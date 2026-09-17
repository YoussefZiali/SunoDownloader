import React, { useState, useRef, useMemo } from 'react';
import { 
  Compass, Play, Pause, ChevronLeft, ChevronRight, Sparkles, 
  Disc, Music, Sliders, Mic2, Orbit, Download, Heart, Flame,
  TrendingUp, Radio, Layers, Search, Filter, ArrowRight, Share2,
  Check, CheckCircle2, AlertCircle, X, FolderArchive, ArrowUpRight, RefreshCw,
  Link2
} from 'lucide-react';
import { SunoTrack, SunoPlaylist, AudioFormat } from '../types';
import { estimateMusicAttributes } from '../utils/musicAnalyzer';

interface ExploreDiscoverViewProps {
  playlists: SunoPlaylist[];
  allTracks: SunoTrack[];
  activeTrack: SunoTrack | null;
  isPlaying: boolean;
  isLoadingAudio?: boolean;
  loadingTrackId?: string | null;
  onPlayTrack: (track: SunoTrack) => void;
  onPlayPlaylist: (playlist: SunoPlaylist) => void;
  onSelectPlaylist: (playlist: SunoPlaylist) => void;
  onOpenStudioDaw: (track: SunoTrack) => void;
  onOpenKaraoke: (track: SunoTrack) => void;
  onOpenSpatial8D: (track: SunoTrack) => void;
  onQuickDownload: (track: SunoTrack, format: AudioFormat) => void;
  onDownloadBatchZip?: (tracks: SunoTrack[], format: AudioFormat) => void;
  onOpenSunoIngest?: (urlOrId?: string) => void;
  onOpenBulkImporter?: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Sounds', icon: Sparkles },
  { id: 'featured', label: 'Featured Studio', icon: Flame },
  { id: 'hip-hop', label: 'Hip Hop & Rap', icon: Disc },
  { id: 'pop', label: 'Pop & Vocal', icon: Music },
  { id: 'house', label: 'House & EDM', icon: Radio },
  { id: 'k-pop', label: 'K-Pop', icon: Sparkles },
  { id: 'rnb', label: 'R&B & Soul', icon: Heart },
  { id: 'latin', label: 'Latin & Reggaeton', icon: Flame },
  { id: 'rock', label: 'Rock & Alternative', icon: Radio },
  { id: 'afrobeats', label: 'Afrobeats', icon: TrendingUp },
  { id: 'remix', label: 'Remix Ready', icon: Layers },
];

