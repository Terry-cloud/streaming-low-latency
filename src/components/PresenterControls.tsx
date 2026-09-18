import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Cpu,
  Zap,
  Play,
  Square,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import { StreamConfig, StreamQualityPreset, CodecPreference, ContentHint, WebRTCStats } from '../types';

interface PresenterControlsProps {
  isStreaming: boolean;
  onStartStream: (config: StreamConfig) => void;
  onStopStream: () => void;
  onUpdateConfig: (config: StreamConfig) => void;
  localStream: MediaStream | null;
  stats: WebRTCStats | null;
  peerConnected: boolean;
  onOpenSignaling: () => void;
  onOpenPhotobooth?: () => void;
}

export const PresenterControls: React.FC<PresenterControlsProps> = ({
  isStreaming,
  onStartStream,
  onStopStream,
  onUpdateConfig,
  localStream,
  stats,
  peerConnected,
  onOpenSignaling,
  onOpenPhotobooth,
}) => {
  const [preset, setPreset] = useState<StreamQualityPreset>('1080p60');
  const [codec, setCodec] = useState<CodecPreference>('h264'); // Default to H.264 for low CPU hardware acceleration
  const [contentHint, setContentHint] = useState<ContentHint>('detail');
  const [includeSystemAudio, setIncludeSystemAudio] = useState<boolean>(true);
  const [includeMicAudio, setIncludeMicAudio] = useState<boolean>(false);
  const [maxBitrateKbps, setMaxBitrateKbps] = useState<number>(6000);
  const [frameRate, setFrameRate] = useState<number>(60);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to preview element
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle Preset changes
  const handlePresetSelect = (newPreset: StreamQualityPreset) => {
    setPreset(newPreset);
    let fps = 60;
    let bitrate = 6000;

    switch (newPreset) {
      case '1080p60':
        fps = 60;
        bitrate = 6000;
        break;
      case '1080p30':
        fps = 30;
        bitrate = 3500;
        break;
      case '720p60':
        fps = 60;
        bitrate = 2800;
        break;
      case '720p30':
        fps = 30;
        bitrate = 1800;
        break;
      case 'adaptive':
        fps = 60;
        bitrate = 4500;
        break;
    }

    setFrameRate(fps);
    setMaxBitrateKbps(bitrate);

    const updatedConfig: StreamConfig = {
      preset: newPreset,
      width: newPreset.includes('1080') ? 1920 : 1280,
      height: newPreset.includes('1080') ? 1080 : 720,
      frameRate: fps,
      maxBitrateKbps: bitrate,
      codec,
      contentHint,
      includeSystemAudio,
      includeMicAudio,
      micNoiseSuppression: true,
    };

    if (isStreaming) {
      onUpdateConfig(updatedConfig);
    }
  };

  const handleStart = () => {
    const config: StreamConfig = {
      preset,
      width: preset.includes('1080') ? 1920 : 1280,
      height: preset.includes('1080') ? 1080 : 720,
      frameRate,
      maxBitrateKbps,
      codec,
      contentHint,
      includeSystemAudio,
      includeMicAudio,
      micNoiseSuppression: true,
    };
    onStartStream(config);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stream Canvas / Preview Box */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
              <h2 className="font-semibold text-sm text-slate-200">
                {isStreaming ? 'Screen Stream Active (1080p WebRTC)' : 'Presenter Preview Stage'}
              </h2>
            </div>
            {isStreaming && stats && (
              <div className="text-xs text-slate-400 font-mono">
                {stats.resolution} @ {stats.fps} FPS ({stats.codec})
              </div>
            )}
          </div>

          {/* Video Preview Frame */}
          <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
            {localStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8 space-y-4 max-w-md">
                <div className="w-16 h-16 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Monitor className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-slate-200 font-semibold text-base">Ready to Share Your Screen</h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    Capture system audio & display at Full HD 60fps with low CPU thermal footprint.
                  </p>
                </div>
                <button
                  id="btn-start-stream"
                  onClick={handleStart}
                  className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Play className="w-4 h-4 fill-current" /> Select Display & Start Streaming
                </button>

                {onOpenPhotobooth && (
                  <button
                    id="btn-photobooth-callout-presenter"
                    onClick={onOpenPhotobooth}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-950/80 to-red-950/80 border border-pink-500/40 text-pink-200 hover:text-white hover:border-pink-400 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-md"
                  >
                    🍿 Couples Movie Date Photobooth (Take Photos)
                  </button>
                )}
              </div>
            )}

            {/* Overlays on active video */}
            {isStreaming && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-xl text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> P2P Live
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-200">
                    {peerConnected ? '1 Viewer Connected' : 'Waiting for Peer to join...'}
                  </span>
                </div>
                <button
                  id="btn-stop-stream"
                  onClick={onStopStream}
                  className="bg-red-600/90 hover:bg-red-500 text-white font-semibold px-3 py-1 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" /> End Stream
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stream Settings & Presets Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> Low-Latency Settings
              </h3>
              <span className="text-xs text-slate-400">1080p / 60 FPS</span>
            </div>

            {/* Quality Presets */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Performance & Quality Preset</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '1080p60', label: '1080p @ 60 FPS', sub: 'Full HD Ultra' },
                  { id: '1080p30', label: '1080p @ 30 FPS', sub: 'Battery & CPU Safe' },
                  { id: '720p60', label: '720p @ 60 FPS', sub: 'High Fluidity' },
                  { id: '720p30', label: '720p @ 30 FPS', sub: 'Slow Network' },
                ].map((p) => (
                  <button
                    key={p.id}
                    id={`preset-${p.id}`}
                    onClick={() => handlePresetSelect(p.id as StreamQualityPreset)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      preset === p.id
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{p.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hardware Accelerated Codec Selector */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Hardware Codec Preference</span>
                <span className="text-[10px] text-cyan-400">Low Thermal CPU</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'h264', name: 'H.264', tip: 'Lowest CPU (Hardware GPU)' },
                  { id: 'vp8', name: 'VP8', tip: 'Broad Compatibility' },
                  { id: 'vp9', name: 'VP9', tip: 'High Bitrate Efficiency' },
                  { id: 'av1', name: 'AV1', tip: 'Next-Gen Codec' },
                ].map((c) => (
                  <button
                    key={c.id}
                    id={`codec-${c.id}`}
                    onClick={() => setCodec(c.id as CodecPreference)}
                    className={`py-2 px-1 rounded-lg border text-center text-xs font-semibold transition-all ${
                      codec === c.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                    title={c.tip}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Optimization Hint */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Content Optimization Hint</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="hint-detail"
                  onClick={() => setContentHint('detail')}
                  className={`p-2 rounded-xl border text-left text-xs font-medium transition-all ${
                    contentHint === 'detail'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400'
                  }`}
                >
                  📝 Text & Code (Crisp)
                </button>
                <button
                  id="hint-motion"
                  onClick={() => setContentHint('motion')}
                  className={`p-2 rounded-xl border text-left text-xs font-medium transition-all ${
                    contentHint === 'motion'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400'
                  }`}
                >
                  🎮 Video & Gaming (Fluid)
                </button>
              </div>
            </div>

            {/* Audio Toggles */}
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Share System Audio
                </span>
                <button
                  id="toggle-system-audio"
                  onClick={() => setIncludeSystemAudio(!includeSystemAudio)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    includeSystemAudio ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform ${
                      includeSystemAudio ? 'left-4.5' : 'left-0.75'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-cyan-400" /> Include Microphone
                </span>
                <button
                  id="toggle-mic-audio"
                  onClick={() => setIncludeMicAudio(!includeMicAudio)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    includeMicAudio ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform ${
                      includeMicAudio ? 'left-4.5' : 'left-0.75'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Connect Peer Action Box */}
          <div className="pt-3 border-t border-slate-800">
            {!peerConnected ? (
              <button
                id="btn-pair-device-presenter"
                onClick={onOpenSignaling}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> Pair Viewer Device (Code / QR)
              </button>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Device paired via WebRTC Direct Peer Connection!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
