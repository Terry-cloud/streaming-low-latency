import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  Radio,
  Server,
  Zap,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  WifiOff,
  Globe,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';
import { ConnectionMode, UserRole } from '../types';

interface SignalingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  setRoomId: (id: string) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  connectionMode: ConnectionMode;
  setConnectionMode: (mode: ConnectionMode) => void;
  peerConnected: boolean;
  onJoinRoomWebSocket: (code: string) => void;
  manualOfferSdp: string;
  manualAnswerSdp: string;
  onGenerateManualOffer: () => void;
  onAcceptManualOfferAndGenerateAnswer: (offerSdp: string) => void;
  onAcceptManualAnswer: (answerSdp: string) => void;
}

export const SignalingModal: React.FC<SignalingModalProps> = ({
  isOpen,
  onClose,
  roomId,
  setRoomId,
  role,
  setRole,
  connectionMode,
  setConnectionMode,
  peerConnected,
  onJoinRoomWebSocket,
  manualOfferSdp,
  manualAnswerSdp,
  onGenerateManualOffer,
  onAcceptManualOfferAndGenerateAnswer,
  onAcceptManualAnswer,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Manual SDP text areas
  const [pastedOffer, setPastedOffer] = useState('');
  const [pastedAnswer, setPastedAnswer] = useState('');

  // Generate QR code for room URL
  useEffect(() => {
    if (roomId) {
      const roomUrl = `${window.location.origin}?room=${roomId}&role=viewer`;
      QRCode.toDataURL(roomUrl, { margin: 1, width: 220 })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [roomId]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const shareableUrl = `${window.location.origin}?room=${roomId || '123456'}&role=viewer`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-slate-950/80 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Pair Devices for P2P Screen Stream</h3>
              <p className="text-xs text-slate-400">
                Sub-100ms WebRTC connection pairing
              </p>
            </div>
          </div>
          <button
            id="btn-close-signaling"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              id="tab-mode-websocket"
              onClick={() => setConnectionMode('websocket')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                connectionMode === 'websocket'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-4 h-4" /> Mode 1: Auto Room Code / QR
            </button>
            <button
              id="tab-mode-manual"
              onClick={() => setConnectionMode('manual-p2p')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                connectionMode === 'manual-p2p'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <WifiOff className="w-4 h-4" /> Mode 2: Zero-Server Direct SDP
            </button>
          </div>

          {/* Mode 1: WebSocket Auto Room Code */}
          {connectionMode === 'websocket' && (
            <div className="space-y-5">
              {/* Room Code Display & QR */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Your Room Pairing Code
                  </span>
                  <div className="text-3xl font-mono font-extrabold text-cyan-400 tracking-widest">
                    {roomId || '123456'}
                  </div>
                </div>

                {/* QR Code */}
                {qrDataUrl && (
                  <div className="bg-white p-3 rounded-2xl inline-block shadow-lg mx-auto">
                    <img src={qrDataUrl} alt="Room QR Code" className="w-40 h-40" />
                  </div>
                )}

                <div className="text-xs text-slate-400">
                  Scan QR code with phone camera or open link on second device:
                </div>

                {/* Shareable Link Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
                  />
                  <button
                    id="btn-copy-share-url"
                    onClick={() => handleCopy(shareableUrl, 'link')}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {copiedField === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedField === 'link' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Or Join Existing Code */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  Or Join Existing Room Code
                </label>
                <div className="flex gap-2">
                  <input
                    id="input-room-code"
                    type="text"
                    placeholder="Enter 6-digit room code..."
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    id="btn-connect-code"
                    onClick={() => {
                      if (inputCode.trim()) {
                        setRoomId(inputCode.trim());
                        onJoinRoomWebSocket(inputCode.trim());
                      }
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                  >
                    Join <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Zero-Server Direct P2P Manual Exchange */}
          {connectionMode === 'manual-p2p' && (
            <div className="space-y-4">
              <div className="bg-cyan-950/40 border border-cyan-500/30 p-3 rounded-xl text-xs text-cyan-200">
                <strong>Zero-Server P2P Mode:</strong> Completely bypasses signaling servers. Copy and paste the WebRTC Offer & Answer tokens directly between devices.
              </div>

              {/* Step 1: Presenter Generates Offer */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">1. Presenter: Generate Offer Token</span>
                  <button
                    id="btn-gen-offer"
                    onClick={onGenerateManualOffer}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Generate Offer
                  </button>
                </div>

                {manualOfferSdp && (
                  <div className="space-y-1.5">
                    <textarea
                      readOnly
                      rows={3}
                      value={manualOfferSdp}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-cyan-300 resize-none focus:outline-none"
                    />
                    <button
                      id="btn-copy-offer"
                      onClick={() => handleCopy(manualOfferSdp, 'offer')}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      {copiedField === 'offer' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy Offer Token
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Viewer Accepts Offer & Generates Answer */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-200 block">2. Viewer: Paste Offer & Generate Answer</span>
                <textarea
                  id="textarea-paste-offer"
                  rows={2}
                  placeholder="Paste Presenter's Offer Token here..."
                  value={pastedOffer}
                  onChange={(e) => setPastedOffer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-slate-200 resize-none focus:outline-none"
                />
                <button
                  id="btn-accept-offer-gen-answer"
                  onClick={() => onAcceptManualOfferAndGenerateAnswer(pastedOffer)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Accept Offer & Generate Answer Token
                </button>

                {manualAnswerSdp && (
                  <div className="space-y-1.5 pt-2">
                    <textarea
                      readOnly
                      rows={2}
                      value={manualAnswerSdp}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-emerald-300 resize-none focus:outline-none"
                    />
                    <button
                      id="btn-copy-answer"
                      onClick={() => handleCopy(manualAnswerSdp, 'answer')}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      {copiedField === 'answer' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy Answer Token
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Presenter Accepts Answer */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-200 block">3. Presenter: Paste Answer Token & Start</span>
                <textarea
                  id="textarea-paste-answer"
                  rows={2}
                  placeholder="Paste Viewer's Answer Token here..."
                  value={pastedAnswer}
                  onChange={(e) => setPastedAnswer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-slate-200 resize-none focus:outline-none"
                />
                <button
                  id="btn-accept-answer"
                  onClick={() => onAcceptManualAnswer(pastedAnswer)}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Finalize Direct P2P Connection
                </button>
              </div>
            </div>
          )}

          {/* Connection Success Banner */}
          {peerConnected && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-2xl text-center text-xs font-semibold text-emerald-300 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>WebRTC Peer Connection Established! You can close this window.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
