import React, { useState } from 'react';
import { Search, Sparkles, Download, MoreVertical, Play, Pause, ExternalLink, Music } from 'lucide-react';
import { SunoTrack, AudioFormat } from '../types';

interface SearchViewProps {
  tracks: SunoTrack[];
  activeTrack: SunoTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: SunoTrack) => void;
  onQuickDownload: (track: SunoTrack) => void;
  onOpenTrackMenu: (track: SunoTrack) => void;
  defaultFormat: AudioFormat;
  onPasteDetect: (url: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  tracks,
  activeTrack,
  isPlaying,
  onPlayTrack,
  onQuickDownload,
  onOpenTrackMenu,
  defaultFormat,
  onPasteDetect,
}) => {
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const tags = ['All', 'v6 Model', 'R&B', 'Rock', 'Afrobeat', 'Synthpop', 'Acoustic'];

  const filtered = tracks.filter((track) => {
    const matchesQuery =
      !query.trim() ||
      track.title.toLowerCase().includes(query.toLowerCase()) ||
      track.artist.toLowerCase().includes(query.toLowerCase()) ||
      (track.tags && track.tags.toLowerCase().includes(query.toLowerCase()));

    const matchesTag =
      selectedTag === 'All' ||
      (selectedTag === 'v6 Model' && track.model === 'v6') ||
      (track.tags && track.tags.toLowerCase().includes(selectedTag.toLowerCase()));

    return matchesQuery && matchesTag;
  });

  return (
    <div className="pb-32 pt-2 px-4 max-w-xl mx-auto space-y-4">
      
      {/* Search Input with URL Detector */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          id="search-view-input"
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (val.includes('suno.com/')) {
              onPasteDetect(val);
            }
          }}
          placeholder="Search by song name, artist, tag, or paste Suno URL..."
          className="w-full pl-11 pr-4 py-3 rounded-full bg-neutral-200/60 hover:bg-neutral-200/80 focus:bg-white text-neutral-900 placeholder:text-neutral-500 font-medium text-sm transition-all outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>

      {/* Filter Tag Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              selectedTag === tag
                ? 'bg-neutral-950 text-white shadow-xs'
                : 'bg-neutral-200/70 hover:bg-neutral-300 text-neutral-700'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-bold text-neutral-500 pt-1">
        <span>{filtered.length} Songs Found</span>
        <span>Format: {defaultFormat.toUpperCase()}</span>
      </div>

      {/* Search Results List */}
      <div className="space-y-2">
        {filtered.map((track) => {
          const isThisPlaying = isPlaying && activeTrack?.id === track.id;
          return (
            <div
              key={track.id}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-neutral-200/60 hover:border-neutral-300 shadow-2xs transition-all cursor-pointer group"
              onClick={() => onPlayTrack(track)}
            >
              <div className="relative w-13 h-13 rounded-xl overflow-hidden bg-neutral-100 shrink-0 mr-3">
                <img
                  src={track.image_url}
                  alt={track.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${
                  isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  {isThisPlaying ? (
                    <Pause className="w-5 h-5 text-white fill-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="font-bold text-sm text-neutral-900 truncate group-hover:text-black">
                  {track.title}
                </div>
                <div className="text-xs text-neutral-500 truncate flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-neutral-700">{track.artist}</span>
                  <span>•</span>
                  <span>{track.duration_formatted}</span>
                  <span>•</span>
                  <span className="truncate">{track.tags?.split(',')[0]}</span>
                </div>
              </div>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onQuickDownload(track)}
                  title={`Download ${defaultFormat.toUpperCase()}`}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-700 hover:text-black transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onOpenTrackMenu(track)}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
