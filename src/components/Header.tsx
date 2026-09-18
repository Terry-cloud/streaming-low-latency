import React from 'react';
import { Monitor, Cpu, Radio, Server, ShieldCheck, Zap, Download, Camera, Film } from 'lucide-react';
import { UserRole, ConnectionMode, WebRTCStats } from '../types';

interface HeaderProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  connectionMode: ConnectionMode;
  setConnectionMode: (mode: ConnectionMode) => void;
  peerConnected: boolean;
  roomId: string | null;
  stats: WebRTCStats | null;
  onOpenSignaling: () => void;
  onOpenDeploy: () => void;
  onOpenPhotobooth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  setRole,
  connectionMode,
  setConnectionMode,
  peerConnected,
  roomId,
  stats,
  onOpenSignaling,
  onOpenDeploy,
  onOpenPhotobooth,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 text-slate-100">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-100 tracking-tight">
                StreamSync P2P
              </h1>
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" /> &lt;100ms
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Low-Latency WebRTC Full HD Screen Streaming
            </p>
          </div>
        </div>

        {/* Status Indicators & Stats Pill */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Active Latency Badge */}
          {peerConnected && stats && (
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1 rounded-lg text-xs font-medium">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-bold">{stats.latencyMs || '<50'} ms</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300">{stats.fps} FPS</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300">{stats.bitrateKbps} kbps</span>
            </div>
          )}

          {/* Peer Status */}
          <button
            id="btn-signaling-modal"
            onClick={onOpenSignaling}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
              peerConnected
                ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/80'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${peerConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            {peerConnected ? `Connected (${roomId || 'P2P'})` : roomId ? `Room: ${roomId}` : 'Connect Devices'}
          </button>

          {/* Role Switcher Toggle */}
          <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex text-xs font-medium">
            <button
              id="btn-role-presenter"
              onClick={() => setRole('host')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                role === 'host'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Presenter
            </button>
            <button
              id="btn-role-viewer"
              onClick={() => setRole('viewer')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                role === 'viewer'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" /> Viewer
            </button>
          </div>

          {/* Photobooth Button */}
          <button
            id="btn-open-photobooth"
            onClick={onOpenPhotobooth}
            className="p-1.5 bg-gradient-to-r from-red-950/80 to-pink-950/80 hover:from-red-900 hover:to-pink-900 border border-red-500/40 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-red-950/40"
            title="Couples Movie Date Photobooth"
          >
            <Camera className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">Movie Photobooth 🍿</span>
          </button>

          {/* Deploy Info Button */}
          <button
            id="btn-deploy-modal"
            onClick={onOpenDeploy}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            title="Free Railway & Fly.io Docker Deployment Instructions"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Docker Deploy</span>
          </button>
        </div>
      </div>
    </header>
  );
};
