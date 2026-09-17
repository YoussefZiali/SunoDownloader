import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Radio, Disc, Sparkles, Sliders, Mic, Orbit, Video, 
  Play, Pause, Download, Layers, Music, ArrowRight, Wand2, Activity,
  Volume2, VolumeX, RotateCcw, FastForward, Check, ChevronDown,
  Repeat, Zap, Headphones, ArrowRightLeft, Flame, Shuffle, RefreshCw, X
} from 'lucide-react';
import { SunoTrack } from '../types';
import { estimateMusicAttributes } from '../utils/musicAnalyzer';
import { audioBufferToWavBlob, triggerFileDownload } from '../utils/audioConverter';

interface DjCreativeSuiteViewProps {
  track: SunoTrack | null;
  allTracks: SunoTrack[];
  onOpenMashup: (track: SunoTrack) => void;
  onOpenAutoDj: (tracks: SunoTrack[]) => void;
  onOpenSpatial8D: (track: SunoTrack) => void;
  onOpenKaraoke: (track: SunoTrack) => void;
  onOpenVideoMaker: (track: SunoTrack) => void;
  onOpenPromptExtractor: (track: SunoTrack) => void;
  onOpenStudioDaw: (track: SunoTrack) => void;
}

type SuiteMode = 'decks' | 'autodj' | 'engines';
type MobileDeckView = 'deckA' | 'mixer' | 'deckB';

