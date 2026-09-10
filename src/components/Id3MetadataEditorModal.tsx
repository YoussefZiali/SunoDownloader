import React, { useState, useEffect } from 'react';
import { X, Tag, RotateCcw, Check, Sparkles, Music } from 'lucide-react';
import { SunoTrack, TrackMetadataCustomization } from '../types';

interface Id3MetadataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: SunoTrack;
  customMetadata: TrackMetadataCustomization;
  onSaveMetadata: (newMeta: TrackMetadataCustomization) => void;
}

const POPULAR_GENRES = [
  'Synthwave', 'Cyberpunk', 'Lo-Fi', 'EDM', 'Pop', 'Rock', 
  'Hip-Hop', 'Acoustic', 'Orchestral', 'Afrobeat', 'Indie', 'Metal'
];

export const Id3MetadataEditorModal: React.FC<Id3MetadataEditorModalProps> = ({
  isOpen,
  onClose,
  track,
  customMetadata,
  onSaveMetadata,
}) => {
  const [title, setTitle] = useState(customMetadata.title || track.title);
  const [artist, setArtist] = useState(customMetadata.artist || track.artist);
  const [album, setAlbum] = useState(customMetadata.album || 'Suno AI Collection');
  const [year, setYear] = useState(customMetadata.year || new Date().getFullYear().toString());
  const [genre, setGenre] = useState(customMetadata.genre || (track.tags ? track.tags.split(',')[0].trim() : 'AI Music'));

  useEffect(() => {
    setTitle(customMetadata.title || track.title);
    setArtist(customMetadata.artist || track.artist);
    setAlbum(customMetadata.album || 'Suno AI Collection');
    setYear(customMetadata.year || new Date().getFullYear().toString());
    setGenre(customMetadata.genre || (track.tags ? track.tags.split(',')[0].trim() : 'AI Music'));
  }, [track.id, customMetadata, isOpen]);

  if (!isOpen) return null;

  const handleReset = () => {
    setTitle(track.title);
    setArtist(track.artist);
    setAlbum('Suno AI Collection');
    setYear(new Date().getFullYear().toString());
    setGenre(track.tags ? track.tags.split(',')[0].trim() : 'AI Music');
  };

  const handleSave = () => {
    onSaveMetadata({
      title: title.trim(),
      artist: artist.trim(),
      album: album.trim(),
      year: year.trim(),
      genre: genre.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 text-white">
      <div 
        className="w-full max-w-md bg-[#0e0f14] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        id="id3-metadata-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff2d55]/20 to-amber-500/20 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55]">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">ID3 Metadata Studio</h2>
              <p className="text-xs text-neutral-400">Embed tags directly into downloaded MP3 & FLAC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Cover thumbnail & preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <img
              src={track.image_url}
              alt="cover"
              className="w-12 h-12 rounded-lg object-cover bg-neutral-900 border border-neutral-800 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-[#ff2d55] font-mono">ID3v2.3 Target</span>
              <p className="text-xs font-bold text-white truncate">{title || 'Untitled'}</p>
              <p className="text-[11px] text-neutral-400 truncate">{artist || 'Unknown Artist'}</p>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Track Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-[#ff2d55] text-xs text-white outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Artist Name</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-[#ff2d55] text-xs text-white outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Album</label>
                <input
                  type="text"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-[#ff2d55] text-xs text-white outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Year</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-[#ff2d55] text-xs text-white outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Genre</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-[#ff2d55] text-xs text-white outline-none transition-colors"
              />
            </div>

            {/* Quick Genre Pills */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-neutral-500">Quick Genre Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenre(g)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors border ${
                      genre.toLowerCase() === g.toLowerCase()
                        ? 'bg-[#ff2d55] text-white border-[#ff2d55]'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-800"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="save-id3-metadata-btn"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#ff2d55] to-[#d61d44] hover:opacity-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#ff2d55]/20"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Tags
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
