import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, 
  Volume2, Volume1, Volume, VolumeX, Download, Heart, Mic2, Mic, MicOff, Orbit, 
  Sliders, Maximize2, Minimize2, Layers, ChevronUp, ChevronDown, Check, 
  Gauge, Share2, Music, Sparkles, Disc, FileText, RefreshCw, X, Radio,
  Tv, Film, ListMusic, ListPlus, RadioTower
} from 'lucide-react';
import { SunoTrack, AudioFormat, UserSettings, KaraokeLyricLine } from '../types';
import { estimateMusicAttributes } from '../utils/musicAnalyzer';
import { 
  parseAndSyncLyrics, 
  generateLrcContent, 
  generateSrtContent, 
  downloadLyricsFile, 
  fetchTrackLyrics 
} from '../utils/lyricsSynchronizer';

export interface SpotifyPlayerBarProps {
  track: SunoTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  playbackRate: number;
  allTracks: SunoTrack[];
  settings: UserSettings;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onChangePlaybackRate: (rate: number) => void;
  onQuickDownload: (track: SunoTrack, format: AudioFormat) => void;
  onOpenStudioDaw: (track: SunoTrack) => void;
  onOpenKaraoke: (track: SunoTrack) => void;
  onOpenSpatial8D: (track: SunoTrack) => void;
  onOpenDjCreative?: () => void;
  onOpenVideoMaker?: (track: SunoTrack) => void;
  onTrackUpdate?: (track: SunoTrack) => void;
  onClose?: () => void;
}

