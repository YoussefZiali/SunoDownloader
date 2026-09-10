import React from 'react';
import { Download, CheckCircle2, AlertCircle, Play, FileAudio, Trash2, ExternalLink, RefreshCw, FolderDown, Archive } from 'lucide-react';
import { DownloadItem, AudioFormat, SunoTrack } from '../types';

interface LibraryViewProps {
  downloads: DownloadItem[];
  onPlayTrack: (track: SunoTrack) => void;
  onSaveItem: (item: DownloadItem) => void;
  onClearHistory: () => void;
  onRedownload: (track: SunoTrack, format: AudioFormat) => void;
  onNavigateDownloader: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  downloads,
  onPlayTrack,
  onSaveItem,
  onClearHistory,
  onRedownload,
  onNavigateDownloader,
}) => {
  const activeQueue = downloads.filter((d) => d.status !== 'completed' && d.status !== 'error');
  const completedList = downloads.filter((d) => d.status === 'completed' || d.status === 'error');

  return (
    <div className="pb-32 pt-2 px-4 max-w-xl mx-auto space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Downloads Library</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {downloads.length} files processed • Saved locally
          </p>
        </div>

        {downloads.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-red-600 transition-colors p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* ACTIVE QUEUE */}
      {activeQueue.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-800" />
            Active Tasks ({activeQueue.length})
          </h3>

          <div className="space-y-2">
            {activeQueue.map((item) => (
              <div key={item.id} className="p-3.5 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-3">
                  <img
                    src={item.track.image_url}
                    alt={item.track.title}
                    className="w-11 h-11 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-neutral-900 truncate">{item.fileName}</div>
                    <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                      <span className="capitalize font-semibold text-neutral-700">{item.status}...</span>
                      <span>•</span>
                      <span className="uppercase font-bold text-[10px] px-1.5 py-0.2 rounded bg-neutral-100">
                        {item.format}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-neutral-900">{item.progress}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-neutral-950 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, item.progress)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLETED LIST */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
          Completed Downloads ({completedList.length})
        </h3>

        {completedList.length === 0 && activeQueue.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-white border border-neutral-200/80 space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center mx-auto">
              <FolderDown className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-neutral-900">No Downloads Yet</h4>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1">
                Explore popular Suno songs or paste a track URL in Downloader Studio to save MP3 or lossless WAV files.
              </p>
            </div>
            <button
              onClick={onNavigateDownloader}
              className="px-5 py-2.5 rounded-full bg-neutral-950 hover:bg-black text-white font-bold text-xs transition-colors"
            >
              Go to Downloader
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {completedList.map((item) => {
              const isError = item.status === 'error';
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs hover:border-neutral-300 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.track.image_url}
                      alt={item.track.title}
                      className="w-11 h-11 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-neutral-900 truncate">
                        {item.fileName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                        <span className="uppercase font-bold text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-800">
                          {item.format}
                        </span>
                        <span>•</span>
                        {item.fileSize ? (
                          <span>{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                        ) : (
                          <span>{item.track.duration_formatted}</span>
                        )}
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {/* Play locally */}
                    <button
                      onClick={() => onPlayTrack(item.track)}
                      title="Play Preview"
                      className="p-2 rounded-full hover:bg-neutral-100 text-neutral-700 transition-colors"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>

                    {/* Download/Save trigger */}
                    <button
                      onClick={() => onSaveItem(item)}
                      title="Save to computer"
                      className="p-2 rounded-full bg-neutral-950 hover:bg-black text-white transition-all active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
