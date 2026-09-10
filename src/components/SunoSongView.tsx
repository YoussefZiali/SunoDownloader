import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Download, Volume2, VolumeX, RotateCcw, RotateCw, Repeat, 
  Share2, Check, Copy, Sparkles, Music2, Disc3, Video,
  Loader2, ExternalLink, ArrowLeft, Clipboard, ListMusic, 
  Sliders, ShieldCheck, FolderArchive, ArrowRight, Music, AlertCircle,
  Layers, History, Scissors, Tag, CheckCircle2, X
} from 'lucide-react';
import { 
  SunoTrack, SunoPlaylist, AudioFormat, UserSettings, 
  TrackMetadataCustomization, AudioClipRange, BatchDownloadStatus 
} from '../types';
import { BEST_OF_V6_PLAYLIST } from '../data/bestOfV6Playlist';
import { BatchProgressBar } from './BatchProgressBar';
import { Footer } from './Footer';

interface SunoSongViewProps {
  currentTrack: SunoTrack | null;
  currentPlaylist: SunoPlaylist | null;
  onFetchUrl: (urlOrId: string) => Promise<void>;
  isLoadingUrl: boolean;
  errorMessage: string | null;
  onReset: () => void;
  onDownloadTrack: (track: SunoTrack, format: AudioFormat, options?: any) => Promise<void>;
  onDownloadBatchZip: (tracks: SunoTrack[], format: AudioFormat) => Promise<void>;
  downloadProgress: { [key: string]: number };
  activeDownloadingFormat: string | null;
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onSelectPlaylistTrack: (track: SunoTrack) => void;
  onOpenBulkImporter: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenTrimmer: () => void;
  onOpenMetadataEditor: () => void;
  historyCount: number;
  customMetadata?: TrackMetadataCustomization;
  clipRange?: AudioClipRange;
  batchStatus?: BatchDownloadStatus;
  onCancelBatchZip?: () => void;
}

