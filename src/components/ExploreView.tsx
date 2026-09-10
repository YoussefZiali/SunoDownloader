import React, { useState } from 'react';
import { Search, ChevronRight, MoreVertical, Play, Pause, Download, Check, Sparkles, Sliders } from 'lucide-react';
import { SunoTrack, AudioFormat } from '../types';

interface ExploreViewProps {
  tracks: SunoTrack[];
  activeTrack: SunoTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: SunoTrack) => void;
  onQuickDownload: (track: SunoTrack) => void;
  onOpenTrackMenu: (track: SunoTrack) => void;
  defaultFormat: AudioFormat;
  onSearchInput: (query: string) => void;
  searchQuery: string;
  onOpenSettings: () => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  tracks,
  activeTrack,
  isPlaying,
  onPlayTrack,
  onQuickDownload,
  onOpenTrackMenu,
  defaultFormat,
  onSearchInput,
  searchQuery,
  onOpenSettings,
}) => {
  // Filter tracks if query is provided
  const filtered = searchQuery.trim()
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.tags && t.tags.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tracks;

  const listenNowTracks = filtered.slice(0, 3);
  const bestOfV6Tracks = filtered.slice(3, 6);
  const staffPicksTracks = filtered.slice(6);

  return (
    <div className="pb-32 pt-2 px-4 max-w-xl mx-auto space-y-6">
      
      {/* Top Search Bar (Exact pill style from Screenshot 2) */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            id="suno-explore-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder="Search songs or paste Suno URL..."
            className="w-full pl-11 pr-4 py-3 rounded-full bg-neutral-200/60 hover:bg-neutral-200/80 focus:bg-white text-neutral-900 placeholder:text-neutral-500 font-medium text-sm transition-all outline-none focus:ring-2 focus:ring-neutral-900"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500 hover:text-neutral-800"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Format Indicator Pill */}
        <button
          onClick={onOpenSettings}
          title="Change download format"
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-xs font-bold text-neutral-800 transition-colors uppercase"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{defaultFormat}</span>
        </button>
      </div>

      {/* SECTION 1: Listen Now */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Listen Now</h2>
          <button 
            onClick={() => onSearchInput('')}
            className="flex items-center gap-0.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <span>More</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {listenNowTracks.map((track) => {
            const isThisPlaying = isPlaying && activeTrack?.id === track.id;
            return (
              <div
                key={track.id}
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-neutral-200/40 transition-colors group cursor-pointer"
                onClick={() => onPlayTrack(track)}
              >
                {/* Artwork with duration badge */}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-200 shrink-0 mr-3">
                  <img
                    src={track.image_url}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Time Badge (Bottom-left from screenshot) */}
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold tracking-tight backdrop-blur-xs">
                    {track.duration_formatted}
                  </span>
                  {/* Play overlay on hover or when playing */}
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

                {/* Track Details */}
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-bold text-sm text-neutral-900 truncate leading-snug group-hover:text-black">
                    {track.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                    <span className="text-neutral-700 font-semibold">▶ {track.play_count}</span>
                    <span>•</span>
                    <span className="truncate font-medium">{track.artist}</span>
                    {track.isVerified && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d55]" />
                    )}
                  </div>
                </div>

                {/* Actions: Download Button & Menu */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    id={`quick-download-${track.id}`}
                    onClick={() => onQuickDownload(track)}
                    title={`Download ${defaultFormat.toUpperCase()}`}
                    className="p-2 rounded-full hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 transition-colors active:scale-90"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    id={`more-menu-${track.id}`}
                    onClick={() => onOpenTrackMenu(track)}
                    className="p-2 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Best of v6 (Horizontal Carousel from Screenshot 2) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Best of v6</h2>
          <button className="flex items-center gap-0.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors">
            <span>More</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal Carousel */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4 scroll-smooth">
          {bestOfV6Tracks.map((track) => {
            const isThisPlaying = isPlaying && activeTrack?.id === track.id;
            return (
              <div
                key={track.id}
                className="w-44 shrink-0 group cursor-pointer"
                onClick={() => onPlayTrack(track)}
              >
                {/* Square Card Artwork with dark stats overlay */}
                <div className="relative w-44 h-44 rounded-2xl overflow-hidden bg-neutral-200 mb-2 shadow-xs group-hover:shadow-md transition-all">
                  <img
                    src={track.image_url}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Dark gradient overlay with play, like, comment stats (Exact match to Screenshot 2!) */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-6 flex flex-col gap-1 text-white">
                    <div className="flex items-center gap-2.5 text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        ▶ {track.play_count}
                      </span>
                      <span className="flex items-center gap-1">
                        👍 {track.upvote_count}
                      </span>
                    </div>
                    {track.comment_count && (
                      <span className="text-[10px] text-neutral-300 flex items-center gap-1">
                        💬 {track.comment_count}
                      </span>
                    )}
                  </div>

                  {/* Play trigger button */}
                  <div className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center transition-all ${
                    isThisPlaying ? 'opacity-100 bg-white text-black' : 'opacity-0 group-hover:opacity-100 text-white'
                  }`}>
                    {isThisPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    )}
                  </div>
                </div>

                {/* Title & Artist below card */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-neutral-900 truncate leading-snug">
                      {track.title}
                    </h4>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {track.artist}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickDownload(track);
                    }}
                    title={`Download ${defaultFormat.toUpperCase()}`}
                    className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Staff Picks (Screenshot 2 bottom section) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Staff Picks</h2>
          <button className="flex items-center gap-0.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors">
            <span>More</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {staffPicksTracks.map((track) => {
            const isThisPlaying = isPlaying && activeTrack?.id === track.id;
            return (
              <div
                key={track.id}
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-neutral-200/40 transition-colors group cursor-pointer"
                onClick={() => onPlayTrack(track)}
              >
                {/* Artwork */}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-200 shrink-0 mr-3">
                  <img
                    src={track.image_url}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold tracking-tight">
                    {track.duration_formatted}
                  </span>
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

                {/* Details */}
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-bold text-sm text-neutral-900 truncate leading-snug">
                    {track.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                    <span className="text-neutral-700 font-semibold">▶ {track.play_count}</span>
                    <span>•</span>
                    <span className="truncate font-semibold text-neutral-800">{track.artist}</span>
                    {track.isVerified && (
                      <span className="w-3.5 h-3.5 rounded-full bg-[#ff2d55] text-white flex items-center justify-center text-[9px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onQuickDownload(track)}
                    className="p-2 rounded-full hover:bg-neutral-200 text-neutral-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onOpenTrackMenu(track)}
                    className="p-2 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
