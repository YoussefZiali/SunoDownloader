import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Layers, Play, Pause, RotateCcw, Download, Sparkles, 
  Sliders, Music, Disc, Loader2, Volume2, ArrowRightLeft 
} from 'lucide-react';
import { SunoTrack, UserSettings } from '../types';
import { INITIAL_TRACKS } from '../data/mockSunoData';
import { audioBufferToWavBlob, triggerFileDownload } from '../utils/audioConverter';

interface SongMashupRemixerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackA: SunoTrack | null;
  settings: UserSettings;
}

export const SongMashupRemixerModal: React.FC<SongMashupRemixerModalProps> = ({
  isOpen,
  onClose,
  trackA,
}) => {
  const [trackB, setTrackB] = useState<SunoTrack | null>(() => {
    return INITIAL_TRACKS.find((t) => t.id !== trackA?.id) || INITIAL_TRACKS[0] || null;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Mix parameters
  const [crossfader, setCrossfader] = useState(0.5); // 0 (Deck A only) to 1 (Deck B only)
  const [deckAMode, setDeckAMode] = useState<'full' | 'vocals' | 'inst'>('vocals');
  const [deckBMode, setDeckBMode] = useState<'full' | 'vocals' | 'inst'>('inst');
  const [tempoSync, setTempoSync] = useState(true);

  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopPlayback();
      return;
    }

    setupAudioElements();

    return () => {
      stopPlayback();
    };
  }, [isOpen, trackA?.id, trackB?.id]);

  // Adjust volumes according to crossfader
  useEffect(() => {
    if (audioARef.current && audioBRef.current) {
      const volA = Math.cos(crossfader * 0.5 * Math.PI);
      const volB = Math.sin(crossfader * 0.5 * Math.PI);
      audioARef.current.volume = Math.max(0, Math.min(1, volA));
      audioBRef.current.volume = Math.max(0, Math.min(1, volB));
    }
  }, [crossfader]);

  const stopPlayback = () => {
    if (audioARef.current) audioARef.current.pause();
    if (audioBRef.current) audioBRef.current.pause();
    setIsPlaying(false);
  };

  const setupAudioElements = () => {
    if (trackA) {
      const a = new Audio();
      a.crossOrigin = 'anonymous';
      a.src = trackA.id ? `/api/suno/stream/${trackA.id}.mp3` : trackA.audio_url;
      audioARef.current = a;
    }
    if (trackB) {
      const b = new Audio();
      b.crossOrigin = 'anonymous';
      b.src = trackB.id ? `/api/suno/stream/${trackB.id}.mp3` : trackB.audio_url;
      audioBRef.current = b;
    }
  };

  const togglePlay = () => {
    if (!audioARef.current || !audioBRef.current) return;

    if (isPlaying) {
      audioARef.current.pause();
      audioBRef.current.pause();
      setIsPlaying(false);
    } else {
      audioARef.current.currentTime = 0;
      audioBRef.current.currentTime = 0;
      audioARef.current.play().catch(() => {});
      audioBRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleExportMashup = async () => {
    if (!trackA || !trackB) return;
    try {
      setIsExporting(true);
      const urlA = trackA.id ? `/api/suno/stream/${trackA.id}.mp3` : trackA.audio_url;
      const urlB = trackB.id ? `/api/suno/stream/${trackB.id}.mp3` : trackB.audio_url;

      const [resA, resB] = await Promise.all([fetch(urlA), fetch(urlB)]);
      const [bufA, bufB] = await Promise.all([resA.arrayBuffer(), resB.arrayBuffer()]);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();

      const [decA, decB] = await Promise.all([
        ctx.decodeAudioData(bufA),
        ctx.decodeAudioData(bufB),
      ]);

      const renderLength = Math.max(decA.length, decB.length);
      const offline = new OfflineAudioContext(2, renderLength, decA.sampleRate);

      const srcA = offline.createBufferSource();
      srcA.buffer = decA;
      const gainA = offline.createGain();
      gainA.gain.value = Math.cos(crossfader * 0.5 * Math.PI);
      srcA.connect(gainA);
      gainA.connect(offline.destination);

      const srcB = offline.createBufferSource();
      srcB.buffer = decB;
      const gainB = offline.createGain();
      gainB.gain.value = Math.sin(crossfader * 0.5 * Math.PI);
      srcB.connect(gainB);
      gainB.connect(offline.destination);

      srcA.start(0);
      srcB.start(0);

      const renderedBuffer = await offline.startRendering();
      const wavBlob = audioBufferToWavBlob(renderedBuffer, '24-bit');

      const safeA = trackA.title.replace(/[/\\?%*:|"<>]/g, '_');
      const safeB = trackB.title.replace(/[/\\?%*:|"<>]/g, '_');
      triggerFileDownload(wavBlob, `AI Mashup - ${safeA} x ${safeB}.wav`);

      setIsExporting(false);
    } catch (err: any) {
      alert(`Mashup Export error: ${err.message}`);
      setIsExporting(false);
    }
  };

  if (!isOpen || !trackA) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[85vh] sm:max-h-[88vh] bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                <span>AI Mashup & Stem Remixer</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Dual Deck
                </span>
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-md">
                Blend Vocals & Instrumentals from two Suno tracks in real time
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

        {/* Dual Decks Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* DECK A */}
            <div className="p-5 rounded-2xl bg-neutral-900/70 border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-cyan-400 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                  Deck A (Primary)
                </span>
                <span className="text-[10px] text-neutral-400">{trackA.tags?.slice(0, 25)}</span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={trackA.image_url || '/placeholder.png'}
                  alt={trackA.title}
                  className="w-14 h-14 rounded-xl object-cover border border-neutral-700"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">{trackA.title}</h4>
                  <p className="text-xs text-neutral-400 truncate">{trackA.artist}</p>
                </div>
              </div>

              {/* Stem selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase">Stem Mode</label>
                <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                  {(['vocals', 'inst', 'full'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDeckAMode(mode)}
                      className={`py-1 text-xs font-bold rounded-lg uppercase transition-all ${
                        deckAMode === mode ? 'bg-cyan-500 text-black' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DECK B */}
            <div className="p-5 rounded-2xl bg-neutral-900/70 border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-purple-400 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                  Deck B (Remix Target)
                </span>
                
                {/* Select track B dropdown */}
                <select
                  value={trackB?.id || ''}
                  onChange={(e) => {
                    const found = INITIAL_TRACKS.find((t) => t.id === e.target.value);
                    if (found) setTrackB(found);
                  }}
                  className="bg-neutral-950 text-xs text-purple-300 font-medium px-2 py-1 rounded-lg border border-purple-500/30"
                >
                  {INITIAL_TRACKS.map((t) => (
                    <option key={t.id} value={t.id}>{t.title.slice(0, 20)}</option>
                  ))}
                </select>
              </div>

              {trackB && (
                <div className="flex items-center gap-3">
                  <img
                    src={trackB.image_url || '/placeholder.png'}
                    alt={trackB.title}
                    className="w-14 h-14 rounded-xl object-cover border border-neutral-700"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">{trackB.title}</h4>
                    <p className="text-xs text-neutral-400 truncate">{trackB.artist}</p>
                  </div>
                </div>
              )}

              {/* Stem selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase">Stem Mode</label>
                <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                  {(['vocals', 'inst', 'full'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDeckBMode(mode)}
                      className={`py-1 text-xs font-bold rounded-lg uppercase transition-all ${
                        deckBMode === mode ? 'bg-purple-500 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Crossfader Section */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4 text-center">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-cyan-400">Deck A ({Math.round((1 - crossfader) * 100)}%)</span>
              <span className="text-neutral-400 uppercase tracking-widest text-[10px]">Crossfader</span>
              <span className="text-purple-400">Deck B ({Math.round(crossfader * 100)}%)</span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={crossfader}
              onChange={(e) => setCrossfader(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-neutral-950 rounded-lg cursor-pointer"
            />

            <div className="flex justify-center gap-2">
              <button
                onClick={() => setCrossfader(0)}
                className="px-3 py-1 rounded-lg text-[10px] font-bold bg-neutral-800 text-neutral-300 hover:text-white"
              >
                100% Deck A
              </button>
              <button
                onClick={() => setCrossfader(0.5)}
                className="px-3 py-1 rounded-lg text-[10px] font-bold bg-neutral-800 text-neutral-300 hover:text-white"
              >
                50 / 50 Center Mix
              </button>
              <button
                onClick={() => setCrossfader(1)}
                className="px-3 py-1 rounded-lg text-[10px] font-bold bg-neutral-800 text-neutral-300 hover:text-white"
              >
                100% Deck B
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-900/95 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={togglePlay}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all active:scale-98 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            <span>{isPlaying ? 'Pause Mashup' : 'Play Mashup Live'}</span>
          </button>

          <button
            onClick={handleExportMashup}
            disabled={isExporting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Download className="w-4 h-4 text-cyan-400" />}
            <span>{isExporting ? 'Exporting Mashup...' : 'Export Mashup (WAV)'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
