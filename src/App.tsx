import React, { useState, useEffect, useRef } from 'react';
import { 
  SunoTrack, SunoPlaylist, AudioFormat, UserSettings, 
  DownloadHistoryEntry, TrackMetadataCustomization, AudioClipRange,
  BatchDownloadStatus
} from './types';
import { DEFAULT_USER_SETTINGS, INITIAL_TRACKS, INITIAL_PLAYLISTS } from './data/mockSunoData';
import { convertTrackToFormat, createBatchZip, triggerFileDownload } from './utils/audioConverter';
import { SunoSongView } from './components/SunoSongView';
import { MultiUrlImporterModal } from './components/MultiUrlImporterModal';
import { DownloadHistoryDrawer } from './components/DownloadHistoryDrawer';
import { AudioTrimmerModal } from './components/AudioTrimmerModal';
import { Id3MetadataEditorModal } from './components/Id3MetadataEditorModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Current track / playlist states
  const [currentTrack, setCurrentTrack] = useState<SunoTrack | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<SunoPlaylist | null>(null);

  // Loading & Error States
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Download State & Progress
  const [activeDownloadingFormat, setActiveDownloadingFormat] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  
  // Detailed Batch Download Progress Status
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

  // Settings - locked to mp3 for now as other formats are Coming Soon
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

  // Modal controls
  const [showBulkImporter, setShowBulkImporter] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isExportingClip, setIsExportingClip] = useState(false);

  // Per-track customization
  const [customMetadata, setCustomMetadata] = useState<TrackMetadataCustomization>({});
  const [clipRange, setClipRange] = useState<AudioClipRange>({ enabled: false, startTime: 0, endTime: 30 });

  // Download history loaded from localStorage with auto-clear filter applied
  const [history, setHistory] = useState<DownloadHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('suno_download_history');
      if (saved) {
        const parsed: DownloadHistoryEntry[] = JSON.parse(saved);
        const settingsSaved = localStorage.getItem('suno_user_settings');
        if (settingsSaved) {
          const s = JSON.parse(settingsSaved);
          if (s.autoClearHistory && s.autoClearHistoryDays > 0) {
            const maxAgeMs = s.autoClearHistoryDays * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const valid = parsed.filter(item => (now - item.downloadedAt) <= maxAgeMs);
            if (valid.length !== parsed.length) {
              try {
                localStorage.setItem('suno_download_history', JSON.stringify(valid));
              } catch {}
            }
            return valid;
          }
        }
        return parsed;
      }
    } catch {}
    return [];
  });

  // Save settings on changes
  useEffect(() => {
    try {
      localStorage.setItem('suno_user_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Auto-clear download history after specified days to keep local storage clean
  useEffect(() => {
    if (!settings.autoClearHistory || !settings.autoClearHistoryDays) return;
    const maxAgeMs = settings.autoClearHistoryDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    setHistory((prev) => {
      const valid = prev.filter((entry) => (now - entry.downloadedAt) <= maxAgeMs);
      if (valid.length !== prev.length) {
        try {
          localStorage.setItem('suno_download_history', JSON.stringify(valid));
        } catch {}
        return valid;
      }
      return prev;
    });
  }, [settings.autoClearHistory, settings.autoClearHistoryDays]);

  // Helper to add history record
  const addHistoryRecord = (entry: Omit<DownloadHistoryEntry, 'id' | 'downloadedAt'>) => {
    const newEntry: DownloadHistoryEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      downloadedAt: Date.now(),
    };
    setHistory((prev) => {
      let next = [newEntry, ...prev.filter(h => !(h.trackId === newEntry.trackId && h.format === newEntry.format && !h.wasClipped))];
      
      // Auto-prune older entries if setting is enabled
      if (settings.autoClearHistory && settings.autoClearHistoryDays > 0) {
        const maxAgeMs = settings.autoClearHistoryDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        next = next.filter(h => (now - h.downloadedAt) <= maxAgeMs);
      }

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

  // Fetch Suno Song or Playlist by URL
  const handleFetchUrl = async (input: string) => {
    setIsLoadingUrl(true);
    setErrorMessage(null);

    try {
      const trimmed = input.trim();

      // Check mock playlists first for instant local matching
      const mockPl = INITIAL_PLAYLISTS.find(p => 
        trimmed.includes(p.id) || 
        (p.id === '0d597d0c-cdb2-4f9c-b4da-57931929f0d0' && (
          trimmed.includes('R38WF37f66Bw6afo') || 
          trimmed.toLowerCase().includes('v6') ||
          trimmed.toLowerCase().includes('best')
        ))
      );
      if (mockPl) {
        setCurrentPlaylist(mockPl);
        setCurrentTrack(null);
        setIsLoadingUrl(false);
        return;
      }

      // Check mock tracks for instant local matching
      const mockTrack = INITIAL_TRACKS.find(t => trimmed.includes(t.id));
      if (mockTrack) {
        setCurrentTrack(mockTrack);
        setCurrentPlaylist(null);
        setCustomMetadata({});
        setClipRange({ enabled: false, startTime: 0, endTime: Math.min(30, mockTrack.duration || 180) });
        setIsLoadingUrl(false);
        if (settings.autoDownloadOnPaste) {
          setTimeout(() => handleDownloadTrack(mockTrack, settings.defaultFormat), 500);
        }
        return;
      }

      // Master URL resolver endpoint on the backend
      let data: any = null;
      try {
        const res = await fetch('/api/suno/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        data = null;
      }

      if (data && data.type === 'playlist' && data.playlist?.tracks?.length > 0) {
        setCurrentPlaylist(data.playlist);
        setCurrentTrack(null);
      } else if (data && data.type === 'song' && data.track) {
        setCurrentTrack(data.track);
        setCurrentPlaylist(null);
        setCustomMetadata({});
        setClipRange({ enabled: false, startTime: 0, endTime: Math.min(30, data.track.duration || 180) });
        if (settings.autoDownloadOnPaste) {
          setTimeout(() => handleDownloadTrack(data.track, settings.defaultFormat), 500);
        }
      } else {
        // Fallback: Client-side URL & Track resolution in browser
        const clientTrack = await resolveTrackClientSide(trimmed);
        if (clientTrack) {
          setCurrentTrack(clientTrack);
          setCurrentPlaylist(null);
          setCustomMetadata({});
          setClipRange({ enabled: false, startTime: 0, endTime: Math.min(30, clientTrack.duration || 180) });
          if (settings.autoDownloadOnPaste) {
            setTimeout(() => handleDownloadTrack(clientTrack, settings.defaultFormat), 500);
          }
        } else {
          throw new Error('Could not identify Suno song or playlist. Please verify the URL.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to resolve Suno URL. Please check the link.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  async function resolveTrackClientSide(inputUrl: string): Promise<SunoTrack | null> {
    const uuidMatch = inputUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (!uuidMatch) return null;
    const trackId = uuidMatch[0];

    try {
      const res = await fetch(`https://studio-api.prod.suno.com/api/clip/${trackId}`);
      if (res.ok) {
        const clip = await res.json();
        if (clip && clip.id) {
          const duration = Math.round(clip.metadata?.duration || clip.duration || 180);
          return {
            id: clip.id,
            title: clip.title || `Suno Track ${clip.id.slice(0, 8)}`,
            artist: clip.display_name || clip.handle || 'Suno Artist',
            handle: clip.handle ? `@${clip.handle}` : '@suno_user',
            audio_url: (clip.audio_url && clip.audio_url.startsWith('http')) ? clip.audio_url : `https://cdn1.suno.ai/${clip.id}.mp3`,
            video_url: clip.video_url || `https://cdn1.suno.ai/${clip.id}.mp4`,
            image_url: clip.image_large_url || clip.image_url || `https://cdn2.suno.ai/image_large_${clip.id}.jpeg`,
            duration,
            duration_formatted: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
            play_count: clip.play_count || 120,
            upvote_count: clip.upvote_count || 12,
            tags: clip.metadata?.tags || clip.display_tags || 'suno',
            model: clip.major_model_version || 'v6',
            created_at: clip.created_at || new Date().toISOString(),
            isVerified: clip.is_verified || false,
            iframe_url: `https://suno.com/embed/${clip.id}`,
          };
        }
      }
    } catch {
      // continue to fallback
    }

    return {
      id: trackId,
      title: `Suno Track ${trackId.slice(0, 8)}`,
      artist: 'Suno Artist',
      handle: '@suno_user',
      audio_url: `https://cdn1.suno.ai/${trackId}.mp3`,
      video_url: `https://cdn1.suno.ai/${trackId}.mp4`,
      image_url: `https://cdn2.suno.ai/image_large_${trackId}.jpeg`,
      duration: 180,
      duration_formatted: '3:00',
      play_count: 100,
      upvote_count: 10,
      tags: 'suno',
      model: 'v6',
      created_at: new Date().toISOString(),
      isVerified: false,
      iframe_url: `https://suno.com/embed/${trackId}`,
    };
  }

  // Reset to initial paste screen
  const handleReset = () => {
    setCurrentTrack(null);
    setCurrentPlaylist(null);
    setErrorMessage(null);
    setCustomMetadata({});
  };

  // Download Single Song Handler
  const handleDownloadTrack = async (
    track: SunoTrack, 
    format: AudioFormat,
    options?: {
      startTime?: number;
      endTime?: number;
      customMetadata?: TrackMetadataCustomization;
      normalize?: boolean;
    }
  ) => {
    setActiveDownloadingFormat(format);
    setDownloadProgress((prev) => ({ ...prev, [format]: 15 }));

    try {
      const mergedOptions = {
        startTime: options?.startTime,
        endTime: options?.endTime,
        customMetadata: options?.customMetadata || customMetadata,
        normalize: options?.normalize ?? settings.volumeNormalization,
      };

      const result = await convertTrackToFormat(track, format, settings, (percent) => {
        setDownloadProgress((prev) => ({ ...prev, [format]: percent }));
      }, mergedOptions);

      triggerFileDownload(result.blob, result.fileName);
      setDownloadProgress((prev) => ({ ...prev, [format]: 100 }));

      // Record to history
      const wasClipped = mergedOptions.startTime != null && mergedOptions.endTime != null;
      addHistoryRecord({
        trackId: track.id,
        trackTitle: mergedOptions.customMetadata?.title || track.title,
        artist: mergedOptions.customMetadata?.artist || track.artist,
        imageUrl: track.image_url,
        format,
        durationFormatted: wasClipped 
          ? `${Math.round(mergedOptions.endTime! - mergedOptions.startTime!)}s` 
          : track.duration_formatted,
        wasClipped,
        clipRange: wasClipped 
          ? `${Math.floor(mergedOptions.startTime! / 60)}:${(mergedOptions.startTime! % 60).toString().padStart(2, '0')} - ${Math.floor(mergedOptions.endTime! / 60)}:${(mergedOptions.endTime! % 60).toString().padStart(2, '0')}`
          : undefined,
        isNormalized: mergedOptions.normalize,
      });
    } catch (err: any) {
      alert(`Download failed: ${err.message || 'Unknown error'}`);
    } finally {
      setTimeout(() => {
        setActiveDownloadingFormat(null);
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[format];
          return next;
        });
      }, 1200);
    }
  };

  // Export from Audio Trimmer
  const handleExportClip = async (
    track: SunoTrack,
    format: AudioFormat,
    startTime: number,
    endTime: number,
    normalize: boolean
  ) => {
    setIsExportingClip(true);
    try {
      await handleDownloadTrack(track, format, {
        startTime,
        endTime,
        normalize,
        customMetadata,
      });
      setShowTrimmer(false);
    } finally {
      setIsExportingClip(false);
    }
  };

  // Cancel active batch download
  const handleCancelBatchZip = () => {
    batchAbortRef.current = true;
    setBatchStatus((prev) => ({
      ...prev,
      phase: 'error',
      error: 'Batch download cancelled by user.',
    }));
    setTimeout(() => {
      setActiveDownloadingFormat(null);
      setBatchStatus({
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
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next.zip;
        return next;
      });
    }, 1000);
  };

  // Download Batch ZIP Handler for Playlists or Multi-URL batches
  const handleDownloadBatchZip = async (tracks: SunoTrack[], format?: AudioFormat) => {
    if (!tracks || tracks.length === 0) return;
    batchAbortRef.current = false;
    setActiveDownloadingFormat('zip');
    setDownloadProgress((prev) => ({ ...prev, zip: 5 }));

    setBatchStatus({
      isActive: true,
      totalTracks: tracks.length,
      completedTracks: 0,
      currentTrackTitle: tracks[0]?.title || 'Preparing...',
      currentTrackArtist: tracks[0]?.artist || '',
      currentTrackId: tracks[0]?.id,
      percent: 5,
      phase: 'converting',
      completedTrackIds: [],
    });

    try {
      const chosenFormats: AudioFormat[] = 
        settings.batchFormats && settings.batchFormats.length > 0
          ? settings.batchFormats
          : [format || settings.defaultFormat || 'mp3'];

      const convertedFiles: { track: SunoTrack; blob: Blob; fileName: string }[] = [];
      const totalOps = tracks.length * chosenFormats.length;
      let completedOps = 0;

      for (let i = 0; i < tracks.length; i++) {
        if (batchAbortRef.current) {
          throw new Error('Batch download cancelled.');
        }

        const t = tracks[i];
        for (const fmt of chosenFormats) {
          if (batchAbortRef.current) break;

          const currentPct = Math.min(80, Math.round((completedOps / totalOps) * 75) + 5);
          setDownloadProgress((prev) => ({
            ...prev,
            zip: currentPct,
          }));

          setBatchStatus({
            isActive: true,
            totalTracks: tracks.length,
            completedTracks: completedOps,
            currentTrackTitle: t.title,
            currentTrackArtist: t.artist,
            currentTrackId: t.id,
            percent: currentPct,
            phase: 'converting',
            completedTrackIds: convertedFiles.map(f => f.track.id),
          });

          const conv = await convertTrackToFormat(t, fmt, settings, undefined, {
            normalize: settings.volumeNormalization,
          });
          convertedFiles.push({ track: t, blob: conv.blob, fileName: conv.fileName });
          completedOps++;

          // Record each batch item to history
          addHistoryRecord({
            trackId: t.id,
            trackTitle: t.title,
            artist: t.artist,
            imageUrl: t.image_url,
            format: fmt,
            durationFormatted: t.duration_formatted,
            isNormalized: settings.volumeNormalization,
          });
        }
      }

      if (batchAbortRef.current) {
        throw new Error('Batch download cancelled.');
      }

      setDownloadProgress((prev) => ({ ...prev, zip: 82 }));
      setBatchStatus((prev) => ({
        ...prev,
        phase: 'zipping',
        percent: 85,
        currentTrackTitle: 'Compressing audio files into clean ZIP archive (no cover images)...',
        currentTrackArtist: undefined,
        currentTrackId: undefined,
        completedTrackIds: convertedFiles.map(f => f.track.id),
      }));

      const zipBlob = await createBatchZip(convertedFiles, settings, (p) => {
        const overall = Math.min(99, 85 + Math.round((p / 100) * 14));
        setDownloadProgress((prev) => ({ ...prev, zip: overall }));
        setBatchStatus((prev) => ({
          ...prev,
          percent: overall,
        }));
      });

      const formatLabel = chosenFormats.map((f) => f.toUpperCase()).join('_');
      const zipName = `Suno_Batch_${tracks.length}_Tracks_${formatLabel}.zip`;
      triggerFileDownload(zipBlob, zipName);

      setDownloadProgress((prev) => ({ ...prev, zip: 100 }));
      setBatchStatus({
        isActive: true,
        totalTracks: tracks.length,
        completedTracks: tracks.length,
        currentTrackTitle: `Downloaded ${tracks.length} tracks as ZIP!`,
        percent: 100,
        phase: 'done',
        completedTrackIds: tracks.map(t => t.id),
      });
    } catch (err: any) {
      if (err.message !== 'Batch download cancelled.') {
        alert(`Batch ZIP creation failed: ${err.message || 'Unknown error'}`);
        setBatchStatus((prev) => ({
          ...prev,
          phase: 'error',
          error: err.message || 'Download failed',
        }));
      }
    } finally {
      setTimeout(() => {
        setActiveDownloadingFormat(null);
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next.zip;
          return next;
        });
        setBatchStatus((prev) => {
          if (prev.phase === 'done' || prev.phase === 'error') {
            return {
              ...prev,
              isActive: false,
            };
          }
          return prev;
        });
      }, 3500);
    }
  };

  // Re-download directly from history
  const handleReDownloadHistory = async (entry: DownloadHistoryEntry) => {
    try {
      const res = await fetch(`/api/suno/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://suno.com/song/${entry.trackId}` }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.track) {
          await handleDownloadTrack(data.track, entry.format);
          return;
        }
      }
      // Fallback direct download
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
    <>
      <SunoSongView
        currentTrack={currentTrack}
        currentPlaylist={currentPlaylist}
        onFetchUrl={handleFetchUrl}
        isLoadingUrl={isLoadingUrl}
        errorMessage={errorMessage}
        onReset={handleReset}
        onDownloadTrack={handleDownloadTrack}
        onDownloadBatchZip={handleDownloadBatchZip}
        downloadProgress={downloadProgress}
        activeDownloadingFormat={activeDownloadingFormat}
        settings={settings}
        onUpdateSettings={setSettings}
        onSelectPlaylistTrack={(t) => setCurrentTrack(t)}
        onOpenBulkImporter={() => setShowBulkImporter(true)}
        onOpenHistory={() => setShowHistory(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenTrimmer={() => setShowTrimmer(true)}
        onOpenMetadataEditor={() => setShowMetadataEditor(true)}
        historyCount={history.length}
        customMetadata={customMetadata}
        clipRange={clipRange}
        batchStatus={batchStatus}
        onCancelBatchZip={handleCancelBatchZip}
      />

      {/* Bulk URL Importer Modal */}
      <MultiUrlImporterModal
        isOpen={showBulkImporter}
        onClose={() => setShowBulkImporter(false)}
        onDownloadBatchZip={handleDownloadBatchZip}
        onDownloadTrack={handleDownloadTrack}
        settings={settings}
        onSelectTrackForPlayer={(track) => {
          setCurrentTrack(track);
          setCurrentPlaylist(null);
          setCustomMetadata({});
        }}
      />

      {/* Download History Slide-over Drawer */}
      <DownloadHistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onClearHistory={handleClearHistory}
        onReDownload={handleReDownloadHistory}
        onLoadTrack={(trackId) => {
          handleFetchUrl(`https://suno.com/song/${trackId}`);
        }}
        autoClearEnabled={settings.autoClearHistory}
        autoClearDays={settings.autoClearHistoryDays}
      />

      {/* Audio Trimmer & Ringtone Clipper Modal */}
      {currentTrack && (
        <AudioTrimmerModal
          isOpen={showTrimmer}
          onClose={() => setShowTrimmer(false)}
          track={currentTrack}
          settings={settings}
          onExportClip={handleExportClip}
          isExporting={isExportingClip}
        />
      )}

      {/* ID3 Metadata Studio Modal */}
      {currentTrack && (
        <Id3MetadataEditorModal
          isOpen={showMetadataEditor}
          onClose={() => setShowMetadataEditor(false)}
          track={currentTrack}
          customMetadata={customMetadata}
          onSaveMetadata={(newMeta) => setCustomMetadata(newMeta)}
        />
      )}

      {/* App & Audio Preferences Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        historyCount={history.length}
        onClearHistory={handleClearHistory}
      />
    </>
  );
}
