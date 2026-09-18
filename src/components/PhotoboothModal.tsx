import React, { useState, useEffect, useRef } from 'react';
import { PhotoboothTheme, PhotoboothShot, UserRole } from '../types';
import {
  X,
  Camera,
  Film,
  Heart,
  Sparkles,
  Download,
  Clapperboard,
  Ticket,
  Check,
  RefreshCw,
  Share2,
  Sliders,
  Image as ImageIcon,
  Flame,
  Volume2,
} from 'lucide-react';
// Costume Props definitions
export type CostumeProp = 'none' | 'helmet' | 'coat' | 'glasses3d' | 'visor' | 'astronaut' | 'crown' | 'sunglasses';

interface CostumeOption {
  id: CostumeProp;
  name: string;
  icon: string;
  category: string;
}

const COSTUME_OPTIONS: CostumeOption[] = [
  { id: 'none', name: 'No Prop', icon: '✨', category: 'Clean' },
  { id: 'helmet', name: 'Action Helmet 🪖', icon: '🪖', category: 'Action' },
  { id: 'coat', name: 'Action Coat 🧥', icon: '🧥', category: 'Action' },
  { id: 'glasses3d', name: '3D Glasses 🥽', icon: '🥽', category: 'Theatre' },
  { id: 'visor', name: 'Cyber Visor ⚡', icon: '⚡', category: 'Sci-Fi' },
  { id: 'astronaut', name: 'Astro Helmet 🧑‍🚀', icon: '🧑‍🚀', category: 'Sci-Fi' },
  { id: 'crown', name: 'Hollywood Crown 👑', icon: '👑', category: 'Drama' },
  { id: 'sunglasses', name: 'Agent Glasses 🕶️', icon: '🕶️', category: 'Action' },
];

interface PhotoboothModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  peerConnected: boolean;
  wsRef: React.RefObject<WebSocket | null>;
  roomId: string;
  movieTitleDefault?: string;
}

