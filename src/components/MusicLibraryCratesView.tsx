import React, { useState, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, Play, Pause, Download, MoreVertical, 
  Sparkles, Music, Disc, Layers, HardDrive, CheckCircle2, 
  FolderPlus, Radio, ArrowUpDown, Tag, Zap, Wand2, Scissors, 
  FileText, Activity, Mic, Orbit, Heart, Plus, ChevronRight, RefreshCw
} from 'lucide-react';
import { SunoTrack, AudioFormat, SunoPlaylist, LibraryFilterState } from '../types';
import { estimateMusicAttributes } from '../utils/musicAnalyzer';

interface MusicLibraryCratesViewProps {
  allTracks: SunoTrack[];
  playlists: SunoPlaylist[];
  activeTrack: SunoTrack | null;
  isPlaying: boolean;
  isLoadingAudio?: boolean;
  loadingTrackId?: string | null;
  onPlayTrack: (track: SunoTrack) => void;
  onSelectPlaylist?: (playlist: SunoPlaylist) => void;
  onOpenStudioDaw: (track: SunoTrack) => void;
  onQuickDownload: (track: SunoTrack, format: AudioFormat) => void;
  onDownloadBatchZip: (tracks: SunoTrack[], format: AudioFormat) => void;
  onOpenTrackMenu: (track: SunoTrack) => void;
  onOpenBulkImporter: () => void;
  onSaveOffline: (track: SunoTrack) => void;
  offlineTrackIds: Set<string>;
  onLoadToDjDeck?: (track: SunoTrack, deck: 'A' | 'B') => void;
  onOpenAutoDjMixer?: (tracks: SunoTrack[]) => void;
  onOpenTrimmer?: (track: SunoTrack) => void;
  onOpenMetadataEditor?: (track: SunoTrack) => void;
  onOpenPromptExtractor?: (track: SunoTrack) => void;
}

const GENRE_TAGS = [
  'All',
  'Hip Hop',
  'Pop',
  'House',
  'K-Pop',
  'R&B',
  'Latin',
  'Rock',
  'Afrobeats',
  'Synthwave',
  'Cyberpunk',
  'Indie Pop',
  'Pop Rock',
  'Lo-Fi',
  'Dance-Pop',
  'Electronic',
];

const CAMELOT_KEYS = [
  'All', '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B',
  '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B',
  '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B'
];

