import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { PresenterControls } from './components/PresenterControls';
import { ViewerPlayer } from './components/ViewerPlayer';
import { StatsPanel } from './components/StatsPanel';
import { SignalingModal } from './components/SignalingModal';
import { DeploymentModal } from './components/DeploymentModal';
import { PhotoboothModal } from './components/PhotoboothModal';
import {
  UserRole,
  ConnectionMode,
  StreamConfig,
  WebRTCStats,
} from './types';
import {
  DEFAULT_ICE_SERVERS,
  preferCodecInSdp,
  applySenderParameters,
  calculateWebRTCStats,
  encodeManualSession,
  decodeManualSession,
} from './utils/webrtc';
import { CpuMonitor, CpuHealthReport } from './utils/cpuMonitor';
import { ShieldCheck, Monitor, Radio, Zap, Info, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // State
  const [role, setRole] = useState<UserRole>('host');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('websocket');
  const [roomId, setRoomId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [peerConnected, setPeerConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [stats, setStats] = useState<WebRTCStats | null>(null);
  const [cpuReport, setCpuReport] = useState<CpuHealthReport | null>(null);

  // Modals
  const [isSignalingOpen, setIsSignalingOpen] = useState<boolean>(false);
  const [isDeployOpen, setIsDeployOpen] = useState<boolean>(false);
  const [isPhotoboothOpen, setIsPhotoboothOpen] = useState<boolean>(false);

  // Manual P2P State
  const [manualOfferSdp, setManualOfferSdp] = useState<string>('');
  const [manualAnswerSdp, setManualAnswerSdp] = useState<string>('');

  // Refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentConfigRef = useRef<StreamConfig | null>(null);
  const prevStatsRef = useRef({ timestamp: Date.now(), bytes: 0, frames: 0 });
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const cpuMonitorRef = useRef<CpuMonitor>(new CpuMonitor());

  // Reconnect Strategy Refs & State Sync
  const reconnectCountRef = useRef<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleAutoReconnectRef = useRef<() => void>(() => {});

  const isStreamingRef = useRef(isStreaming);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);

  const roleRef = useRef(role);
  useEffect(() => { roleRef.current = role; }, [role]);

  const roomIdRef = useRef(roomId);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  const connectionModeRef = useRef(connectionMode);
  useEffect(() => { connectionModeRef.current = connectionMode; }, [connectionMode]);

  // Check URL parameters on load for auto-room join
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const roleParam = params.get('role') as UserRole | null;

    if (roomParam) {
      setRoomId(roomParam);
      if (roleParam === 'viewer' || roleParam === 'host') {
        setRole(roleParam);
      } else {
        setRole('viewer');
      }
    } else {
      // Generate default 6-digit room code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRoomId(code);
    }

    // Start CPU Performance Monitor
    cpuMonitorRef.current.start((report) => {
      setCpuReport(report);
    });

    return () => {
      cpuMonitorRef.current.stop();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // Cleanup WebRTC connection
  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    setPeerConnected(false);
    setRemoteStream(null);
  }, []);

  // Initialize WebRTC RTCPeerConnection instance
  const createPeer = useCallback(
    (iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS) => {
      closePeerConnection();

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          setPeerConnected(true);
          setIsReconnecting(false);
          setReconnectAttempt(0);
          reconnectCountRef.current = 0;
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        } else if (state === 'disconnected' || state === 'failed') {
          setPeerConnected(false);
          handleAutoReconnectRef.current();
        } else if (state === 'closed') {
          setPeerConnected(false);
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          const newStream = new MediaStream([event.track]);
          setRemoteStream(newStream);
        }
      };

      // If presenter already has local tracks, attach them
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      return pc;
    },
    [closePeerConnection]
  );

  // Stats Telemetry Polling Loop (1s interval)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (pcRef.current && peerConnected) {
        const s = await calculateWebRTCStats(pcRef.current, prevStatsRef.current);
        if (s) setStats(s);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [peerConnected]);

  // WebSocket Connection Handler
  const connectWebSocket = useCallback(
    (targetRoomId: string, currentRole: UserRole) => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', roomId: targetRoomId, role: currentRole }));
      };

      ws.onclose = () => {
        if (connectionModeRef.current === 'websocket' && reconnectCountRef.current < 5) {
          handleAutoReconnectRef.current();
        }
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Viewer connected -> Host creates offer
          if (data.type === 'peer-joined' && currentRole === 'host') {
            const pc = createPeer();

            pc.onicecandidate = (e) => {
              if (e.candidate && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate, roomId: targetRoomId }));
              }
            };

            const offer = await pc.createOffer({
              offerToReceiveVideo: false,
              offerToReceiveAudio: false,
            });

            let finalSdp = offer.sdp || '';
            if (currentConfigRef.current) {
              finalSdp = preferCodecInSdp(finalSdp, currentConfigRef.current.codec);
            }

            await pc.setLocalDescription({ type: 'offer', sdp: finalSdp });

            // Apply bitrate limits
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender && currentConfigRef.current) {
              await applySenderParameters(
                videoSender,
                currentConfigRef.current.maxBitrateKbps,
                currentConfigRef.current.frameRate,
                currentConfigRef.current.contentHint
              );
            }

            ws.send(JSON.stringify({ type: 'offer', sdp: finalSdp, roomId: targetRoomId }));
          }

          // Offer received by Viewer -> Viewer creates answer
          if (data.type === 'offer' && currentRole === 'viewer') {
            const pc = createPeer();

            pc.onicecandidate = (e) => {
              if (e.candidate && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate, roomId: targetRoomId }));
              }
            };

            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));

            // Process buffered ICE candidates
            while (pendingCandidatesRef.current.length > 0) {
              const candidate = pendingCandidatesRef.current.shift();
              if (candidate) await pc.addIceCandidate(candidate);
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            ws.send(JSON.stringify({ type: 'answer', sdp: answer.sdp, roomId: targetRoomId }));
          }

          // Answer received by Host -> Set Remote Description
          if (data.type === 'answer' && currentRole === 'host' && pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));

            while (pendingCandidatesRef.current.length > 0) {
              const candidate = pendingCandidatesRef.current.shift();
              if (candidate) await pcRef.current.addIceCandidate(candidate);
            }
          }

          // ICE Candidates
          if (data.type === 'candidate' && data.candidate) {
            const candidate = new RTCIceCandidate(data.candidate);
            if (pcRef.current && pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(candidate);
            } else {
              pendingCandidatesRef.current.push(candidate);
            }
          }

          if (data.type === 'peer-disconnected') {
            setPeerConnected(false);
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };
    },
    [createPeer]
  );

  // Auto Reconnect Execution Handler
  const triggerAutoReconnect = useCallback(() => {
    const curMode = connectionModeRef.current;
    const curRoom = roomIdRef.current;
    const curRole = roleRef.current;

    if (curMode !== 'websocket' || !curRoom) return;

    if (reconnectCountRef.current >= 5) {
      console.warn('Max WebRTC reconnect attempts reached (5/5).');
      setIsReconnecting(false);
      return;
    }

    setIsReconnecting(true);
    reconnectCountRef.current += 1;
    setReconnectAttempt(reconnectCountRef.current);

    const backoffMs = Math.min(1000 * Math.pow(1.5, reconnectCountRef.current - 1), 6000);

    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

    reconnectTimerRef.current = setTimeout(async () => {
      console.log(`[WebRTC Auto-Reconnect] Attempt ${reconnectCountRef.current}/5...`);

      // 1. Ensure WebSocket signaling connection is alive
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket(curRoom, curRole);
      } else {
        // Re-notify signaling server of presence
        wsRef.current.send(JSON.stringify({ type: 'join', roomId: curRoom, role: curRole }));

        // 2. If Presenter & actively streaming, re-create peer connection & send fresh ICE offer
        if (curRole === 'host' && isStreamingRef.current) {
          try {
            const pc = createPeer();
            pc.onicecandidate = (e) => {
              if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'candidate', candidate: e.candidate, roomId: curRoom }));
              }
            };

            const offer = await pc.createOffer({ iceRestart: true });
            let finalSdp = offer.sdp || '';
            if (currentConfigRef.current) {
              finalSdp = preferCodecInSdp(finalSdp, currentConfigRef.current.codec);
            }

            await pc.setLocalDescription({ type: 'offer', sdp: finalSdp });

            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender && currentConfigRef.current) {
              await applySenderParameters(
                videoSender,
                currentConfigRef.current.maxBitrateKbps,
                currentConfigRef.current.frameRate,
                currentConfigRef.current.contentHint
              );
            }

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'offer', sdp: finalSdp, roomId: curRoom }));
            }
          } catch (err) {
            console.warn('Failed to send ICE restart offer:', err);
          }
        }
      }
    }, backoffMs);
  }, [connectWebSocket, createPeer]);

  // Keep ref synchronized
  useEffect(() => {
    handleAutoReconnectRef.current = triggerAutoReconnect;
  }, [triggerAutoReconnect]);

  // Auto-connect socket when room ID or mode changes
  useEffect(() => {
    if (connectionMode === 'websocket' && roomId) {
      connectWebSocket(roomId, role);
    }
  }, [connectionMode, roomId, role, connectWebSocket]);

  // Manual Reset Reconnect
  const handleManualRetry = () => {
    reconnectCountRef.current = 0;
    triggerAutoReconnect();
  };

  // Start Screen Streaming (Presenter)
  const handleStartStream = async (config: StreamConfig) => {
    currentConfigRef.current = config;

    try {
      // Capture Display Media with high-res constraints
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: config.width, max: 1920 },
          height: { ideal: config.height, max: 1080 },
          frameRate: { ideal: config.frameRate, max: 60 },
        },
        audio: config.includeSystemAudio,
      });

      // Optional Microphone Audio Mixing
      if (config.includeMicAudio) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: { noiseSuppression: config.micNoiseSuppression, echoCancellation: true },
          });

          // Mix audio tracks
          const tracks = [...displayStream.getVideoTracks(), ...displayStream.getAudioTracks(), ...micStream.getAudioTracks()];
          const combinedStream = new MediaStream(tracks);
          setLocalStream(combinedStream);
          localStreamRef.current = combinedStream;
        } catch (micErr) {
          console.warn('Microphone permission denied, proceeding with system display audio only.', micErr);
          setLocalStream(displayStream);
          localStreamRef.current = displayStream;
        }
      } else {
        setLocalStream(displayStream);
        localStreamRef.current = displayStream;
      }

      setIsStreaming(true);

      // Handle stream end (user clicks browser "Stop Sharing" floating bar)
      displayStream.getVideoTracks()[0].onended = () => {
        handleStopStream();
      };

      // Re-trigger peer connection offer if room is ready
      if (connectionMode === 'websocket' && roomId) {
        connectWebSocket(roomId, role);
      }
    } catch (err) {
      console.error('Failed to get display media:', err);
      alert('Screen capture cancelled or permission denied.');
    }
  };

  const handleStopStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setIsStreaming(false);
    closePeerConnection();
    setIsPhotoboothOpen(true);
  };

  const handleUpdateConfig = (config: StreamConfig) => {
    currentConfigRef.current = config;
    if (pcRef.current) {
      const senders = pcRef.current.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === 'video');
      if (videoSender) {
        applySenderParameters(videoSender, config.maxBitrateKbps, config.frameRate, config.contentHint);
      }
    }
  };

  // --- MANUAL ZERO-SERVER P2P HANDSHAKE METHODS ---
  const handleGenerateManualOffer = async () => {
    const candidatesList: RTCIceCandidateInit[] = [];
    const pc = createPeer();

    pc.onicecandidate = (e) => {
      if (e.candidate) candidatesList.push(e.candidate.toJSON());
    };

    const offer = await pc.createOffer();
    let sdpStr = offer.sdp || '';
    if (currentConfigRef.current) {
      sdpStr = preferCodecInSdp(sdpStr, currentConfigRef.current.codec);
    }

    await pc.setLocalDescription({ type: 'offer', sdp: sdpStr });

    // Wait 1s for ICE candidate gathering
    await new Promise((res) => setTimeout(res, 1000));

    const encoded = encodeManualSession({
      sdp: { type: 'offer', sdp: pc.localDescription?.sdp || sdpStr },
      candidates: candidatesList,
    });

    setManualOfferSdp(encoded);
  };

  const handleAcceptManualOfferAndGenerateAnswer = async (encodedOffer: string) => {
    const decoded = decodeManualSession(encodedOffer);
    if (!decoded) {
      alert('Invalid Offer Token. Please check and try again.');
      return;
    }

    const candidatesList: RTCIceCandidateInit[] = [];
    const pc = createPeer();

    pc.onicecandidate = (e) => {
      if (e.candidate) candidatesList.push(e.candidate.toJSON());
    };

    await pc.setRemoteDescription(new RTCSessionDescription(decoded.sdp));

    for (const cand of decoded.candidates) {
      await pc.addIceCandidate(new RTCIceCandidate(cand));
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Wait 1s for ICE gathering
    await new Promise((res) => setTimeout(res, 1000));

    const encoded = encodeManualSession({
      sdp: { type: 'answer', sdp: pc.localDescription?.sdp || answer.sdp },
      candidates: candidatesList,
    });

    setManualAnswerSdp(encoded);
  };

  const handleAcceptManualAnswer = async (encodedAnswer: string) => {
    if (!pcRef.current) return;
    const decoded = decodeManualSession(encodedAnswer);
    if (!decoded) {
      alert('Invalid Answer Token.');
      return;
    }

    await pcRef.current.setRemoteDescription(new RTCSessionDescription(decoded.sdp));

    for (const cand of decoded.candidates) {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
    }

    setPeerConnected(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Header
        role={role}
        setRole={setRole}
        connectionMode={connectionMode}
        setConnectionMode={setConnectionMode}
        peerConnected={peerConnected}
        roomId={roomId}
        stats={stats}
        onOpenSignaling={() => setIsSignalingOpen(true)}
        onOpenDeploy={() => setIsDeployOpen(true)}
        onOpenPhotobooth={() => setIsPhotoboothOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Auto-Reconnect Status Alert */}
        {isReconnecting && (
          <div className="bg-amber-950/80 border border-amber-500/50 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-200 shadow-lg animate-pulse">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <span>
                <strong className="text-amber-100 font-semibold">WebRTC Disconnected.</strong> Re-establishing connection automatically without page reload (Attempt {reconnectAttempt}/5)...
              </span>
            </div>
            <button
              onClick={handleManualRetry}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-xs shrink-0 transition-colors shadow-sm"
            >
              Retry Now
            </button>
          </div>
        )}

        {/* Connection Mode Banner / Role Context */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 border border-blue-500/20 text-cyan-400 rounded-xl">
              {role === 'host' ? <Monitor className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-100">
                  {role === 'host' ? 'Presenter View (Screen Capture)' : 'Viewer View (Receiver)'}
                </h2>
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  P2P Direct
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {role === 'host'
                  ? 'Stream display & audio at 1080p60 with low CPU hardware encoding.'
                  : 'Receiving low-latency Full HD video with hardware video decoding.'}
              </p>
            </div>
          </div>

          {/* Quick Pair CTA & Photobooth */}
          <div className="flex items-center gap-2">
            <button
              id="btn-open-photobooth-banner"
              onClick={() => setIsPhotoboothOpen(true)}
              className="px-3.5 py-2 bg-pink-950/80 hover:bg-pink-900/80 border border-pink-500/40 text-xs font-semibold text-pink-200 rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              🍿 Movie Date Photobooth
            </button>
            <button
              id="btn-open-signaling-cta"
              onClick={() => setIsSignalingOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-all flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              {peerConnected ? 'Connected (Manage Room)' : 'Pair Devices (Room Code / QR)'}
            </button>
          </div>
        </div>

        {/* Primary Role View */}
        {role === 'host' ? (
          <PresenterControls
            isStreaming={isStreaming}
            onStartStream={handleStartStream}
            onStopStream={handleStopStream}
            onUpdateConfig={handleUpdateConfig}
            localStream={localStream}
            stats={stats}
            peerConnected={peerConnected}
            onOpenSignaling={() => setIsSignalingOpen(true)}
            onOpenPhotobooth={() => setIsPhotoboothOpen(true)}
          />
        ) : (
          <ViewerPlayer
            remoteStream={remoteStream}
            stats={stats}
            peerConnected={peerConnected}
            onOpenSignaling={() => setIsSignalingOpen(true)}
            onOpenPhotobooth={() => setIsPhotoboothOpen(true)}
          />
        )}

        {/* Real-time Telemetry & Performance Dashboard */}
        <StatsPanel stats={stats} peerConnected={peerConnected} cpuReport={cpuReport} />
      </main>

      {/* Modals */}
      <SignalingModal
        isOpen={isSignalingOpen}
        onClose={() => setIsSignalingOpen(false)}
        roomId={roomId}
        setRoomId={setRoomId}
        role={role}
        setRole={setRole}
        connectionMode={connectionMode}
        setConnectionMode={setConnectionMode}
        peerConnected={peerConnected}
        onJoinRoomWebSocket={(code) => connectWebSocket(code, role)}
        manualOfferSdp={manualOfferSdp}
        manualAnswerSdp={manualAnswerSdp}
        onGenerateManualOffer={handleGenerateManualOffer}
        onAcceptManualOfferAndGenerateAnswer={handleAcceptManualOfferAndGenerateAnswer}
        onAcceptManualAnswer={handleAcceptManualAnswer}
      />

      <DeploymentModal isOpen={isDeployOpen} onClose={() => setIsDeployOpen(false)} />

      <PhotoboothModal
        isOpen={isPhotoboothOpen}
        onClose={() => setIsPhotoboothOpen(false)}
        role={role}
        peerConnected={peerConnected}
        wsRef={wsRef}
        roomId={roomId}
      />
    </div>
  );
}
