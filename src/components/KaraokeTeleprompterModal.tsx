import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Play, Pause, RotateCcw, Volume2, VolumeX, 
  Download, Sparkles, FileText, Music, Sliders, Maximize2, Minimize2, 
  RefreshCw, Check, Share2, Layers, Disc
} from 'lucide-react';
import { SunoTrack, UserSettings, KaraokeLyricLine } from '../types';
import { 
  parseAndSyncLyrics, 
  generateLrcContent, 
  generateSrtContent, 
  downloadLyricsFile, 
  fetchTrackLyrics 
} from '../utils/lyricsSynchronizer';
import { estimateMusicAttributes } from '../utils/musicAnalyzer';

interface KaraokeTeleprompterModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: SunoTrack | null;
  settings?: UserSettings;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  onTogglePlay?: () => void;
  onSeek?: (time: number) => void;
  onTrackUpdate?: (track: SunoTrack) => void;
}

export const KaraokeTeleprompterModal: React.FC<KaraokeTeleprompterModalProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying: externalIsPlaying,
  currentTime: externalCurrentTime,
  duration: externalDuration,
  onTogglePlay: externalTogglePlay,
  onSeek: externalSeek,
  onTrackUpdate,
}) => {
  // If external playback controller is not provided, fall back to internal
  const isExternalControlled = externalTogglePlay !== undefined && externalSeek !== undefined;

  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [internalDuration, setInternalDuration] = useState(0);

  const isPlaying = isExternalControlled ? (externalIsPlaying ?? false) : internalIsPlaying;
  const currentTime = isExternalControlled ? (externalCurrentTime ?? 0) : internalCurrentTime;
  const duration = isExternalControlled ? (externalDuration || (track?.duration || 180)) : internalDuration;

  const [micEnabled, setMicEnabled] = useState(false);
  const [micVolume, setMicVolume] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'huge'>('large');
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [lyricsLines, setLyricsLines] = useState<KaraokeLyricLine[]>([]);
  const [showMicSettings, setShowMicSettings] = useState(false);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const lyricContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Sync lyrics lines when track changes or prompt changes
  useEffect(() => {
    if (track) {
      const parsed = parseAndSyncLyrics(track);
      setLyricsLines(parsed);
    }
  }, [track?.id, track?.prompt]);

  // Automatically retrieve lyrics when modal opens if prompt is missing or placeholder
  const fetchedModalTrackIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (isOpen && track?.id && fetchedModalTrackIdRef.current !== track.id) {
      fetchedModalTrackIdRef.current = track.id;
      if (!track.prompt || !track.prompt.trim()) {
        handleRetrieveLyrics();
      }
    }
  }, [isOpen, track?.id]);

  // Setup internal audio engine only if not externally controlled
  useEffect(() => {
    if (!isOpen || !track || isExternalControlled) {
      if (!isOpen && !isExternalControlled) cleanupInternalAudio();
      return;
    }

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = track.id ? `/api/suno/stream/${track.id}.mp3` : track.audio_url;
    audioElementRef.current = audio;

    audio.ontimeupdate = () => {
      setInternalCurrentTime(audio.currentTime);
    };

    audio.onloadedmetadata = () => {
      setInternalDuration(audio.duration || track.duration || 180);
    };

    audio.onended = () => {
      setInternalIsPlaying(false);
    };

    return () => {
      cleanupInternalAudio();
    };
  }, [isOpen, track?.id, isExternalControlled]);

  const cleanupInternalAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setInternalIsPlaying(false);
    setMicEnabled(false);
    setInternalCurrentTime(0);
  };

  // Scroll active lyric into center view
  useEffect(() => {
    if (activeLineRef.current && lyricContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  const handleTogglePlay = () => {
    if (isExternalControlled && externalTogglePlay) {
      externalTogglePlay();
    } else if (audioElementRef.current) {
      if (internalIsPlaying) {
        audioElementRef.current.pause();
        setInternalIsPlaying(false);
      } else {
        audioElementRef.current.play().catch(() => {});
        setInternalIsPlaying(true);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    if (isExternalControlled && externalSeek) {
      externalSeek(newTime);
    } else if (audioElementRef.current) {
      audioElementRef.current.currentTime = newTime;
      setInternalCurrentTime(newTime);
    }
  };

  const toggleMic = async () => {
    if (micEnabled) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      setMicEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = audioContextRef.current || new AudioCtx();
        audioContextRef.current = ctx;

        const micSource = ctx.createMediaStreamSource(stream);
        const micGain = ctx.createGain();
        micGain.gain.value = micVolume;
        micGainRef.current = micGain;

        micSource.connect(micGain);
        micGain.connect(ctx.destination);
        setMicEnabled(true);
      } catch (err: any) {
        console.warn(`Microphone access error: ${err.message}`);
      }
    }
  };

  const handleRetrieveLyrics = async () => {
    if (!track) return;
    setIsFetchingLyrics(true);
    setFetchSuccess(false);

    try {
      const data = await fetchTrackLyrics(track.id);
      if (data.rawLyrics || (data.structuredLines && data.structuredLines.length > 0)) {
        const updatedTrack: SunoTrack = {
          ...track,
          prompt: data.rawLyrics || track.prompt,
        };
        setLyricsLines(data.structuredLines || parseAndSyncLyrics(updatedTrack));
        if (onTrackUpdate) {
          onTrackUpdate(updatedTrack);
        }
        setFetchSuccess(true);
        setTimeout(() => setFetchSuccess(false), 3000);
      }
    } catch (err: any) {
      console.warn('Could not fetch online lyrics:', err.message);
    } finally {
      setIsFetchingLyrics(false);
    }
  };

  const handleExportLrc = () => {
    if (!track) return;
    downloadLyricsFile(track, 'lrc');
  };

  const handleExportSrt = () => {
    if (!track) return;
    downloadLyricsFile(track, 'srt');
  };

  const handleExportTxt = () => {
    if (!track) return;
    downloadLyricsFile(track, 'txt');
  };

  if (!isOpen || !track) return null;

  const analysis = estimateMusicAttributes(track);

  const activeLineIndex = lyricsLines.findIndex((line, idx) => {
    const nextLine = lyricsLines[idx + 1];
    if (nextLine) {
      return currentTime >= line.time && currentTime < nextLine.time;
    }
    return currentTime >= line.time;
  });

  const fontClasses = {
    normal: 'text-lg sm:text-xl md:text-2xl',
    large: 'text-2xl sm:text-3xl md:text-4xl',
    huge: 'text-3xl sm:text-4xl md:text-5xl font-black',
  }[fontSize];

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-fadeIn ${isFullscreen ? 'p-0 w-screen h-screen' : 'p-0 md:p-4 lg:p-6'}`}>
      <div className={`relative w-full ${isFullscreen ? 'h-screen w-screen max-w-none rounded-none border-none' : 'h-full md:h-auto md:max-h-[90vh] max-w-4xl md:rounded-3xl md:border border-neutral-800'} bg-[#0a0a0f] shadow-2xl overflow-hidden flex flex-col`}>
        
        {/* Top Header Bar with Safe-Area Inset */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-3.5 sm:p-5 border-b border-neutral-800/80 bg-neutral-900/95 backdrop-blur-xl shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-pink-500/30">
              <img src={track.image_url} alt={track.title} className="w-full h-full object-cover" />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-bold text-white truncate">
                  {track.title}
                </h2>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {analysis.camelot} • {analysis.bpm} BPM
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate">
                {track.artist} &bull; Synced Teleprompter & Karaoke
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Live Fetch / Sync Lyrics from Suno */}
            <button
              onClick={handleRetrieveLyrics}
              disabled={isFetchingLyrics}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-700 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Retrieve and synchronize lyrics from Suno servers"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLyrics ? 'animate-spin text-pink-400' : 'text-neutral-400'}`} />
              <span className="hidden md:inline">{fetchSuccess ? 'Synced!' : 'Retrieve Lyrics'}</span>
            </button>

            {/* Font Size Selector */}
            <div className="hidden sm:flex items-center bg-neutral-900 rounded-xl p-1 border border-neutral-800">
              {(['normal', 'large', 'huge'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-2.5 py-1 text-xs rounded-lg uppercase font-bold transition-all ${
                    fontSize === size ? 'bg-pink-500 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {size[0]}
                </button>
              ))}
            </div>

            {/* Mic Live Toggle & Gain Settings */}
            <div className="relative">
              <button
                onClick={toggleMic}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  micEnabled 
                    ? 'bg-pink-500 text-white border-pink-400 shadow-lg shadow-pink-500/30 animate-pulse' 
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                }`}
                title="Pass-through live microphone sing-along"
              >
                {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{micEnabled ? 'Mic Live' : 'Pass-thru Mic'}</span>
              </button>

              {micEnabled && (
                <button
                  onClick={() => setShowMicSettings(!showMicSettings)}
                  className="hidden sm:inline-flex ml-1 p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
                  title="Mic Gain Settings"
                >
                  <Sliders className="w-3 h-3" />
                </button>
              )}

              {showMicSettings && micEnabled && (
                <div className="absolute top-10 right-0 w-48 bg-neutral-900 border border-neutral-700 rounded-2xl p-3 shadow-2xl z-50 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-300">
                    <span>Mic Gain</span>
                    <span>{Math.round(micVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={micVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setMicVolume(val);
                      if (micGainRef.current) {
                        micGainRef.current.gain.value = val;
                      }
                    }}
                    className="w-full accent-pink-500 h-1 bg-neutral-700 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 sm:p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Stage Mode'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close Karaoke Teleprompter"
              className="p-2 sm:p-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-all shrink-0 cursor-pointer shadow-md flex items-center justify-center border border-neutral-700 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Teleprompter Scrolling Stage */}
        <div 
          ref={lyricContainerRef}
          className="flex-1 overflow-y-auto p-6 sm:p-12 space-y-7 text-center flex flex-col items-center custom-scrollbar relative selection:bg-pink-500 selection:text-white"
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Top spacer */}
          <div className="h-32 shrink-0" />

          {lyricsLines.map((line, index) => {
            const isActive = index === activeLineIndex;
            const isPast = index < activeLineIndex;

            return (
              <div
                key={line.id || `line-${index}`}
                ref={isActive ? activeLineRef : null}
                onClick={() => handleSeek(line.time)}
                className={`cursor-pointer transition-all duration-300 py-3.5 px-6 rounded-2xl max-w-2xl w-full ${
                  isActive
                    ? `${fontClasses} text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 font-extrabold scale-105 drop-shadow-[0_0_24px_rgba(244,63,94,0.45)] bg-neutral-900/80 border border-pink-500/40 shadow-xl`
                    : isPast
                    ? 'text-neutral-500 opacity-60 hover:opacity-100 text-lg sm:text-xl font-medium'
                    : 'text-neutral-400 opacity-80 hover:opacity-100 text-lg sm:text-xl font-medium'
                }`}
              >
                {line.section && isActive && (
                  <span className="block text-[11px] uppercase tracking-widest text-pink-400 font-bold mb-1">
                    [{line.section}]
                  </span>
                )}
                <span>{line.text}</span>
              </div>
            );
          })}

          {/* Bottom spacer */}
          <div className="h-48 shrink-0" />
        </div>

        {/* Bottom Playback & Subtitle Export Bar */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-md space-y-3.5">
          
          {/* Progress Timeline */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-neutral-400">
              <span className="tabular-nums">{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
              <span className="tabular-nums">{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full accent-pink-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleTogglePlay}
                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-500/25 transition-all active:scale-95 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                <span>{isPlaying ? 'Pause' : 'Sing Now'}</span>
              </button>

              <button
                onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                className="p-2 sm:p-2.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-all cursor-pointer text-xs font-mono font-bold"
                title="Rewind 5 Seconds"
              >
                -5s
              </button>

              <button
                onClick={() => handleSeek(Math.min(duration, currentTime + 5))}
                className="p-2 sm:p-2.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-all cursor-pointer text-xs font-mono font-bold"
                title="Forward 5 Seconds"
              >
                +5s
              </button>

              <button
                onClick={() => handleSeek(0)}
                className="p-2 sm:p-2.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-all cursor-pointer"
                title="Restart Song"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Subtitle & Lyrics Downloads */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleExportLrc}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-neutral-700 cursor-pointer"
                title="Download standard synchronized .LRC file"
              >
                <Download className="w-3.5 h-3.5 text-pink-400" />
                <span>.LRC<span className="hidden sm:inline"> Synced</span></span>
              </button>
              <button
                onClick={handleExportSrt}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-neutral-700 cursor-pointer"
                title="Download video subtitle .SRT file"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>.SRT<span className="hidden sm:inline"> Subtitles</span></span>
              </button>
              <button
                onClick={handleExportTxt}
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-neutral-700 cursor-pointer"
                title="Download plain lyrics text file"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>.TXT</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
