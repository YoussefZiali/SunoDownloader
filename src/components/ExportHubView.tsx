import React, { useState, useEffect } from 'react';
import { 
  FolderDown, History, HardDrive, Download, Trash2, 
  RefreshCw, CheckCircle2, FileText, Database, ShieldCheck, 
  ExternalLink, Disc, Music, Play, WifiOff, Sparkles, HelpCircle
} from 'lucide-react';
import { DownloadHistoryEntry, AudioFormat, OfflineStoredTrack, SunoTrack } from '../types';
import { 
  getAllOfflineTracks, removeOfflineTrack, clearAllOfflineTracks, 
  exportLibraryToJson 
} from '../utils/offlineStorage';
import { triggerFileDownload } from '../utils/audioConverter';

interface ExportHubViewProps {
  history: DownloadHistoryEntry[];
  onClearHistory: () => void;
  onReDownload: (entry: DownloadHistoryEntry) => void;
  onLoadTrack: (trackId: string) => void;
  onOpenStudioDaw: (track: SunoTrack) => void;
  allTracks: SunoTrack[];
  onPlayTrack?: (track: SunoTrack) => void;
}

export const ExportHubView: React.FC<ExportHubViewProps> = ({
  history,
  onClearHistory,
  onReDownload,
  onLoadTrack,
  onOpenStudioDaw,
  allTracks,
  onPlayTrack,
}) => {
  const [offlineTracks, setOfflineTracks] = useState<OfflineStoredTrack[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'vault'>('history');
  const [isLoadingVault, setIsLoadingVault] = useState(false);

  useEffect(() => {
    loadOffline();
  }, []);

  const loadOffline = async () => {
    setIsLoadingVault(true);
    const list = await getAllOfflineTracks();
    setOfflineTracks(list);
    setIsLoadingVault(false);
  };

  const handleDeleteOffline = async (id: string) => {
    await removeOfflineTrack(id);
    await loadOffline();
  };

  const handleClearAllOffline = async () => {
    if (confirm('Are you sure you want to remove all cached offline tracks?')) {
      await clearAllOfflineTracks();
      await loadOffline();
    }
  };

  const handleExportBackup = async () => {
    const jsonStr = exportLibraryToJson(allTracks);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    triggerFileDownload(blob, `suno_audio_studio_backup_${Date.now()}.json`);
  };

  const totalVaultBytes = offlineTracks.reduce((acc, item) => acc + (item.fileSizeBytes || 0), 0);
  const formattedVaultSize = (totalVaultBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="w-full min-h-screen bg-[#0d0d0f] text-neutral-100 pb-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#ff2d55]">
                Lossless Hub & Offline Storage
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Syne']">
              Exports & Offline Songs
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Manage rendered audio files, download history, and your browser's offline storage for airplane mode playback.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#ff2d55] text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Export History ({history.length})
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Offline Saved Songs ({offlineTracks.length})
            </button>
          </div>
        </div>

        {/* VIEW 1: Download History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Recent Exports & Conversions ({history.length})
              </h3>
              {history.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="py-16 text-center bg-neutral-900/60 rounded-3xl border border-neutral-800 space-y-3">
                <FolderDown className="w-10 h-10 text-neutral-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No downloads rendered yet</h4>
                <p className="text-xs text-neutral-500">
                  Export tracks from the DAW Studio or Music Library to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <img
                        src={entry.imageUrl}
                        alt={entry.trackTitle}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1 pr-2">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                          {entry.trackTitle}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                          <span className="font-medium text-neutral-300">{entry.artist}</span>
                          <span>•</span>
                          <span className="uppercase font-bold text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-[#ff2d55]">
                            {entry.format}
                          </span>
                          <span>•</span>
                          <span>{entry.durationFormatted}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onReDownload(entry)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-[#ff2d55] text-neutral-200 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: IndexedDB Offline Storage */}
        {activeTab === 'vault' && (
          <div className="space-y-5">
            
            {/* Clear Explanation Card */}
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3.5">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <WifiOff className="w-5 h-5 text-emerald-400" />
                <span>How Offline Music Storage Works</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono font-bold">1</span>
                    <span>Save Any Song</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed text-[11px]">
                    Click the <span className="text-emerald-400 font-bold">💾 Hard Drive</span> icon on any song card in your library to save it locally.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono font-bold">2</span>
                    <span>Stored on Your Device</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed text-[11px]">
                    Audio files are safely stored inside your browser memory (IndexedDB) without uploading to any external server.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono font-bold">3</span>
                    <span>Play in Airplane Mode</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed text-[11px]">
                    Enjoy full playback on flights, subways, or anywhere without Wi-Fi or cellular data!
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Summary Bar */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Local Browser Storage Status</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Active
                    </span>
                  </h4>
                  <p className="text-xs text-neutral-400">
                    {offlineTracks.length} song{offlineTracks.length === 1 ? '' : 's'} saved locally ({formattedVaultSize} MB) &bull; 100% Offline Ready
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportBackup}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Backup JSON</span>
                </button>
                {offlineTracks.length > 0 && (
                  <button
                    onClick={handleClearAllOffline}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-red-950/80 text-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Storage</span>
                  </button>
                )}
              </div>
            </div>

            {/* Offline Tracks List */}
            {offlineTracks.length === 0 ? (
              <div className="py-16 text-center bg-neutral-900/60 rounded-3xl border border-neutral-800 space-y-3">
                <HardDrive className="w-10 h-10 text-neutral-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No songs saved offline yet</h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  Click the hard drive (💾) icon on any track in your library to save it for instant offline listening.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {offlineTracks.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <img
                          src={item.track.image_url || '/placeholder.png'}
                          alt={item.track.title}
                          className="w-12 h-12 rounded-xl object-cover border border-neutral-700"
                        />
                        {onPlayTrack && (
                          <button
                            onClick={() => onPlayTrack(item.track)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity cursor-pointer text-white"
                            title="Play Offline Track"
                          >
                            <Play className="w-5 h-5 fill-white" />
                          </button>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pr-2">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                          {item.track.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5 flex-wrap">
                          <span className="font-medium text-neutral-300">{item.track.artist}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Offline Ready
                          </span>
                          {item.fileSizeBytes && (
                            <>
                              <span>•</span>
                              <span>{(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-neutral-500">Saved {new Date(item.savedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onPlayTrack && (
                        <button
                          onClick={() => onPlayTrack(item.track)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-black" />
                          <span className="hidden sm:inline">Play</span>
                        </button>
                      )}
                      <button
                        onClick={() => onOpenStudioDaw(item.track)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-[#ff2d55] text-neutral-200 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        DAW
                      </button>
                      <button
                        onClick={() => handleDeleteOffline(item.id)}
                        className="p-2 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Remove from Offline Storage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
