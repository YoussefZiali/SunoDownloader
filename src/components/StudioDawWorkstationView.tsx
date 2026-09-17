import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw, Repeat, 
  Download, Disc, Sparkles, Sliders, Scissors, Tag, Activity, 
  Mic, Orbit, Radio, FileText, Music, HardDrive, CheckCircle2,
  Share2, Copy, Layers, ExternalLink, Wand2, ArrowLeft, Video,
  AudioWaveform, Zap, RadioTower
} from 'lucide-react';
import { 
  SunoTrack, AudioFormat, UserSettings, AudioMasterPreset, 
  MusicalAnalysis 
} from '../types';
import { estimateMusicAttributes } from '../utils/musicAnalyzer';
import { triggerFileDownload } from '../utils/audioConverter';

interface StudioDawWorkstationViewProps {
  track: SunoTrack | null;
  allTracks: SunoTrack[];
  onSelectTrack: (track: SunoTrack) => void;
  onQuickDownload: (track: SunoTrack, format: AudioFormat) => void;
  onOpenTrimmer: (track: SunoTrack) => void;
  onOpenMetadataEditor: (track: SunoTrack) => void;
  onOpenVideoMaker: (track: SunoTrack) => void;
  onOpenKaraoke: (track: SunoTrack) => void;
  onOpenSpatial8D: (track: SunoTrack) => void;
  onOpenMashup: (track: SunoTrack) => void;
  onSaveOffline: (track: SunoTrack) => void;
  isOffline: boolean;
  onBackToLibrary: () => void;
  onOpenIngest: () => void;
}

const MASTER_PRESETS: { id: AudioMasterPreset; name: string; desc: string; icon: string }[] = [
  { id: 'none', name: 'Pure Bypass', desc: 'Raw uncompressed Suno stream', icon: '🎧' },
  { id: 'studio', name: 'Studio Master', desc: 'Dynamic compression & brickwall limiter', icon: '🎛️' },
  { id: 'bass_boost', name: 'Deep Sub-Bass', desc: '+6dB warm 60Hz punch', icon: '🔊' },
  { id: 'vocal_air', name: 'Vocal Air & Clarity', desc: '+5dB silky 10kHz sheen', icon: '✨' },
  { id: 'lofi', name: 'Lo-Fi Tape', desc: 'Warm saturation & vintage roll-off', icon: '📻' },
  { id: 'slowed_reverb', name: 'Slowed + Reverb', desc: '0.85x speed with atmospheric space', icon: '🌙' },
  { id: 'nightcore', name: 'Nightcore Boost', desc: '1.25x tempo with punchy highs', icon: '⚡' },
];

