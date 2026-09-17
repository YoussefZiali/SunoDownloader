import React, { useState, useEffect, useRef } from 'react';
import { 
  SunoTrack, SunoPlaylist, AudioFormat, UserSettings, 
  DownloadHistoryEntry, TrackMetadataCustomization, AudioClipRange,
  BatchDownloadStatus, ActiveTab
} from './types';
import { DEFAULT_USER_SETTINGS, INITIAL_TRACKS, INITIAL_PLAYLISTS } from './data/mockSunoData';
import { convertTrackToFormat, createBatchZip, triggerFileDownload } from './utils/audioConverter';
import { saveTrackForOffline, getAllOfflineTracks } from './utils/offlineStorage';

// Top Workstation Navigation
import { StudioHeader } from './components/StudioHeader';
import { Navigation } from './components/Navigation';

// Main Workstation Views
import { MusicLibraryCratesView } from './components/MusicLibraryCratesView';
import { ExploreDiscoverView } from './components/ExploreDiscoverView';
import { PlaylistDetailView } from './components/PlaylistDetailView';
import { StudioDawWorkstationView } from './components/StudioDawWorkstationView';
import { DjCreativeSuiteView } from './components/DjCreativeSuiteView';
import { SunoCoreIngestView } from './components/SunoCoreIngestView';
import { ExportHubView } from './components/ExportHubView';