export const SunoSongView: React.FC<SunoSongViewProps> = ({
  currentTrack,
  currentPlaylist,
  onFetchUrl,
  isLoadingUrl,
  errorMessage,
  onReset,
  onDownloadTrack,
  onDownloadBatchZip,
  downloadProgress,
  activeDownloadingFormat,
  settings,
  onUpdateSettings,
  onSelectPlaylistTrack,
  onOpenBulkImporter,
  onOpenHistory,
  onOpenSettings,
  onOpenTrimmer,
  onOpenMetadataEditor,
  historyCount,
  customMetadata,
  clipRange,
  batchStatus,
  onCancelBatchZip,
}) => {
  // Input state
  const [urlInput, setUrlInput] = useState('');
  
  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentTrack?.duration || 180);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [useEmbedPlayer, setUseEmbedPlayer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  // Sync audio when current track changes
  useEffect(() => {
    if (!currentTrack) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setIsBuffering(false);
      setPlaybackError(null);
      setCurrentTime(0);
      return;
    }

    setCurrentTime(0);
    setIsPlaying(false);
    setIsBuffering(false);
    setPlaybackError(null);
    setDuration(currentTrack.duration || 180);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      const playSrc = (currentTrack.audio_url && currentTrack.audio_url.startsWith('http'))
        ? currentTrack.audio_url
        : (currentTrack.id ? `/api/suno/stream/${currentTrack.id}.mp3` : `https://cdn1.suno.ai/${currentTrack.id}.mp3`);
      audioRef.current.src = playSrc;
      audioRef.current.load();
    }
  }, [currentTrack?.id, currentTrack?.audio_url]);

  // Audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onWaiting = () => {
      setIsBuffering(true);
    };

    const onCanPlay = () => {
      setIsBuffering(false);
      setPlaybackError(null);
    };

    const onPlaying = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      setPlaybackError(null);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onError = () => {
      console.warn('Audio playback error triggered, checking stream fallback');
      if (currentTrack?.id && audio.src && audio.src.includes('/api/suno/stream/')) {
        console.log('Falling back to proxy audio');
        audio.src = `/api/suno/proxy-audio?url=${encodeURIComponent(`https://cdn1.suno.ai/${currentTrack.id}.mp4`)}`;
        audio.load();
        audio.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
          setPlaybackError('Stream unavailable. Please verify network.');
        });
      } else if (audio.src && audio.src.includes('/api/suno/proxy-audio') && currentTrack?.audio_url) {
        console.log('Falling back to direct stream URL');
        audio.src = currentTrack.audio_url;
        audio.load();
        audio.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
          setPlaybackError('Stream unavailable. Please verify network or try another song.');
        });
      } else {
        setIsPlaying(false);
        setIsBuffering(false);
        setPlaybackError('Stream error. Click play to retry.');
      }
    };

    const onEnded = () => {
      if (isLooping) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        setIsPlaying(false);
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [isLooping, currentTrack]);

  // Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Play/pause
  const togglePlay = () => {
    if (!currentTrack) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(`/api/suno/proxy-audio?url=${encodeURIComponent(currentTrack.audio_url)}`);
    }

    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setPlaybackError(null);
      setIsBuffering(true);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          })
          .catch((err) => {
            console.warn('Play failed, attempting fallback stream:', err);
            if (audio.src.includes('/api/suno/proxy-audio') && currentTrack.audio_url) {
              audio.src = currentTrack.audio_url;
              audio.load();
              audio.play().then(() => {
                setIsPlaying(true);
                setIsBuffering(false);
              }).catch((e2) => {
                console.error('All stream playback attempts failed:', e2);
                setIsPlaying(false);
                setIsBuffering(false);
                setPlaybackError('Could not play stream. Please click to retry.');
              });
            } else {
              setIsPlaying(false);
              setIsBuffering(false);
              setPlaybackError('Could not play stream. Please click to retry.');
            }
          });
      }
    }
  };

  const handleSeek = (percentage: number) => {
    const newTime = Math.max(0, Math.min(duration, percentage * duration));
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Waveform click
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    handleSeek(pct);
  };

  // 52 visualizer bars
  const waveformBars = React.useMemo(() => {
    if (!currentTrack) return [];
    const seed = currentTrack.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return Array.from({ length: 52 }, (_, i) => {
      const val = Math.sin((i + seed * 0.1) * 0.4) * 0.4 + Math.cos((i * 1.5) * 0.3) * 0.3 + 0.35;
      return Math.max(0.18, Math.min(0.95, val));
    });
  }, [currentTrack?.id]);

  const copySongLink = () => {
    if (!currentTrack) return;
    const url = `https://suno.com/song/${currentTrack.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onFetchUrl(urlInput.trim());
    }
  };

  const currentProgressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ==========================================
  // VIEW 1: MAIN PAGE (Suno Downloader URL Input + Best of v6 Playlist directly underneath)
  // ==========================================
  if (!currentTrack) {
    const activePlaylist = currentPlaylist || BEST_OF_V6_PLAYLIST;

    return (
      <div className="w-full min-h-screen bg-[#0d0d0f] text-neutral-100 flex flex-col items-center selection:bg-[#ff2d55] selection:text-white pb-16">
        
        {/* Top SaaS Header */}
        <header className="w-full max-w-5xl px-4 sm:px-6 py-4 border-b border-neutral-800/80 bg-[#0d0d0f]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff2d55] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#ff2d55]/20">
              <Disc3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white tracking-tight">Suno Studio Pro</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  v2.4
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="header-bulk-import-btn"
              type="button"
              onClick={onOpenBulkImporter}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-xs font-bold text-neutral-200 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-[#ff2d55]" />
              <span className="hidden sm:inline">Bulk Importer</span>
            </button>

            <button
              id="header-history-btn"
              type="button"
              onClick={onOpenHistory}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-xs font-bold text-neutral-200 transition-all flex items-center gap-1.5 relative shadow-sm"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">History</span>
              {historyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#ff2d55] text-white text-[10px] font-mono font-bold">
                  {historyCount}
                </span>
              )}
            </button>

            <button
              id="header-settings-btn"
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-colors"
              title="Preferences & Audio Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="w-full max-w-4xl px-4 sm:px-6 py-8 space-y-10">
          
          {/* Top Section: Suno Downloader Input Hero */}
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ff2d55] to-amber-500 shadow-xl shadow-[#ff2d55]/20 mb-1">
                <Disc3 className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Suno Downloader
              </h1>
              
              <p className="text-neutral-400 text-sm max-w-md mx-auto leading-relaxed">
                Paste any Suno song or playlist link. The app will load the song to play with live waveform and download in high quality MP3 320 kbps.
              </p>
            </div>

            {/* Main Input Form Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800/90 shadow-2xl space-y-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <label htmlFor="suno-paste-input" className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Suno Song or Playlist URL
                </label>

                <div className="relative">
                  <input
                    id="suno-paste-input"
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste Suno link (e.g. suno.com/s/..., /playlist/..., /song/...)"
                    className="w-full pl-4 pr-24 py-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 focus:border-[#ff2d55] text-sm text-white placeholder:text-neutral-500 outline-none transition-all shadow-inner"
                    autoFocus
                  />

                  <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      title="Paste from clipboard"
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors flex items-center gap-1"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Paste</span>
                    </button>
                  </div>
                </div>

                {/* Error notification if fetch failed */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoadingUrl || !urlInput.trim()}
                  className="w-full py-3.5 rounded-2xl bg-[#ff2d55] hover:bg-[#e0264b] disabled:opacity-50 text-white font-extrabold text-sm tracking-wide transition-all shadow-lg shadow-[#ff2d55]/20 flex items-center justify-center gap-2"
                >
                  {isLoadingUrl ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching from Suno...</span>
                    </>
                  ) : (
                    <>
                      <span>Load Song or Playlist</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Action SaaS Ribbon */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onOpenBulkImporter}
                  className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 text-xs font-semibold text-neutral-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-[#ff2d55]" />
                  <span>Multi-URL Bulk Importer</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 text-xs font-semibold text-neutral-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Recent Downloads ({historyCount})</span>
                </button>
              </div>
            </div>

            {/* Supported Export Formats Note */}
            <div className="flex items-center justify-center gap-3 text-xs font-medium text-neutral-500">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                MP3 320 kbps (Active)
              </span>
              <span>•</span>
              <span className="text-neutral-500">WAV & FLAC (Coming Soon)</span>
              <span>•</span>
              <span>MP4 Video</span>
            </div>
          </div>

          {/* SECTION 2: BEST OF V6 PLAYLIST DIRECTLY UNDER SUNO DOWNLOADER */}
          <div className="space-y-6 pt-6 border-t border-neutral-800/80">
            {/* Playlist Header Card */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col sm:flex-row items-center gap-6">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800 shadow-lg relative group">
                <img
                  src={activePlaylist.cover_url || activePlaylist.tracks[0]?.image_url}
                  alt={activePlaylist.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] font-bold text-white px-2 py-1 rounded bg-black/60 backdrop-blur-xs">
                  <span>v6 Master</span>
                  <span>{activePlaylist.tracks.length} Songs</span>
                </div>
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ff2d55] px-2.5 py-0.5 rounded-full bg-[#ff2d55]/10 border border-[#ff2d55]/20 inline-block">
                    Featured Playlist
                  </span>
                  <span className="text-xs font-semibold text-neutral-400">
                    {activePlaylist.creator || 'Suno Editorial'} ({activePlaylist.tracks.length} Tracks)
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white">{activePlaylist.title}</h2>
                {activePlaylist.description && (
                  <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">{activePlaylist.description}</p>
                )}

                {/* Batch Actions */}
                <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    onClick={() => onSelectPlaylistTrack(activePlaylist.tracks[0])}
                    className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Play First Song</span>
                  </button>

                  <button
                    onClick={() => onDownloadBatchZip(activePlaylist.tracks, 'mp3')}
                    disabled={batchStatus?.isActive || activeDownloadingFormat !== null}
                    className="px-4 py-2 rounded-xl bg-[#ff2d55] hover:bg-[#e0264b] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-75"
                  >
                    {batchStatus?.isActive || activeDownloadingFormat === 'zip' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderArchive className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {batchStatus?.isActive
                        ? batchStatus.phase === 'zipping'
                          ? `Packaging ZIP (${batchStatus.percent}%)`
                          : `Processing ${batchStatus.completedTracks}/${batchStatus.totalTracks} (${batchStatus.percent}%)`
                        : 'Download All as ZIP (MP3)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Prominent Linear Progress Bar for Batch Downloads (Conversion & Zipping Stages) */}
            <BatchProgressBar batchStatus={batchStatus} onCancel={onCancelBatchZip} />

            {/* Track List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Songs in Playlist ({activePlaylist.tracks.length})
                </h3>
                <span className="text-[11px] text-neutral-500">
                  Click song to play with live waveform or download MP3
                </span>
              </div>

              <div className="space-y-2">
                {activePlaylist.tracks.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 flex items-center justify-between gap-3 transition-colors group/item"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-neutral-500 w-5 text-center">
                        {idx + 1}
                      </span>

                      <div
                        onClick={() => onSelectPlaylistTrack(t)}
                        className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-950 shrink-0 cursor-pointer relative group border border-neutral-800"
                        title="Click to play with waveform"
                      >
                        <img src={t.image_url} alt={t.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 fill-white" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div
                          onClick={() => onSelectPlaylistTrack(t)}
                          className="font-bold text-sm text-white truncate cursor-pointer hover:underline hover:text-[#ff2d55] transition-colors"
                        >
                          {t.title}
                        </div>
                        <div className="text-xs text-neutral-400 flex items-center gap-2">
                          <span className="text-neutral-300 font-medium">{t.artist}</span>
                          {t.handle && <span className="text-neutral-500">{t.handle}</span>}
                          <span>•</span>
                          <span className="font-mono text-[11px] text-neutral-400">{t.duration_formatted}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400">
                            v6
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Live Batch Status */}
                    <div className="flex items-center gap-2 shrink-0">
                      {batchStatus?.isActive && (
                        <div className="text-xs font-medium">
                          {batchStatus.completedTrackIds.includes(t.id) ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-1 font-semibold">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>In ZIP</span>
                            </span>
                          ) : batchStatus.currentTrackId === t.id ? (
                            <span className="px-2.5 py-1 rounded-lg bg-[#ff2d55]/20 border border-[#ff2d55]/40 text-[#ff2d55] flex items-center gap-1 font-bold animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Encoding...</span>
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-500 text-[11px]">
                              Queued
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => onSelectPlaylistTrack(t)}
                        className="p-2 rounded-xl bg-neutral-800 hover:bg-white hover:text-black text-neutral-300 transition-colors"
                        title="Play Song & Open Waveform"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDownloadTrack(t, 'mp3')}
                        className="px-3 py-1.5 rounded-xl bg-[#ff2d55]/15 hover:bg-[#ff2d55] text-[#ff2d55] hover:text-white border border-[#ff2d55]/30 hover:border-[#ff2d55] transition-colors text-xs font-bold flex items-center gap-1.5 shadow-xs"
                        title="Download MP3 320 kbps"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>MP3</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Global Footer */}
        <Footer 
          onOpenSettings={onOpenSettings}
          onOpenHistory={onOpenHistory}
          onOpenBulkImporter={onOpenBulkImporter}
        />
      </div>
    );
  }



  // ==========================================
  // VIEW 2: SINGLE SUNO SONG LOADED
  // ==========================================
  if (!currentTrack) return null;

  return (
    <div className="w-full min-h-screen bg-[#0d0d0f] text-neutral-100 flex flex-col items-center selection:bg-[#ff2d55] selection:text-white pb-12">
      {/* Hidden Native Audio Element */}
      <audio ref={audioRef} preload="metadata" />

      {/* Top Header Bar */}
      <header className="w-full max-w-4xl px-4 py-3.5 border-b border-neutral-800/80 bg-[#0d0d0f]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
        <button
          onClick={onReset}
          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Downloader & Playlist</span>
        </button>

        {/* Quick URL form right in header */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (urlInput.trim()) {
              onFetchUrl(urlInput.trim());
            }
          }}
          className="flex-1 max-w-sm hidden sm:flex items-center gap-2"
        >
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste another Suno URL..."
            className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-neutral-600 text-xs text-white placeholder:text-neutral-500 outline-none"
          />
          <button
            type="submit"
            disabled={isLoadingUrl || !urlInput.trim()}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold"
          >
            {isLoadingUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Go'}
          </button>
        </form>

        <div className="flex items-center gap-2">
          {currentPlaylist && (
            <button
              onClick={() => onSelectPlaylistTrack(null as any)}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-300 flex items-center gap-1"
            >
              <ListMusic className="w-3.5 h-3.5 text-[#ff2d55]" />
              <span className="hidden sm:inline">Playlist</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenBulkImporter}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Bulk Multi-URL Importer"
          >
            <Layers className="w-3.5 h-3.5 text-[#ff2d55]" />
            <span className="hidden md:inline">Bulk</span>
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors relative"
            title="Recent Downloads History"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#ff2d55] text-white text-[10px] font-mono font-bold">
                {historyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold transition-colors"
            title="Preferences & Formats"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={copySongLink}
            title="Share or Copy Link"
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl px-4 py-5 space-y-6">
        
        {/* Prominent Linear Progress Bar if Batch Download is active in background */}
        {batchStatus?.isActive && (
          <BatchProgressBar batchStatus={batchStatus} onCancel={onCancelBatchZip} />
        )}

        {/* SONG HERO CARD */}
        <section className="p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          {/* Subtle Ambient Glow */}
          <div 
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #ff2d55 0%, #ff8800 100%)' }}
          />

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
            {/* Artwork with Vinyl Spin and Play Toggle */}
            <div 
              className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-neutral-950 shrink-0 shadow-xl group border border-neutral-800 cursor-pointer"
              onClick={togglePlay}
            >
              <img
                src={currentTrack.image_url}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'group-hover:scale-105'}`}
              />

              {/* Overlay Play Indicator */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-black" />
                  ) : (
                    <Play className="w-6 h-6 fill-black translate-x-0.5" />
                  )}
                </div>
              </div>

              {/* Badges */}
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white text-[11px] font-bold">
                {currentTrack.duration_formatted}
              </span>

              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-neutral-900/90 border border-neutral-700 text-[10px] font-black uppercase text-neutral-200 tracking-wider">
                Suno {currentTrack.model || 'v6'}
              </span>
            </div>

            {/* Song Details */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                <span className="text-[#ff2d55] font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Loaded Suno Song
                </span>
                <span>•</span>
                <span>{currentTrack.duration_formatted}</span>
                <span>•</span>
                <span>Model {currentTrack.model || 'v6'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                {currentTrack.title}
              </h1>

              {/* Artist Info */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-white">
                  {currentTrack.artist.charAt(0)}
                </div>
                <span className="font-extrabold text-sm text-neutral-200">{currentTrack.artist}</span>
                <span className="text-xs text-neutral-500 font-medium">{currentTrack.handle}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              </div>

              {/* Tags */}
              {currentTrack.tags && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentTrack.tags.split(',').map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-md bg-neutral-800/80 text-neutral-300 text-xs font-semibold border border-neutral-700/60"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Counters */}
              <div className="flex items-center gap-4 text-xs font-bold text-neutral-400 pt-2 border-t border-neutral-800">
                <span>▶ {currentTrack.play_count || '1.2K'} Plays</span>
                <span>👍 {currentTrack.upvote_count || '84'} Likes</span>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE SOUND & WAVEFORM PLAYER */}
        <section className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          
          {/* Player Header & Mode Switcher */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Music2 className="w-3.5 h-3.5 text-[#ff2d55]" />
              <span>{useEmbedPlayer ? 'Official Suno Player' : 'Waveform Scrubber'}</span>
            </span>

            <button
              onClick={() => {
                if (isPlaying && audioRef.current) {
                  audioRef.current.pause();
                  setIsPlaying(false);
                }
                setUseEmbedPlayer(!useEmbedPlayer);
              }}
              className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors flex items-center gap-1.5 border border-neutral-700/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff2d55]" />
              <span>{useEmbedPlayer ? 'Use Waveform Player' : 'Official Suno Player'}</span>
            </button>
          </div>

          {useEmbedPlayer ? (
            /* Official Suno Embed Player - Works for all tracks including private/unlisted */
            <div className="rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800">
              <iframe
                src={`https://suno.com/embed/${currentTrack.id}`}
                width="100%"
                height="160"
                className="w-full border-0"
                allow="autoplay; encrypted-media; fullscreen"
                title={currentTrack.title}
              />
            </div>
          ) : (
            /* Standard Waveform Player */
            <>
              {/* Waveform Scrubber */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-400">
                  <span className="text-white">{formatSeconds(currentTime)}</span>
                  <span>{formatSeconds(duration)}</span>
                </div>

                {/* Waveform Bars */}
                <div
                  ref={waveformRef}
                  onClick={handleWaveformClick}
                  className="h-16 w-full flex items-center justify-between gap-1 cursor-pointer select-none group py-1"
                >
                  {waveformBars.map((height, i) => {
                    const barPct = (i / waveformBars.length) * 100;
                    const isPlayed = barPct <= currentProgressPct;

                    return (
                      <div key={i} className="flex-1 h-full flex items-center justify-center">
                        <div
                          style={{ height: `${height * 100}%` }}
                          className={`w-full rounded-full transition-all duration-75 ${
                            isPlayed
                              ? 'bg-[#ff2d55] group-hover:brightness-110'
                              : 'bg-neutral-800 group-hover:bg-neutral-700'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Range Track */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value) / (duration || 1))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#ff2d55]"
                />
              </div>

              {/* Master Player Controls */}
              <div className="flex items-center justify-between pt-2">
                
                {/* Loop Toggle */}
                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={`p-2.5 rounded-xl transition-colors ${
                    isLooping ? 'bg-[#ff2d55]/20 text-[#ff2d55]' : 'hover:bg-neutral-800 text-neutral-400'
                  }`}
                  title={isLooping ? 'Loop: ON' : 'Loop: OFF'}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                {/* Central Controls */}
                <div className="flex items-center gap-3 sm:gap-5">
                  <button
                    onClick={() => handleSkip(-10)}
                    className="p-2.5 rounded-full hover:bg-neutral-800 text-neutral-300 transition-colors"
                    title="Rewind 10s"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    id="main-suno-play-btn"
                    onClick={togglePlay}
                    disabled={isBuffering}
                    className="w-14 h-14 rounded-full bg-white text-black hover:bg-neutral-200 transition-all flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-75"
                  >
                    {isBuffering ? (
                      <Loader2 className="w-6 h-6 animate-spin text-black" />
                    ) : isPlaying ? (
                      <Pause className="w-6 h-6 fill-black" />
                    ) : (
                      <Play className="w-6 h-6 fill-black translate-x-0.5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSkip(10)}
                    className="p-2.5 rounded-full hover:bg-neutral-800 text-neutral-300 transition-colors"
                    title="Forward 10s"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-16 sm:w-20 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#ff2d55]"
                  />
                </div>
              </div>

              {/* Playback Error Alert */}
              {playbackError && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300">
                  <span>Direct audio stream unavailable. Switch to Official Suno Player.</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setUseEmbedPlayer(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors"
                    >
                      Open Official Player
                    </button>
                    <button
                      onClick={togglePlay}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* AUDIO STUDIO & DSP CUSTOMIZATION CARD */}
        <section className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">Audio Studio & DSP Customization</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ff2d55]/15 text-[#ff2d55] border border-[#ff2d55]/30">
                  PRO SUITE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Precision trimming, ID3v2.4 tags & album art editor, and broadcast loudness normalization
              </p>
            </div>

            {/* Active customizations badge summary */}
            {(Object.keys(customMetadata || {}).length > 0 || settings.volumeNormalization) && (
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                {Object.keys(customMetadata || {}).length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Custom Tags Active
                  </span>
                )}
                {settings.volumeNormalization && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    -14 LUFS Normalized
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Audio Trimmer & Ringtone Clipper */}
            <button
              id="open-audio-trimmer-btn"
              type="button"
              onClick={onOpenTrimmer}
              className="p-3.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800/90 border border-neutral-800/90 hover:border-neutral-700 text-left transition-all active:scale-98 group flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#ff2d55]" />
                  <span className="font-bold text-xs text-white group-hover:text-[#ff2d55] transition-colors">
                    Audio Trimmer
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Clip bounds, ringtones & intro/outro
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-neutral-800 text-neutral-300 group-hover:bg-white group-hover:text-black transition-colors">
                Open
              </span>
            </button>

            {/* 2. ID3 Metadata Studio */}
            <button
              id="open-id3-metadata-btn"
              type="button"
              onClick={onOpenMetadataEditor}
              className="p-3.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800/90 border border-neutral-800/90 hover:border-neutral-700 text-left transition-all active:scale-98 group flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs text-white group-hover:text-blue-400 transition-colors">
                    ID3 Tags & Cover
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Edit Title, Artist, Album & Year
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-neutral-800 text-neutral-300 group-hover:bg-white group-hover:text-black transition-colors">
                Edit
              </span>
            </button>

            {/* 3. Loudness Normalization Toggle */}
            <button
              id="toggle-normalization-btn"
              type="button"
              onClick={() => onUpdateSettings({ ...settings, volumeNormalization: !settings.volumeNormalization })}
              className={`p-3.5 rounded-2xl border text-left transition-all active:scale-98 flex items-center justify-between ${
                settings.volumeNormalization
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-neutral-950 border-neutral-800/90 hover:bg-neutral-800/90'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Volume2 className={`w-4 h-4 ${settings.volumeNormalization ? 'text-emerald-400' : 'text-neutral-400'}`} />
                  <span className={`font-bold text-xs ${settings.volumeNormalization ? 'text-emerald-300' : 'text-white'}`}>
                    -14 LUFS Loudnorm
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {settings.volumeNormalization ? 'Streaming target active' : 'Audio normalization bypassed'}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                settings.volumeNormalization 
                  ? 'bg-emerald-500 text-black font-black' 
                  : 'bg-neutral-800 text-neutral-400'
              }`}>
                {settings.volumeNormalization ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </section>

        {/* SONG ACTIONS & EXPORT SUITE - Only checked formats from settings appear (right now just MP3) */}
        <section className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">Audio Export</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  READY
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Download high-bitrate 320 kbps MP3 with embedded cover art and metadata
              </p>
            </div>
            
            <a
              href={`https://suno.com/song/${currentTrack.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700/60 self-start sm:self-auto"
            >
              <span>View on Suno</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Format Buttons - Unchecked formats in settings are hidden, showing only MP3 */}
          <div className="grid grid-cols-1 gap-3 pt-1">
            {/* HIGH BITRATE MP3 */}
            <button
              id="download-mp3-btn"
              onClick={() => onDownloadTrack(currentTrack, 'mp3', {
                customMetadata,
                normalize: settings.volumeNormalization,
              })}
              disabled={activeDownloadingFormat !== null}
              className="p-5 rounded-2xl bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700/80 hover:border-[#ff2d55]/70 text-left transition-all active:scale-98 group flex items-center justify-between shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-base text-white">MP3 320 kbps</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    WITH COVER ART & METADATA
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Universal high-fidelity 320 kbps audio with ID3v2 tags and embedded album art
                </p>
              </div>
              <div className="p-3 rounded-xl bg-neutral-900 group-hover:bg-[#ff2d55] group-hover:text-white text-neutral-300 transition-colors shrink-0 ml-3 shadow-md">
                {activeDownloadingFormat === 'mp3' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </div>
            </button>
          </div>

          {/* Progress Bar */}
          {activeDownloadingFormat && (
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff2d55]" />
                  Exporting {activeDownloadingFormat.toUpperCase()}...
                </span>
                <span className="text-[#ff2d55]">{downloadProgress[activeDownloadingFormat] || 50}%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[#ff2d55] h-full rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress[activeDownloadingFormat] || 50}%` }}
                />
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Global Footer */}
      <Footer 
        onOpenSettings={onOpenSettings}
        onOpenHistory={onOpenHistory}
        onOpenBulkImporter={onOpenBulkImporter}
      />
    </div>
  );
};
