import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Headphones, Play, Pause, Download, RotateCcw, 
  Sparkles, Sliders, Volume2, Orbit, Loader2, Check 
} from 'lucide-react';
import { SunoTrack, UserSettings, Spatial8DSettings } from '../types';
import { createSpatial8DChain, renderSpatial8DBuffer } from '../utils/spatialAudio';
import { audioBufferToWavBlob, triggerFileDownload } from '../utils/audioConverter';

interface Spatial8DAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: SunoTrack | null;
  settings: UserSettings;
}

export const Spatial8DAudioModal: React.FC<Spatial8DAudioModalProps> = ({
  isOpen,
  onClose,
  track,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [spatialSettings, setSpatialSettings] = useState<Spatial8DSettings>({
    speedSeconds: 12,
    reverbAmount: 0.35,
    stereoWidth: 1.0,
    roomSize: 'medium',
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const chainRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentAngleRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen || !track) {
      cleanup();
      return;
    }

    setupAudio();

    return () => {
      cleanup();
    };
  }, [isOpen, track?.id]);

  // Handle visualizer orbit loop
  useEffect(() => {
    if (!isOpen) return;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - 30;

      ctx.clearRect(0, 0, width, height);

      // Draw outer orbit ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw listener head in center
      ctx.beginPath();
      ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
      ctx.fillStyle = '#18181b';
      ctx.fill();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Headphone icons / ear indicators on listener
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(centerX - 28, centerY - 6, 6, 12);
      ctx.fillRect(centerX + 22, centerY - 6, 6, 12);

      // Calculate orbiter position
      let angle = currentAngleRef.current;
      if (isPlaying) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        angle = (elapsed / spatialSettings.speedSeconds) * Math.PI * 2;
        currentAngleRef.current = angle;

        if (chainRef.current) {
          chainRef.current.updatePosition(angle);
        }
      }

      const orbiterX = centerX + Math.sin(angle) * radius;
      const orbiterY = centerY - Math.cos(angle) * radius; // 0 is top

      // Glow behind orbiter
      const glow = ctx.createRadialGradient(orbiterX, orbiterY, 2, orbiterX, orbiterY, 20);
      glow.addColorStop(0, 'rgba(236, 72, 153, 0.8)');
      glow.addColorStop(1, 'rgba(236, 72, 153, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(orbiterX, orbiterY, 20, 0, Math.PI * 2);
      ctx.fill();

      // Sound Orbiter
      ctx.beginPath();
      ctx.arc(orbiterX, orbiterY, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#ec4899';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isPlaying, spatialSettings.speedSeconds]);

  const cleanup = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  };

  const setupAudio = () => {
    if (!track) return;
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = track.id ? `/api/suno/stream/${track.id}.mp3` : track.audio_url;
    audioElementRef.current = audio;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    audioContextRef.current = ctx;

    const srcNode = ctx.createMediaElementSource(audio);
    const chain = createSpatial8DChain(ctx, spatialSettings);
    chainRef.current = chain;

    srcNode.connect(chain.input);
    chain.output.connect(ctx.destination);

    audio.onended = () => setIsPlaying(false);
  };

  const togglePlay = async () => {
    if (!audioElementRef.current || !audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      startTimeRef.current = Date.now();
      audioElementRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleExport8D = async () => {
    if (!track) return;
    try {
      setIsExporting(true);
      setExportProgress(10);

      const targetUrl = track.id ? `/api/suno/stream/${track.id}.mp3` : track.audio_url;
      const res = await fetch(targetUrl);
      const arrayBuffer = await res.arrayBuffer();

      setExportProgress(35);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const offlineTempCtx = new AudioCtx();
      const decodedBuffer = await offlineTempCtx.decodeAudioData(arrayBuffer);

      setExportProgress(60);
      const rendered8D = await renderSpatial8DBuffer(decodedBuffer, spatialSettings, (p) => {
        setExportProgress(60 + p * 0.3);
      });

      const wavBlob = audioBufferToWavBlob(rendered8D, '24-bit');
      const safeTitle = track.title.replace(/[/\\?%*:|"<>]/g, '_');
      triggerFileDownload(wavBlob, `${track.artist} - ${safeTitle} (8D Spatial Audio).wav`);

      setIsExporting(false);
      setExportProgress(100);
    } catch (err: any) {
      alert(`8D Render error: ${err.message}`);
      setIsExporting(false);
    }
  };

  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] sm:max-h-[88vh] bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Orbit className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                <span>3D Spatial & 8D Audio Maker</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Headphone Immersive
                </span>
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-md">
                {track.title} &bull; 360° Circular Binaural Panning
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visualizer & Controls */}
        <div className="p-4 sm:p-6 space-y-5 flex flex-col items-center flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Headphone Advice Banner */}
          <div className="w-full flex items-center gap-3 p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-purple-200 text-xs shrink-0">
            <Headphones className="w-5 h-5 text-purple-400 shrink-0" />
            <span>
              <strong>Wear Headphones for best experience!</strong> 8D audio rotates around your head in 360° spatial coordinates.
            </span>
          </div>

          {/* 360 Orbit Canvas */}
          <div className="relative flex items-center justify-center shrink-0">
            <canvas
              ref={canvasRef}
              width={260}
              height={260}
              className="rounded-full bg-neutral-900/80 border border-neutral-800 shadow-inner"
            />
            <div className="absolute bottom-2 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
              360° Soundstage
            </div>
          </div>

          {/* Controls Sliders */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Speed slider */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-neutral-300">
                <span>Rotation Period (Speed)</span>
                <span className="text-purple-400">{spatialSettings.speedSeconds}s / 360°</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={spatialSettings.speedSeconds}
                onChange={(e) => setSpatialSettings({ ...spatialSettings, speedSeconds: parseInt(e.target.value) })}
                className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>Fast (5s)</span>
                <span>Hypnotic (25s)</span>
              </div>
            </div>

            {/* Room Reverb slider */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-neutral-300">
                <span>Acoustic Room Atmosphere</span>
                <span className="text-purple-400">{Math.round(spatialSettings.reverbAmount * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={spatialSettings.reverbAmount}
                onChange={(e) => setSpatialSettings({ ...spatialSettings, reverbAmount: parseFloat(e.target.value) })}
                className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>Dry Studio</span>
                <span>Concert Hall</span>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Bar */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-900/95 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={togglePlay}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all active:scale-98 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            <span>{isPlaying ? 'Pause 8D' : 'Experience 8D Live'}</span>
          </button>

          <button
            onClick={handleExport8D}
            disabled={isExporting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Download className="w-4 h-4 text-purple-400" />}
            <span>{isExporting ? `Rendering 8D (${Math.round(exportProgress)}%)...` : 'Download 8D Audio (WAV)'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
