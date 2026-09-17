import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Video, Download, Play, Pause, Sparkles, Layers, Sliders, 
  Check, Loader2, Disc, Eye, Share2, Music2, RotateCw
} from 'lucide-react';
import { SunoTrack, UserSettings, VideoVisualizerStyle, VideoAspect } from '../types';
import { triggerFileDownload } from '../utils/audioConverter';

interface SocialVideoMakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: SunoTrack | null;
  settings: UserSettings;
}

export const SocialVideoMakerModal: React.FC<SocialVideoMakerModalProps> = ({
  isOpen,
  onClose,
  track,
  settings,
}) => {
  const [visualStyle, setVisualStyle] = useState<VideoVisualizerStyle>('bars');
  const [aspect, setAspect] = useState<VideoAspect>('9:16');
  const [showLyrics, setShowLyrics] = useState(true);
  const [showBpmBadge, setShowBpmBadge] = useState(true);
  const [accentColor, setAccentColor] = useState('#ff2d55'); // default Suno red/pink

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const coverImageRef = useRef<HTMLImageElement | null>(null);

  // Initialize Canvas & Audio Engine
  useEffect(() => {
    if (!isOpen || !track) {
      stopVideoPreview();
      return;
    }

    // Load cover image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = track.image_url;
    img.onload = () => {
      coverImageRef.current = img;
    };

    // Setup audio element
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = track.id ? `/api/suno/stream/${track.id}.mp3` : track.audio_url;
    audioElementRef.current = audio;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    audioContextRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyserRef.current = analyser;

    try {
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (e) {
      // ignore if already connected
    }

    startAnimationLoop();

    return () => {
      stopVideoPreview();
    };
  }, [isOpen, track?.id]);

  const stopVideoPreview = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const togglePreviewPlay = () => {
    if (!audioElementRef.current || !audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Canvas 60 FPS Render Loop
  const startAnimationLoop = () => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear background with dark gradient
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, width, height);

      // Radial background glow based on accent color
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.7);
      bgGrad.addColorStop(0, `${accentColor}25`);
      bgGrad.addColorStop(1, '#0a0a0c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Get frequency data
      let freqData = new Uint8Array(64);
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqData);
      } else {
        // Fallback pulsing animation
        for (let i = 0; i < 64; i++) {
          freqData[i] = isPlaying ? Math.floor(40 + Math.sin(Date.now() * 0.005 + i) * 35) : 15;
        }
      }

      const cover = coverImageRef.current;
      const coverSize = Math.min(width, height) * (aspect === '9:16' ? 0.65 : 0.45);
      const coverX = (width - coverSize) / 2;
      const coverY = aspect === '9:16' ? height * 0.22 : (height - coverSize) / 2 - 40;

      // 1. Render Visualizer based on style
      if (visualStyle === 'bars') {
        // Spectrum Bars
        const numBars = 32;
        const barWidth = (width * 0.8) / numBars;
        const barBaseY = aspect === '9:16' ? height * 0.72 : height * 0.82;

        for (let i = 0; i < numBars; i++) {
          const val = freqData[i % freqData.length] / 255;
          const barHeight = Math.max(6, val * 120);
          const x = width * 0.1 + i * barWidth;

          const barGrad = ctx.createLinearGradient(0, barBaseY, 0, barBaseY - barHeight);
          barGrad.addColorStop(0, accentColor);
          barGrad.addColorStop(1, '#ffffff');

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(x + 2, barBaseY - barHeight, barWidth - 4, barHeight, 4);
          ctx.fill();
        }
      } else if (visualStyle === 'radial') {
        // Radial Circular Spectrum
        const centerX = width / 2;
        const centerY = coverY + coverSize / 2;
        const radius = coverSize / 2 + 15;
        const numPoints = 48;

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;

        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const val = freqData[i % freqData.length] / 255;
          const len = 8 + val * 65;

          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + len);
          const y2 = centerY + Math.sin(angle) * (radius + len);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (visualStyle === 'particles') {
        // Floating audio-reactive particle bubbles
        const time = Date.now() * 0.002;
        for (let i = 0; i < 24; i++) {
          const pAngle = i * (Math.PI / 12) + time * 0.3;
          const dist = 100 + ((i * 17) % 180) + (freqData[i % 30] / 255) * 60;
          const px = width / 2 + Math.cos(pAngle) * dist;
          const py = height / 2 + Math.sin(pAngle) * dist;
          const pSize = 3 + ((i * 5) % 8) + (freqData[i] / 255) * 6;

          ctx.fillStyle = `${accentColor}88`;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw Cover Artwork with rounded corners
      if (cover) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(coverX, coverY, coverSize, coverSize, 24);
        ctx.clip();
        ctx.drawImage(cover, coverX, coverY, coverSize, coverSize);
        ctx.restore();

        // Subtle cover border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(coverX, coverY, coverSize, coverSize, 24);
        ctx.stroke();
      }

      // 3. Draw Track Title & Artist Typography
      if (track) {
        ctx.textAlign = 'center';
        
        const titleY = aspect === '9:16' ? height * 0.60 : height * 0.70;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Plus Jakarta Sans, sans-serif';
        ctx.fillText(track.title, width / 2, titleY);

        ctx.fillStyle = '#a3a3a3';
        ctx.font = '16px Plus Jakarta Sans, sans-serif';
        ctx.fillText(track.artist, width / 2, titleY + 30);

        // Suno AI Badge
        ctx.fillStyle = `${accentColor}33`;
        const badgeY = aspect === '9:16' ? height * 0.85 : height * 0.90;
        ctx.beginPath();
        ctx.roundRect(width / 2 - 75, badgeY - 18, 150, 32, 16);
        ctx.fill();

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
        ctx.fillText('♫ SUNO AI STUDIO', width / 2, badgeY + 2);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Record Canvas + Audio to MP4 / WebM
  const handleRecordAndExportVideo = async () => {
    if (!canvasRef.current || !track || isRecording) return;
    setIsRecording(true);
    setRecordProgress(0);

    try {
      const canvas = canvasRef.current;
      const canvasStream = canvas.captureStream(60);

      // Setup audio element for offline recording playback
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = track.id ? `/api/suno/stream/${track.id}.mp3` : track.audio_url;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createMediaElementSource(audio);
      const dest = ctx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(ctx.destination);

      // Combine Canvas video stream + WebAudio stream
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('video/mp4') 
        ? 'video/mp4' 
        : 'video/webm;codecs=vp9';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 8000000,
      });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      const recordDurationSec = Math.min(track.duration || 60, 30); // 30s social clip
      const interval = setInterval(() => {
        setRecordProgress((p) => Math.min(100, p + Math.round((100 / recordDurationSec))));
      }, 1000);

      recorder.onstop = () => {
        clearInterval(interval);
        const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const safeTitle = track.title.replace(/[/\\?%*:|"<>]/g, '_');
        triggerFileDownload(finalBlob, `${track.artist} - ${safeTitle} [Social Reel].${ext}`);
        setIsRecording(false);
        setRecordProgress(100);
      };

      recorder.start();
      audio.play();

      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          audio.pause();
        }
      }, recordDurationSec * 1000);

    } catch (err: any) {
      alert(`Video render failed: ${err.message}`);
      setIsRecording(false);
    }
  };

  if (!isOpen || !track) return null;

  // Aspect ratio canvas dimensions
  const canvasWidth = aspect === '9:16' ? 540 : aspect === '1:1' ? 600 : 720;
  const canvasHeight = aspect === '9:16' ? 960 : aspect === '1:1' ? 600 : 405;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 lg:p-6 bg-black/90 backdrop-blur-2xl animate-fadeIn">
      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] max-w-4xl bg-neutral-900 md:border border-neutral-800 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Sticky Header with Safe-Area Inset */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-3.5 sm:p-5 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-xl shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-500/20 to-pink-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                <span>Social Video & Waveform Reel</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  60 FPS
                </span>
              </h2>
              <p className="text-xs text-neutral-400 truncate">
                Generate animated dynamic visualizer videos for TikTok, Reels, Shorts & YouTube
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Video Maker"
            className="p-2 sm:p-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-all shrink-0 cursor-pointer shadow-md flex items-center justify-center border border-neutral-700 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 custom-scrollbar pb-[max(2rem,env(safe-area-inset-bottom))]">
          
          {/* Left: Canvas Live Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-neutral-950 p-4 rounded-xl border border-neutral-800 relative">
            <div className="relative max-h-[460px] flex items-center justify-center overflow-hidden rounded-lg shadow-2xl">
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="max-h-[440px] w-auto rounded-lg shadow-xl object-contain border border-neutral-800"
              />
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={togglePreviewPlay}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition-all border border-neutral-700"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                <span>{isPlaying ? 'Pause Preview' : 'Test Motion'}</span>
              </button>
              <span className="text-xs text-neutral-400">
                Canvas updates live with audio frequencies
              </span>
            </div>
          </div>

          {/* Right: Customization Controls */}
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            
            <div className="space-y-4">
              {/* Aspect Ratio */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Target Platform & Aspect
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '9:16' as VideoAspect, label: '9:16', sub: 'TikTok / Reels' },
                    { id: '1:1' as VideoAspect, label: '1:1', sub: 'Square Feed' },
                    { id: '16:9' as VideoAspect, label: '16:9', sub: 'YouTube' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setAspect(item.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        aspect === item.id
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                      <div className="text-[10px] text-neutral-400">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visualizer Style */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Waveform Spectrum Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bars' as VideoVisualizerStyle, label: 'Neon Bars', icon: Sliders },
                    { id: 'radial' as VideoVisualizerStyle, label: 'Radial Halo', icon: Disc },
                    { id: 'particles' as VideoVisualizerStyle, label: 'Star Particles', icon: Sparkles },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setVisualStyle(item.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                          visualStyle === item.id
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Palette */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Glow Accent Color
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { color: '#ff2d55', name: 'Suno Red' },
                    { color: '#8b5cf6', name: 'Cyber Purple' },
                    { color: '#06b6d4', name: 'Neon Cyan' },
                    { color: '#f59e0b', name: 'Gold Pulse' },
                    { color: '#10b981', name: 'Emerald' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      onClick={() => setAccentColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        accentColor === c.color ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Render Progress Indicator */}
            {isRecording && (
              <div className="p-4 bg-neutral-950 rounded-xl border border-rose-500/40 space-y-2">
                <div className="flex justify-between text-xs text-rose-400 font-bold">
                  <span>Rendering 60 FPS Video...</span>
                  <span>{recordProgress}%</span>
                </div>
                <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300 rounded-full"
                    style={{ width: `${recordProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Video Export Button */}
            <button
              onClick={handleRecordAndExportVideo}
              disabled={isRecording}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRecording ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Video Clip ({recordProgress}%)...</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Export Video ({aspect} Reel)</span>
                </>
              )}
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};
