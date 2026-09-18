import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Server, Globe, Download, ExternalLink } from 'lucide-react';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentModal: React.FC<DeploymentModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const dockerfileCode = `FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.cjs"]`;

  const flyTomlCode = `app = "streamsync-p2p"
primary_region = "iad"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']`;

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-950/80 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Free Server Deployment Guide</h3>
              <p className="text-xs text-slate-400">Deploy easily to Railway, Fly.io, or Render with Docker</p>
            </div>
          </div>
          <button
            id="btn-close-deploy"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Option 1: Railway */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Option A: Railway (One-Click Docker)
              </h4>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                Easiest
              </span>
            </div>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pl-1 leading-relaxed">
              <li>Connect your GitHub repository to <strong>Railway.app</strong>.</li>
              <li>Railway automatically detects the <code className="text-cyan-300">Dockerfile</code> below.</li>
              <li>Set <code className="text-cyan-300">PORT=3000</code> in variable settings.</li>
              <li>Deployment completes in under 60 seconds with instant HTTPS URL!</li>
            </ol>
          </div>

          {/* Option 2: Fly.io */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Option B: Fly.io (Global Scale)
              </h4>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
                Low Latency
              </span>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 text-xs font-mono text-slate-300 space-y-1">
              <div>fly launch --name streamsync-app</div>
              <div>fly deploy</div>
            </div>
          </div>

          {/* Dockerfile Code Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 font-mono">Dockerfile (Production Ready)</span>
              <button
                id="btn-copy-dockerfile"
                onClick={() => handleCopy(dockerfileCode, 'dockerfile')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                {copiedSection === 'dockerfile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSection === 'dockerfile' ? 'Copied!' : 'Copy Dockerfile'}
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {dockerfileCode}
            </pre>
          </div>

          {/* fly.toml Code Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 font-mono">fly.toml Configuration</span>
              <button
                id="btn-copy-flytoml"
                onClick={() => handleCopy(flyTomlCode, 'flytoml')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                {copiedSection === 'flytoml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSection === 'flytoml' ? 'Copied!' : 'Copy fly.toml'}
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {flyTomlCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