export const ExploreDiscoverView: React.FC<ExploreDiscoverViewProps> = ({
  playlists,
  allTracks,
  activeTrack,
  isPlaying,
  isLoadingAudio = false,
  loadingTrackId = null,
  onPlayTrack,
  onPlayPlaylist,
  onSelectPlaylist,
  onOpenStudioDaw,
  onOpenKaraoke,
  onOpenSpatial8D,
  onQuickDownload,
  onDownloadBatchZip,
  onOpenSunoIngest,
  onOpenBulkImporter,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [importInput, setImportInput] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadModalPlaylist, setDownloadModalPlaylist] = useState<SunoPlaylist | null>(null);

  // Map of scroll container refs for each playlist slider
  const sliderRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleScrollSlider = (key: string, direction: 'left' | 'right') => {
    const el = sliderRefs.current[key];
    if (el) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCopyLink = (track: SunoTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`https://suno.com/song/${track.id}`);
    setCopiedId(track.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunImport = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onOpenSunoIngest) {
      onOpenSunoIngest(importInput.trim());
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setImportInput(text.trim());
      }
    } catch {
      // Ignore if clipboard access denied
    }
  };

  // Filter playlists based on category and search query
  const filteredPlaylists = useMemo(() => {
    let list = [...playlists];

    if (selectedCategory !== 'all') {
      const catLower = selectedCategory.toLowerCase();
      list = list.filter((p) => {
        const titleLower = p.title.toLowerCase();
        if (catLower === 'featured' && (titleLower.includes('studio') || titleLower.includes('picks'))) return true;
        if (catLower === 'remix' && titleLower.includes('remix')) return true;
        if (catLower === 'hip-hop' && titleLower.includes('hip hop')) return true;
        if (catLower === 'pop' && titleLower.includes('pop') && !titleLower.includes('k-pop')) return true;
        if (catLower === 'house' && (titleLower.includes('house') || titleLower.includes('edm'))) return true;
        if (catLower === 'k-pop' && titleLower.includes('k-pop')) return true;
        if (catLower === 'rnb' && (titleLower.includes('r&b') || titleLower.includes('soul'))) return true;
        if (catLower === 'latin' && titleLower.includes('latin')) return true;
        if (catLower === 'rock' && titleLower.includes('rock')) return true;
        if (catLower === 'afrobeats' && titleLower.includes('afrobeats')) return true;
        return titleLower.includes(catLower);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => 
          p.title.toLowerCase().includes(q) || 
          p.tracks.some((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.tags?.toLowerCase().includes(q))
      );
    }

    return list;
  }, [playlists, selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6 sm:space-y-8 md:space-y-10">
      
      {/* ---------------- 1. IMPORT MUSIC OR PLAYLIST HERO BANNER ---------------- */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-900 via-[#181822] to-neutral-900 border border-neutral-800 p-4 sm:p-7 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-bl from-[#ff2d55]/15 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 sm:w-80 h-56 sm:h-80 bg-gradient-to-tr from-amber-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Suno Music & Playlist Ingest</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight font-['Syne']">
            Import Music or Playlist
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-2xl">
            Paste any Suno song link or playlist URL to fetch lossless streams, extract multi-format stems, or audition curated sound crates below.
          </p>

          {/* Direct Import Box */}
          <div className="pt-1 sm:pt-2 max-w-2xl space-y-2 sm:space-y-2.5">
            <form onSubmit={handleRunImport} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Paste Suno song URL, playlist link, or ID..."
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  className="w-full pl-9 pr-14 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-neutral-950/90 border border-neutral-700/80 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55] shadow-inner backdrop-blur-md transition-all"
                />
                {importInput ? (
                  <button
                    type="button"
                    onClick={() => setImportInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
                  >
                    Clear
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
                  >
                    Paste
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#ff2d55] to-rose-600 hover:from-rose-600 hover:to-[#ff2d55] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#ff2d55]/30 cursor-pointer active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Import & Download</span>
                </button>

                {onOpenBulkImporter && (
                  <button
                    type="button"
                    onClick={onOpenBulkImporter}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs sm:text-sm font-semibold cursor-pointer active:scale-95 transition-all"
                    title="Bulk Multi-URL Importer"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bulk</span>
                  </button>
                )}
              </div>
            </form>

            {/* Quick Filter Bar for Curated Content */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Filter curated songs, artists, genres, or moods below..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 sm:py-2 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 2. CATEGORY PILL SLIDER ---------------- */}
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ff2d55]" />
            <span>Browse by Category</span>
          </h3>
          <span className="text-[10px] sm:text-xs font-mono text-neutral-500">
            {filteredPlaylists.length} Playlists
          </span>
        </div>

        {/* Horizontal Category Chips */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#ff2d55] to-rose-600 text-white shadow-md shadow-[#ff2d55]/25 scale-102'
                    : 'bg-neutral-900/90 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- 3. PLAYLISTS CAROUSEL SLIDER ---------------- */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Disc className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-[spin_10s_linear_infinite]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">Curated Playlists & Sound Crates</h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">Select any collection to view in Library or play continuously</p>
            </div>
          </div>

          {/* Slider Arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleScrollSlider('playlists_main', 'left')}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => handleScrollSlider('playlists_main', 'right')}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Playlists Horizontal Slider Container */}
        <div
          ref={(el) => { sliderRefs.current['playlists_main'] = el; }}
          className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-3 snap-x snap-mandatory no-scrollbar"
        >
          {filteredPlaylists.map((playlist) => {
            const trackCount = playlist.tracks?.length || 0;
            const isCurrentPlayingPlaylist = playlist.tracks.some((t) => t.id === activeTrack?.id);

            return (
              <div
                key={playlist.id}
                className="w-44 sm:w-56 md:w-64 shrink-0 snap-start bg-neutral-900/80 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-2.5 sm:p-3.5 transition-all duration-200 group shadow-lg flex flex-col justify-between"
              >
                <div>
                  {/* Cover Artwork */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-800 mb-2 sm:mb-3 shadow-md">
                    <img 
                      src={playlist.cover_url || playlist.tracks[0]?.image_url || 'https://cdn2.suno.ai/image_large_placeholder.jpeg'} 
                      alt={playlist.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    
                    {/* Badge */}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold text-white border border-neutral-700/50">
                      {trackCount} Tracks
                    </div>

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                      <button
                        onClick={() => onPlayPlaylist(playlist)}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#ff2d55] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
                        title="Play All in Playlist"
                      >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                      </button>
                    </div>

                    {isCurrentPlayingPlaylist && isPlaying && (
                      <div className="absolute bottom-2 right-2 bg-[#ff2d55] text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>Playing</span>
                      </div>
                    )}
                  </div>

                  {/* Playlist Info */}
                  <h3 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#ff2d55] transition-colors">
                    {playlist.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-neutral-400 line-clamp-1 sm:line-clamp-2 mt-0.5 min-h-[16px] sm:min-h-[30px]">
                    {playlist.description || `Curated collection with ${trackCount} Suno Studio tracks.`}
                  </p>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 mt-2 border-t border-neutral-800 flex items-center justify-between gap-1.5 sm:gap-2">
                  <button
                    onClick={() => onSelectPlaylist(playlist)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-neutral-800 hover:bg-[#ff2d55] text-[10px] sm:text-xs font-bold text-neutral-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => setDownloadModalPlaylist(playlist)}
                    className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-neutral-800 hover:bg-emerald-600 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Download Playlist or Import in Suno Ingest"
                  >
                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>

                  <button
                    onClick={() => onPlayPlaylist(playlist)}
                    className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#ff2d55]/20 text-[#ff2d55] hover:bg-[#ff2d55] hover:text-white transition-colors cursor-pointer"
                    title="Play Playlist"
                  >
                    <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- 4. DEDICATED TRACK SLIDERS FOR EACH PLAYLIST ---------------- */}
      <div className="space-y-8 sm:space-y-10 pt-2">
        {filteredPlaylists.map((playlist) => {
          const sampleTracks = playlist.tracks.slice(0, 10);
          if (sampleTracks.length === 0) return null;

          const sliderKey = `slider_playlist_${playlist.id}`;

          return (
            <section key={playlist.id} className="space-y-3 sm:space-y-4">
              
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                <div 
                  className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
                  onClick={() => onSelectPlaylist(playlist)}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700/60 shadow group-hover:scale-105 transition-transform">
                    <img 
                      src={playlist.cover_url || sampleTracks[0]?.image_url} 
                      alt={playlist.title} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h2 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight group-hover:text-[#ff2d55] transition-colors truncate">
                        {playlist.title}
                      </h2>
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 shrink-0">
                        {playlist.tracks.length}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-neutral-400 truncate max-w-[200px] sm:max-w-md">
                      {playlist.description || `Spotlight tracks from ${playlist.title}`}
                    </p>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button
                    onClick={() => setDownloadModalPlaylist(playlist)}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-neutral-900 hover:bg-emerald-600 text-[11px] sm:text-xs font-bold text-neutral-300 hover:text-white border border-neutral-800 hover:border-emerald-500 transition-colors cursor-pointer"
                    title="Download Playlist"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => onSelectPlaylist(playlist)}
                    className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-neutral-900 hover:bg-[#ff2d55] text-[10px] sm:text-xs font-bold text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleScrollSlider(sliderKey, 'left')}
                      className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => handleScrollSlider(sliderKey, 'right')}
                      className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Scroll Right"
                    >
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Horizontal Tracks Slider */}
              <div
                ref={(el) => { sliderRefs.current[sliderKey] = el; }}
                className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-3 snap-x snap-mandatory no-scrollbar"
              >
                {sampleTracks.map((track) => {
                  const isCurrent = activeTrack?.id === track.id;
                  const isThisBuffering = (loadingTrackId === track.id && isLoadingAudio) || (isCurrent && isLoadingAudio);
                  const analysis = estimateMusicAttributes(track);

                  return (
                    <div
                      key={track.id}
                      className={`w-36 sm:w-44 md:w-52 shrink-0 snap-start rounded-xl sm:rounded-2xl p-2 sm:p-2.5 bg-neutral-900/90 hover:bg-neutral-850 border transition-all duration-200 group flex flex-col justify-between shadow-lg cursor-pointer ${
                        isCurrent ? 'border-[#ff2d55] ring-1 ring-[#ff2d55]/40 bg-[#16141a]' : 'border-neutral-800 hover:border-neutral-700'
                      }`}
                      onClick={() => onPlayTrack(track)}
                    >
                      <div>
                        {/* Artwork with Quick Play Button */}
                        <div className="relative aspect-square w-full rounded-lg sm:rounded-xl overflow-hidden bg-neutral-800 mb-1.5 sm:mb-2 shadow-inner">
                          <img 
                            src={track.image_url} 
                            alt={track.title} 
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                              isThisBuffering ? 'scale-105 opacity-80' : ''
                            }`} 
                          />

                          {/* Camelot & BPM Pill */}
                          <div className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-bold text-amber-400 border border-neutral-700/60">
                            {analysis.camelot} • {analysis.bpm}
                          </div>

                          {/* Duration Pill */}
                          <div className="absolute top-1.5 right-1.5 bg-black/75 backdrop-blur-md px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-mono text-neutral-300">
                            {track.duration_formatted}
                          </div>

                          {/* Play overlay button */}
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                            isThisBuffering || (isCurrent && isPlaying) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 active:scale-95 transition-all ${
                              isThisBuffering ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white animate-player-buffering shadow-pink-500/50' : 'bg-white text-black'
                            }`}>
                              {isThisBuffering ? (
                                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
                              ) : isCurrent && isPlaying ? (
                                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-black" />
                              ) : (
                                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black translate-x-0.5" />
                              )}
                            </div>
                          </div>

                          {/* Active Equalizer or Buffering Pill */}
                          {isThisBuffering ? (
                            <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-pink-500/60">
                              <span className="w-1 h-1 rounded-full bg-pink-400 animate-ping" />
                              <span className="text-[8px] font-mono font-extrabold text-pink-300 tracking-wider">LOAD</span>
                            </div>
                          ) : isCurrent && isPlaying ? (
                            <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-md p-1 rounded flex items-end gap-[2px] h-4">
                              <span className="w-0.5 sm:w-1 bg-[#ff2d55] animate-bounce h-2.5 rounded-full" />
                              <span className="w-0.5 sm:w-1 bg-rose-400 animate-bounce h-3 delay-75 rounded-full" />
                              <span className="w-0.5 sm:w-1 bg-amber-400 animate-bounce h-1.5 delay-150 rounded-full" />
                            </div>
                          ) : null}
                        </div>

                        {/* Title & Artist */}
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#ff2d55] transition-colors">
                          {track.title}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-neutral-400 truncate mt-0.5">
                          {track.artist}
                        </p>

                        {/* Tags */}
                        {track.tags && (
                          <p className="text-[9px] sm:text-[10px] text-neutral-500 truncate mt-0.5">
                            {track.tags}
                          </p>
                        )}
                      </div>

                      {/* Action Icon Strip */}
                      <div 
                        className="pt-2 mt-2 border-t border-neutral-800/80 flex items-center justify-between text-neutral-400 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Open Studio DAW */}
                        <button
                          onClick={() => onOpenStudioDaw(track)}
                          className="p-1 sm:p-1.5 rounded-lg hover:text-[#ff2d55] hover:bg-neutral-800 transition-colors"
                          title="Open Studio DAW"
                        >
                          <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>

                        {/* Open Karaoke */}
                        <button
                          onClick={() => onOpenKaraoke(track)}
                          className="p-1 sm:p-1.5 rounded-lg hover:text-pink-400 hover:bg-neutral-800 transition-colors"
                          title="Sing with Synced Lyrics & Karaoke"
                        >
                          <Mic2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>

                        {/* 8D Spatial Audio */}
                        <button
                          onClick={() => onOpenSpatial8D(track)}
                          className="p-1 sm:p-1.5 rounded-lg hover:text-indigo-400 hover:bg-neutral-800 transition-colors"
                          title="360° 8D Spatial Audio"
                        >
                          <Orbit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>

                        {/* Quick Download */}
                        <button
                          onClick={() => onQuickDownload(track, 'mp3')}
                          className="p-1 sm:p-1.5 rounded-lg hover:text-emerald-400 hover:bg-neutral-800 transition-colors"
                          title="Download MP3"
                        >
                          <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>

                        {/* Copy Link */}
                        <button
                          onClick={(e) => handleCopyLink(track, e)}
                          className="p-1 sm:p-1.5 rounded-lg hover:text-white hover:bg-neutral-800 transition-colors"
                          title="Copy Song Link"
                        >
                          {copiedId === track.id ? (
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          )}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

            </section>
          );
        })}
      </div>

      {/* ---------------- 5. DOWNLOAD PLAYLIST / IMPORT SUNO MODAL ---------------- */}
      {downloadModalPlaylist && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0e0f14] border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/50">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FolderArchive className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    Download Playlist
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-400 truncate max-w-[220px] sm:max-w-[280px]">
                    {downloadModalPlaylist.title} &bull; {downloadModalPlaylist.tracks.length} Tracks
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDownloadModalPlaylist(null)}
                className="p-1.5 sm:p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Notice / Helper Box */}
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 sm:gap-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] sm:text-xs text-amber-200/90 leading-relaxed space-y-1">
                  <p className="font-bold text-amber-300">Choose your download or ingest method:</p>
                  <p>
                    For the highest audio quality with multi-track stems (Vocals & Instrumental), synchronized karaoke lyrics, and chord progressions, open in <strong>Download Suno</strong>. Or download the bundled MP3 archive directly.
                  </p>
                </div>
              </div>

              {/* Option 1: Open in Download Suno (Primary) */}
              <div 
                onClick={() => {
                  const pl = downloadModalPlaylist;
                  setDownloadModalPlaylist(null);
                  if (onOpenSunoIngest) {
                    onOpenSunoIngest(`https://suno.com/playlist/${pl.id}`);
                  }
                }}
                className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border border-rose-500/40 hover:border-rose-500 transition-all cursor-pointer group shadow-lg hover:shadow-rose-500/10 flex items-center justify-between gap-3 sm:gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-[#ff2d55] transition-colors">
                      🚀 Open in Download Suno (Recommended)
                    </span>
                    <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-[#ff2d55]/20 text-[#ff2d55] font-bold">
                      Full Stems
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-neutral-400 leading-relaxed">
                    Fetch live Suno masters, extract stem tracks, lyrics .LRC, and ID3 album tags.
                  </p>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#ff2d55] text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>

              {/* Option 2: Direct ZIP Download */}
              <div 
                onClick={() => {
                  const pl = downloadModalPlaylist;
                  setDownloadModalPlaylist(null);
                  if (onDownloadBatchZip) {
                    onDownloadBatchZip(pl.tracks, 'mp3');
                  }
                }}
                className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-emerald-500/60 transition-all cursor-pointer group flex items-center justify-between gap-3 sm:gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      📦 Direct .ZIP Batch Archive
                    </span>
                    <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                      320 kbps
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-neutral-400 leading-relaxed">
                    Instantly package all {downloadModalPlaylist.tracks.length} preloaded songs into a single download archive.
                  </p>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neutral-800 group-hover:bg-emerald-600 text-neutral-300 group-hover:text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-all">
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-end">
              <button
                onClick={() => setDownloadModalPlaylist(null)}
                className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
