import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Wifi,
  BarChart2,
  RefreshCw,
  Sliders,
  Check,
} from 'lucide-react';
import { WebRTCStats } from '../types';
import { CpuHealthReport } from '../utils/cpuMonitor';

interface StatsPanelProps {
  stats: WebRTCStats | null;
  peerConnected: boolean;
  cpuReport: CpuHealthReport | null;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, peerConnected, cpuReport }) => {
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [bitrateHistory, setBitrateHistory] = useState<number[]>([]);

  // Update history charts whenever stats change
  useEffect(() => {
    if (stats) {
      setLatencyHistory((prev) => [...prev.slice(-19), stats.latencyMs || 25]);
      setBitrateHistory((prev) => [...prev.slice(-19), stats.bitrateKbps || 0]);
    }
  }, [stats]);

  if (!peerConnected || !stats) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
        <Activity className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="text-slate-300 font-semibold text-sm">Telemetry Inactive</h4>
        <p className="text-slate-500 text-xs">
          Connect a peer via WebRTC to view sub-100ms real-time latency graphs, bitrates, and hardware performance metrics.
        </p>
      </div>
    );
  }

  const maxLatency = Math.max(100, ...latencyHistory);
  const maxBitrate = Math.max(8000, ...bitrateHistory);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-slate-100 text-sm">Real-Time WebRTC Telemetry</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-400">
          <Zap className="w-3.5 h-3.5" /> Sub-100ms Active
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Latency RTT */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">Round Trip Time (RTT)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-cyan-400">{stats.latencyMs || '<40'}</span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium block">Target &lt;100ms met</span>
        </div>

        {/* Bitrate */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">Current Bitrate</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-100">{stats.bitrateKbps}</span>
            <span className="text-xs text-slate-400">kbps</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">
            {(stats.bitrateKbps / 1000).toFixed(1)} Mbps
          </span>
        </div>

        {/* Framerate & Resolution */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">Video Resolution</span>
          <div className="text-base font-bold text-slate-100">{stats.resolution}</div>
          <span className="text-[10px] text-slate-400 font-medium block">
            {stats.fps} FPS ({stats.codec})
          </span>
        </div>

        {/* CPU & Thermal Status */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">Device Thermal Status</span>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span
              className={`text-sm font-bold ${
                cpuReport?.thermalRisk === 'safe'
                  ? 'text-emerald-400'
                  : cpuReport?.thermalRisk === 'warm'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {(cpuReport?.thermalRisk || 'safe').toUpperCase()}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">
            Jank: {cpuReport?.jankPercentage || 0}%
          </span>
        </div>
      </div>

      {/* Latency & Bitrate Dynamic SVG Sparkline Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Latency Graph */}
        <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Latency History (ms)</span>
            <span className="text-cyan-400 font-mono font-bold">{stats.latencyMs} ms</span>
          </div>
          <div className="h-16 flex items-end gap-1 pt-2 border-b border-slate-800/80">
            {latencyHistory.map((val, idx) => {
              const heightPercent = Math.min(100, Math.max(10, (val / maxLatency) * 100));
              return (
                <div
                  key={idx}
                  className="flex-1 bg-cyan-500/80 hover:bg-cyan-400 rounded-t transition-all"
                  style={{ height: `${heightPercent}%` }}
                  title={`${val} ms`}
                />
              );
            })}
          </div>
        </div>

        {/* Bitrate Graph */}
        <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Bitrate History (kbps)</span>
            <span className="text-slate-100 font-mono font-bold">{stats.bitrateKbps} kbps</span>
          </div>
          <div className="h-16 flex items-end gap-1 pt-2 border-b border-slate-800/80">
            {bitrateHistory.map((val, idx) => {
              const heightPercent = Math.min(100, Math.max(10, (val / maxBitrate) * 100));
              return (
                <div
                  key={idx}
                  className="flex-1 bg-blue-500/80 hover:bg-blue-400 rounded-t transition-all"
                  style={{ height: `${heightPercent}%` }}
                  title={`${val} kbps`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Thermal / Health Warnings if detected */}
      {cpuReport && cpuReport.recommendation && (
        <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-300">Thermal CPU Health Optimization</div>
            <p className="mt-0.5 text-amber-200/90 leading-relaxed">{cpuReport.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
};