export const DjCreativeSuiteView: React.FC<DjCreativeSuiteViewProps> = ({
  track,
  allTracks,
  onOpenMashup,
  onOpenAutoDj,
  onOpenSpatial8D,
  onOpenKaraoke,
  onOpenVideoMaker,
  onOpenPromptExtractor,
  onOpenStudioDaw,
}) => {
  // Navigation mode within DJ suite
  const [suiteMode, setSuiteMode] = useState<SuiteMode>('decks');
  const [mobileDeckView, setMobileDeckView] = useState<MobileDeckView>('deckA');

  // Decks Track Selection
  const [trackA, setTrackA] = useState<SunoTrack>(() => track || allTracks[0] || {} as SunoTrack);
  const [trackB, setTrackB] = useState<SunoTrack>(() => {
    return allTracks.find((t) => t.id !== (track?.id || allTracks[0]?.id)) || allTracks[1] || allTracks[0] || {} as SunoTrack;
  });

  // Track Selector Modals
  const [selectingForDeck, setSelectingForDeck] = useState<'A' | 'B' | null>(null);

  // Playback & Mixing State
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [crossfader, setCrossfader] = useState(0.5); // 0 (Deck A) to 1 (Deck B)
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [deckAVolume, setDeckAVolume] = useState(1);
  const [deckBVolume, setDeckBVolume] = useState(1);
  const [pitchA, setPitchA] = useState(0); // -8 to +8 percent
  const [pitchB, setPitchB] = useState(0);
  const [filterA, setFilterA] = useState(0); // -100 (LP) to +100 (HP)
  const [filterB, setFilterB] = useState(0);
  const [stemModeA, setStemModeA] = useState<'full' | 'vocals' | 'inst'>('vocals');
  const [stemModeB, setStemModeB] = useState<'full' | 'vocals' | 'inst'>('inst');
  const [tempoSync, setTempoSync] = useState(true);
  const [headphoneCue, setHeadphoneCue] = useState<'none' | 'A' | 'B' | 'both'>('both');
  const [activeFxPad, setActiveFxPad] = useState<string | null>(null);
  const [isExportingMashup, setIsExportingMashup] = useState(false);

  // Auto-DJ State
  const [autoDjQueue, setAutoDjQueue] = useState<SunoTrack[]>(() => allTracks.slice(0, 8));
  const [autoDjPlaying, setAutoDjPlaying] = useState(false);
  const [autoDjCurrentIdx, setAutoDjCurrentIdx] = useState(0);
  const [crossfadeSecs, setCrossfadeSecs] = useState(8);

  // Audio element references
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const autoDjAudioRef = useRef<HTMLAudioElement | null>(null);

  // Attributes analysis
  const analysisA = useMemo(() => estimateMusicAttributes(trackA), [trackA]);
  const analysisB = useMemo(() => estimateMusicAttributes(trackB), [trackB]);

  // Sync track prop change into Deck A if user passed new currentTrack
  useEffect(() => {
    if (track && track.id !== trackA.id) {
      setTrackA(track);
    }
  }, [track?.id]);

  // Setup Audio elements for Deck A & B
  useEffect(() => {
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.src = trackA?.id ? `/api/suno/stream/${trackA.id}.mp3` : trackA?.audio_url || '';
    a.preload = 'auto';
    audioARef.current = a;

    const b = new Audio();
    b.crossOrigin = 'anonymous';
    b.src = trackB?.id ? `/api/suno/stream/${trackB.id}.mp3` : trackB?.audio_url || '';
    b.preload = 'auto';
    audioBRef.current = b;

    return () => {
      a.pause();
      b.pause();
    };
  }, [trackA?.id, trackB?.id]);

  // Apply volume & crossfading calculations
  useEffect(() => {
    if (audioARef.current) {
      const volA = Math.cos(crossfader * 0.5 * Math.PI) * deckAVolume * masterVolume;
      audioARef.current.volume = Math.max(0, Math.min(1, volA));
      audioARef.current.playbackRate = 1 + pitchA / 100;
    }
    if (audioBRef.current) {
      const volB = Math.sin(crossfader * 0.5 * Math.PI) * deckBVolume * masterVolume;
      audioBRef.current.volume = Math.max(0, Math.min(1, volB));
      audioBRef.current.playbackRate = 1 + pitchB / 100;
    }
  }, [crossfader, masterVolume, deckAVolume, deckBVolume, pitchA, pitchB]);

  // Play/Pause toggles
  const handleTogglePlayA = () => {
    if (!audioARef.current) return;
    if (isPlayingA) {
      audioARef.current.pause();
      setIsPlayingA(false);
    } else {
      audioARef.current.play().catch(() => {});
      setIsPlayingA(true);
    }
  };

  const handleTogglePlayB = () => {
    if (!audioBRef.current) return;
    if (isPlayingB) {
      audioBRef.current.pause();
      setIsPlayingB(false);
    } else {
      audioBRef.current.play().catch(() => {});
      setIsPlayingB(true);
    }
  };

  const handlePlayBoth = () => {
    if (isPlayingA || isPlayingB) {
      if (audioARef.current) audioARef.current.pause();
      if (audioBRef.current) audioBRef.current.pause();
      setIsPlayingA(false);
      setIsPlayingB(false);
    } else {
      if (audioARef.current) {
        audioARef.current.currentTime = 0;
        audioARef.current.play().catch(() => {});
        setIsPlayingA(true);
      }
      if (audioBRef.current) {
        audioBRef.current.currentTime = 0;
        audioBRef.current.play().catch(() => {});
        setIsPlayingB(true);
      }
    }
  };

  const handleCueA = () => {
    if (audioARef.current) {
      audioARef.current.pause();
      audioARef.current.currentTime = 0;
      setIsPlayingA(false);
    }
  };

  const handleCueB = () => {
    if (audioBRef.current) {
      audioBRef.current.pause();
      audioBRef.current.currentTime = 0;
      setIsPlayingB(false);
    }
  };

  // FX trigger
  const triggerFx = (fx: string) => {
    setActiveFxPad(fx);
    setTimeout(() => setActiveFxPad(null), 1200);

    if (fx === 'brake') {
      // Vinyl brake effect: slowdown playbackRate over 800ms
      if (audioARef.current && isPlayingA) {
        audioARef.current.playbackRate = 0.4;
        setTimeout(() => {
          if (audioARef.current) audioARef.current.playbackRate = 1 + pitchA / 100;
        }, 800);
      }
      if (audioBRef.current && isPlayingB) {
        audioBRef.current.playbackRate = 0.4;
        setTimeout(() => {
          if (audioBRef.current) audioBRef.current.playbackRate = 1 + pitchB / 100;
        }, 800);
      }
    } else if (fx === 'horn') {
      // Play brief synth burst
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch {
        // Fallback
      }
    }
  };

  // Export Combined Mashup WAV
  const handleExportMashupWav = async () => {
    if (!trackA || !trackB) return;
    try {
      setIsExportingMashup(true);
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
      triggerFileDownload(wavBlob, `Suno_Live_Mashup_${safeA}_x_${safeB}.wav`);
    } catch (err: any) {
      alert(`Mashup rendering failed: ${err.message}`);
    } finally {
      setIsExportingMashup(false);
    }
  };

  // Harmonic Sort for Auto-DJ Queue
  const handleHarmonicSort = () => {
    const sorted = [...autoDjQueue].sort((a, b) => {
      const aInfo = estimateMusicAttributes(a);
      const bInfo = estimateMusicAttributes(b);
      const aNum = parseInt(aInfo.camelot) || 0;
      const bNum = parseInt(bInfo.camelot) || 0;
      return aNum - bNum;
    });
    setAutoDjQueue(sorted);
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0a0d] text-neutral-100 flex flex-col">
      
      {/* ---------------- 1. WORKSTATION TOP BAR ---------------- */}
      <div className="w-full bg-[#111116] border-b border-neutral-800 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        
        {/* Left: Section Title & Live Engine */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#ff2d55] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#ff2d55]/30">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight font-['Syne']">
                DJ CREATIVE WORKSTATION
              </h1>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PRO CONSOLE
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 hidden sm:block">
              Dual-Deck Stem Mixer &bull; Camelot Harmonic Sync &bull; 60fps Visualizer Suite
            </p>
          </div>
        </div>

        {/* Center: Suite Mode Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-bold">
          <button
            onClick={() => setSuiteMode('decks')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              suiteMode === 'decks'
                ? 'bg-[#ff2d55] text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Dual Decks</span>
          </button>

          <button
            onClick={() => setSuiteMode('autodj')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              suiteMode === 'autodj'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto-DJ Set</span>
          </button>

          <button
            onClick={() => setSuiteMode('engines')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              suiteMode === 'engines'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>All Engines</span>
          </button>
        </div>

        {/* Right: Master Volume & Sync */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setTempoSync(!tempoSync)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
              tempoSync 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Master Tempo & BPM Sync"
          >
            <RefreshCw className={`w-3 h-3 ${tempoSync ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">BPM SYNC</span>
          </button>

          {/* Master Volume Slider */}
          <div className="hidden md:flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
            <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="w-16 sm:w-20 accent-[#ff2d55] h-1.5 rounded-lg cursor-pointer"
              title="Master Gain"
            />
          </div>

          <button
            onClick={handleExportMashupWav}
            disabled={isExportingMashup}
            className="px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-[#ff2d55] to-rose-600 hover:from-rose-600 hover:to-[#ff2d55] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#ff2d55]/20 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExportingMashup ? 'Exporting...' : 'Export Mashup'}</span>
          </button>
        </div>

      </div>

      {/* ---------------- 2. PRIMARY VIEW CONTENT ---------------- */}
      <div className="flex-1 w-full flex flex-col p-2.5 sm:p-4 md:p-6 pb-6 sm:pb-8">

        {/* ================= MODE 1: DUAL-DECK DJ CONSOLE ================= */}
        {suiteMode === 'decks' && (
          <div className="w-full flex-1 flex flex-col gap-4">
            
            {/* Mobile View Switcher Tabs (< md) */}
            <div className="flex md:hidden items-center justify-around bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs font-bold">
              <button
                onClick={() => setMobileDeckView('deckA')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                  mobileDeckView === 'deckA' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400'
                }`}
              >
                Deck A (Vocals)
              </button>
              <button
                onClick={() => setMobileDeckView('mixer')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                  mobileDeckView === 'mixer' ? 'bg-amber-500 text-black' : 'text-neutral-400'
                }`}
              >
                Crossfader & FX
              </button>
              <button
                onClick={() => setMobileDeckView('deckB')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                  mobileDeckView === 'deckB' ? 'bg-indigo-600 text-white' : 'text-neutral-400'
                }`}
              >
                Deck B (Beats)
              </button>
            </div>

            {/* Desktop / Tablet / Mobile Decks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 flex-1 items-stretch">
              
              {/* ================= DECK A (LEFT) ================= */}
              <div className={`md:col-span-4 lg:col-span-5 bg-[#121217] border border-neutral-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden ${
                mobileDeckView === 'deckA' ? 'flex' : 'hidden md:flex'
              }`}>
                {/* Glow accent */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-[#ff2d55]/10 rounded-full blur-2xl pointer-events-none" />

                {/* Deck A Header */}
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff2d55] animate-ping" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#ff2d55]">
                        DECK A
                      </span>
                    </div>

                    {/* Camelot & BPM badge */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/30">
                        {analysisA.camelot}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                        {analysisA.bpm} BPM
                      </span>
                    </div>
                  </div>

                  {/* Track Info & Quick Switch Button */}
                  <div 
                    onClick={() => setSelectingForDeck('A')}
                    className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 flex items-center justify-between gap-2.5 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={trackA.image_url} 
                        alt={trackA.title} 
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-neutral-700/60"
                      />
                      <div className="min-w-0 text-left">
                        <div className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#ff2d55] transition-colors">
                          {trackA.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {trackA.artist}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
                  </div>
                </div>

                {/* Center: Turntable / Jog Wheel for Deck A */}
                <div className="my-4 sm:my-6 flex flex-col items-center justify-center relative">
                  <div className={`relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-full bg-radial from-neutral-800 via-neutral-900 to-black border-4 border-neutral-700 shadow-2xl flex items-center justify-center group ${
                    isPlayingA ? 'animate-[spin_4s_linear_infinite]' : ''
                  }`}>
                    {/* Vinyl Grooves */}
                    <div className="absolute inset-2 rounded-full border border-neutral-700/40" />
                    <div className="absolute inset-5 rounded-full border border-neutral-700/30" />
                    <div className="absolute inset-8 rounded-full border border-neutral-700/20" />
                    <div className="absolute inset-11 rounded-full border border-neutral-700/10" />

                    {/* Center Label / Artwork */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white shadow-md relative">
                      <img 
                        src={trackA.image_url} 
                        alt={trackA.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="w-2.5 h-2.5 rounded-full bg-black absolute inset-0 m-auto border border-neutral-600" />
                    </div>

                    {/* Vinyl needle / visual marker */}
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 rounded-full bg-[#ff2d55] shadow-sm shadow-[#ff2d55]" />
                  </div>

                  {/* Stem Isolator Buttons */}
                  <div className="mt-3 sm:mt-4 flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-[10px] font-bold">
                    <button
                      onClick={() => setStemModeA('vocals')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        stemModeA === 'vocals' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Vocals
                    </button>
                    <button
                      onClick={() => setStemModeA('inst')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        stemModeA === 'inst' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Beats
                    </button>
                    <button
                      onClick={() => setStemModeA('full')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        stemModeA === 'full' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Full Mix
                    </button>
                  </div>
                </div>

                {/* Bottom Controls: CUE & PLAY */}
                <div className="space-y-3 relative z-10">
                  {/* Pitch slider */}
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-neutral-400">
                    <span>Pitch: {pitchA > 0 ? `+${pitchA}` : pitchA}%</span>
                    <input 
                      type="range"
                      min="-8"
                      max="8"
                      step="0.5"
                      value={pitchA}
                      onChange={(e) => setPitchA(parseFloat(e.target.value))}
                      className="flex-1 accent-[#ff2d55] h-1.5 rounded-lg cursor-pointer"
                    />
                    <button 
                      onClick={() => setPitchA(0)}
                      className="text-neutral-500 hover:text-white"
                      title="Reset pitch"
                    >
                      0%
                    </button>
                  </div>

                  {/* Large Touch Controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCueA}
                      className="py-2.5 sm:py-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs sm:text-sm font-bold border border-neutral-700 transition-colors cursor-pointer active:scale-95"
                    >
                      CUE
                    </button>

                    <button
                      onClick={handleTogglePlayA}
                      className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        isPlayingA
                          ? 'bg-[#ff2d55] text-white shadow-lg shadow-[#ff2d55]/40'
                          : 'bg-neutral-800 hover:bg-[#ff2d55] text-neutral-200 hover:text-white border border-neutral-700'
                      }`}
                    >
                      {isPlayingA ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>PAUSE</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>PLAY A</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* ================= CENTER MIXER & CROSSFADER ================= */}
              <div className={`md:col-span-4 lg:col-span-2 bg-[#121217] border border-neutral-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between shadow-xl ${
                mobileDeckView === 'mixer' ? 'flex' : 'hidden md:flex'
              }`}>
                {/* Visualizer / VU Meters */}
                <div className="space-y-2">
                  <div className="text-center text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                    LIVE MASTER VU
                  </div>

                  {/* Dual Channel VU Animation */}
                  <div className="flex items-end justify-center gap-1.5 h-16 sm:h-20 bg-black/40 rounded-xl p-2 border border-neutral-800">
                    <div className="flex items-end gap-1 h-full">
                      {[...Array(8)].map((_, i) => (
                        <div 
                          key={`vu-a-${i}`}
                          className={`w-1.5 sm:w-2 rounded-full transition-all duration-75 ${
                            isPlayingA 
                              ? i > 5 ? 'bg-rose-500 animate-pulse' : i > 3 ? 'bg-amber-400' : 'bg-emerald-400'
                              : 'bg-neutral-800'
                          }`}
                          style={{ height: isPlayingA ? `${(i + 1) * 11}%` : '8%' }}
                        />
                      ))}
                    </div>

                    <div className="w-[1px] h-full bg-neutral-800 mx-1" />

                    <div className="flex items-end gap-1 h-full">
                      {[...Array(8)].map((_, i) => (
                        <div 
                          key={`vu-b-${i}`}
                          className={`w-1.5 sm:w-2 rounded-full transition-all duration-75 ${
                            isPlayingB 
                              ? i > 5 ? 'bg-rose-500 animate-pulse' : i > 3 ? 'bg-amber-400' : 'bg-emerald-400'
                              : 'bg-neutral-800'
                          }`}
                          style={{ height: isPlayingB ? `${(i + 1) * 11}%` : '8%' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Center Sync / Play Both Button */}
                <div className="my-3 space-y-2 text-center">
                  <button
                    onClick={handlePlayBoth}
                    className={`w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black tracking-wide uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95 ${
                      isPlayingA && isPlayingB
                        ? 'bg-gradient-to-r from-[#ff2d55] via-amber-500 to-indigo-600 text-white animate-pulse'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>{isPlayingA && isPlayingB ? 'Pause Mashup' : 'Mashup Both'}</span>
                  </button>

                  <div className="text-[9px] text-neutral-400 font-mono">
                    {Math.round((1 - crossfader) * 100)}% Deck A &bull; {Math.round(crossfader * 100)}% Deck B
                  </div>
                </div>

                {/* Performance FX Pads */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-neutral-400 text-center uppercase">
                    HOT FX PADS
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => triggerFx('brake')}
                      className={`p-2 rounded-lg text-[10px] font-bold border transition-colors ${
                        activeFxPad === 'brake'
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border-neutral-750'
                      }`}
                    >
                      🛑 Brake
                    </button>
                    <button
                      onClick={() => triggerFx('horn')}
                      className={`p-2 rounded-lg text-[10px] font-bold border transition-colors ${
                        activeFxPad === 'horn'
                          ? 'bg-[#ff2d55] text-white border-[#ff2d55]'
                          : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border-neutral-750'
                      }`}
                    >
                      📢 Horn
                    </button>
                    <button
                      onClick={() => triggerFx('loop4')}
                      className={`p-2 rounded-lg text-[10px] font-bold border transition-colors ${
                        activeFxPad === 'loop4'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border-neutral-750'
                      }`}
                    >
                      🔁 4-Bar
                    </button>
                    <button
                      onClick={() => triggerFx('echo')}
                      className={`p-2 rounded-lg text-[10px] font-bold border transition-colors ${
                        activeFxPad === 'echo'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border-neutral-750'
                      }`}
                    >
                      ✨ Echo
                    </button>
                  </div>
                </div>

                {/* Center Crossfader Slider */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-neutral-400">
                    <button 
                      onClick={() => setCrossfader(0)} 
                      className="hover:text-[#ff2d55] cursor-pointer"
                    >
                      [A]
                    </button>
                    <button 
                      onClick={() => setCrossfader(0.5)} 
                      className="hover:text-white cursor-pointer"
                    >
                      MID
                    </button>
                    <button 
                      onClick={() => setCrossfader(1)} 
                      className="hover:text-indigo-400 cursor-pointer"
                    >
                      [B]
                    </button>
                  </div>

                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={crossfader}
                    onChange={(e) => setCrossfader(parseFloat(e.target.value))}
                    className="w-full accent-[#ff2d55] h-3 bg-neutral-900 rounded-lg cursor-pointer"
                    title="Crossfader"
                  />
                </div>

              </div>

              {/* ================= DECK B (RIGHT) ================= */}
              <div className={`md:col-span-4 lg:col-span-5 bg-[#121217] border border-neutral-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden ${
                mobileDeckView === 'deckB' ? 'flex' : 'hidden md:flex'
              }`}>
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Deck B Header */}
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                        DECK B
                      </span>
                    </div>

                    {/* Camelot & BPM badge */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {analysisB.camelot}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                        {analysisB.bpm} BPM
                      </span>
                    </div>
                  </div>

                  {/* Track Info & Quick Switch Button */}
                  <div 
                    onClick={() => setSelectingForDeck('B')}
                    className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 flex items-center justify-between gap-2.5 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={trackB.image_url} 
                        alt={trackB.title} 
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-neutral-700/60"
                      />
                      <div className="min-w-0 text-left">
                        <div className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                          {trackB.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {trackB.artist}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
                  </div>
                </div>

                {/* Center: Turntable / Jog Wheel for Deck B */}
                <div className="my-4 sm:my-6 flex flex-col items-center justify-center relative">
                  <div className={`relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-full bg-radial from-neutral-800 via-neutral-900 to-black border-4 border-neutral-700 shadow-2xl flex items-center justify-center group ${
                    isPlayingB ? 'animate-[spin_4s_linear_infinite]' : ''
                  }`}>
                    {/* Vinyl Grooves */}
                    <div className="absolute inset-2 rounded-full border border-neutral-700/40" />
                    <div className="absolute inset-5 rounded-full border border-neutral-700/30" />
                    <div className="absolute inset-8 rounded-full border border-neutral-700/20" />
                    <div className="absolute inset-11 rounded-full border border-neutral-700/10" />

                    {/* Center Label / Artwork */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white shadow-md relative">
                      <img 
                        src={trackB.image_url} 
                        alt={trackB.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="w-2.5 h-2.5 rounded-full bg-black absolute inset-0 m-auto border border-neutral-600" />
                    </div>

                    {/* Vinyl needle / visual marker */}
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500" />
                  </div>

                  {/* Stem Isolator Buttons */}
                  <div className="mt-3 sm:mt-4 flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-[10px] font-bold">
                    <button
                      onClick={() => setStemModeB('vocals')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        stemModeB === 'vocals' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Vocals
                    </button>
                    <button
                      onClick={() => setStemModeB('inst')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        stemModeB === 'inst' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Beats
                    </button>
                    <button
                      onClick={() => setStemModeB('full')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        stemModeB === 'full' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Full Mix
                    </button>
                  </div>
                </div>

                {/* Bottom Controls: CUE & PLAY */}
                <div className="space-y-3 relative z-10">
                  {/* Pitch slider */}
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-neutral-400">
                    <span>Pitch: {pitchB > 0 ? `+${pitchB}` : pitchB}%</span>
                    <input 
                      type="range"
                      min="-8"
                      max="8"
                      step="0.5"
                      value={pitchB}
                      onChange={(e) => setPitchB(parseFloat(e.target.value))}
                      className="flex-1 accent-indigo-500 h-1.5 rounded-lg cursor-pointer"
                    />
                    <button 
                      onClick={() => setPitchB(0)}
                      className="text-neutral-500 hover:text-white"
                      title="Reset pitch"
                    >
                      0%
                    </button>
                  </div>

                  {/* Large Touch Controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCueB}
                      className="py-2.5 sm:py-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs sm:text-sm font-bold border border-neutral-700 transition-colors cursor-pointer active:scale-95"
                    >
                      CUE
                    </button>

                    <button
                      onClick={handleTogglePlayB}
                      className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        isPlayingB
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                          : 'bg-neutral-800 hover:bg-indigo-600 text-neutral-200 hover:text-white border border-neutral-700'
                      }`}
                    >
                      {isPlayingB ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>PAUSE</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>PLAY B</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ================= MODE 2: AUTO-DJ HARMONIC SET ================= */}
        {suiteMode === 'autodj' && (
          <div className="w-full flex-1 flex flex-col gap-4">
            
            {/* Auto-DJ Control Ribbon */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#121217] border border-neutral-800 flex flex-wrap items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    Camelot Harmonic Continuous Mix
                  </h2>
                  <p className="text-[11px] sm:text-xs text-neutral-400">
                    Automatically sequences tracks using compatible keys (8A → 9A) with smooth {crossfadeSecs}-second energy transitions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleHarmonicSort}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 border border-neutral-700 transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Harmonic Sort</span>
                </button>

                <button
                  onClick={() => onOpenAutoDj(autoDjQueue)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Continuous Player</span>
                </button>
              </div>
            </div>

            {/* Sequence Tracklist */}
            <div className="flex-1 bg-[#121217] border border-neutral-800 rounded-2xl p-4 space-y-2 overflow-y-auto max-h-[60vh]">
              <div className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Mix Queue ({autoDjQueue.length} Tracks Scheduled)
              </div>

              {autoDjQueue.map((t, idx) => {
                const info = estimateMusicAttributes(t);
                const isCurrent = idx === autoDjCurrentIdx;

                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-center text-xs font-mono font-bold text-neutral-500">
                        {idx + 1}
                      </span>
                      <img 
                        src={t.image_url} 
                        alt={t.title} 
                        className="w-10 h-10 rounded-lg object-cover border border-neutral-700/60 shrink-0" 
                      />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {t.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {t.artist} &bull; {t.duration_formatted}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {info.camelot}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-400">
                        {info.bpm} BPM
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ================= MODE 3: ALL CREATIVE ENGINES ================= */}
        {suiteMode === 'engines' && (
          <div className="w-full flex-1 space-y-4">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
              Creative Studio Engines
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Engine 1: 360 Spatial */}
              <div 
                onClick={() => onOpenSpatial8D(trackA)}
                className="p-5 rounded-2xl bg-[#121217] border border-neutral-800 hover:border-indigo-500 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-105 transition-transform">
                    <Orbit className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">
                    360° 8D Spatial Binaural Audio
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Binaural headphone panning with rotational speed and room acoustic simulation.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-bold text-indigo-400">
                  <span>Launch Spatial Room</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Engine 2: Cinema Karaoke */}
              <div 
                onClick={() => onOpenKaraoke(trackA)}
                className="p-5 rounded-2xl bg-[#121217] border border-neutral-800 hover:border-emerald-500 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition-transform">
                    <Mic className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                    Karaoke Cinema & Lyrics Teleprompter
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Synchronized lyric teleprompter with pitch feedback and mic monitoring.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span>Open Cinema Mode</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Engine 3: Social Video Maker */}
              <div 
                onClick={() => onOpenVideoMaker(trackA)}
                className="p-5 rounded-2xl bg-[#121217] border border-neutral-800 hover:border-pink-500 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30 group-hover:scale-105 transition-transform">
                    <Video className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-pink-400 transition-colors">
                    60fps Social Video Visualizer Maker
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Export 9:16 vertical TikTok/Reel visualizer videos with animated wave spectrum.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-bold text-pink-400">
                  <span>Export Social Video</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Engine 4: Prompt & DNA Extractor */}
              <div 
                onClick={() => onOpenPromptExtractor(trackA)}
                className="p-5 rounded-2xl bg-[#121217] border border-neutral-800 hover:border-purple-500 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-105 transition-transform">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors">
                    Prompt & Style DNA Extractor
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Deconstruct Suno musical tags, structure, and prompt ingredients.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-bold text-purple-400">
                  <span>Inspect Prompt DNA</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Engine 5: Studio DAW Switcher */}
              <div 
                onClick={() => onOpenStudioDaw(trackA)}
                className="p-5 rounded-2xl bg-[#121217] border border-neutral-800 hover:border-[#ff2d55] transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#ff2d55]/20 text-[#ff2d55] flex items-center justify-center border border-[#ff2d55]/30 group-hover:scale-105 transition-transform">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-[#ff2d55] transition-colors">
                    Multi-Stem Studio DAW Workstation
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Master stems with EQ, compression, pitch correction, and precision trimming.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-bold text-[#ff2d55]">
                  <span>Open DAW Workstation</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ---------------- TRACK SELECTOR POPUP MODAL ---------------- */}
      {selectingForDeck && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 lg:p-6 bg-black/90 backdrop-blur-2xl animate-fadeIn">
          <div className="w-full h-full md:h-auto md:max-h-[85vh] max-w-lg bg-[#111116] md:border border-neutral-800 md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="sticky top-0 z-30 p-3.5 sm:p-4 border-b border-neutral-800 bg-[#14141a]/95 backdrop-blur-xl flex items-center justify-between pt-[max(0.75rem,env(safe-area-inset-top))]">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Select Track for Deck {selectingForDeck}
              </h3>
              <button
                onClick={() => setSelectingForDeck(null)}
                aria-label="Close track selector"
                className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer border border-neutral-700 active:scale-95"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-2 pb-[max(2rem,env(safe-area-inset-bottom))]">
              {allTracks.map((t) => {
                const info = estimateMusicAttributes(t);
                const isSelected = selectingForDeck === 'A' ? trackA.id === t.id : trackB.id === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (selectingForDeck === 'A') setTrackA(t);
                      else setTrackB(t);
                      setSelectingForDeck(null);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-[#ff2d55]/20 border-[#ff2d55]' 
                        : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={t.image_url} 
                        alt={t.title} 
                        className="w-10 h-10 rounded-lg object-cover shrink-0" 
                      />
                      <div className="min-w-0 text-left">
                        <div className="text-xs font-bold text-white truncate">
                          {t.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {t.artist}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                        {info.camelot}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {info.bpm}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
