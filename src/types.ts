export type StreamQualityPreset = '1080p60' | '1080p30' | '720p60' | '720p30' | 'adaptive';

export type CodecPreference = 'default' | 'vp8' | 'vp9' | 'h264' | 'av1';

export type ContentHint = 'detail' | 'motion' | 'text' | 'none';

export type ConnectionMode = 'websocket' | 'manual-p2p';

export type UserRole = 'host' | 'viewer';

export interface WebRTCStats {
  bitrateKbps: number;
  fps: number;
  latencyMs: number; // RTT
  packetsLost: number;
  packetsReceivedOrSent: number;
  resolution: string;
  codec: string;
  jitterMs: number;
  framesDropped: number;
  qualityLimitationReason?: string;
  cpuLoadEstimate: 'low' | 'moderate' | 'high' | 'critical';
}

export interface StreamConfig {
  preset: StreamQualityPreset;
  width: number;
  height: number;
  frameRate: number;
  maxBitrateKbps: number;
  codec: CodecPreference;
  contentHint: ContentHint;
  includeSystemAudio: boolean;
  includeMicAudio: boolean;
  micNoiseSuppression: boolean;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface RoomInfo {
  roomId: string;
  role: UserRole;
  isPeerConnected: boolean;
}

export type PhotoboothTheme = 'cinema-noir' | 'neon-cyberpunk' | 'classic-theatre' | 'sunset-romance' | 'hollywood-gold';

export interface PhotoboothShot {
  id: string;
  localImage: string;
  peerImage?: string;
  timestamp: string;
}
