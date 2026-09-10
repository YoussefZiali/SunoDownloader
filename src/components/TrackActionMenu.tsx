import React from 'react';
import { Download, Play, Music, Video, FileText, Copy, Share2, Sparkles, X } from 'lucide-react';
import { SunoTrack, AudioFormat } from '../types';

interface TrackActionMenuProps {
  track: SunoTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadFormat: (track: SunoTrack, format: AudioFormat) => void;
  onDownloadLyrics: (track: SunoTrack) => void;
  onPlay: (track: SunoTrack) => void;
  onCopyLink: (track: SunoTrack) => void;
}

export const TrackActionMenu: React.FC<TrackActionMenuProps> = ({
  track,
  isOpen,
  onClose,
  onDownloadFormat,
  onDownloadLyrics,
  onPlay,
  onCopyLink,
}) => {
  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div 
        id="track-action-sheet"
        className="w-full max-w-md bg-white text-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Track header */}
        <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
          <img
            src={track.image_url}
            alt={track.title}
            className="w-14 h-14 rounded-xl object-cover bg-neutral-100"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-neutral-900 truncate">{track.title}</h3>
            <p className="text-xs text-neutral-500 truncate">{track.artist} • {track.duration_formatted} • Suno {track.model || 'v6'}</p>
            {track.tags && (
              <p className="text-[11px] text-neutral-400 truncate mt-0.5">{track.tags}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action list */}
        <div className="p-3 space-y-1 text-sm max-h-[60vh] overflow-y-auto">
          {/* Play option */}
          <button
            onClick={() => {
              onPlay(track);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors text-left"
          >
            <Play className="w-4 h-4 text-neutral-700 fill-neutral-700" />
            <span className="font-medium text-neutral-900">Play Preview</span>
          </button>

          {/* Download Lossless WAV */}
          <button
            onClick={() => {
              onDownloadFormat(track, 'wav');
              onClose();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 text-neutral-900" />
              <div>
                <div className="font-bold text-neutral-900">Download WAV</div>
                <div className="text-[11px] text-neutral-500">24-bit Lossless Studio PCM</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-900 text-white">
              Studio Master
            </span>
          </button>

          {/* Download MP3 */}
          <button
            onClick={() => {
              onDownloadFormat(track, 'mp3');
              onClose();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Music className="w-4 h-4 text-neutral-700" />
              <div>
                <div className="font-semibold text-neutral-900">Download MP3</div>
                <div className="text-[11px] text-neutral-500">320kbps High Quality Audio</div>
              </div>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
              Universal
            </span>
          </button>

          {/* Download MP4 Video */}
          <button
            onClick={() => {
              onDownloadFormat(track, 'mp4');
              onClose();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Video className="w-4 h-4 text-neutral-700" />
              <div>
                <div className="font-semibold text-neutral-900">Download MP4 Video</div>
                <div className="text-[11px] text-neutral-500">Official moving visualizer clip</div>
              </div>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
              Video
            </span>
          </button>

          {/* Download Lyrics */}
          <button
            onClick={() => {
              onDownloadLyrics(track);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors text-left"
          >
            <FileText className="w-4 h-4 text-neutral-700" />
            <div>
              <div className="font-medium text-neutral-900">Download Lyrics (.LRC / .TXT)</div>
              <div className="text-[11px] text-neutral-500">Karaoke-ready time synchronized lyrics</div>
            </div>
          </button>

          {/* Copy Suno Link */}
          <button
            onClick={() => {
              onCopyLink(track);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors text-left"
          >
            <Copy className="w-4 h-4 text-neutral-700" />
            <span className="font-medium text-neutral-900">Copy Suno Song URL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
