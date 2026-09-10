import React from 'react';
import { Play, Pause, Download, X, Volume2, Check } from 'lucide-react';
import { SunoTrack, AudioFormat } from '../types';

interface PlayerBarProps {
  track: SunoTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onDownload: (track: SunoTrack, format?: AudioFormat) => void;
  onClose: () => void;
  currentFormat: AudioFormat;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  track,
  isPlaying,
  onTogglePlay,
  onDownload,
  onClose,
  currentFormat,
}) => {
  if (!track) return null;

  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-30 px-3 max-w-xl mx-auto">
      <div 
        id="suno-mini-player"
        className="bg-[#18181b]/95 text-white backdrop-blur-md rounded-2xl p-2.5 shadow-xl flex items-center justify-between gap-3 border border-neutral-800 animate-in slide-in-from-bottom-2 duration-150"
      >
        {/* Track Artwork & Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-neutral-800 shrink-0">
            <img
              src={track.image_url}
              alt={track.title}
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex items-end gap-[2px] h-3">
                  <span className="w-1 bg-white animate-bounce h-2" />
                  <span className="w-1 bg-white animate-bounce h-3 delay-75" />
                  <span className="w-1 bg-white animate-bounce h-1.5 delay-150" />
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs text-white truncate">{track.title}</h4>
            <p className="text-[11px] text-neutral-400 truncate">{track.artist} • {track.duration_formatted}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Play/Pause */}
          <button
            id="mini-player-toggle-btn"
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-all active:scale-90 hover:bg-neutral-200"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black translate-x-0.5" />
            )}
          </button>

          {/* Quick Download */}
          <button
            id="mini-player-download-btn"
            onClick={() => onDownload(track, currentFormat)}
            title={`Download ${track.title} (${currentFormat.toUpperCase()})`}
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-neutral-300" />
            <span className="uppercase text-[10px] font-bold tracking-wide">{currentFormat}</span>
          </button>

          {/* Close miniplayer */}
          <button
            id="mini-player-close-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-full text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
