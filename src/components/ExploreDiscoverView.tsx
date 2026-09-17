import React, { useState, useRef, useMemo } from 'react';
import { 
  Compass, Play, Pause, ChevronLeft, ChevronRight, Sparkles, 
  Disc, Music, Sliders, Mic2, Orbit, Download, Heart, Flame,
  TrendingUp, Radio, Layers, Search, Filter, ArrowRight, Share2,
  Check, CheckCircle2, AlertCircle, X, FolderArchive, ArrowUpRight
} from 'lucide-react';
import { SunoTrack, SunoPlaylist, AudioFormat } from '../types';
import { estimateMusicAttributes } from '../utils/musicAnalyzer';

interface ExploreDiscoverViewProps {
  playlists: SunoPlaylist[];
  allTracks: SunoTrack[];
  activeTrack: SunoTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: SunoTrack) => void;
  onPlayPlaylist: (playlist: SunoPlaylist) => void;
  onSelectPlaylist: (playlist: SunoPlaylist) => void;
  onOpenStudioDaw: (track: SunoTrack) => void;
  onOpenKaraoke: (track: SunoTrack) => void;
  onOpenSpatial8D: (track: SunoTrack) => void;
  onQuickDownload: (track: SunoTrack, format: AudioFormat) => void;
  onDownloadBatchZip?: (tracks: SunoTrack[], format: AudioFormat) => void;
  onOpenSunoIngest?: (urlOrId?: string) => void;
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
  onPlayTrack,
  onPlayPlaylist,
  onSelectPlaylist,
  onOpenStudioDaw,
  onOpenKaraoke,
  onOpenSpatial8D,
  onQuickDownload,
  onDownloadBatchZip,
  onOpenSunoIngest,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadModalPlaylist, setDownloadModalPlaylist] = useState<SunoPlaylist | null>(null);

  // Map of scroll container refs for each playlist slider
  const sliderRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleScrollSlider = (key: string, direction: 'left' | 'right') => {
    const el = sliderRefs.current[key];
    if (el) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCopyLink = (track: SunoTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`https://suno.com/song/${track.id}`);
    setCopiedId(track.id);
    setTimeout(() => setCopiedId(null), 2000);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-10">
      
      {/* ---------------- 1. EXPLORE HERO BANNER ---------------- */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-900 via-[#181822] to-neutral-900 border border-neutral-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#ff2d55]/15 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-amber-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/30 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Suno Soundscape Explorer</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight font-['Syne']">
            Discover Curated Playlists & Genres
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-2xl">
            Explore fresh generative releases across all official Suno playlists. Audition tracks with horizontal sliders, jump directly into multi-track DAW mastering, sing along with synchronized karaoke, or export lossless 320k audio.
          </p>

          {/* Quick Search Bar inside Hero */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search across explore tracks, artists, genres, or moods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-neutral-950/80 border border-neutral-700/80 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55] shadow-inner backdrop-blur-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 2. CATEGORY PILL SLIDER ---------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#ff2d55]" />
            <span>Browse by Category</span>
          </h3>
          <span className="text-xs font-mono text-neutral-500">
            {filteredPlaylists.length} Playlists Active
          </span>
        </div>

        {/* Horizontal Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#ff2d55] to-rose-600 text-white shadow-lg shadow-[#ff2d55]/25 scale-105'
                    : 'bg-neutral-900/90 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- 3. PLAYLISTS CAROUSEL SLIDER (LIST OF PLAYLISTS BY CATEGORY) ---------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Disc className="w-4 h-4 animate-[spin_10s_linear_infinite]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Curated Playlists & Sound Crates</h2>
              <p className="text-xs text-neutral-400">Select any collection to view in Library or play continuously</p>
            </div>
          </div>

          {/* Slider Arrows */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleScrollSlider('playlists_main', 'left')}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScrollSlider('playlists_main', 'right')}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Playlists Horizontal Slider Container */}
        <div
          ref={(el) => { sliderRefs.current['playlists_main'] = el; }}
          className="flex items-center gap-4 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar"
        >
          {filteredPlaylists.map((playlist) => {
            const trackCount = playlist.tracks?.length || 0;
            const isCurrentPlayingPlaylist = playlist.tracks.some((t) => t.id === activeTrack?.id);

            return (
              <div
                key={playlist.id}
                className="w-64 sm:w-72 shrink-0 snap-start bg-neutral-900/80 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-3xl p-4 transition-all duration-200 group shadow-xl flex flex-col justify-between"
              >
                <div>
                  {/* Cover Artwork */}
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-800 mb-3.5 shadow-md">
                    <img 
                      src={playlist.cover_url || playlist.tracks[0]?.image_url || 'https://cdn2.suno.ai/image_large_placeholder.jpeg'} 
                      alt={playlist.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    
                    {/* Badge */}
                    <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white border border-neutral-700/50">
                      {trackCount} Tracks
                    </div>

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                      <button
                        onClick={() => onPlayPlaylist(playlist)}
                        className="w-12 h-12 rounded-full bg-[#ff2d55] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
                        title="Play All in Playlist"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    </div>

                    {isCurrentPlayingPlaylist && isPlaying && (
                      <div className="absolute bottom-2.5 right-2.5 bg-[#ff2d55] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>Now Playing</span>
                      </div>
                    )}
                  </div>

                  {/* Playlist Info */}
                  <h3 className="font-bold text-sm sm:text-base text-white truncate group-hover:text-[#ff2d55] transition-colors">
                    {playlist.title}
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-2 mt-1 min-h-[32px]">
                    {playlist.description || `Curated collection featuring ${trackCount} Suno Studio tracks.`}
                  </p>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 mt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectPlaylist(playlist)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-[#ff2d55] text-xs font-bold text-neutral-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Open Playlist</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDownloadModalPlaylist(playlist)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-emerald-600 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Download Playlist or Import in Suno Ingest"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onPlayPlaylist(playlist)}
                    className="p-2 rounded-xl bg-[#ff2d55]/20 text-[#ff2d55] hover:bg-[#ff2d55] hover:text-white transition-colors cursor-pointer"
                    title="Play Playlist"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- 4. DEDICATED TRACK SLIDERS FOR EACH PLAYLIST ("FEW SONGS FROM EACH PLAYLIST AS SLIDER") ---------------- */}
      <div className="space-y-12 pt-4">
        {filteredPlaylists.map((playlist, pIdx) => {
          const sampleTracks = playlist.tracks.slice(0, 10);
          if (sampleTracks.length === 0) return null;

          const sliderKey = `slider_playlist_${playlist.id}`;

          return (
            <section key={playlist.id} className="space-y-4">
              
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                <div 
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => onSelectPlaylist(playlist)}
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700/60 shadow group-hover:scale-105 transition-transform">
                    <img 
                      src={playlist.cover_url || sampleTracks[0]?.image_url} 
                      alt={playlist.title} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight group-hover:text-[#ff2d55] transition-colors">
                        {playlist.title}
                      </h2>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {playlist.tracks.length} tracks
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 truncate max-w-sm sm:max-w-xl">
                      {playlist.description || `Spotlight tracks from ${playlist.title}`}
                    </p>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDownloadModalPlaylist(playlist)}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-emerald-600 text-xs font-bold text-neutral-300 hover:text-white border border-neutral-800 hover:border-emerald-500 transition-colors cursor-pointer"
                    title="Download Playlist"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => onSelectPlaylist(playlist)}
                    className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-[#ff2d55] text-xs font-bold text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                  >
                    <span>View All ({playlist.tracks.length})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleScrollSlider(sliderKey, 'left')}
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleScrollSlider(sliderKey, 'right')}
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Scroll Right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Horizontal Tracks Slider */}
              <div
                ref={(el) => { sliderRefs.current[sliderKey] = el; }}
                className="flex items-center gap-4 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar"
              >
                {sampleTracks.map((track) => {
                  const isCurrent = activeTrack?.id === track.id;
                  const analysis = estimateMusicAttributes(track);

                  return (
                    <div
                      key={track.id}
                      className={`w-52 sm:w-60 shrink-0 snap-start rounded-2xl p-3 bg-neutral-900/90 hover:bg-neutral-850 border transition-all duration-200 group flex flex-col justify-between shadow-lg cursor-pointer ${
                        isCurrent ? 'border-[#ff2d55] ring-1 ring-[#ff2d55]/40 bg-[#16141a]' : 'border-neutral-800 hover:border-neutral-700'
                      }`}
                      onClick={() => onPlayTrack(track)}
                    >
                      <div>
                        {/* Artwork with Quick Play Button */}
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-800 mb-3 shadow-inner">
                          <img 
                            src={track.image_url} 
                            alt={track.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Camelot & BPM Pill */}
                          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-400 border border-neutral-700/60">
                            {analysis.camelot} • {analysis.bpm} BPM
                          </div>

                          {/* Duration Pill */}
                          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-300">
                            {track.duration_formatted}
                          </div>

                          {/* Play overlay button */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-xl group-hover:scale-110 active:scale-95 transition-transform">
                              {isCurrent && isPlaying ? (
                                <Pause className="w-5 h-5 fill-black" />
                              ) : (
                                <Play className="w-5 h-5 fill-black translate-x-0.5" />
                              )}
                            </div>
                          </div>

                          {/* Active Equalizer animation */}
                          {isCurrent && isPlaying && (
                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg flex items-end gap-[2px] h-5">
                              <span className="w-1 bg-[#ff2d55] animate-bounce h-3 rounded-full" />
                              <span className="w-1 bg-rose-400 animate-bounce h-4 delay-75 rounded-full" />
                              <span className="w-1 bg-amber-400 animate-bounce h-2 delay-150 rounded-full" />
                            </div>
                          )}
                        </div>

                        {/* Title & Artist */}
                        <h4 className="font-bold text-sm text-white truncate group-hover:text-[#ff2d55] transition-colors">
                          {track.title}
                        </h4>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {track.artist}
                        </p>

                        {/* Tags */}
                        {track.tags && (
                          <p className="text-[10px] text-neutral-500 truncate mt-1">
                            {track.tags}
                          </p>
                        )}
                      </div>

                      {/* Action Icon Strip */}
                      <div 
                        className="pt-2.5 mt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-neutral-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Open Studio DAW */}
                        <button
                          onClick={() => onOpenStudioDaw(track)}
                          className="p-1.5 rounded-lg hover:text-[#ff2d55] hover:bg-neutral-800 transition-colors"
                          title="Open Studio DAW"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {/* Open Karaoke */}
                        <button
                          onClick={() => onOpenKaraoke(track)}
                          className="p-1.5 rounded-lg hover:text-pink-400 hover:bg-neutral-800 transition-colors"
                          title="Sing with Synced Lyrics & Karaoke"
                        >
                          <Mic2 className="w-3.5 h-3.5" />
                        </button>

                        {/* 8D Spatial Audio */}
                        <button
                          onClick={() => onOpenSpatial8D(track)}
                          className="p-1.5 rounded-lg hover:text-indigo-400 hover:bg-neutral-800 transition-colors"
                          title="360° 8D Spatial Audio"
                        >
                          <Orbit className="w-3.5 h-3.5" />
                        </button>

                        {/* DAW Studio */}
                        <button
                          onClick={() => onOpenStudioDaw(track)}
                          className="p-1.5 rounded-lg hover:text-[#ff2d55] hover:bg-neutral-800 transition-colors"
                          title="Open in DAW Studio"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Download */}
                        <button
                          onClick={() => onQuickDownload(track, 'mp3')}
                          className="p-1.5 rounded-lg hover:text-emerald-400 hover:bg-neutral-800 transition-colors"
                          title="Download MP3 320k"
                        >
                          <Download className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0e0f14] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Download Playlist
                  </h3>
                  <p className="text-xs text-neutral-400 truncate max-w-[280px]">
                    {downloadModalPlaylist.title} &bull; {downloadModalPlaylist.tracks.length} Tracks
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDownloadModalPlaylist(null)}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Notice / Helper Box */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed space-y-1">
                  <p className="font-bold text-amber-300">Choose your download or ingest method:</p>
                  <p>
                    For the highest audio quality with multi-track stems (Vocals & Instrumental), synchronized karaoke lyrics, and chord progressions, open in <strong>Suno Ingest</strong>. Or download the bundled MP3 archive directly.
                  </p>
                </div>
              </div>

              {/* Option 1: Open in Suno Ingest (Primary) */}
              <div 
                onClick={() => {
                  const pl = downloadModalPlaylist;
                  setDownloadModalPlaylist(null);
                  if (onOpenSunoIngest) {
                    onOpenSunoIngest(`https://suno.com/playlist/${pl.id}`);
                  }
                }}
                className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border border-rose-500/40 hover:border-rose-500 transition-all cursor-pointer group shadow-lg hover:shadow-rose-500/10 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-[#ff2d55] transition-colors">
                      🚀 Open in Suno Ingest (Recommended)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff2d55]/20 text-[#ff2d55] font-bold">
                      Full Stems
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Fetch live Suno masters, extract stem tracks, lyrics .LRC, and ID3 album tags.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-[#ff2d55] text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="w-4 h-4" />
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
                className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-emerald-500/60 transition-all cursor-pointer group flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      📦 Direct .ZIP Batch Archive
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                      320 kbps
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Instantly package all {downloadModalPlaylist.tracks.length} preloaded songs into a single download archive.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-neutral-800 group-hover:bg-emerald-600 text-neutral-300 group-hover:text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-all">
                  <Download className="w-4 h-4" />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-end">
              <button
                onClick={() => setDownloadModalPlaylist(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 transition-colors"
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
