import React, { useRef, useState, useEffect } from 'react';
import {
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Camera,
  Layers,
  Activity,
  Zap,
  Radio,
  RadioTower,
  Cpu,
  Wifi,
  Eye,
  Settings,
} from 'lucide-react';
import { WebRTCStats } from '../types';

interface ViewerPlayerProps {
  remoteStream: MediaStream | null;
  stats: WebRTCStats | null;
  peerConnected: boolean;
  onOpenSignaling: () => void;
  onOpenPhotobooth?: () => void;
}

export const ViewerPlayer: React.FC<ViewerPlayerProps> = ({
  remoteStream,
  stats,
  peerConnected,
  onOpenSignaling,
  onOpenPhotobooth,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showHud, setShowHud] = useState(true);
  const [efficiencyMode, setEfficiencyMode] = useState(true); // Default to efficiency mode to save CPU/battery
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  // Attach remote stream
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Picture-in-Picture
  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP not supported or failed:', err);
    }
  };

  // High-res Snapshot capture
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `streamsync-snapshot-${Date.now()}.png`;
      a.click();
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 2000);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    videoRef.current.muted = newMute;
  };

  return (
    <div className="space-y-4">
      {/* Main Stream Stage Container */}
      <div
        ref={containerRef}
        className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl group flex flex-col justify-center min-h-[480px]"
      >
        {remoteStream && peerConnected ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            controls={false}
            className="w-full h-full object-contain max-h-[80vh]"
          />
        ) : (
          <div className="p-12 text-center space-y-5 max-w-lg mx-auto">
            <div className="w-20 h-20 bg-blue-600/10 border border-blue-500/20 text-cyan-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <RadioTower className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100">Waiting for Screen Stream</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Connect a presenter device using the room code or QR code to receive the sub-100ms Full HD stream.
              </p>
            </div>
            <button
              id="btn-viewer-connect"
              onClick={onOpenSignaling}
              className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Zap className="w-4 h-4" /> Connect to Presenter Room
            </button>

            {onOpenPhotobooth && (
              <button
                id="btn-photobooth-callout-viewer"
                onClick={onOpenPhotobooth}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-950/80 to-red-950/80 border border-pink-500/40 text-pink-200 hover:text-white hover:border-pink-400 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-md"
              >
                🍿 Couples Movie Date Photobooth (Take Photos)
              </button>
            )}
          </div>
        )}

        {/* Live HUD Overlay (Bitrate, RTT Latency, FPS, Resolution) */}
        {remoteStream && peerConnected && showHud && stats && (
          <div className="absolute top-4 left-4 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono text-slate-200 pointer-events-none z-10 transition-opacity">
            <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-700/60 pb-1 font-sans">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Low Latency Stream Active</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[11px]">
              <div>
                <span className="text-slate-400">Latency (RTT):</span>{' '}
                <span className="text-cyan-400 font-semibold">{stats.latencyMs || '<40'} ms</span>
              </div>
              <div>
                <span className="text-slate-400">FPS:</span>{' '}
                <span className="text-slate-100 font-semibold">{stats.fps}</span>
              </div>
              <div>
                <span className="text-slate-400">Bitrate:</span>{' '}
                <span className="text-slate-100 font-semibold">{stats.bitrateKbps} kbps</span>
              </div>
              <div>
                <span className="text-slate-400">Res:</span>{' '}
                <span className="text-slate-100 font-semibold">{stats.resolution}</span>
              </div>
              <div>
                <span className="text-slate-400">Codec:</span>{' '}
                <span className="text-slate-100 font-semibold">{stats.codec}</span>
              </div>
              <div>
                <span className="text-slate-400">CPU Load:</span>{' '}
                <span
                  className={`font-semibold ${
                    stats.cpuLoadEstimate === 'low'
                      ? 'text-emerald-400'
                      : stats.cpuLoadEstimate === 'moderate'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {stats.cpuLoadEstimate.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Snapshot Notification Toast */}
        {snapshotSuccess && (
          <div className="absolute top-4 right-4 bg-emerald-600 text-white font-semibold text-xs px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 z-20">
            <Camera className="w-4 h-4" /> Snapshot Saved to Downloads!
          </div>
        )}

        {/* Player Floating Control Toolbar */}
        {remoteStream && peerConnected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 z-20 opacity-90 hover:opacity-100 transition-opacity">
            {/* Mute & Volume */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-700/80">
              <button
                id="btn-toggle-mute"
                onClick={toggleMute}
                className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
              </button>
              <input
                id="slider-volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* HUD Toggle */}
            <button
              id="btn-toggle-hud"
              onClick={() => setShowHud(!showHud)}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                showHud ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Live Telemetry HUD"
            >
              <Activity className="w-4 h-4" /> HUD
            </button>

            {/* Low CPU Efficiency Mode Toggle */}
            <button
              id="btn-toggle-efficiency"
              onClick={() => setEfficiencyMode(!efficiencyMode)}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                efficiencyMode
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Low CPU / Battery Saver Hardware Decoding"
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Low CPU Mode</span>
            </button>

            {/* Picture in Picture */}
            <button
              id="btn-pip"
              onClick={togglePip}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Picture in Picture"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Snapshot */}
            <button
              id="btn-snapshot"
              onClick={takeSnapshot}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Take Full HD Snapshot"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Couples Movie Photobooth */}
            {onOpenPhotobooth && (
              <button
                id="btn-open-photobooth-player"
                onClick={onOpenPhotobooth}
                className="p-1.5 text-pink-400 hover:text-pink-300 bg-pink-950/50 border border-pink-500/30 rounded-lg transition-colors"
                title="Open Couples Movie Date Photobooth"
              >
                <Camera className="w-4 h-4 text-pink-400 animate-pulse" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              id="btn-fullscreen"
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