export const SpotifyPlayerBar: React.FC<SpotifyPlayerBarProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  playbackRate,
  allTracks,
  settings,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onNextTrack,
  onPrevTrack,
  onToggleShuffle,
  onToggleRepeat,
  onChangePlaybackRate,
  onQuickDownload,
  onOpenStudioDaw,
  onOpenKaraoke,
  onOpenSpatial8D,
  onOpenDjCreative,
  onOpenVideoMaker,
  onTrackUpdate,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showLyricsDock, setShowLyricsDock] = useState(false);
  const [isExpandedMobile, setIsExpandedMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<'player' | 'lyrics' | 'suite'>('player');
  const [isHoveringScrubber, setIsHoveringScrubber] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPositionX, setHoverPositionX] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live Lyrics & Karaoke states inside the dock
  const [lyricsLines, setLyricsLines] = useState<KaraokeLyricLine[]>([]);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [karaokeMicActive, setKaraokeMicActive] = useState(false);
  const [karaokeVocalFilter, setKaraokeVocalFilter] = useState(false);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const dockLyricsContainerRef = useRef<HTMLDivElement>(null);
  const dockActiveLineRef = useRef<HTMLDivElement>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sync liked songs in local storage
  useEffect(() => {
    if (!track) return;
    try {
      const likedList = JSON.parse(localStorage.getItem('suno_liked_tracks') || '[]');
      setIsLiked(likedList.includes(track.id));
    } catch {
      setIsLiked(false);
    }
  }, [track?.id]);

  // Sync lyrics when track changes
  useEffect(() => {
    if (track) {
      const parsed = parseAndSyncLyrics(track);
      setLyricsLines(parsed);
    }
  }, [track?.id, track?.prompt]);

  // Auto-scroll active lyric line in dock
  useEffect(() => {
    if (showLyricsDock && dockActiveLineRef.current && dockLyricsContainerRef.current) {
      dockActiveLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime, showLyricsDock]);

  // Cleanup mic when dock closes or unmounts
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
    };
  }, []);

  const toggleLike = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!track) return;
    try {
      const likedList = JSON.parse(localStorage.getItem('suno_liked_tracks') || '[]');
      let updated: string[];
      if (likedList.includes(track.id)) {
        updated = likedList.filter((id: string) => id !== track.id);
        setIsLiked(false);
      } else {
        updated = [...likedList, track.id];
        setIsLiked(true);
      }
      localStorage.setItem('suno_liked_tracks', JSON.stringify(updated));
    } catch {}
  };

  const handleCopyLink = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!track) return;
    navigator.clipboard.writeText(`https://suno.com/song/${track.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFetchLyricsOnline = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
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
        setTimeout(() => setFetchSuccess(false), 2500);
      }
    } catch (err) {
      console.warn('Could not retrieve lyrics online:', err);
    } finally {
      setIsFetchingLyrics(false);
    }
  };

  const toggleSingAlongMic = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (karaokeMicActive) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      setKaraokeMicActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = audioContextRef.current || new AudioCtx();
        audioContextRef.current = ctx;

        const micSource = ctx.createMediaStreamSource(stream);
        const micGain = ctx.createGain();
        micGain.gain.value = 1.0;
        micSource.connect(micGain);
        micGain.connect(ctx.destination);
        setKaraokeMicActive(true);
      } catch (err: any) {
        console.warn('Microphone error:', err.message);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentDuration = duration > 0 ? duration : (track?.duration || 180);
  const progressPercent = Math.min(100, Math.max(0, (currentTime / (currentDuration || 1)) * 100));

  // Scrubber click / drag
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || !currentDuration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const newPercent = clickX / rect.width;
    onSeek(newPercent * currentDuration);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || !currentDuration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const newPercent = clickX / rect.width;
    setHoverPositionX(clickX);
    setHoverTime(newPercent * currentDuration);
  };

  // Interactive Mouse Wheel Volume Adjustment
  const handleVolumeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const current = isMuted ? 0 : volume;
    const next = Math.max(0, Math.min(1, Math.round((current + delta) * 100) / 100));
    onVolumeChange(next);
  };

  if (!track) return null;

  const analysis = estimateMusicAttributes(track);

  const activeLineIndex = lyricsLines.findIndex((line, idx) => {
    const nextLine = lyricsLines[idx + 1];
    if (nextLine) {
      return currentTime >= line.time && currentTime < nextLine.time;
    }
    return currentTime >= line.time;
  });

  return (
    <>
      {/* ================= 1. DOCKED KARAOKE & SYNCHRONIZED LYRICS DRAWER ================= */}
      {showLyricsDock && (
        <div 
          id="spotify-docked-lyrics-drawer"
          className="fixed bottom-[88px] right-4 sm:right-6 md:right-8 z-40 w-[94vw] sm:w-[480px] md:w-[540px] max-h-[65vh] h-[480px] bg-[#101015]/95 backdrop-blur-2xl border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
          style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.8)' }}
        >
          {/* Header Strip */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
                <Mic2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <span>Synced Lyrics & Karaoke</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono">
                    {analysis.camelot}
                  </span>
                </h4>
                <p className="text-[11px] text-neutral-400 truncate">{track.title} &bull; {track.artist}</p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Retrieve Suno Lyrics */}
              <button
                onClick={handleFetchLyricsOnline}
                disabled={isFetchingLyrics}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Retrieve latest lyrics from Suno"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLyrics ? 'animate-spin text-pink-400' : ''}`} />
              </button>

              {/* Sing-Along Mic */}
              <button
                onClick={toggleSingAlongMic}
                className={`p-1.5 rounded-lg transition-colors ${
                  karaokeMicActive 
                    ? 'text-pink-400 bg-pink-500/20 border border-pink-500/40 animate-pulse' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
                title={karaokeMicActive ? 'Mic Active' : 'Enable Sing-Along Mic'}
              >
                {karaokeMicActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>

              {/* Fullscreen Stage Mode */}
              <button
                onClick={() => {
                  setShowLyricsDock(false);
                  onOpenKaraoke(track);
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Open Fullscreen Teleprompter Stage"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Close Dock */}
              <button
                onClick={() => setShowLyricsDock(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Synchronized Lyrics Scrolling Body */}
          <div 
            ref={dockLyricsContainerRef}
            className="flex-1 overflow-y-auto px-6 py-8 space-y-5 text-center custom-scrollbar selection:bg-pink-500 selection:text-white"
          >
            {/* Top Spacer */}
            <div className="h-16" />

            {lyricsLines.map((line, idx) => {
              const isActive = idx === activeLineIndex;
              const isPast = idx < activeLineIndex;

              return (
                <div
                  key={line.id || `dock-line-${idx}`}
                  ref={isActive ? dockActiveLineRef : null}
                  onClick={() => onSeek(line.time)}
                  className={`cursor-pointer transition-all duration-200 py-2 px-3 rounded-xl ${
                    isActive
                      ? 'text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 scale-105 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)] bg-neutral-900/80 border border-pink-500/30'
                      : isPast
                      ? 'text-sm md:text-base font-medium text-neutral-500 opacity-60 hover:opacity-100 hover:text-neutral-300'
                      : 'text-sm md:text-base font-medium text-neutral-400 opacity-80 hover:opacity-100 hover:text-white'
                  }`}
                >
                  {line.section && isActive && (
                    <span className="block text-[10px] uppercase tracking-widest text-pink-400 font-bold mb-0.5">
                      [{line.section}]
                    </span>
                  )}
                  <span>{line.text}</span>
                </div>
              );
            })}

            {/* Bottom Spacer */}
            <div className="h-24" />
          </div>

          {/* Dock Footer with Quick Downloads */}
          <div className="px-5 py-2.5 border-t border-neutral-800/80 bg-neutral-900/80 backdrop-blur-md flex items-center justify-between text-xs text-neutral-400">
            <span className="font-mono tabular-nums text-[11px]">
              {formatTime(currentTime)} / {formatTime(currentDuration)}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadLyricsFile(track, 'lrc')}
                className="hover:text-pink-400 transition-colors font-bold text-[11px]"
                title="Download synced .LRC"
              >
                .LRC
              </button>
              <span>•</span>
              <button
                onClick={() => downloadLyricsFile(track, 'srt')}
                className="hover:text-amber-400 transition-colors font-bold text-[11px]"
                title="Download subtitle .SRT"
              >
                .SRT
              </button>
              <span>•</span>
              <button
                onClick={() => downloadLyricsFile(track, 'txt')}
                className="hover:text-blue-400 transition-colors font-bold text-[11px]"
                title="Download plain .TXT"
              >
                .TXT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. SPOTIFY DESKTOP PLAYER BAR ================= */}
      <footer 
        id="spotify-bottom-player-desktop"
        className="hidden md:flex fixed bottom-0 left-0 right-0 z-50 h-[88px] bg-[#121216]/98 backdrop-blur-2xl border-t border-[#24242c] px-4 lg:px-6 items-center justify-between text-neutral-200 select-none shadow-2xl transition-all"
        style={{ boxShadow: '0 -8px 24px -4px rgba(0, 0, 0, 0.6)' }}
      >
        {/* Top Glowing Micro-Progress Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-neutral-800">
          <div 
            className="h-full bg-gradient-to-r from-[#ff2d55] via-rose-500 to-amber-500 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ---------------- LEFT: TRACK INFO & METRICS ---------------- */}
        <div className="flex items-center gap-3.5 w-[30%] min-w-[220px] max-w-[380px]">
          {/* Artwork Thumbnail */}
          <div 
            className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700/60 group shadow-md cursor-pointer"
            onClick={() => onOpenStudioDaw(track)}
            title="Open in Studio DAW"
          >
            <img 
              src={track.image_url} 
              alt={track.title} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex items-end gap-1 h-4">
                  <span className="w-1 bg-[#ff2d55] rounded-full animate-bounce h-3" />
                  <span className="w-1 bg-rose-400 rounded-full animate-bounce h-4 delay-75" />
                  <span className="w-1 bg-amber-400 rounded-full animate-bounce h-2 delay-150" />
                </div>
              </div>
            )}
          </div>

          {/* Title, Artist, Camelot & BPM Badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 
                onClick={() => onOpenStudioDaw(track)}
                className="font-bold text-sm text-white truncate hover:text-[#ff2d55] transition-colors cursor-pointer"
                title={track.title}
              >
                {track.title}
              </h4>
            </div>
            
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              {track.artist}
            </p>

            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-block px-1.5 py-0.2 text-[10px] font-mono font-bold bg-neutral-800 text-amber-400 rounded border border-neutral-700/50">
                {analysis.camelot}
              </span>
              <span className="inline-block px-1.5 py-0.2 text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 rounded border border-neutral-700/50">
                {analysis.bpm} BPM
              </span>
              {track.model && (
                <span className="hidden xl:inline-block px-1.5 py-0.2 text-[10px] font-bold bg-rose-950/40 text-rose-300 rounded border border-rose-800/40">
                  {track.model}
                </span>
              )}
            </div>
          </div>

          {/* Like Heart Button */}
          <button
            id="spotify-player-like-btn"
            onClick={toggleLike}
            className={`p-2 rounded-full transition-transform active:scale-75 cursor-pointer ${
              isLiked ? 'text-[#ff2d55]' : 'text-neutral-400 hover:text-white'
            }`}
            title={isLiked ? 'Remove from Liked' : 'Save to Liked Songs'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#ff2d55]' : ''}`} />
          </button>
        </div>

        {/* ---------------- CENTER: MAIN TRANSPORT & SCRUBBER ---------------- */}
        <div className="flex flex-col items-center justify-center w-[40%] max-w-[620px] px-2">
          {/* Controls row */}
          <div className="flex items-center gap-4 lg:gap-6 mb-1.5">
            {/* Shuffle */}
            <button
              id="spotify-player-shuffle-btn"
              onClick={onToggleShuffle}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                isShuffle ? 'text-[#ff2d55] drop-shadow-[0_0_8px_rgba(255,45,85,0.6)]' : 'text-neutral-400 hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle Enabled' : 'Enable Shuffle'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              id="spotify-player-prev-btn"
              onClick={onPrevTrack}
              className="p-1.5 text-neutral-300 hover:text-white transition-all active:scale-90 cursor-pointer"
              title="Previous Track (J)"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              id="spotify-player-play-btn"
              onClick={onTogglePlay}
              className="w-10 h-10 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black translate-x-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              id="spotify-player-next-btn"
              onClick={onNextTrack}
              className="p-1.5 text-neutral-300 hover:text-white transition-all active:scale-90 cursor-pointer"
              title="Next Track (K)"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat */}
            <button
              id="spotify-player-repeat-btn"
              onClick={onToggleRepeat}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                repeatMode !== 'off' ? 'text-[#ff2d55] drop-shadow-[0_0_8px_rgba(255,45,85,0.6)]' : 'text-neutral-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Scrubber & Time Display */}
          <div className="w-full flex items-center gap-3 text-xs font-mono text-neutral-400">
            <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
            
            <div 
              ref={scrubberRef}
              onClick={handleScrubberClick}
              onMouseMove={handleScrubberMouseMove}
              onMouseEnter={() => setIsHoveringScrubber(true)}
              onMouseLeave={() => setIsHoveringScrubber(false)}
              className="relative flex-1 h-3 flex items-center group cursor-pointer"
            >
              {/* Background Track */}
              <div className="w-full h-1 bg-neutral-700/80 rounded-full overflow-hidden group-hover:h-1.5 transition-all">
                <div 
                  className="h-full bg-gradient-to-r from-rose-500 to-[#ff2d55] rounded-full group-hover:bg-gradient-to-r group-hover:from-rose-400 group-hover:to-pink-400"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Progress Knob */}
              <div 
                className="absolute w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 -translate-x-1/2 transition-opacity pointer-events-none"
                style={{ left: `${progressPercent}%` }}
              />

              {/* Hover Time Tooltip */}
              {isHoveringScrubber && hoverTime !== null && (
                <div 
                  className="absolute bottom-4 -translate-x-1/2 bg-black/90 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white border border-neutral-700 pointer-events-none shadow"
                  style={{ left: `${hoverPositionX}px` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            <span className="w-10 text-left tabular-nums">{formatTime(currentDuration)}</span>
          </div>
        </div>

        {/* ---------------- RIGHT: MERGED APP FUNCTIONS & SOUND VOLUME ---------------- */}
        <div className="flex items-center gap-1.5 lg:gap-2.5 shrink-0 justify-end relative">
          
          {/* 1. SYNCED LYRICS & KARAOKE TOGGLE */}
          <button
            id="spotify-player-lyrics-btn"
            onClick={() => setShowLyricsDock(!showLyricsDock)}
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              showLyricsDock 
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/30' 
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80'
            }`}
            title="Toggle Live Synced Lyrics & Karaoke"
          >
            <Mic2 className="w-4 h-4 text-pink-400" />
            <span className="hidden xl:inline">Lyrics</span>
          </button>

          {/* 2. 360° 8D SPATIAL AUDIO */}
          <button
            id="spotify-player-spatial-btn"
            onClick={() => onOpenSpatial8D(track)}
            className="p-2 rounded-xl text-neutral-400 hover:text-indigo-400 hover:bg-neutral-800/80 transition-all cursor-pointer"
            title="360° 8D Spatial Audio"
          >
            <Orbit className="w-4 h-4" />
          </button>

          {/* 3. PLAYBACK SPEED SELECTOR */}
          <div className="relative">
            <button
              id="spotify-player-speed-btn"
              type="button"
              onClick={() => {
                setShowSpeedMenu(!showSpeedMenu);
                setShowFormatMenu(false);
              }}
              className="px-2 py-1.5 rounded-lg text-xs font-mono font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Playback Speed"
            >
              {playbackRate}x
            </button>

            {showSpeedMenu && (
              <div 
                className="absolute bottom-12 right-0 bg-[#16161c] border border-neutral-700 rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1 min-w-[75px] animate-in slide-in-from-bottom-2 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      onChangePlaybackRate(rate);
                      setShowSpeedMenu(false);
                    }}
                    className={`px-3 py-1 rounded text-xs font-mono text-left transition-colors cursor-pointer ${
                      playbackRate === rate ? 'bg-[#ff2d55] text-white font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. QUICK AUDIO FORMAT DOWNLOADER */}
          <div className="relative">
            <button
              id="spotify-player-download-btn"
              type="button"
              onClick={() => {
                setShowFormatMenu(!showFormatMenu);
                setShowSpeedMenu(false);
              }}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-all cursor-pointer"
              title="Download Audio Format"
            >
              <Download className="w-4 h-4" />
            </button>

            {showFormatMenu && (
              <div 
                className="absolute bottom-12 right-0 w-44 bg-[#16161c] border border-neutral-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in slide-in-from-bottom-2 duration-150 space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                  Export Lossless / HD
                </div>
                {(['mp3', 'wav', 'flac', 'aac', 'ogg'] as AudioFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      onQuickDownload(track, fmt);
                      setShowFormatMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs uppercase font-bold text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>{fmt}</span>
                    <span className="text-[10px] text-neutral-500 lowercase">
                      {fmt === 'wav' || fmt === 'flac' ? 'Lossless' : '320k'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5. COPY LINK / SHARE */}
          <button
            id="spotify-player-share-btn"
            type="button"
            onClick={handleCopyLink}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-all cursor-pointer hidden sm:flex items-center justify-center"
            title="Copy Suno Song Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* 6. FULLY INTERACTIVE SOUND VOLUME CONTROLLER */}
          <div 
            onWheel={handleVolumeWheel}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-all select-none group shadow-inner"
            title="Interactive Master Volume (Scroll or drag slider)"
          >
            {/* Mute / Unmute Button */}
            <button
              id="spotify-player-mute-btn"
              type="button"
              onClick={onToggleMute}
              className="text-neutral-400 hover:text-white transition-colors p-1 cursor-pointer shrink-0 active:scale-90"
              title={isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-500 animate-pulse" />
              ) : volume < 0.35 ? (
                <Volume className="w-4 h-4 text-neutral-300" />
              ) : volume < 0.75 ? (
                <Volume1 className="w-4 h-4 text-neutral-200" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {/* Direct Interactive HTML5 Range Slider */}
            <div className="relative flex items-center w-20 sm:w-24 md:w-28 lg:w-32 h-5">
              <input 
                id="spotify-player-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onVolumeChange(val);
                }}
                className="w-full h-1.5 hover:h-2 rounded-full appearance-none cursor-pointer accent-[#ff2d55] bg-neutral-800 transition-all"
                style={{
                  background: isMuted || volume === 0 
                    ? '#525252' 
                    : `linear-gradient(to right, #ff2d55 0%, #ff2d55 ${volume * 100}%, #262626 ${volume * 100}%, #262626 100%)`
                }}
                aria-label="Master Sound Volume"
              />
            </div>

            {/* Live Percentage / Quick Toggle */}
            <button
              id="spotify-player-volume-pct-btn"
              type="button"
              onClick={() => {
                if (isMuted || volume === 0) {
                  onVolumeChange(0.75);
                } else if (volume >= 0.95) {
                  onVolumeChange(0.5);
                } else {
                  onVolumeChange(1.0);
                }
              }}
              className="text-[11px] font-mono font-bold text-neutral-400 group-hover:text-white hover:text-[#ff2d55] transition-colors w-8 text-right cursor-pointer shrink-0"
              title="Click to toggle volume (100% / 50%)"
            >
              {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
            </button>
          </div>
        </div>
      </footer>

      {/* ================= 3. SPOTIFY MOBILE COMPACT BAR ================= */}
      <div 
        id="spotify-mobile-floating-player"
        onClick={() => setIsExpandedMobile(true)}
        className="md:hidden fixed bottom-[64px] left-2 right-2 z-40 bg-[#16161c]/95 backdrop-blur-xl border border-neutral-700/70 rounded-2xl p-2 shadow-2xl flex items-center justify-between gap-3 text-white animate-in slide-in-from-bottom-2 duration-150 cursor-pointer select-none"
      >
        {/* Micro Progress Line on Top of Mobile Bar */}
        <div className="absolute top-0 left-3 right-3 h-[2px] bg-neutral-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#ff2d55] transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Artwork + Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-neutral-800 shrink-0">
            <img 
              src={track.image_url} 
              alt={track.title} 
              className="w-full h-full object-cover" 
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex items-end gap-[2px] h-3">
                  <span className="w-0.5 bg-white animate-bounce h-2" />
                  <span className="w-0.5 bg-white animate-bounce h-3 delay-75" />
                  <span className="w-0.5 bg-white animate-bounce h-1.5 delay-150" />
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs text-white truncate">{track.title}</h4>
            <p className="text-[11px] text-neutral-400 truncate">{track.artist} • {analysis.camelot}</p>
          </div>
        </div>

        {/* Mobile Quick Action Buttons */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onOpenKaraoke(track)}
            className="p-2 rounded-full text-pink-400 active:scale-75 transition-transform"
            title="Lyrics & Karaoke"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            onClick={toggleLike}
            className={`p-2 rounded-full transition-transform active:scale-75 ${
              isLiked ? 'text-[#ff2d55]' : 'text-neutral-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#ff2d55]' : ''}`} />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow active:scale-90 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black translate-x-0.5" />
            )}
          </button>

          <button
            onClick={onNextTrack}
            className="p-2 text-neutral-300 active:scale-90 transition-all"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>

      {/* ================= 4. MOBILE FULL-SCREEN EXPANDED NOW PLAYING MODAL ================= */}
      {isExpandedMobile && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#0d0d11] text-white flex flex-col p-5 animate-in slide-in-from-bottom duration-200 overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => setIsExpandedMobile(false)}
              className="p-2 text-neutral-400 hover:text-white"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <div className="flex items-center bg-neutral-900 rounded-xl p-1 border border-neutral-800">
              <button
                onClick={() => setMobileTab('player')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  mobileTab === 'player' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400'
                }`}
              >
                Player
              </button>
              <button
                onClick={() => setMobileTab('lyrics')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  mobileTab === 'lyrics' ? 'bg-pink-600 text-white' : 'text-neutral-400'
                }`}
              >
                Lyrics
              </button>
              <button
                onClick={() => setMobileTab('suite')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  mobileTab === 'suite' ? 'bg-amber-600 text-white' : 'text-neutral-400'
                }`}
              >
                Suite
              </button>
            </div>
            <button onClick={handleCopyLink} className="p-2 text-neutral-400 hover:text-white">
              {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
            </button>
          </div>

          {/* TAB 1: Main Player View */}
          {mobileTab === 'player' && (
            <div className="flex-1 flex flex-col justify-between py-2">
              {/* Artwork */}
              <div className="my-auto max-w-xs mx-auto aspect-square w-full rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 relative">
                <img 
                  src={track.image_url} 
                  alt={track.title} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-mono font-bold text-amber-400 border border-neutral-700/60">
                  {analysis.camelot} • {analysis.bpm} BPM
                </div>
              </div>

              {/* Title & Like */}
              <div className="flex items-center justify-between mb-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold truncate text-white">{track.title}</h2>
                  <p className="text-sm text-neutral-400 truncate">{track.artist}</p>
                </div>
                <button onClick={toggleLike} className="p-2 text-[#ff2d55]">
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-[#ff2d55]' : ''}`} />
                </button>
              </div>

              {/* Scrubber */}
              <div className="space-y-1 mb-6">
                <input 
                  type="range"
                  min="0"
                  max={currentDuration}
                  value={currentTime}
                  onChange={(e) => onSeek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-700 rounded-full appearance-none accent-[#ff2d55]"
                />
                <div className="flex justify-between text-xs font-mono text-neutral-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(currentDuration)}</span>
                </div>
              </div>

              {/* Main Transport */}
              <div className="flex items-center justify-between mb-4 px-4">
                <button onClick={onToggleShuffle} className={`p-2 ${isShuffle ? 'text-[#ff2d55]' : 'text-neutral-400'}`}>
                  <Shuffle className="w-5 h-5" />
                </button>
                <button onClick={onPrevTrack} className="p-2 text-white active:scale-90 transition-transform">
                  <SkipBack className="w-7 h-7 fill-current" />
                </button>
                <button 
                  onClick={onTogglePlay} 
                  className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                >
                  {isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black translate-x-0.5" />}
                </button>
                <button onClick={onNextTrack} className="p-2 text-white active:scale-90 transition-transform">
                  <SkipForward className="w-7 h-7 fill-current" />
                </button>
                <button onClick={onToggleRepeat} className={`p-2 ${repeatMode !== 'off' ? 'text-[#ff2d55]' : 'text-neutral-400'}`}>
                  {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
              </div>

              {/* High-Precision Sound Volume Control Bar */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2 mb-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-neutral-300 font-bold">
                    <button 
                      onClick={onToggleMute}
                      className="p-1 rounded-lg bg-neutral-800 text-neutral-200 active:scale-90 transition-transform"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-500" />
                      ) : volume < 0.35 ? (
                        <Volume className="w-4 h-4 text-neutral-300" />
                      ) : volume < 0.75 ? (
                        <Volume1 className="w-4 h-4 text-neutral-200" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                    <span>Sound Volume</span>
                  </div>
                  <span className="font-mono font-bold text-neutral-300">
                    {isMuted ? 'Muted (0%)' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>

                {/* Touch Slider */}
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onVolumeChange(val);
                  }}
                  className="w-full h-3 bg-neutral-800 rounded-full appearance-none accent-[#ff2d55] cursor-pointer"
                  style={{
                    background: isMuted || volume === 0 
                      ? '#525252' 
                      : `linear-gradient(to right, #ff2d55 0%, #ff2d55 ${volume * 100}%, #262626 ${volume * 100}%, #262626 100%)`
                  }}
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[
                    { label: 'Mute', val: 0 },
                    { label: '25%', val: 0.25 },
                    { label: '50%', val: 0.5 },
                    { label: '75%', val: 0.75 },
                    { label: '100%', val: 1.0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (preset.val === 0) {
                          if (!isMuted) onToggleMute();
                        } else {
                          onVolumeChange(preset.val);
                        }
                      }}
                      className={`py-1 rounded-lg text-[10px] font-bold font-mono transition-colors ${
                        (preset.val === 0 && isMuted) || (!isMuted && Math.abs(volume - preset.val) < 0.05)
                          ? 'bg-[#ff2d55] text-white'
                          : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Synced Lyrics View */}
          {mobileTab === 'lyrics' && (
            <div className="flex-1 flex flex-col justify-between py-2 min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs text-neutral-400 font-bold">Live Synced Teleprompter</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFetchLyricsOnline}
                    className="text-xs text-pink-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingLyrics ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsExpandedMobile(false);
                      onOpenKaraoke(track);
                    }}
                    className="text-xs text-neutral-300 hover:text-white flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Stage</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-6 space-y-4 text-center custom-scrollbar">
                {lyricsLines.map((line, idx) => {
                  const isActive = idx === activeLineIndex;
                  return (
                    <div
                      key={line.id || `m-line-${idx}`}
                      onClick={() => onSeek(line.time)}
                      className={`cursor-pointer transition-all py-2 px-3 rounded-xl ${
                        isActive 
                          ? 'text-lg font-black text-pink-400 bg-neutral-900 border border-pink-500/30' 
                          : 'text-sm text-neutral-400 opacity-70'
                      }`}
                    >
                      {line.section && isActive && (
                        <span className="block text-[9px] uppercase tracking-widest text-pink-500 font-bold">
                          [{line.section}]
                        </span>
                      )}
                      <span>{line.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Scrubber inside lyrics tab */}
              <div className="pt-2 border-t border-neutral-800">
                <input 
                  type="range"
                  min="0"
                  max={currentDuration}
                  value={currentTime}
                  onChange={(e) => onSeek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-700 rounded-full appearance-none accent-pink-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Audio Effects & Tools */}
          {mobileTab === 'suite' && (
            <div className="flex-1 flex flex-col justify-start py-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Audio Suite & Visuals</h3>

              <button 
                onClick={() => {
                  setIsExpandedMobile(false);
                  onOpenSpatial8D(track);
                }}
                className="w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-3 text-left cursor-pointer hover:bg-neutral-800/80 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Orbit className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">360° 8D Spatial Audio</h4>
                  <p className="text-xs text-neutral-400">Orbital panning, binaural HRTF & cathedral reverb</p>
                </div>
              </button>

              <button 
                onClick={() => {
                  setIsExpandedMobile(false);
                  onOpenKaraoke(track);
                }}
                className="w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-3 text-left"
              >
                <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400">
                  <Mic2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Cinema Karaoke Stage</h4>
                  <p className="text-xs text-neutral-400">Fullscreen teleprompter, pass-thru mic & vocal isolation</p>
                </div>
              </button>

              {onOpenVideoMaker && (
                <button 
                  onClick={() => {
                    setIsExpandedMobile(false);
                    onOpenVideoMaker(track);
                  }}
                  className="w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-3 text-left"
                >
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Social Video Visualizer</h4>
                    <p className="text-xs text-neutral-400">Render 9:16 reels, 16:9 4K audio spectrums</p>
                  </div>
                </button>
              )}
            </div>
          )}

        </div>
      )}
    </>
  );
};