// Studio Modals & Creative Workbenches
import { MultiUrlImporterModal } from './components/MultiUrlImporterModal';
import { DownloadHistoryDrawer } from './components/DownloadHistoryDrawer';
import { AudioTrimmerModal } from './components/AudioTrimmerModal';
import { Id3MetadataEditorModal } from './components/Id3MetadataEditorModal';
import { SettingsModal } from './components/SettingsModal';
import { SongMashupRemixerModal } from './components/SongMashupRemixerModal';
import { AutoDjMixerModal } from './components/AutoDjMixerModal';
import { Spatial8DAudioModal } from './components/Spatial8DAudioModal';
import { KaraokeTeleprompterModal } from './components/KaraokeTeleprompterModal';
import { PromptExtractorModal } from './components/PromptExtractorModal';
import { SocialVideoMakerModal } from './components/SocialVideoMakerModal';
import { TrackActionMenu } from './components/TrackActionMenu';
import { SpotifyPlayerBar } from './components/SpotifyPlayerBar';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');

  // Active track & playlist catalog
  const [currentTrack, setCurrentTrack] = useState<SunoTrack | null>(INITIAL_TRACKS[0] || null);
  const [allTracks, setAllTracks] = useState<SunoTrack[]>(INITIAL_TRACKS);
  const [playlists, setPlaylists] = useState<SunoPlaylist[]>(INITIAL_PLAYLISTS);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SunoPlaylist | null>(INITIAL_PLAYLISTS[0] || null);

  // Global Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);

  // Spotify Player Bar State Engine
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('suno_player_volume');
      return saved ? parseFloat(saved) : 0.8;
    } catch {
      return 0.8;
    }
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  // Offline Stored Track IDs
  const [offlineTrackIds, setOfflineTrackIds] = useState<Set<string>>(new Set());

  // Ingest Loading & Error States
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Download & Batch Status
  const [activeDownloadingFormat, setActiveDownloadingFormat] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [batchStatus, setBatchStatus] = useState<BatchDownloadStatus>({
    isActive: false,
    totalTracks: 0,
    completedTracks: 0,
    currentTrackTitle: '',
    currentTrackArtist: '',
    currentTrackId: undefined,
    percent: 0,
    phase: 'idle',
    completedTrackIds: [],
  });
  const batchAbortRef = useRef<boolean>(false);

  // App Settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('suno_user_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { 
          ...DEFAULT_USER_SETTINGS, 
          ...parsed,
          defaultFormat: 'mp3' as const,
          batchFormats: ['mp3'] as AudioFormat[],
          includeCoverArtInZip: false,
          autoClearHistory: typeof parsed.autoClearHistory === 'boolean' ? parsed.autoClearHistory : DEFAULT_USER_SETTINGS.autoClearHistory,
          autoClearHistoryDays: typeof parsed.autoClearHistoryDays === 'number' ? parsed.autoClearHistoryDays : DEFAULT_USER_SETTINGS.autoClearHistoryDays,
        };
      }
    } catch {}
    return {
      ...DEFAULT_USER_SETTINGS,
      defaultFormat: 'mp3' as const,
      batchFormats: ['mp3'] as AudioFormat[],
      includeCoverArtInZip: false,
    };
  });

  // Modal Visibility States
  const [showBulkImporter, setShowBulkImporter] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMashup, setShowMashup] = useState(false);
  const [showAutoDj, setShowAutoDj] = useState(false);
  const [showSpatial8D, setShowSpatial8D] = useState(false);
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [showPromptExtractor, setShowPromptExtractor] = useState(false);
  const [showVideoMaker, setShowVideoMaker] = useState(false);
  const [showTrackActionMenu, setShowTrackActionMenu] = useState(false);
  const [actionMenuTrack, setActionMenuTrack] = useState<SunoTrack | null>(null);

  // Per-track customization
  const [customMetadata, setCustomMetadata] = useState<TrackMetadataCustomization>({});
  const [clipRange, setClipRange] = useState<AudioClipRange>({ enabled: false, startTime: 0, endTime: 30 });
  const [isExportingClip, setIsExportingClip] = useState(false);

  // Download History
  const [history, setHistory] = useState<DownloadHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('suno_download_history');
      if (saved) {
        const parsed: DownloadHistoryEntry[] = JSON.parse(saved);
        return parsed;
      }
    } catch {}
    return [];
  });

  // Load Offline Cache IDs on Mount
  useEffect(() => {
    const syncOffline = async () => {
      try {
        const cached = await getAllOfflineTracks();
        setOfflineTrackIds(new Set(cached.map((c) => c.id)));
      } catch {}
    };
    syncOffline();
  }, []);

  // Sync Settings to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('suno_user_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Global Audio Controller & Event Listeners
  useEffect(() => {
    if (!globalAudioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.volume = volume;
      audio.playbackRate = playbackRate;
      globalAudioRef.current = audio;
    }

    const audio = globalAudioRef.current;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || currentTrack?.duration || 180);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onLoadStart = () => {
      setIsLoadingAudio(true);
    };

    const onWaiting = () => {
      setIsLoadingAudio(true);
    };

    const onCanPlay = () => {
      setIsLoadingAudio(false);
      setLoadingTrackId(null);
    };

    const onPlaying = () => {
      setIsLoadingAudio(false);
      setLoadingTrackId(null);
      setIsPlaying(true);
    };

    const onError = () => {
      setIsLoadingAudio(false);
      setLoadingTrackId(null);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Update track source when currentTrack changes
  useEffect(() => {
    const audio = globalAudioRef.current;
    if (!audio || !currentTrack) return;

    const streamUrl = currentTrack.id ? `/api/suno/stream/${currentTrack.id}.mp3` : currentTrack.audio_url;
    const fullUrl = streamUrl.startsWith('http') ? streamUrl : `${window.location.origin}${streamUrl}`;
    
    if (audio.src !== fullUrl) {
      audio.src = streamUrl;
      audio.playbackRate = playbackRate;
      setCurrentTime(0);
      if (isPlaying) {
        audio.play().catch(() => {});
      }
    }
  }, [currentTrack?.id]);

  // Handle Track Completion (Repeat one, next track, or stop)
  useEffect(() => {
    const audio = globalAudioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        handleNextTrack();
      }
    };

    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [repeatMode, allTracks, currentTrack?.id, isShuffle]);

  const toggleGlobalPlay = () => {
    if (!globalAudioRef.current) return;
    if (isPlaying) {
      globalAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      globalAudioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handlePlaySpecificTrack = (track: SunoTrack) => {
    if (currentTrack?.id === track.id) {
      toggleGlobalPlay();
    } else {
      setLoadingTrackId(track.id);
      setIsLoadingAudio(true);
      setCurrentTrack(track);
      if (globalAudioRef.current) {
        const streamUrl = track.id ? `/api/suno/stream/${track.id}.mp3` : track.audio_url;
        globalAudioRef.current.src = streamUrl;
        globalAudioRef.current.currentTime = 0;
        setCurrentTime(0);
        globalAudioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setIsLoadingAudio(false);
            setLoadingTrackId(null);
          })
          .catch(() => {
            setIsLoadingAudio(false);
            setLoadingTrackId(null);
          });
      }
    }
  };

  const handleSeek = (time: number) => {
    if (globalAudioRef.current) {
      globalAudioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  // Synchronize audio volume and mute state whenever changed
  useEffect(() => {
    const audio = globalAudioRef.current;
    if (!audio) return;
    try {
      audio.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume));
      audio.muted = isMuted;
    } catch {}
  }, [volume, isMuted]);

  const handleVolumeChange = (vol: number) => {
    const safeVol = Math.max(0, Math.min(1, vol));
    if (globalAudioRef.current) {
      try {
        globalAudioRef.current.volume = safeVol;
        globalAudioRef.current.muted = safeVol === 0;
      } catch {}
    }
    setVolume(safeVol);
    setIsMuted(safeVol === 0);
    try {
      localStorage.setItem('suno_player_volume', String(safeVol));
    } catch {}
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    if (globalAudioRef.current) {
      try {
        globalAudioRef.current.muted = nextMuted;
        if (!nextMuted && volume === 0) {
          globalAudioRef.current.volume = 0.75;
          setVolume(0.75);
        }
      } catch {}
    }
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.75);
    }
  };

  const handleNextTrack = () => {
    if (allTracks.length === 0) return;
    if (!currentTrack) {
      handlePlaySpecificTrack(allTracks[0]);
      return;
    }

    const currentIndex = allTracks.findIndex((t) => t.id === currentTrack.id);
    let nextIndex: number;

    if (isShuffle) {
      if (allTracks.length === 1) {
        nextIndex = 0;
      } else {
        do {
          nextIndex = Math.floor(Math.random() * allTracks.length);
        } while (nextIndex === currentIndex && allTracks.length > 1);
      }
    } else {
      nextIndex = (currentIndex + 1) % allTracks.length;
    }

    handlePlaySpecificTrack(allTracks[nextIndex]);
  };

  const handlePrevTrack = () => {
    if (allTracks.length === 0) return;
    if (!currentTrack) {
      handlePlaySpecificTrack(allTracks[0]);
      return;
    }

    const audio = globalAudioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const currentIndex = allTracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + allTracks.length) % allTracks.length;
    handlePlaySpecificTrack(allTracks[prevIndex]);
  };

  const handleToggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const handleToggleRepeat = () => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  };

  const handleChangePlaybackRate = (rate: number) => {
    if (globalAudioRef.current) {
      globalAudioRef.current.playbackRate = rate;
    }
    setPlaybackRate(rate);
  };

  // Spacebar & Arrow Key Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleGlobalPlay();
      } else if (e.code === 'ArrowLeft') {
        if (e.shiftKey) {
          handlePrevTrack();
        } else {
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 5));
        }
      } else if (e.code === 'ArrowRight') {
        if (e.shiftKey) {
          handleNextTrack();
        } else {
          e.preventDefault();
          handleSeek(Math.min(duration || 180, currentTime + 5));
        }
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, isPlaying, isMuted, currentTrack?.id, allTracks]);

  // Helper to add history record
  const addHistoryRecord = (entry: Omit<DownloadHistoryEntry, 'id' | 'downloadedAt'>) => {
    const newEntry: DownloadHistoryEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      downloadedAt: Date.now(),
    };
    setHistory((prev) => {
      let next = [newEntry, ...prev.filter(h => !(h.trackId === newEntry.trackId && h.format === newEntry.format && !h.wasClipped))];
      next = next.slice(0, 50);
      try {
        localStorage.setItem('suno_download_history', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('suno_download_history');
    } catch {}
  };

  // Save Track Offline Handler
  const handleSaveTrackOffline = async (track: SunoTrack) => {
    try {
      await saveTrackForOffline(track);
      setOfflineTrackIds((prev) => new Set([...prev, track.id]));
    } catch (err: any) {
      alert(`Could not save track offline: ${err.message}`);
    }
  };

  // Fetch Suno Song or Playlist by URL
  const handleFetchUrl = async (input: string) => {
    setIsLoadingUrl(true);
    setErrorMessage(null);

    try {
      const trimmed = input.trim();

      // Check local catalog
      const localTrack = allTracks.find(t => trimmed.includes(t.id));
      if (localTrack) {
        setCurrentTrack(localTrack);
        setActiveTab('studio');
        setIsLoadingUrl(false);
        return;
      }

      // API Resolver
      const res = await fetch('/api/suno/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to resolve Suno link. Please verify URL.');
      }

      const data = await res.json();

      if (data.type === 'playlist' && data.playlist) {
        if (data.playlist.tracks && data.playlist.tracks.length > 0) {
          setPlaylists(prev => [data.playlist, ...prev.filter(p => p.id !== data.playlist.id)]);
          setAllTracks(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newTracks = data.playlist.tracks.filter((t: SunoTrack) => !existingIds.has(t.id));
            return [...newTracks, ...prev];
          });
          setSelectedPlaylist(data.playlist);
          setCurrentTrack(data.playlist.tracks[0]);
          setActiveTab('playlist');
        }
      } else if (data.type === 'song' && data.track) {
        setAllTracks(prev => {
          if (prev.some(t => t.id === data.track.id)) return prev;
          return [data.track, ...prev];
        });
        setCurrentTrack(data.track);
        setActiveTab('studio');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to resolve Suno URL.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Download Single Song Handler
  const handleDownloadTrack = async (
    track: SunoTrack, 
    format: AudioFormat = settings.defaultFormat,
    customClip?: AudioClipRange
  ) => {
    try {
      setActiveDownloadingFormat(format);
      setDownloadProgress((prev) => ({ ...prev, [format]: 10 }));

      const effectiveClip = customClip || clipRange;
      const effectiveMeta = customMetadata[track.id];

      const result = await convertTrackToFormat(
        track,
        format,
        settings,
        (pct) => {
          setDownloadProgress((prev) => ({ ...prev, [format]: pct }));
        },
        {
          customMetadata: effectiveMeta,
          startTime: effectiveClip?.enabled ? effectiveClip.startTime : undefined,
          endTime: effectiveClip?.enabled ? effectiveClip.endTime : undefined,
        }
      );

      triggerFileDownload(result.blob, result.fileName);

      addHistoryRecord({
        trackId: track.id,
        trackTitle: effectiveMeta?.title || track.title,
        artist: effectiveMeta?.artist || track.artist,
        imageUrl: track.image_url,
        durationFormatted: track.duration_formatted,
        format: format,
        fileSizeFormatted: `${(result.blob.size / (1024 * 1024)).toFixed(1)} MB`,
        wasClipped: effectiveClip?.enabled,
      });

      setDownloadProgress((prev) => ({ ...prev, [format]: 100 }));
      setTimeout(() => {
        setActiveDownloadingFormat(null);
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[format];
          return next;
        });
      }, 1000);

    } catch (err: any) {
      alert(`Download failed: ${err.message || 'Unknown error'}`);
      setActiveDownloadingFormat(null);
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[format];
        return next;
      });
    }
  };

  // Batch Zip Download Handler
  const handleDownloadBatchZip = async (
    tracks: SunoTrack[], 
    format: AudioFormat = settings.defaultFormat
  ) => {
    if (tracks.length === 0) return;
    batchAbortRef.current = false;

    // Switch to Download Suno screen so user can watch the download process in real-time
    setActiveTab('ingest');

    setBatchStatus({
      isActive: true,
      totalTracks: tracks.length,
      completedTracks: 0,
      currentTrackTitle: tracks[0].title,
      currentTrackArtist: tracks[0].artist,
      currentTrackId: tracks[0].id,
      percent: 5,
      phase: 'downloading',
      completedTrackIds: [],
    });

    try {
      const files: { track: SunoTrack; blob: Blob; fileName: string }[] = [];
      for (let i = 0; i < tracks.length; i++) {
        if (batchAbortRef.current) throw new Error('Batch download cancelled by user.');
        const t = tracks[i];
        setBatchStatus((prev) => ({
          ...prev,
          completedTracks: i,
          currentTrackTitle: t.title,
          currentTrackArtist: t.artist,
          currentTrackId: t.id,
          percent: Math.round(((i + 0.2) / tracks.length) * 75),
        }));

        const res = await convertTrackToFormat(t, format, settings);
        files.push({ track: t, blob: res.blob, fileName: res.fileName });
      }

      setBatchStatus((prev) => ({
        ...prev,
        phase: 'zipping',
        percent: 85,
      }));

      const zipBlob = await createBatchZip(
        files,
        settings,
        (zipPct) => {
          setBatchStatus((prev) => ({
            ...prev,
            percent: 85 + Math.round(zipPct * 0.15),
          }));
        }
      );

      const zipName = `Suno_Batch_${tracks.length}_Tracks_${Date.now()}.zip`;
      triggerFileDownload(zipBlob, zipName);

      setBatchStatus((prev) => ({
        ...prev,
        percent: 100,
        phase: 'done',
        completedTracks: tracks.length,
      }));

      setTimeout(() => {
        setBatchStatus((prev) => ({ ...prev, isActive: false }));
      }, 3000);

    } catch (err: any) {
      if (err.message !== 'Batch download cancelled by user.') {
        alert(`Batch download failed: ${err.message}`);
      }
      setBatchStatus((prev) => ({ ...prev, isActive: false, phase: 'error' }));
    }
  };

  const handleCancelBatchZip = () => {
    batchAbortRef.current = true;
    setBatchStatus((prev) => ({
      ...prev,
      phase: 'cancelled',
      isActive: false,
    }));
  };

  // Re-download directly from history
  const handleReDownloadHistory = async (entry: DownloadHistoryEntry) => {
    try {
      const track = allTracks.find((t) => t.id === entry.trackId);
      if (track) {
        await handleDownloadTrack(track, entry.format);
        return;
      }
      const dlUrl = `/api/suno/download?id=${encodeURIComponent(entry.trackId)}&format=${entry.format}&title=${encodeURIComponent(entry.trackTitle)}&artist=${encodeURIComponent(entry.artist)}`;
      const link = document.createElement('a');
      link.href = dlUrl;
      link.download = `${entry.artist} - ${entry.trackTitle}.${entry.format}`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => link.remove(), 1000);
    } catch (err: any) {
      alert(`Re-download failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-neutral-100 font-sans selection:bg-[#ff2d55] selection:text-white">
      
      {/* Top Workstation Header Bar */}
      <StudioHeader
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenHistory={() => setShowHistory(true)}
        onOpenSettings={() => setShowSettings(true)}
        historyCount={history.length}
        offlineCount={offlineTrackIds.size}
      />

      {/* Main Workstation Tab Views */}
      <main className="w-full pb-36 lg:pb-28">
        {activeTab === 'explore' && (
          <ExploreDiscoverView
            playlists={playlists}
            allTracks={allTracks}
            activeTrack={currentTrack}
            isPlaying={isPlaying}
            isLoadingAudio={isLoadingAudio}
            loadingTrackId={loadingTrackId}
            onPlayTrack={handlePlaySpecificTrack}
            onPlayPlaylist={(playlist) => {
              setSelectedPlaylist(playlist);
              if (playlist.tracks && playlist.tracks.length > 0) {
                handlePlaySpecificTrack(playlist.tracks[0]);
              }
            }}
            onSelectPlaylist={(playlist) => {
              setSelectedPlaylist(playlist);
              setActiveTab('playlist');
            }}
            onOpenStudioDaw={(track) => {
              setCurrentTrack(track);
              setActiveTab('studio');
            }}
            onOpenKaraoke={(track) => {
              setCurrentTrack(track);
              setShowKaraoke(true);
            }}
            onOpenSpatial8D={(track) => {
              setCurrentTrack(track);
              setShowSpatial8D(true);
            }}
            onQuickDownload={handleDownloadTrack}
            onDownloadBatchZip={handleDownloadBatchZip}
            onOpenSunoIngest={(urlOrId) => {
              setActiveTab('ingest');
              if (urlOrId) {
                handleFetchUrl(urlOrId);
              }
            }}
            onOpenBulkImporter={() => setShowBulkImporter(true)}
          />
        )}

        {activeTab === 'playlist' && (
          <PlaylistDetailView
            playlist={selectedPlaylist || playlists[0]}
            allPlaylists={playlists}
            activeTrack={currentTrack}
            isPlaying={isPlaying}
            isLoadingAudio={isLoadingAudio}
            loadingTrackId={loadingTrackId}
            onPlayTrack={handlePlaySpecificTrack}
            onPlayPlaylist={(pl, startTrackId) => {
              setSelectedPlaylist(pl);
              if (startTrackId) {
                const trk = pl.tracks.find((t) => t.id === startTrackId);
                if (trk) handlePlaySpecificTrack(trk);
              } else if (pl.tracks && pl.tracks.length > 0) {
                handlePlaySpecificTrack(pl.tracks[0]);
              }
            }}
            onSelectPlaylist={(pl) => {
              setSelectedPlaylist(pl);
            }}
            onBack={() => setActiveTab('library')}
            onOpenStudioDaw={(track) => {
              setCurrentTrack(track);
              setActiveTab('studio');
            }}
            onOpenKaraoke={(track) => {
              setCurrentTrack(track);
              setShowKaraoke(true);
            }}
            onOpenSpatial8D={(track) => {
              setCurrentTrack(track);
              setShowSpatial8D(true);
            }}
            onQuickDownload={handleDownloadTrack}
            onDownloadBatchZip={handleDownloadBatchZip}
            onOpenTrackMenu={(track) => {
              setActionMenuTrack(track);
              setShowTrackActionMenu(true);
            }}
            onSaveOffline={handleSaveTrackOffline}
            offlineTrackIds={offlineTrackIds}
          />
        )}

        {activeTab === 'library' && (
          <MusicLibraryCratesView
            allTracks={allTracks}
            playlists={playlists}
            activeTrack={currentTrack}
            isPlaying={isPlaying}
            isLoadingAudio={isLoadingAudio}
            loadingTrackId={loadingTrackId}
            onPlayTrack={handlePlaySpecificTrack}
            onSelectPlaylist={(playlist) => {
              setSelectedPlaylist(playlist);
              setActiveTab('playlist');
            }}
            onOpenStudioDaw={(track) => {
              setCurrentTrack(track);
              setActiveTab('studio');
            }}
            onQuickDownload={handleDownloadTrack}
            onDownloadBatchZip={handleDownloadBatchZip}
            onOpenTrackMenu={(track) => {
              setActionMenuTrack(track);
              setShowTrackActionMenu(true);
            }}
            onOpenBulkImporter={() => setShowBulkImporter(true)}
            onSaveOffline={handleSaveTrackOffline}
            offlineTrackIds={offlineTrackIds}
            onOpenAutoDjMixer={(tracks) => {
              setShowAutoDj(true);
            }}
            onOpenTrimmer={(track) => {
              setCurrentTrack(track);
              setShowTrimmer(true);
            }}
            onOpenMetadataEditor={(track) => {
              setCurrentTrack(track);
              setShowMetadataEditor(true);
            }}
            onOpenPromptExtractor={(track) => {
              setCurrentTrack(track);
              setShowPromptExtractor(true);
            }}
          />
        )}

        {activeTab === 'studio' && (
          <StudioDawWorkstationView
            track={currentTrack}
            allTracks={allTracks}
            onSelectTrack={(t) => setCurrentTrack(t)}
            onQuickDownload={handleDownloadTrack}
            onOpenTrimmer={(t) => {
              setCurrentTrack(t);
              setShowTrimmer(true);
            }}
            onOpenMetadataEditor={(t) => {
              setCurrentTrack(t);
              setShowMetadataEditor(true);
            }}
            onOpenVideoMaker={(t) => {
              setCurrentTrack(t);
              setShowVideoMaker(true);
            }}
            onOpenKaraoke={(t) => {
              setCurrentTrack(t);
              setShowKaraoke(true);
            }}
            onOpenSpatial8D={(t) => {
              setCurrentTrack(t);
              setShowSpatial8D(true);
            }}
            onOpenMashup={(t) => {
              setCurrentTrack(t);
              setShowMashup(true);
            }}
            onSaveOffline={handleSaveTrackOffline}
            isOffline={currentTrack ? offlineTrackIds.has(currentTrack.id) : false}
            onBackToLibrary={() => setActiveTab('library')}
            onOpenIngest={() => setActiveTab('ingest')}
          />
        )}

        {activeTab === 'dj_creative' && (
          <DjCreativeSuiteView
            track={currentTrack}
            allTracks={allTracks}
            onOpenMashup={(t) => {
              setCurrentTrack(t);
              setShowMashup(true);
            }}
            onOpenAutoDj={() => setShowAutoDj(true)}
            onOpenSpatial8D={(t) => {
              setCurrentTrack(t);
              setShowSpatial8D(true);
            }}
            onOpenKaraoke={(t) => {
              setCurrentTrack(t);
              setShowKaraoke(true);
            }}
            onOpenVideoMaker={(t) => {
              setCurrentTrack(t);
              setShowVideoMaker(true);
            }}
            onOpenPromptExtractor={(t) => {
              setCurrentTrack(t);
              setShowPromptExtractor(true);
            }}
            onOpenStudioDaw={(t) => {
              setCurrentTrack(t);
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'ingest' && (
          <SunoCoreIngestView
            onFetchUrl={handleFetchUrl}
            isLoadingUrl={isLoadingUrl}
            errorMessage={errorMessage}
            onOpenBulkImporter={() => setShowBulkImporter(true)}
            onOpenTrimmer={(t) => {
              setCurrentTrack(t);
              setShowTrimmer(true);
            }}
            onOpenMetadataEditor={(t) => {
              setCurrentTrack(t);
              setShowMetadataEditor(true);
            }}
            onOpenPromptExtractor={(t) => {
              setCurrentTrack(t);
              setShowPromptExtractor(true);
            }}
            onOpenStudioDaw={(t) => {
              setCurrentTrack(t);
              setActiveTab('studio');
            }}
            currentTrack={currentTrack}
            onQuickDownload={handleDownloadTrack}
            batchStatus={batchStatus}
            onCancelBatchZip={handleCancelBatchZip}
          />
        )}

        {activeTab === 'exports' && (
          <ExportHubView
            history={history}
            onClearHistory={handleClearHistory}
            onReDownload={handleReDownloadHistory}
            onLoadTrack={(trackId) => handleFetchUrl(`https://suno.com/song/${trackId}`)}
            onOpenStudioDaw={(track) => {
              setCurrentTrack(track);
              setActiveTab('studio');
            }}
            allTracks={allTracks}
            onPlayTrack={handlePlaySpecificTrack}
          />
        )}
      </main>

      {/* Bottom Navigation for Mobile / Tablet */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        completedDownloadsCount={history.length}
      />

      {/* Modals & Slide-Overs */}
      
      {/* 1. Bulk Multi-URL Importer */}
      <MultiUrlImporterModal
        isOpen={showBulkImporter}
        onClose={() => setShowBulkImporter(false)}
        onDownloadBatchZip={handleDownloadBatchZip}
        onDownloadTrack={handleDownloadTrack}
        settings={settings}
        onImportToLibrary={(tracks) => {
          setAllTracks(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newTracks = tracks.filter(t => !existingIds.has(t.id));
            return [...newTracks, ...prev];
          });
        }}
        onSelectTrackForPlayer={(track) => {
          setAllTracks(prev => {
            if (prev.some(t => t.id === track.id)) return prev;
            return [track, ...prev];
          });
          setCurrentTrack(track);
          setActiveTab('studio');
        }}
      />

      {/* 2. Download History Drawer */}
      <DownloadHistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onClearHistory={handleClearHistory}
        onReDownload={handleReDownloadHistory}
        onLoadTrack={(trackId) => {
          handleFetchUrl(`https://suno.com/song/${trackId}`);
          setShowHistory(false);
        }}
        autoClearEnabled={settings.autoClearHistory}
        autoClearDays={settings.autoClearHistoryDays}
      />

      {/* 3. Audio Trimmer & Ringtone Clipper */}
      {currentTrack && (
        <AudioTrimmerModal
          isOpen={showTrimmer}
          onClose={() => setShowTrimmer(false)}
          track={currentTrack}
          settings={settings}
          onExportClip={(range) => {
            handleDownloadTrack(currentTrack, 'mp3', range);
            setShowTrimmer(false);
          }}
          isExporting={isExportingClip}
        />
      )}

      {/* 4. ID3 Metadata Studio */}
      {currentTrack && (
        <Id3MetadataEditorModal
          isOpen={showMetadataEditor}
          onClose={() => setShowMetadataEditor(false)}
          track={currentTrack}
          customMetadata={customMetadata}
          onSaveMetadata={(newMeta) => setCustomMetadata(newMeta)}
        />
      )}

      {/* 5. App Settings & Audio Quality */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        historyCount={history.length}
        onClearHistory={handleClearHistory}
      />

      {/* 6. Song Mashup & Remixer Modal */}
      {currentTrack && (
        <SongMashupRemixerModal
          isOpen={showMashup}
          onClose={() => setShowMashup(false)}
          trackA={currentTrack}
          allTracks={allTracks}
          settings={settings}
        />
      )}

      {/* 8. Harmonic Auto-DJ Continuous Set Modal */}
      <AutoDjMixerModal
        isOpen={showAutoDj}
        onClose={() => setShowAutoDj(false)}
        playlist={null}
        tracks={allTracks}
        settings={settings}
      />

      {/* 9. 360° 8D Spatial Audio Modal */}
      {currentTrack && (
        <Spatial8DAudioModal
          isOpen={showSpatial8D}
          onClose={() => setShowSpatial8D(false)}
          track={currentTrack}
          settings={settings}
        />
      )}

      {/* 10. Cinema Karaoke Teleprompter Modal */}
      {currentTrack && (
        <KaraokeTeleprompterModal
          isOpen={showKaraoke}
          onClose={() => setShowKaraoke(false)}
          track={currentTrack}
          settings={settings}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={toggleGlobalPlay}
          onSeek={handleSeek}
          onTrackUpdate={(updated) => {
            setCurrentTrack(updated);
            setAllTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }}
        />
      )}

      {/* 11. Prompt & Style DNA Extractor Modal */}
      {currentTrack && (
        <PromptExtractorModal
          isOpen={showPromptExtractor}
          onClose={() => setShowPromptExtractor(false)}
          track={currentTrack}
        />
      )}

      {/* 12. Social Video Visualizer Maker Modal */}
      {currentTrack && (
        <SocialVideoMakerModal
          isOpen={showVideoMaker}
          onClose={() => setShowVideoMaker(false)}
          track={currentTrack}
          settings={settings}
        />
      )}

      {/* 13. Track Action Menu */}
      {actionMenuTrack && (
        <TrackActionMenu
          isOpen={showTrackActionMenu}
          onClose={() => setShowTrackActionMenu(false)}
          track={actionMenuTrack}
          onDownloadFormat={(t, fmt) => {
            handleDownloadTrack(t, fmt);
            setShowTrackActionMenu(false);
          }}
          onDownloadLyrics={(t) => {
            const blob = new Blob([t.prompt || ''], { type: 'text/plain' });
            triggerFileDownload(blob, `${t.title}_lyrics.txt`);
            setShowTrackActionMenu(false);
          }}
          onPlay={(t) => {
            handlePlaySpecificTrack(t);
            setShowTrackActionMenu(false);
          }}
          onCopyLink={(t) => {
            navigator.clipboard.writeText(`https://suno.com/song/${t.id}`);
            setShowTrackActionMenu(false);
          }}
        />
      )}

      {/* Spotify Bottom Player Bar (Hidden when full-screen Karaoke stage is open) */}
      {!showKaraoke && (
        <SpotifyPlayerBar
          track={currentTrack}
          isPlaying={isPlaying}
          isLoadingAudio={isLoadingAudio}
          loadingTrackId={loadingTrackId}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          playbackRate={playbackRate}
          allTracks={allTracks}
          settings={settings}
          onTogglePlay={toggleGlobalPlay}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onNextTrack={handleNextTrack}
          onPrevTrack={handlePrevTrack}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
          onChangePlaybackRate={handleChangePlaybackRate}
          onQuickDownload={handleDownloadTrack}
          onOpenStudioDaw={(track) => {
            setCurrentTrack(track);
            setActiveTab('studio');
          }}
          onOpenKaraoke={(track) => {
            setCurrentTrack(track);
            setShowKaraoke(true);
          }}
          onOpenSpatial8D={(track) => {
            setCurrentTrack(track);
            setShowSpatial8D(true);
          }}
          onOpenDjCreative={() => {
            setActiveTab('remix');
          }}
          onOpenVideoMaker={(track) => {
            setCurrentTrack(track);
            setShowVideoMaker(true);
          }}
          onTrackUpdate={(updated) => {
            setCurrentTrack(updated);
            setAllTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }}
        />
      )}

    </div>
  );
}
