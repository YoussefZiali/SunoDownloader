import React, { useState, useEffect } from 'react';
import { 
  X, HardDrive, Download, Upload, Trash2, CheckCircle2, 
  Sparkles, RefreshCw, FileText, Database, ShieldCheck 
} from 'lucide-react';
import { SunoTrack, OfflineStoredTrack } from '../types';
import { 
  getAllOfflineTracks, removeOfflineTrack, clearAllOfflineTracks, 
  exportLibraryToJson, saveTrackForOffline 
} from '../utils/offlineStorage';
import { triggerFileDownload } from '../utils/audioConverter';

interface OfflineLibrarySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: SunoTrack | null;
  allTracks: SunoTrack[];
}

export const OfflineLibrarySyncModal: React.FC<OfflineLibrarySyncModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  allTracks,
}) => {
  const [offlineList, setOfflineList] = useState<OfflineStoredTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOfflineTracks();
    }
  }, [isOpen]);

  const loadOfflineTracks = async () => {
    setIsLoading(true);
    const list = await getAllOfflineTracks();
    setOfflineList(list);
    setIsLoading(false);
  };

  const handleCacheCurrent = async () => {
    if (!currentTrack) return;
    try {
      setIsLoading(true);
      const url = currentTrack.id ? `/api/suno/stream/${currentTrack.id}.mp3` : currentTrack.audio_url;
      const res = await fetch(url);
      const blob = await res.blob();
      await saveTrackForOffline(currentTrack, blob);
      await loadOfflineTracks();
    } catch (err: any) {
      alert(`Cache error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    await removeOfflineTrack(id);
    await loadOfflineTracks();
  };

  const handleClearAll = async () => {
    if (confirm('Clear all offline cached tracks from this browser?')) {
      await clearAllOfflineTracks();
      await loadOfflineTracks();
    }
  };

  const handleExportBackup = () => {
    const json = exportLibraryToJson(allTracks);
    const blob = new Blob([json], { type: 'application/json' });
    triggerFileDownload(blob, `Suno Audio Studio Backup (${new Date().toISOString().slice(0, 10)}).json`);
  };

  if (!isOpen) return null;

  const totalBytes = offlineList.reduce((acc, curr) => acc + (curr.fileSizeBytes || 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] sm:max-h-[88vh] bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                <span>Offline Cache & Backup</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  IndexedDB
                </span>
              </h2>
              <p className="text-xs text-neutral-400 truncate">
                100% Offline playback storage and JSON library exports
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* Storage stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Offline Cached Songs</span>
              <p className="text-2xl font-black text-white mt-1">{offlineList.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Local Browser Storage</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{totalMb} MB</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {currentTrack && (
              <button
                onClick={handleCacheCurrent}
                disabled={isLoading}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Save "{currentTrack.title.slice(0, 18)}..." Offline</span>
              </button>
            )}

            <button
              onClick={handleExportBackup}
              className="flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 transition-all"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Export JSON Backup</span>
            </button>

            {offlineList.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-red-950/40 text-red-400 font-bold text-xs rounded-xl border border-red-500/20 transition-all ml-auto"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Cache</span>
              </button>
            )}
          </div>

          {/* List of cached tracks */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Cached Tracks in Device Storage
            </h4>

            {offlineList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-neutral-900/30 border border-dashed border-neutral-800 text-neutral-500 text-xs">
                No songs cached offline yet. Click "Save Offline" on any track for instant airplane mode playback!
              </div>
            ) : (
              <div className="space-y-2">
                {offlineList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.track.image_url || '/placeholder.png'}
                        alt={item.track.title}
                        className="w-10 h-10 rounded-xl object-cover border border-neutral-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <h5 className="font-bold text-sm text-white truncate">{item.track.title}</h5>
                        <p className="text-xs text-neutral-400 truncate">
                          {((item.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB &bull; Saved {new Date(item.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-neutral-500 hover:text-red-400 rounded-xl hover:bg-neutral-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/90 text-center text-xs text-neutral-400">
          Audio cached in IndexedDB persists in your browser and works completely offline without internet connection.
        </div>

      </div>
    </div>
  );
};
