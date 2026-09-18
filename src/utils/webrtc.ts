import { CodecPreference, WebRTCStats } from '../types';

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

/**
 * Prefers a specific video codec in the SDP (VP8, VP9, H264, or AV1)
 */
export function preferCodecInSdp(sdp: string, codec: CodecPreference): string {
  if (codec === 'default') return sdp;

  const codecUpper = codec.toUpperCase();
  const sdpLines = sdp.split('\r\n');
  const mLineIndex = sdpLines.findIndex((line) => line.startsWith('m=video'));

  if (mLineIndex === -1) return sdp;

  // Find payload types matching codec name
  const payloadTypes: string[] = [];
  for (let i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].startsWith('a=rtpmap:')) {
      const parts = sdpLines[i].split(' ');
      if (parts[1] && parts[1].toUpperCase().includes(codecUpper)) {
        const pt = sdpLines[i].substring(9, sdpLines[i].indexOf(' '));
        payloadTypes.push(pt);
      }
    }
  }

  if (payloadTypes.length === 0) return sdp;

  // Reorder m=video line payload types to place preferred PT first
  const mLineParts = sdpLines[mLineIndex].split(' ');
  const headerParts = mLineParts.slice(0, 3);
  const existingPts = mLineParts.slice(3);

  const filteredPts = existingPts.filter((pt) => !payloadTypes.includes(pt));
  const newPts = [...payloadTypes, ...filteredPts];

  sdpLines[mLineIndex] = [...headerParts, ...newPts].join(' ');
  return sdpLines.join('\r\n');
}

/**
 * Configures RTCRtpSender encoding parameters (maxBitrate, maxFramerate, degradationPreference)
 */
export async function applySenderParameters(
  sender: RTCRtpSender,
  maxBitrateKbps: number,
  maxFramerate: number,
  contentHint: string
) {
  if (!sender || !sender.track || sender.track.kind !== 'video') return;

  // Apply contentHint for optimization (e.g. 'detail' for text/code, 'motion' for video)
  if ('contentHint' in sender.track) {
    (sender.track as MediaStreamTrack & { contentHint: string }).contentHint = contentHint;
  }

  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }

    params.encodings[0].maxBitrate = maxBitrateKbps * 1000;
    params.encodings[0].maxFramerate = maxFramerate;
    
    // Low-latency priority: maintain resolution unless bandwidth drops significantly
    params.degradationPreference = 'maintain-framerate';

    await sender.setParameters(params);
  } catch (err) {
    console.warn('Failed to apply sender parameters:', err);
  }
}

/**
 * Calculates current network & video statistics from RTCPeerConnection stats
 */
export async function calculateWebRTCStats(
  pc: RTCPeerConnection,
  prevStatsRef: { timestamp: number; bytes: number; frames: number }
): Promise<WebRTCStats | null> {
  if (!pc || pc.connectionState === 'closed') return null;

  try {
    const stats = await pc.getStats();
    let bitrateKbps = 0;
    let fps = 0;
    let latencyMs = 0;
    let packetsLost = 0;
    let packetsReceivedOrSent = 0;
    let resolution = '1920x1080';
    let codec = 'Unknown';
    let jitterMs = 0;
    let framesDropped = 0;
    let qualityLimitationReason = 'none';

    const now = Date.now();
    const timeDelta = (now - prevStatsRef.timestamp) / 1000; // seconds

    stats.forEach((report) => {
      // Candidate pairs for Latency (RTT)
      if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime !== undefined) {
        latencyMs = Math.round(report.currentRoundTripTime * 1000);
      }

      // Inbound Video Stats (Viewer)
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        const bytes = report.bytesReceived || 0;
        const frames = report.framesDecoded || 0;

        if (timeDelta > 0) {
          bitrateKbps = Math.round(((bytes - prevStatsRef.bytes) * 8) / (timeDelta * 1000));
          fps = Math.round((frames - prevStatsRef.frames) / timeDelta);
        }

        prevStatsRef.bytes = bytes;
        prevStatsRef.frames = frames;
        prevStatsRef.timestamp = now;

        packetsLost = report.packetsLost || 0;
        packetsReceivedOrSent = report.packetsReceived || 0;
        framesDropped = report.framesDropped || 0;
        jitterMs = Math.round((report.jitter || 0) * 1000);

        if (report.frameWidth && report.frameHeight) {
          resolution = `${report.frameWidth}x${report.frameHeight}`;
        }
      }

      // Outbound Video Stats (Host / Presenter)
      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        const bytes = report.bytesSent || 0;
        const frames = report.framesEncoded || 0;

        if (timeDelta > 0) {
          bitrateKbps = Math.round(((bytes - prevStatsRef.bytes) * 8) / (timeDelta * 1000));
          fps = Math.round((frames - prevStatsRef.frames) / timeDelta);
        }

        prevStatsRef.bytes = bytes;
        prevStatsRef.frames = frames;
        prevStatsRef.timestamp = now;

        packetsReceivedOrSent = report.packetsSent || 0;
        qualityLimitationReason = report.qualityLimitationReason || 'none';

        if (report.frameWidth && report.frameHeight) {
          resolution = `${report.frameWidth}x${report.frameHeight}`;
        }
      }

      // Codec details
      if (report.type === 'codec' && report.mimeType) {
        codec = report.mimeType.replace('video/', '').toUpperCase();
      }
    });

    // CPU / Latency estimate
    let cpuLoadEstimate: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (framesDropped > 30 || (fps < 20 && fps > 0) || qualityLimitationReason === 'cpu') {
      cpuLoadEstimate = 'critical';
    } else if (framesDropped > 10 || qualityLimitationReason === 'bandwidth') {
      cpuLoadEstimate = 'high';
    } else if (latencyMs > 150) {
      cpuLoadEstimate = 'moderate';
    }

    return {
      bitrateKbps: Math.max(0, bitrateKbps),
      fps: Math.max(0, fps),
      latencyMs: Math.max(0, latencyMs),
      packetsLost,
      packetsReceivedOrSent,
      resolution,
      codec,
      jitterMs,
      framesDropped,
      qualityLimitationReason,
      cpuLoadEstimate,
    };
  } catch (err) {
    console.warn('Error reading WebRTC stats:', err);
    return null;
  }
}

/**
 * Encodes SDP & ICE candidates into a compact compressed string for manual P2P exchange
 */
export function encodeManualSession(data: { sdp: RTCSessionDescriptionInit; candidates: RTCIceCandidateInit[] }): string {
  try {
    const jsonStr = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonStr));
  } catch (err) {
    console.error('Failed to encode session:', err);
    return '';
  }
}

/**
 * Decodes manual P2P SDP & ICE payload string
 */
export function decodeManualSession(encoded: string): { sdp: RTCSessionDescriptionInit; candidates: RTCIceCandidateInit[] } | null {
  try {
    const jsonStr = decodeURIComponent(atob(encoded.trim()));
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to decode manual session payload:', err);
    return null;
  }
}