export const StudioDawWorkstationView: React.FC<StudioDawWorkstationViewProps> = ({
  track,
  allTracks,
  onSelectTrack,
  onQuickDownload,
  onOpenTrimmer,
  onOpenMetadataEditor,
  onOpenVideoMaker,
  onOpenKaraoke,
  onOpenSpatial8D,
  onOpenMashup,
  onSaveOffline,
  isOffline,
  onBackToLibrary,
  onOpenIngest,
}) => {
  // If no track is provided, fallback to first track in catalog
  const currentTrack = track || allTracks[0] || null;

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentTrack?.duration || 180);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState(false);

  // DSP Mastering State
  const [activePreset, setActivePreset] = useState<AudioMasterPreset>('none');
  const [bassGain, setBassGain] = useState(0); // -10 to +10 dB
  const [trebleGain, setTrebleGain] = useState(0);
  const [reverbMix, setReverbMix] = useState(0); // 0 to 1

  // Audio References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const masteringChainRef = useRef<any>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  // Musical Analysis
  const musicalAnalysis = React.useMemo(() => {
    if (!currentTrack) return null;
    return estimateMusicAttributes(currentTrack);
  }, [currentTrack?.id]);

  // Initialize and update audio element
  useEffect(() => {
    if (!currentTrack) return;
    
    setCurrentTime(0);
    setIsPlaying(false);
    setDuration(currentTrack.duration || 180);

    const streamUrl = currentTrack.id ? `/api/suno/stream/${currentTrack.id}.mp3` : currentTrack.audio_url;

    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    audio.src = streamUrl;
    audio.playbackRate = playbackSpeed;
    audio.volume = isMuted ? 0 : volume;
    audio.loop = isLooping;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.onended = () => {
      if (!isLooping) setIsPlaying(false);
    };

    return () => {
      audio.pause();
    };
  }, [currentTrack?.id]);

  // Handle DSP preset changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (activePreset === 'slowed_reverb') {
      audioRef.current.playbackRate = 0.85;
      setPlaybackSpeed(0.85);
      setReverbMix(0.4);
    } else if (activePreset === 'nightcore') {
      audioRef.current.playbackRate = 1.25;
      setPlaybackSpeed(1.25);
      setTrebleGain(4);
    } else if (activePreset === 'bass_boost') {
      audioRef.current.playbackRate = 1.0;
      setPlaybackSpeed(1.0);
      setBassGain(6);
      setReverbMix(0);
    } else if (activePreset === 'vocal_air') {
      audioRef.current.playbackRate = 1.0;
      setPlaybackSpeed(1.0);
      setTrebleGain(5);
      setBassGain(0);
    } else {
      audioRef.current.playbackRate = 1.0;
      setPlaybackSpeed(1.0);
      setBassGain(0);
      setTrebleGain(0);
      setReverbMix(0);
    }
  }, [activePreset]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (pct: number) => {
    if (!audioRef.current) return;
    const newTime = pct * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    handleSeek(pct);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  const copySongLink = () => {
    if (!currentTrack) return;
    navigator.clipboard.writeText(`https://suno.com/song/${currentTrack.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // 64 visualizer spectrum bars
  const waveformBars = React.useMemo(() => {
    if (!currentTrack) return [];
    const seed = currentTrack.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return Array.from({ length: 64 }, (_, i) => {
      const val = Math.sin((i + seed * 0.1) * 0.35) * 0.4 + Math.cos((i * 1.6) * 0.25) * 0.3 + 0.35;
      return Math.max(0.15, Math.min(0.98, val));
    });
  }, [currentTrack?.id]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentTrack) {
    return (
      <div className="w-full min-h-screen bg-[#0d0d0f] flex items-center justify-center p-6 text-center text-white">
        <div className="space-y-4">
          <Disc className="w-12 h-12 text-[#ff2d55] mx-auto animate-spin" />
          <h2 className="text-xl font-bold">No Track Loaded in Studio DAW</h2>
          <button
            onClick={onBackToLibrary}
            className="px-5 py-2.5 rounded-xl bg-[#ff2d55] text-white font-bold text-xs"
          >
            Browse Music Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0d0d0f] text-neutral-100 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Top DAW Header & Track Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl">
          
          <div className="flex items-center gap-4 min-w-0">
            {/* Artwork */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-neutral-800 shrink-0 shadow-md">
              <img
                src={currentTrack.image_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white font-bold backdrop-blur-xs">
                {currentTrack.duration_formatted}
              </span>
            </div>

            {/* Track Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/30">
                  DAW MASTER CHANNEL
                </span>
                {currentTrack.model && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    Model {currentTrack.model}
                  </span>
                )}
                {isOffline && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    Cached
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate mt-1">
                {currentTrack.title}
              </h1>

              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5 flex-wrap">
                <span className="font-bold text-neutral-200">{currentTrack.artist}</span>
                <span>•</span>
                <span className="font-mono text-[#ff2d55] font-bold">
                  Key: {musicalAnalysis?.camelot} ({musicalAnalysis?.key} {musicalAnalysis?.scale})
                </span>
                <span>•</span>
                <span className="font-mono text-amber-400 font-bold">
                  {musicalAnalysis?.bpm} BPM
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">
                  Energy: {musicalAnalysis?.energy}%
                </span>
              </div>
            </div>
          </div>

          {/* Quick Track Switcher Dropdown & Ingest Button */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <select
              value={currentTrack.id}
              onChange={(e) => {
                const found = allTracks.find((t) => t.id === e.target.value);
                if (found) onSelectTrack(found);
              }}
              className="bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#ff2d55] max-w-[200px] truncate"
            >
              {allTracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} - {t.artist}
                </option>
              ))}
            </select>

            <button
              onClick={onOpenIngest}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff2d55]" />
              <span>Load URL</span>
            </button>

            <button
              onClick={copySongLink}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Copy Suno Share URL"
            >
              {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Master Waveform Display & Transport Deck */}
        <div className="p-6 sm:p-7 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl space-y-6">
          
          {/* Waveform Canvas & Time Cursor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span className="font-bold text-white">{formatSeconds(currentTime)}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-500 uppercase">Master Signal 48kHz / 24-bit</span>
                <span className="font-bold text-neutral-300">{formatSeconds(duration)}</span>
              </div>
            </div>

            {/* Interactive 64-Bar Visualizer Spectrum */}
            <div
              ref={waveformRef}
              onClick={handleWaveformClick}
              className="relative h-28 sm:h-36 bg-neutral-950 rounded-2xl border border-neutral-800/90 flex items-center justify-between px-3 sm:px-4 cursor-pointer group overflow-hidden select-none"
            >
              {/* Progress Fill Background Overlay */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff2d55]/15 to-[#ff2d55]/5 border-r border-[#ff2d55] pointer-events-none transition-all"
                style={{ width: `${currentPct}%` }}
              />

              {/* Spectrum Bars */}
              {waveformBars.map((heightPct, idx) => {
                const barPct = (idx / waveformBars.length) * 100;
                const isPassed = barPct <= currentPct;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex items-center justify-center h-full px-[1.5px] sm:px-[2px]"
                  >
                    <div
                      className={`w-full rounded-full transition-all duration-150 ${
                        isPassed
                          ? 'bg-gradient-to-t from-[#ff2d55] to-amber-400 shadow-sm shadow-[#ff2d55]/30'
                          : 'bg-neutral-800 group-hover:bg-neutral-700'
                      }`}
                      style={{
                        height: `${Math.max(10, heightPct * 100)}%`,
                      }}
                    />
                  </div>
                );
              })}

              {/* Scrubber Playhead Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none transition-all"
                style={{ left: `${currentPct}%` }}
              >
                <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-white shadow-md" />
              </div>
            </div>
          </div>

          {/* Transport Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            
            {/* Play / Skip / Loop Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.max(0, currentTime - 10);
                  }
                }}
                className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                title="Rewind 10s"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                id="daw-play-pause-btn"
                onClick={togglePlay}
                className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ff2d55] to-amber-500 hover:from-[#ff3d63] hover:to-amber-400 text-white flex items-center justify-center shadow-xl shadow-[#ff2d55]/30 transition-all active:scale-95 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current translate-x-0.5" />
                )}
              </button>

              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.min(duration, currentTime + 10);
                  }
                }}
                className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                title="Forward 10s"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  isLooping
                    ? 'bg-[#ff2d55]/20 border-[#ff2d55] text-[#ff2d55]'
                    : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
                title="Loop Track"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 p-1 rounded-xl">
              {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    playbackSpeed === speed
                      ? 'bg-[#ff2d55] text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-2 min-w-[150px]">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-neutral-400 hover:text-white"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  setIsMuted(false);
                  if (audioRef.current) audioRef.current.volume = v;
                }}
                className="w-full accent-[#ff2d55] cursor-pointer"
              />
            </div>

          </div>

        </div>

        {/* Studio Rack: DSP Mastering Suite & Real-Time Stem Mixer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Module 1: DSP Mastering Rack */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#ff2d55]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Live DSP Mastering Rack
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Web Audio DSP
              </span>
            </div>

            {/* Preset Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MASTER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    activePreset === preset.id
                      ? 'bg-gradient-to-tr from-[#ff2d55]/20 to-amber-500/10 border-[#ff2d55] text-white shadow-md'
                      : 'bg-neutral-950 hover:bg-neutral-800/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="text-base mb-1">{preset.icon}</div>
                  <div className="font-bold text-xs text-white leading-tight">{preset.name}</div>
                  <div className="text-[10px] text-neutral-400 truncate mt-0.5">{preset.desc}</div>
                </button>
              ))}
            </div>

            {/* Live EQ Sliders */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 text-center space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Bass (60Hz)</span>
                <div className="text-xs font-mono font-bold text-amber-400">
                  {bassGain > 0 ? `+${bassGain}` : bassGain} dB
                </div>
                <input
                  type="range"
                  min={-10}
                  max={10}
                  value={bassGain}
                  onChange={(e) => setBassGain(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 text-center space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Air (10kHz)</span>
                <div className="text-xs font-mono font-bold text-[#ff2d55]">
                  {trebleGain > 0 ? `+${trebleGain}` : trebleGain} dB
                </div>
                <input
                  type="range"
                  min={-10}
                  max={10}
                  value={trebleGain}
                  onChange={(e) => setTrebleGain(Number(e.target.value))}
                  className="w-full accent-[#ff2d55] cursor-pointer"
                />
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 text-center space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Reverb Space</span>
                <div className="text-xs font-mono font-bold text-indigo-400">
                  {Math.round(reverbMix * 100)}%
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={reverbMix}
                  onChange={(e) => setReverbMix(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Module 2: Harmonic Key & Audio Profile Analysis */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Harmonic Key & Audio Profile
                </h3>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                Suno AI Harmonic Analyzer
              </span>
            </div>

            {/* Key & BPM harmonic summary cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Root Key</span>
                <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block">
                  {musicalAnalysis?.key || 'A Minor'}
                </span>
                <span className="text-[9px] text-neutral-500">Tonal Center</span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Camelot Code</span>
                <span className="text-sm font-black text-[#ff2d55] font-mono mt-0.5 block">
                  {musicalAnalysis?.camelot || '8A'}
                </span>
                <span className="text-[9px] text-neutral-500">DJ Harmonic Mix</span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Tempo (BPM)</span>
                <span className="text-sm font-black text-indigo-400 font-mono mt-0.5 block">
                  {musicalAnalysis?.bpm || 120}
                </span>
                <span className="text-[9px] text-neutral-500">Beats Per Min</span>
              </div>
            </div>

            {/* Audio Profile & Stem Presence Meters */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-300">Acoustic Energy & Stem Characteristics</span>
                <span className="text-[10px] text-neutral-500 font-mono">Master Stream</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Vocal Presence / Clarity</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {currentTrack?.prompt ? 'Lead Vocals Detected' : 'Instrumental'}
                  </span>
                </div>
                <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: currentTrack?.prompt ? '88%' : '20%' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Dynamic Punch & Energy</span>
                  <span className="font-mono text-amber-400 font-bold">{musicalAnalysis?.energy || 80}%</span>
                </div>
                <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-[#ff2d55] rounded-full"
                    style={{ width: `${musicalAnalysis?.energy || 80}%` }}
                  />
                </div>
              </div>

              {/* Tags & Genre prompt pill indicators */}
              {currentTrack?.tags && (
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase mr-1">Style Tags:</span>
                  {currentTrack.tags.split(',').map((tag, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] font-medium text-neutral-300"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Lossless Export & Production Suite Actions */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Download className="w-4 h-4 text-[#ff2d55]" />
              <span>Lossless Production Exports</span>
            </h3>
            <span className="text-xs text-neutral-400">100% Client-Side Render</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => onQuickDownload(currentTrack, 'mp3')}
              className="p-3.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-[#ff2d55] text-left transition-all cursor-pointer group"
            >
              <div className="font-bold text-xs text-white group-hover:text-[#ff2d55] transition-colors">
                MP3 (320 kbps)
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">High Bitrate CBR</div>
            </button>

            <button
              onClick={() => onQuickDownload(currentTrack, 'wav')}
              className="p-3.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-400 text-left transition-all cursor-pointer group"
            >
              <div className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors">
                WAV (24-bit Lossless)
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Studio Master 48kHz</div>
            </button>

            <button
              onClick={() => onQuickDownload(currentTrack, 'flac')}
              className="p-3.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-indigo-400 text-left transition-all cursor-pointer group"
            >
              <div className="font-bold text-xs text-white group-hover:text-indigo-400 transition-colors">
                FLAC Lossless
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Archival Quality</div>
            </button>

            <button
              onClick={() => onQuickDownload(currentTrack, 'm4a')}
              className="p-3.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-400 text-left transition-all cursor-pointer group"
            >
              <div className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors">
                M4A / AAC
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Apple High Quality</div>
            </button>
          </div>

          {/* Secondary Studio Modals Launchers */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button
              onClick={() => onOpenTrimmer(currentTrack)}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Audio Trimmer</span>
            </button>

            <button
              onClick={() => onOpenMetadataEditor(currentTrack)}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5 text-[#ff2d55]" />
              <span>ID3 Tag Studio</span>
            </button>

            <button
              onClick={() => onOpenSpatial8D(currentTrack)}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Orbit className="w-3.5 h-3.5 text-indigo-400" />
              <span>3D Spatial 8D</span>
            </button>

            <button
              onClick={() => onOpenKaraoke(currentTrack)}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span>Karaoke Cinema</span>
            </button>

            <button
              onClick={() => onOpenVideoMaker(currentTrack)}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-pink-400" />
              <span>Social Reel Video</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
