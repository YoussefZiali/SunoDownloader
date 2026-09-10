import React from 'react';
import { X, History, Trash2, Download, Play, CheckCircle2, Clock, Music, Scissors, Volume2 } from 'lucide-react';
import { DownloadHistoryEntry, AudioFormat, SunoTrack } from '../types';

interface DownloadHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: DownloadHistoryEntry[];
  onClearHistory: () => void;
  onReDownload: (entry: DownloadHistoryEntry) => void;
  onLoadTrack?: (trackId: string) => void;
  autoClearDays?: number;
  autoClearEnabled?: boolean;
}

export const DownloadHistoryDrawer: React.FC<DownloadHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onReDownload,
  onLoadTrack,
  autoClearDays,
  autoClearEnabled,
}) => {
  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md h-full bg-[#0d0e12] border-l border-neutral-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-250"
        id="history-drawer"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-[#ff2d55]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">Download History</h2>
                <span className="px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-mono">
                  {history.length}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Processed songs and export logs</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                title="Clear download logs"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {history.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-2 text-neutral-500">
              <Clock className="w-8 h-8 stroke-1 text-neutral-600" />
              <p className="text-xs font-medium">No recent downloads</p>
              <p className="text-[11px] text-neutral-600 max-w-[200px]">
                Songs you download in WAV, MP3, or FLAC will appear here for fast re-downloading.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all space-y-2.5 group"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.trackTitle}
                    className="w-11 h-11 rounded-lg object-cover bg-neutral-800 shrink-0 border border-neutral-800"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-[#ff2d55] transition-colors">
                      {item.trackTitle}
                    </h4>
                    <p className="text-[11px] text-neutral-400 truncate">{item.artist}</p>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] uppercase font-bold font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {item.format}
                      </span>

                      {item.wasClipped && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Scissors className="w-2.5 h-2.5" />
                          {item.clipRange || 'Clipped'}
                        </span>
                      )}

                      {item.isNormalized && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <Volume2 className="w-2.5 h-2.5" />
                          -14 LUFS
                        </span>
                      )}

                      <span className="text-[10px] text-neutral-500 ml-auto">
                        {formatDate(item.downloadedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/50">
                  {onLoadTrack && (
                    <button
                      type="button"
                      onClick={() => {
                        onLoadTrack(item.trackId);
                        onClose();
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3 h-3 text-[#ff2d55]" />
                      Open in Player
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onReDownload(item)}
                    className="py-1.5 px-3 rounded-lg bg-[#ff2d55]/10 hover:bg-[#ff2d55]/20 text-[#ff2d55] text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 border border-[#ff2d55]/30"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/40 text-[11px] text-neutral-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Local storage synced
            </span>
            {autoClearEnabled && (
              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px] font-medium flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-[#ff2d55]" />
                Auto-clears &gt; {autoClearDays || 7}d
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