export const PhotoboothModal: React.FC<PhotoboothModalProps> = ({
  isOpen,
  onClose,
  role,
  peerConnected,
  wsRef,
  roomId,
  movieTitleDefault = 'Our Movie Date Night',
}) => {
  const [theme, setTheme] = useState<PhotoboothTheme>('classic-theatre');
  const [selectedProp, setSelectedProp] = useState<CostumeProp>('helmet');
  const [movieTitle, setMovieTitle] = useState(movieTitleDefault);
  const [dateStamp, setDateStamp] = useState(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  
  // Camera state
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);

  // Photobooth captured shots (up to 3 shots)
  const [shots, setShots] = useState<PhotoboothShot[]>([]);
  const [peerLatestSnapshot, setPeerLatestSnapshot] = useState<string | null>(null);

  // Sticker toggles
  const [showPopcorn, setShowPopcorn] = useState(true);
  const [showClapper, setShowClapper] = useState(true);
  const [showHearts, setShowHearts] = useState(true);

  // Canvas ref for exporting photo strip
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Listen to peer snapshots over WebSocket
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'photobooth-snapshot' && msg.fromRole !== role) {
          setPeerLatestSnapshot(msg.imageBase64);
        }
      } catch (err) {
        // ignore non-json
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [wsRef, role]);

  // Start Webcam when modal opens
  useEffect(() => {
    if (isOpen) {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [isOpen]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      setWebcamStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam permission denied or unavailable for photobooth:', err);
      setCameraActive(false);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setCameraActive(false);
  };

  // Re-attach stream to video element if it changes
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  // Capture a single shot snapshot
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally for natural mirror selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset transform for drawing overlays
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Bake Costume Overlay Props onto Canvas Snapshot
    const cw = canvas.width;
    const ch = canvas.height;

    if (selectedProp === 'helmet') {
      // Action Pilot/Tactical Helmet
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cw / 2, ch * 0.28, cw * 0.22, Math.PI, 0, false);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;
      ctx.stroke();
      // Visor
      ctx.fillStyle = 'rgba(14, 165, 233, 0.6)';
      ctx.beginPath();
      ctx.ellipse(cw / 2, ch * 0.28, cw * 0.16, ch * 0.08, 0, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (selectedProp === 'coat') {
      // Action Leather Coat / Shoulders
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cw * 0.05, ch);
      ctx.lineTo(cw * 0.25, ch * 0.62);
      ctx.lineTo(cw * 0.4, ch * 0.72);
      ctx.lineTo(cw * 0.5, ch * 0.82);
      ctx.lineTo(cw * 0.6, ch * 0.72);
      ctx.lineTo(cw * 0.75, ch * 0.62);
      ctx.lineTo(cw * 0.95, ch);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 5;
      ctx.stroke();
      // Coat Collar Lapels
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(cw * 0.25, ch * 0.62);
      ctx.lineTo(cw * 0.35, ch * 0.85);
      ctx.lineTo(cw * 0.42, ch * 0.75);
      ctx.fill();
    } else if (selectedProp === 'glasses3d') {
      // 3D Movie Glasses
      const eyeY = ch * 0.38;
      ctx.fillStyle = '#000000';
      ctx.fillRect(cw / 2 - cw * 0.18, eyeY - ch * 0.04, cw * 0.36, ch * 0.08);
      // Red lens left, Blue lens right
      ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.fillRect(cw / 2 - cw * 0.16, eyeY - ch * 0.03, cw * 0.14, ch * 0.06);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.75)';
      ctx.fillRect(cw / 2 + cw * 0.02, eyeY - ch * 0.03, cw * 0.14, ch * 0.06);
    } else if (selectedProp === 'visor') {
      // Cyberpunk Visor
      const visorY = ch * 0.36;
      ctx.fillStyle = 'rgba(236, 72, 153, 0.8)';
      ctx.fillRect(cw / 2 - cw * 0.22, visorY, cw * 0.44, ch * 0.07);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.strokeRect(cw / 2 - cw * 0.22, visorY, cw * 0.44, ch * 0.07);
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('ACTION MODE // ONLINE', cw / 2 - 60, visorY + 14);
    } else if (selectedProp === 'crown') {
      // Hollywood Crown
      const crownY = ch * 0.15;
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(cw / 2 - cw * 0.15, crownY + ch * 0.08);
      ctx.lineTo(cw / 2 - cw * 0.15, crownY);
      ctx.lineTo(cw / 2 - cw * 0.07, crownY + ch * 0.04);
      ctx.lineTo(cw / 2, crownY - ch * 0.02);
      ctx.lineTo(cw / 2 + cw * 0.07, crownY + ch * 0.04);
      ctx.lineTo(cw / 2 + cw * 0.15, crownY);
      ctx.lineTo(cw / 2 + cw * 0.15, crownY + ch * 0.08);
      ctx.closePath();
      ctx.fill();
    } else if (selectedProp === 'sunglasses') {
      // Agent Sunglasses
      const sgY = ch * 0.38;
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(cw / 2 - cw * 0.18, sgY, cw * 0.16, ch * 0.07, 8);
      ctx.roundRect(cw / 2 + cw * 0.02, sgY, cw * 0.16, ch * 0.07, 8);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

    // Broadcast to peer if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && peerConnected) {
      wsRef.current.send(
        JSON.stringify({
          type: 'photobooth-snapshot',
          fromRole: role,
          roomId,
          imageBase64,
        })
      );
    }

    const newShot: PhotoboothShot = {
      id: Date.now().toString(),
      localImage: imageBase64,
      peerImage: peerLatestSnapshot || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setShots((prev) => [...prev.slice(-2), newShot]); // Keep up to 3 shots
  };

  // 3-2-1 Countdown Trigger
  const triggerCountdownCapture = () => {
    if (shots.length >= 3) {
      setShots([]); // Reset if max reached
    }
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setFlashActive(true);
          setTimeout(() => setFlashActive(false), 250);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Render & Download Full Photo Strip Canvas
  const exportPhotoStrip = () => {
    if (shots.length === 0) return;

    const canvas = canvasRef.current || document.createElement('canvas');
    const stripWidth = 600;
    const singleHeight = 360;
    const headerHeight = 110;
    const footerHeight = 120;
    const padding = 20;

    const totalShots = shots.length;
    const stripHeight = headerHeight + totalShots * (singleHeight + padding) + footerHeight;

    canvas.width = stripWidth;
    canvas.height = stripHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply Background Theme Colors
    if (theme === 'cinema-noir') {
      ctx.fillStyle = '#111827';
    } else if (theme === 'neon-cyberpunk') {
      ctx.fillStyle = '#090d16';
    } else if (theme === 'classic-theatre') {
      ctx.fillStyle = '#450a0a'; // Deep red velvet
    } else if (theme === 'sunset-romance') {
      ctx.fillStyle = '#2e1065'; // Purple sunset
    } else if (theme === 'hollywood-gold') {
      ctx.fillStyle = '#1c1917'; // Dark charcoal gold
    }
    ctx.fillRect(0, 0, stripWidth, stripHeight);

    // Decorative Borders
    ctx.lineWidth = 4;
    if (theme === 'classic-theatre') {
      ctx.strokeStyle = '#eab308'; // Gold border
    } else if (theme === 'neon-cyberpunk') {
      ctx.strokeStyle = '#06b6d4'; // Cyan neon
    } else {
      ctx.strokeStyle = '#374151';
    }
    ctx.strokeRect(12, 12, stripWidth - 24, stripHeight - 24);

    // Header Title Text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`🎬 ${movieTitle.toUpperCase()} 🍿`, stripWidth / 2, 50);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = theme === 'classic-theatre' ? '#fde047' : '#9ca3af';
    ctx.fillText(`Couples Theatre Date • ${dateStamp}`, stripWidth / 2, 80);

    // Draw Captured Photos
    let currentY = headerHeight;

    const loadAndDrawImage = (src: string, x: number, y: number, w: number, h: number): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.save();
          // Filter effects
          if (theme === 'cinema-noir') {
            ctx.filter = 'grayscale(100%) contrast(120%)';
          } else if (theme === 'neon-cyberpunk') {
            ctx.filter = 'hue-rotate(180deg) saturate(140%)';
          } else if (theme === 'sunset-romance') {
            ctx.filter = 'sepia(30%) saturate(130%)';
          }
          ctx.drawImage(img, x, y, w, h);
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      });
    };

    const drawAllShots = async () => {
      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        const photoY = currentY;

        if (shot.peerImage) {
          // Dual view (Local + Peer side by side)
          const halfW = (stripWidth - padding * 3) / 2;
          await loadAndDrawImage(shot.localImage, padding, photoY, halfW, singleHeight);
          await loadAndDrawImage(shot.peerImage, padding * 2 + halfW, photoY, halfW, singleHeight);
        } else {
          // Single local photo centered
          const photoW = stripWidth - padding * 2;
          await loadAndDrawImage(shot.localImage, padding, photoY, photoW, singleHeight);
        }

        // Frame border around each photo box
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(padding, photoY, stripWidth - padding * 2, singleHeight);

        currentY += singleHeight + padding;
      }

      // Draw Footer & Movie Ticket Details
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('🎟️ ADMIT TWO • SEAT A1 & A2 • STREAMSYNC P2P', stripWidth / 2, currentY + 45);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('Sub-100ms Low-Latency Screen Share Date Memories', stripWidth / 2, currentY + 75);

      // Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `movie-date-photobooth-${Date.now()}.png`;
      a.click();
    };

    drawAllShots();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-slate-950/90 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/10 border border-red-500/20 text-red-400 rounded-2xl">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Couples Movie Date Photobooth ❤️🍿
              </h3>
              <p className="text-xs text-slate-400">
                Capture romantic movie night memories with 1080p cinema frames & custom effects
              </p>
            </div>
          </div>
          <button
            id="btn-close-photobooth"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[82vh] overflow-y-auto">
          {/* Left Column: Live Camera & Snapshots Stage */}
          <div className="lg:col-span-7 space-y-4">
            {/* Camera Viewfinder Box */}
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center group">
              {/* Flash animation */}
              {flashActive && <div className="absolute inset-0 bg-white z-30 animate-ping" />}

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-slate-950/70 z-20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-7xl font-black text-cyan-400 animate-bounce">{countdown}</span>
                </div>
              )}

              {cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover -scale-x-100 ${
                    theme === 'cinema-noir'
                      ? 'grayscale contrast-125'
                      : theme === 'neon-cyberpunk'
                      ? 'hue-rotate-180 saturate-150'
                      : theme === 'sunset-romance'
                      ? 'sepia-50 saturate-125'
                      : ''
                  }`}
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">Webcam loading or unavailable...</p>
                  <button
                    onClick={startWebcam}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-xl font-semibold"
                  >
                    Enable Camera
                  </button>
                </div>
              )}

              {/* Live Theme Frame Watermark */}
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-xl text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 pointer-events-none">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="capitalize">{theme.replace('-', ' ')} Filter</span>
              </div>

              {/* Live Prop Costume Overlays on Viewfinder */}
              {selectedProp === 'helmet' && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none z-10 flex flex-col items-center">
                  <div className="bg-slate-800/90 text-slate-100 border border-slate-600 px-4 py-1.5 rounded-t-full text-xl font-bold shadow-2xl flex items-center gap-1.5 animate-pulse">
                    🪖 <span className="text-xs font-bold text-amber-300">TACTICAL ACTION HELMET</span>
                  </div>
                </div>
              )}
              {selectedProp === 'coat' && (
                <div className="absolute bottom-0 inset-x-0 pointer-events-none z-10 flex justify-center">
                  <div className="bg-slate-950/80 border-t-2 border-slate-600 px-8 py-3 rounded-t-3xl text-xs font-bold text-slate-200 flex items-center gap-2 shadow-2xl backdrop-blur-sm">
                    🧥 <span className="text-pink-300">ACTION LEATHER TRENCH COAT OVERLAY</span>
                  </div>
                </div>
              )}
              {selectedProp === 'glasses3d' && (
                <div className="absolute top-[32%] left-1/2 -translate-x-1/2 pointer-events-none z-10">
                  <div className="bg-black/90 border-2 border-red-500/80 px-5 py-2 rounded-2xl flex items-center gap-2 shadow-2xl">
                    <span className="w-5 h-4 bg-red-500/80 rounded" />
                    <span className="text-xs font-extrabold text-white">3D GLASSES</span>
                    <span className="w-5 h-4 bg-cyan-400/80 rounded" />
                  </div>
                </div>
              )}
              {selectedProp === 'visor' && (
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 pointer-events-none z-10">
                  <div className="bg-pink-600/80 border-2 border-cyan-400 px-6 py-1.5 rounded-xl text-xs font-mono font-bold text-cyan-200 shadow-cyan-500/50 shadow-lg tracking-wider">
                    ⚡ CYBER VISOR ACTIVE
                  </div>
                </div>
              )}
              {selectedProp === 'crown' && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-10 text-3xl animate-bounce">
                  👑
                </div>
              )}
              {selectedProp === 'sunglasses' && (
                <div className="absolute top-[35%] left-1/2 -translate-x-1/2 pointer-events-none z-10 bg-black/90 border border-slate-700 px-5 py-2 rounded-2xl text-xs font-bold text-slate-200">
                  🕶️ SECRET AGENT
                </div>
              )}
            </div>

            {/* Shutter Action Controls */}
            <div className="flex items-center gap-3">
              <button
                id="btn-take-shot"
                onClick={triggerCountdownCapture}
                disabled={countdown !== null}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                {countdown !== null ? 'Taking Photo...' : 'Snap Date Photo (3s Timer)'}
              </button>

              {shots.length > 0 && (
                <button
                  id="btn-clear-shots"
                  onClick={() => setShots([])}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Reset ({shots.length}/3)
                </button>
              )}
            </div>

            {/* Captured Photo Strip Thumbnails */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Captured Strip Frames ({shots.length}/3 Shots taken)
              </label>
              {shots.length === 0 ? (
                <div className="bg-slate-950 border border-dashed border-slate-800 p-6 rounded-2xl text-center text-xs text-slate-500">
                  No photos captured yet. Click "Snap Date Photo" to add your 1st frame!
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {shots.map((s, idx) => (
                    <div key={s.id} className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700 group shadow-md">
                      <img src={s.localImage} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 bg-slate-900/90 text-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Theme Selector, Movie Details & Export */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-pink-400" /> Photobooth Theme & Customization
                </h4>
              </div>

              {/* Custom Movie Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Movie / Date Title</label>
                <input
                  type="text"
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                  placeholder="e.g. Late Night Interstellar Date"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:border-pink-500 focus:outline-none"
                />
              </div>

              {/* Costume / Movie Prop Overlay Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300 block flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Virtual Action Costume Props (Wearables)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COSTUME_OPTIONS.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => setSelectedProp(prop.id)}
                      className={`p-2 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2 ${
                        selectedProp === prop.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-base">{prop.icon}</span>
                      <span className="truncate">{prop.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Cinema Photo Strip Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'classic-theatre', name: 'Velvet Theatre 🍿', border: 'border-amber-500/50' },
                    { id: 'cinema-noir', name: 'Cinema Noir 🎬', border: 'border-slate-500' },
                    { id: 'neon-cyberpunk', name: 'Neon Cyberpunk ⚡', border: 'border-cyan-500' },
                    { id: 'sunset-romance', name: 'Sunset Romance ❤️', border: 'border-purple-500' },
                    { id: 'hollywood-gold', name: 'Hollywood Gold 🏆', border: 'border-yellow-500' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as PhotoboothTheme)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                        theme === t.id
                          ? 'bg-pink-600/20 border-pink-500 text-pink-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sticker Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300 block">Date Night Watermark Stickers</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowPopcorn(!showPopcorn)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      showPopcorn ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    🍿 Popcorn
                  </button>
                  <button
                    onClick={() => setShowClapper(!showClapper)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      showClapper ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    🎬 Clapperboard
                  </button>
                  <button
                    onClick={() => setShowHearts(!showHearts)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      showHearts ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    ❤️ Hearts
                  </button>
                </div>
              </div>
            </div>

            {/* Export & Download Button */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                id="btn-export-photostrip"
                onClick={exportPhotoStrip}
                disabled={shots.length === 0}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Download Movie Date Photo Strip (PNG)
              </button>
              <p className="text-[10px] text-slate-500 text-center">
                Generates a high-res printable 600px vertical photo strip memory!
              </p>
            </div>
          </div>
        </div>

        {/* Hidden Canvas for Export */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