export const MusicLibraryCratesView: React.FC<MusicLibraryCratesViewProps> = ({
  allTracks,
  playlists,
  activeTrack,
  isPlaying,
  isLoadingAudio = false,
  loadingTrackId = null,
  onPlayTrack,
  onSelectPlaylist,
  onOpenStudioDaw,
  onQuickDownload,
  onDownloadBatchZip,
  onOpenTrackMenu,
  onOpenBulkImporter,
  onSaveOffline,
  offlineTrackIds,
  onLoadToDjDeck,
  onOpenAutoDjMixer,
  onOpenTrimmer,
  onOpenMetadataEditor,
  onOpenPromptExtractor,
}) => {
  // Active Crate selection
  const [selectedCrateId, setSelectedCrateId] = useState<string>('all');
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedCamelot, setSelectedCamelot] = useState('All');
  const [minBpm, setMinBpm] = useState<number>(60);
  const [maxBpm, setMaxBpm] = useState<number>(180);
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'bpm' | 'title'>('latest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Multi-selection state for batch actions
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  // Compute enriched tracks with cached harmonic analysis
  const enrichedTracks = useMemo(() => {
    return allTracks.map((track) => {
      const analysis = estimateMusicAttributes(track);
      return {
        ...track,
        analysis,
      };
    });
  }, [allTracks]);

  // Filter based on crate, search, genre, key, and BPM
  const filteredTracks = useMemo(() => {
    let list = enrichedTracks;

    // 1. Crate filtering
    if (selectedCrateId === 'best-of-v6') {
      const v6 = playlists.find((p) => p.id === '0d597d0c-cdb2-4f9c-b4da-57931929f0d0');
      if (v6) {
        const v6Ids = new Set(v6.tracks.map((t) => t.id));
        list = list.filter((t) => v6Ids.has(t.id));
      }
    } else if (selectedCrateId === 'peak-energy') {
      list = list.filter((t) => t.analysis.bpm >= 120 || t.analysis.energy >= 70);
    } else if (selectedCrateId === 'chill-vocal') {
      list = list.filter((t) => t.analysis.bpm < 120 && t.analysis.energy < 70);
    } else if (selectedCrateId === 'offline-vault') {
      list = list.filter((t) => offlineTrackIds.has(t.id));
    } else if (selectedCrateId !== 'all') {
      const customPl = playlists.find((p) => p.id === selectedCrateId);
      if (customPl) {
        const plIds = new Set(customPl.tracks.map((t) => t.id));
        list = list.filter((t) => plIds.has(t.id));
      }
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.tags && t.tags.toLowerCase().includes(q)) ||
          (t.prompt && t.prompt.toLowerCase().includes(q))
      );
    }

    // 3. Genre tag filter
    if (selectedGenre !== 'All') {
      const g = selectedGenre.toLowerCase();
      list = list.filter((t) => t.tags && t.tags.toLowerCase().includes(g));
    }

    // 4. Camelot Key filter
    if (selectedCamelot !== 'All') {
      list = list.filter((t) => t.analysis.camelot === selectedCamelot);
    }

    // 5. BPM range filter
    list = list.filter(
      (t) => t.analysis.bpm >= minBpm && t.analysis.bpm <= maxBpm
    );

    // 6. Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'bpm') return a.analysis.bpm - b.analysis.bpm;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'popular') {
        const aPlay = typeof a.play_count === 'number' ? a.play_count : 50000;
        const bPlay = typeof b.play_count === 'number' ? b.play_count : 50000;
        return bPlay - aPlay;
      }
      return 0; // Default latest order
    });
  }, [
    enrichedTracks,
    selectedCrateId,
    searchQuery,
    selectedGenre,
    selectedCamelot,
    minBpm,
    maxBpm,
    sortBy,
    playlists,
    offlineTrackIds,
  ]);

  // Multi-selection handlers
  const toggleSelectTrack = (trackId: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedTrackIds.size === filteredTracks.length) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)));
    }
  };

  const handleBatchDownloadSelected = () => {
    const selected = allTracks.filter((t) => selectedTrackIds.has(t.id));
    if (selected.length === 0) return;
    onDownloadBatchZip(selected, 'mp3');
  };

  const handleBatchAutoDjSelected = () => {
    const selected = allTracks.filter((t) => selectedTrackIds.has(t.id));
    if (selected.length > 0 && onOpenAutoDjMixer) {
      onOpenAutoDjMixer(selected);
    }
  };

  const handleBatchSaveOfflineSelected = () => {
    const selected = allTracks.filter((t) => selectedTrackIds.has(t.id));
    selected.forEach((track) => onSaveOffline(track));
  };

  return (
    <div className="w-full min-h-screen bg-[#0d0d0f] text-neutral-100 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Top Library Title & Ingest Quick Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-neutral-900/90 via-neutral-900/60 to-neutral-900/90 p-5 sm:p-6 rounded-3xl border border-neutral-800/80 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#ff2d55]">
                Harmonic Music Library & Crates
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                {allTracks.length} Master Tracks
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Syne']">
              Production Crates & Audio Vault
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1 max-w-xl">
              Curate, filter by Camelot harmonic key and BPM, stream with real-time waveform scrubbing, or launch directly into the Studio DAW.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onOpenBulkImporter}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#e02649] hover:from-[#ff3d63] hover:to-[#eb3154] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#ff2d55]/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Import Suno Links</span>
            </button>
            <button
              onClick={() => setSelectedCrateId('offline-vault')}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Offline ({offlineTrackIds.size})</span>
            </button>
          </div>
        </div>

        {/* Curated Playlists Showcase Strip */}
        {playlists.length > 0 && (
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-3xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#ff2d55]">
                  Curated Collections
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                  {playlists.length} Playlists
                </span>
              </div>
              
              {onSelectPlaylist && (
                <button
                  onClick={() => onSelectPlaylist(playlists[0])}
                  className="text-xs font-bold text-[#ff2d55] hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>See All Playlists</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Horizontal Playlist Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {playlists.slice(0, 5).map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => onSelectPlaylist ? onSelectPlaylist(pl) : setSelectedCrateId(pl.id)}
                  className="group relative bg-neutral-950/70 hover:bg-neutral-800/80 border border-neutral-800/80 hover:border-neutral-700 rounded-2xl p-2.5 transition-all cursor-pointer shadow hover:shadow-lg flex flex-col"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-800 mb-2">
                    <img
                      src={pl.cover_url || pl.tracks[0]?.image_url || 'https://cdn2.suno.ai/image_large_placeholder.jpeg'}
                      alt={pl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                      {pl.tracks.length} tracks
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-white truncate group-hover:text-[#ff2d55] transition-colors">
                    {pl.title}
                  </h3>
                  <span className="text-[10px] text-neutral-400 truncate">
                    {pl.creator}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crate Tabs Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCrateId('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCrateId === 'all'
                ? 'bg-white text-neutral-950 shadow-md'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            🎵 All Tracks ({allTracks.length})
          </button>
          <button
            onClick={() => setSelectedCrateId('best-of-v6')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCrateId === 'best-of-v6'
                ? 'bg-[#ff2d55] text-white shadow-md shadow-[#ff2d55]/30'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            🔥 Best of Suno v6
          </button>
          {playlists.map((pl) => {
            if (pl.id === '0d597d0c-cdb2-4f9c-b4da-57931929f0d0') return null; // Skip duplicate Best of v6
            const isSelected = selectedCrateId === pl.id;
            return (
              <button
                key={pl.id}
                onClick={() => setSelectedCrateId(pl.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#ff2d55] text-white shadow-md shadow-[#ff2d55]/30'
                    : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
                }`}
              >
                <span>💿 {pl.title}</span>
                <span className="text-[10px] opacity-70">({pl.tracks?.length || 0})</span>
              </button>
            );
          })}
          <button
            onClick={() => setSelectedCrateId('peak-energy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCrateId === 'peak-energy'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            ⚡ Peak Energy (120+ BPM)
          </button>
          <button
            onClick={() => setSelectedCrateId('chill-vocal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCrateId === 'chill-vocal'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            🌙 Chill & Melodic
          </button>
          <button
            onClick={() => setSelectedCrateId('offline-vault')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCrateId === 'offline-vault'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            💾 Offline Vault ({offlineTrackIds.size})
          </button>
        </div>

        {/* Selected Playlist Banner if a specific playlist is active */}
        {selectedCrateId !== 'all' && selectedCrateId !== 'peak-energy' && selectedCrateId !== 'chill-vocal' && selectedCrateId !== 'offline-vault' && (
          (() => {
            const activePl = selectedCrateId === 'best-of-v6'
              ? playlists.find((p) => p.id === '0d597d0c-cdb2-4f9c-b4da-57931929f0d0')
              : playlists.find((p) => p.id === selectedCrateId);

            if (!activePl) return null;

            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md">
                <div className="flex items-center gap-3.5">
                  <img
                    src={activePl.cover_url || (activePl.tracks[0] && activePl.tracks[0].image_url) || 'https://cdn2.suno.ai/image_large_d859e804-bcdb-4c34-9e0b-04f74efe30f2.jpeg'}
                    alt={activePl.title}
                    className="w-14 h-14 rounded-xl object-cover border border-neutral-700/60 shadow"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#ff2d55]">
                        Curated Playlist
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium">
                        by {activePl.creator} ({activePl.creatorHandle || '@suno'})
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">{activePl.title}</h2>
                    <p className="text-xs text-neutral-400 line-clamp-1 max-w-xl">{activePl.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto flex-wrap">
                  {onSelectPlaylist && (
                    <button
                      onClick={() => onSelectPlaylist(activePl)}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-neutral-700"
                    >
                      <span>Open Playlist Page</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (activePl.tracks && activePl.tracks.length > 0) {
                        onPlayTrack(activePl.tracks[0]);
                      }
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play All ({activePl.tracks.length})</span>
                  </button>
                  <button
                    onClick={() => onDownloadBatchZip(activePl.tracks, 'mp3')}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#ff2d55] hover:bg-[#e02649] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-[#ff2d55]/20 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download ZIP</span>
                  </button>
                </div>
              </div>
            );
          })()
        )}

        {/* Search & Filter Controls Toolbar */}
        <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, artist, genre tags, or prompt lyrics..."
                className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-[#ff2d55] rounded-xl text-xs text-white placeholder:text-neutral-500 font-medium outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-neutral-500 font-bold hidden md:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-neutral-300 font-bold text-xs rounded-xl px-3 py-2.5 outline-none focus:border-[#ff2d55]"
              >
                <option value="latest">Latest Ingest</option>
                <option value="popular">Most Played</option>
                <option value="bpm">BPM (Low → High)</option>
                <option value="title">Alphabetical (A → Z)</option>
              </select>

              {/* Toggle Advanced Filters (Key & BPM) */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showAdvancedFilters || selectedCamelot !== 'All' || minBpm > 60 || maxBpm < 180
                    ? 'bg-[#ff2d55]/20 border-[#ff2d55] text-[#ff2d55]'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Harmonics & BPM</span>
              </button>
            </div>

          </div>

          {/* Genre Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider shrink-0 mr-1">
              Genre:
            </span>
            {GENRE_TAGS.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedGenre === genre
                    ? 'bg-neutral-200 text-neutral-950 font-bold'
                    : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800/80'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Expanded Harmonic & BPM Filter Tray */}
          {showAdvancedFilters && (
            <div className="pt-3 mt-3 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-950/60 p-3.5 rounded-xl">
              
              {/* Camelot Key Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-300">Camelot Harmonic Key</span>
                  <span className="font-mono text-[#ff2d55] font-bold">{selectedCamelot}</span>
                </div>
                <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
                  {CAMELOT_KEYS.map((k) => (
                    <button
                      key={k}
                      onClick={() => setSelectedCamelot(k)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-bold shrink-0 transition-colors cursor-pointer ${
                        selectedCamelot === k
                          ? 'bg-[#ff2d55] text-white'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* BPM Range Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-300">Tempo Range</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {minBpm} – {maxBpm} BPM
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={60}
                    max={180}
                    value={minBpm}
                    onChange={(e) => setMinBpm(Math.min(Number(e.target.value), maxBpm - 5))}
                    className="w-full accent-[#ff2d55] cursor-pointer"
                  />
                  <input
                    type="range"
                    min={60}
                    max={180}
                    value={maxBpm}
                    onChange={(e) => setMaxBpm(Math.max(Number(e.target.value), minBpm + 5))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  {(minBpm > 60 || maxBpm < 180 || selectedCamelot !== 'All') && (
                    <button
                      onClick={() => {
                        setMinBpm(60);
                        setMaxBpm(180);
                        setSelectedCamelot('All');
                      }}
                      className="text-[11px] text-neutral-400 hover:text-white underline shrink-0"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Batch Selection Action Bar (Appears when tracks are selected) */}
        {selectedTrackIds.size > 0 && (
          <div className="sticky top-20 z-30 flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-[#ff2d55]/40 shadow-2xl shadow-[#ff2d55]/10 animate-fade-in">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllFiltered}
                className="w-5 h-5 rounded bg-[#ff2d55] flex items-center justify-center text-white"
              >
                ✓
              </button>
              <span className="text-xs font-bold text-white">
                {selectedTrackIds.size} tracks selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchDownloadSelected}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#ff2d55]" />
                <span>Download ZIP</span>
              </button>
              {onOpenAutoDjMixer && (
                <button
                  onClick={handleBatchAutoDjSelected}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto-DJ Mixset</span>
                </button>
              )}
              <button
                onClick={handleBatchSaveOfflineSelected}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Save Offline</span>
              </button>
              <button
                onClick={() => setSelectedTrackIds(new Set())}
                className="p-1.5 text-xs text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Tracks List Header & Count */}
        <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllFiltered}
              className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                selectedTrackIds.size === filteredTracks.length && filteredTracks.length > 0
                  ? 'bg-[#ff2d55] border-[#ff2d55] text-white font-bold'
                  : 'border-neutral-700 bg-neutral-900'
              }`}>
                {selectedTrackIds.size === filteredTracks.length && filteredTracks.length > 0 ? '✓' : ''}
              </div>
              <span>Select All</span>
            </button>
            <span>•</span>
            <span>Showing {filteredTracks.length} tracks</span>
          </div>

          <div className="flex items-center gap-4 text-neutral-500 font-bold uppercase tracking-wider text-[11px] hidden sm:flex">
            <span>Harmonics</span>
            <span>Tempo</span>
            <span>Actions</span>
          </div>
        </div>

        {/* Tracks Grid / List */}
        {filteredTracks.length === 0 ? (
          <div className="py-16 text-center bg-neutral-900/60 rounded-3xl border border-neutral-800/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
              <Music className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No tracks match your filters</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Try adjusting your search query, BPM range, or Camelot harmonic key filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('All');
                setSelectedCamelot('All');
                setMinBpm(60);
                setMaxBpm(180);
              }}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTracks.map((track) => {
              const isThisPlaying = isPlaying && activeTrack?.id === track.id;
              const isThisBuffering = (loadingTrackId === track.id && isLoadingAudio) || (activeTrack?.id === track.id && isLoadingAudio);
              const isSelected = selectedTrackIds.has(track.id);
              const isOffline = offlineTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 group ${
                    activeTrack?.id === track.id
                      ? 'bg-neutral-800/90 border-[#ff2d55]/60 shadow-lg shadow-[#ff2d55]/5'
                      : isSelected
                      ? 'bg-neutral-900 border-[#ff2d55]/40'
                      : 'bg-neutral-900/70 hover:bg-neutral-800/70 border-neutral-800/80'
                  }`}
                >
                  
                  {/* Left: Checkbox + Artwork + Title & Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectTrack(track.id);
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#ff2d55] border-[#ff2d55] text-white font-bold'
                          : 'border-neutral-700 bg-neutral-950 group-hover:border-neutral-500'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </button>

                    {/* Artwork with Play Overlay */}
                    <div
                      onClick={() => onPlayTrack(track)}
                      className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-neutral-800 shrink-0 cursor-pointer shadow-sm group-hover:shadow transition-all ${
                        isThisBuffering ? 'ring-2 ring-pink-500 shadow-pink-500/30' : ''
                      }`}
                    >
                      <img
                        src={track.image_url}
                        alt={track.title}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                          isThisBuffering ? 'scale-105 opacity-80' : ''
                        }`}
                      />
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        isThisBuffering || isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        {isThisBuffering ? (
                          <RefreshCw className="w-5 h-5 text-white animate-spin" />
                        ) : isThisPlaying ? (
                          <Pause className="w-5 h-5 text-white fill-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
                        )}
                      </div>
                      <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-white font-bold backdrop-blur-xs">
                        {track.duration_formatted}
                      </span>
                    </div>

                    {/* Track Title, Artist, & Tags */}
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <h4
                          onClick={() => onPlayTrack(track)}
                          className={`font-bold text-xs sm:text-sm truncate cursor-pointer hover:text-[#ff2d55] transition-colors ${
                            activeTrack?.id === track.id ? 'text-[#ff2d55]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </h4>
                        {isThisBuffering && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 animate-pulse shrink-0 flex items-center gap-1">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-pink-400" />
                            <span>Buffering</span>
                          </span>
                        )}
                        {track.model && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 shrink-0">
                            {track.model}
                          </span>
                        )}
                        {isOffline && (
                          <span title="Saved for offline playback" className="text-emerald-400">
                            <HardDrive className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5 flex-wrap">
                        <span className="font-semibold text-neutral-300 truncate">
                          {track.artist}
                        </span>
                        {track.play_count && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-neutral-500 font-mono">
                              ▶ {track.play_count}
                            </span>
                          </>
                        )}
                        {track.tags && (
                          <span className="text-[10px] text-neutral-500 truncate max-w-[200px] hidden md:inline">
                            {track.tags}
                          </span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Middle: Harmonics Badge & BPM (Desktop) */}
                  <div className="hidden sm:flex items-center gap-3 px-3 shrink-0">
                    {/* Camelot Key Badge */}
                    <div className="text-center">
                      <span className="px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono font-black text-[#ff2d55] block">
                        {track.analysis.camelot}
                      </span>
                      <span className="text-[9px] text-neutral-500 font-bold block mt-0.5">
                        {track.analysis.key} {track.analysis.scale.slice(0, 3)}
                      </span>
                    </div>

                    {/* BPM Badge */}
                    <div className="text-center min-w-[50px]">
                      <span className="text-xs font-mono font-black text-amber-400 block">
                        {track.analysis.bpm}
                      </span>
                      <span className="text-[9px] text-neutral-500 font-bold block">
                        BPM
                      </span>
                    </div>
                  </div>

                  {/* Right: Studio DAW Launcher & Action Triggers */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    
                    {/* Primary Button: Open in Studio DAW (desktop only to save space on mobile) */}
                    <button
                      onClick={() => onOpenStudioDaw(track)}
                      title="Open full mastering DAW workstation for this track"
                      className="hidden sm:flex px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-[#ff2d55] text-neutral-200 hover:text-white text-xs font-bold transition-all items-center gap-1.5 cursor-pointer shadow-sm group/btn"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff2d55] group-hover/btn:text-white transition-colors" />
                      <span className="hidden lg:inline">DAW Studio</span>
                    </button>

                    {/* Quick Download Button */}
                    <button
                      onClick={() => onQuickDownload(track, 'mp3')}
                      title="Quick Download 320kbps MP3"
                      className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Offline Save Toggle (Desktop/Tablet) */}
                    <button
                      onClick={() => onSaveOffline(track)}
                      title={isOffline ? "Saved Offline" : "Save to Offline Storage"}
                      className={`hidden sm:flex p-2 rounded-xl border transition-colors cursor-pointer ${
                        isOffline
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                          : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      <HardDrive className="w-4 h-4" />
                    </button>

                    {/* More Action Menu Trigger (Dropdown menu with all tools) */}
                    <button
                      onClick={() => onOpenTrackMenu(track)}
                      title="More Tools (Stems, Chords, DJ, Karaoke)"
                      className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
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
