import React, { useState, useMemo, useEffect } from 'react';
import { 
  Play, Pause, Download, ArrowLeft, Shuffle, Sparkles, 
  Clock, Disc, Music, Sliders, Mic2, Orbit, Heart, 
  Search, CheckCircle2, HardDrive, Share2, FileText,
  Layers, ArrowUpDown, Filter, ChevronRight, Check
} from 'lucide-react';
import { SunoTrack, SunoPlaylist, AudioFormat } from '../types';
import { estimateMusicAttributes } from '../utils/musicAnalyzer';

interface PlaylistDetailViewProps {
  playlist: SunoPlaylist;
  activeTrack: SunoTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: SunoTrack) => void;
  onPlayPlaylist: (playlist: SunoPlaylist, startTrackId?: string) => void;
  onBack: () => void;
  onOpenStudioDaw: (track: SunoTrack) => void;
  onOpenKaraoke: (track: SunoTrack) => void;
  onOpenSpatial8D: (track: SunoTrack) => void;
  onOpenChordMidi: (track: SunoTrack) => void;
  onQuickDownload: (track: SunoTrack, format: AudioFormat) => void;
  onDownloadBatchZip: (tracks: SunoTrack[], format: AudioFormat) => void;
  onSaveOffline: (track: SunoTrack) => void;
  offlineTrackIds: Set<string>;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlist,
  activeTrack,
  isPlaying,
  onPlayTrack,
  onPlayPlaylist,
  onBack,
  onOpenStudioDaw,
  onOpenKaraoke,
  onOpenSpatial8D,
  onOpenChordMidi,
  onQuickDownload,
  onDownloadBatchZip,
  onSaveOffline,
  offlineTrackIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<AudioFormat>('mp3');
  const [copiedLink, setCopiedLink] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'bpm' | 'key'>('default');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [playlist.id]);

  const tracks = playlist.tracks || [];

  // Enriched tracks with musical analysis
  const enrichedTracks = useMemo(() => {
    return tracks.map((track) => {
      const analysis = estimateMusicAttributes(track);
      return {
        ...track,
        analysis,
      };
    });
  }, [tracks]);

  // Filtered & sorted tracks
  const filteredTracks = useMemo(() => {
    let list = [...enrichedTracks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.tags && t.tags.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'bpm') {
      list.sort((a, b) => b.analysis.bpm - a.analysis.bpm);
    } else if (sortBy === 'key') {
      list.sort((a, b) => a.analysis.camelot.localeCompare(b.analysis.camelot));
    }

    return list;
  }, [enrichedTracks, searchQuery, sortBy]);

  // Calculate total playlist duration
  const totalDurationSeconds = useMemo(() => {
    return tracks.reduce((acc, t) => acc + (t.duration || 120), 0);
  }, [tracks]);

  const formattedTotalDuration = useMemo(() => {
    const mins = Math.floor(totalDurationSeconds / 60);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) {
      return `${hours} hr ${remMins} min`;
    }
    return `${mins} min`;
  }, [totalDurationSeconds]);

  const handleCopyPlaylistLink = () => {
    navigator.clipboard.writeText(`https://suno.com/playlist/${playlist.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadEntirePlaylist = () => {
    if (tracks.length === 0) return;
    onDownloadBatchZip(tracks, selectedFormat);
  };

  const isCurrentPlaylistPlaying = tracks.some((t) => t.id === activeTrack?.id);

  return (
    <div className="w-full min-h-screen bg-[#0d0d0f] text-neutral-100 pb-36">
      
      {/* ---------------- 1. PLAYLIST HERO BANNER ---------------- */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-neutral-900 via-[#13121a] to-[#0d0d0f] border-b border-neutral-800/80 pt-6 pb-10 px-4 sm:px-8 shadow-2xl">
        
        {/* Ambient glow backdrop */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-[#ff2d55]/15 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto">
          
          {/* Back Button Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-bold transition-all shadow cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Library / Explore</span>
            </button>

            <button
              onClick={handleCopyPlaylistLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Playlist</span>
                </>
              )}
            </button>
          </div>

          {/* Playlist Info Header */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
            
            {/* Playlist Artwork Tile */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-3xl overflow-hidden bg-neutral-800 shrink-0 shadow-2xl border border-neutral-700/60 group">
              <img 
                src={playlist.cover_url || tracks[0]?.image_url || 'https://cdn2.suno.ai/image_large_placeholder.jpeg'} 
                alt={playlist.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              
              {/* Play Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <button
                  onClick={() => onPlayPlaylist(playlist)}
                  className="w-16 h-16 rounded-full bg-[#ff2d55] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                >
                  <Play className="w-7 h-7 fill-current ml-1" />
                </button>
              </div>

              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white border border-neutral-700/60">
                {tracks.length} Tracks
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/30 text-xs font-bold uppercase tracking-wider">
                <Disc className="w-3.5 h-3.5" />
                <span>Curated Suno Playlist</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight font-['Syne']">
                {playlist.title}
              </h1>

              <p className="text-neutral-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                {playlist.description || `Featuring ${tracks.length} master tracks generated and curated in Suno Studio.`}
              </p>

              {/* Stats Bar */}
              <div className="flex items-center justify-center md:justify-start gap-4 text-xs sm:text-sm text-neutral-400 font-medium pt-1">
                <span className="flex items-center gap-1.5 text-neutral-200">
                  <Music className="w-4 h-4 text-[#ff2d55]" />
                  <span>{tracks.length} Songs</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-neutral-200">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{formattedTotalDuration} Total Duration</span>
                </span>
                <span>•</span>
                <span className="text-neutral-400">320kbps / Lossless Quality</span>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex items-center justify-center md:justify-start gap-3 pt-3 flex-wrap">
                
                {/* Play All Button */}
                <button
                  onClick={() => onPlayPlaylist(playlist)}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ff2d55] to-rose-600 hover:from-[#ff3d63] hover:to-rose-500 text-white font-black text-sm flex items-center gap-2.5 shadow-xl shadow-[#ff2d55]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {isCurrentPlaylistPlaying && isPlaying ? (
                    <>
                      <Pause className="w-5 h-5 fill-current" />
                      <span>Pause Playlist</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                      <span>Play All Songs</span>
                    </>
                  )}
                </button>

                {/* Bulk Download Entire Playlist Button */}
                <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700/80 rounded-2xl p-1 shadow-lg">
                  <button
                    onClick={handleDownloadEntirePlaylist}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                    title="Download entire playlist as a high-speed ZIP package"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Playlist (.ZIP)</span>
                  </button>

                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value as AudioFormat)}
                    className="bg-neutral-800 text-neutral-200 text-xs font-mono font-bold px-2 py-1.5 rounded-lg border border-neutral-700 focus:outline-none cursor-pointer"
                  >
                    <option value="mp3">MP3 320k</option>
                    <option value="wav">WAV 24b</option>
                    <option value="flac">FLAC Lossless</option>
                    <option value="aac">AAC 256k</option>
                    <option value="ogg">OGG Vorbis</option>
                  </select>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ---------------- 2. PLAYLIST TRACKS TABLE & CONTROLS ---------------- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-6">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-900/80 p-3 rounded-2xl border border-neutral-800 shadow">
          
          {/* Quick Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search songs, artists, or genres in playlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#ff2d55]"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </span>

            <div className="flex items-center gap-1">
              {(['default', 'title', 'bpm', 'key'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortBy(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors capitalize ${
                    sortBy === mode
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {mode === 'default' ? 'Default Order' : mode}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Tracks List */}
        <div className="space-y-2">
          {filteredTracks.length === 0 ? (
            <div className="p-12 text-center bg-neutral-900/50 rounded-3xl border border-neutral-800">
              <Music className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No tracks match your search</h3>
              <p className="text-xs text-neutral-400 mt-1">Try clearing the search query to see all songs in this playlist.</p>
            </div>
          ) : (
            filteredTracks.map((track, index) => {
              const isCurrent = activeTrack?.id === track.id;
              const isOffline = offlineTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all group ${
                    isCurrent
                      ? 'bg-[#18151f] border-[#ff2d55]/80 shadow-lg'
                      : 'bg-neutral-900/70 hover:bg-neutral-850 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  
                  {/* Left: Track #, Play Button, Artwork, Title & Artist */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    
                    {/* Index or Animated Play Icon */}
                    <div className="w-6 text-center text-xs font-mono font-bold text-neutral-500 shrink-0">
                      {isCurrent && isPlaying ? (
                        <div className="flex items-end justify-center gap-[2px] h-4">
                          <span className="w-1 bg-[#ff2d55] animate-bounce h-3 rounded-full" />
                          <span className="w-1 bg-rose-400 animate-bounce h-4 delay-75 rounded-full" />
                          <span className="w-1 bg-amber-400 animate-bounce h-2 delay-150 rounded-full" />
                        </div>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    {/* Artwork & Hover Play Button */}
                    <div 
                      className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 shrink-0 cursor-pointer shadow-md"
                      onClick={() => onPlayTrack(track)}
                    >
                      <img src={track.image_url} alt={track.title} className="w-full h-full object-cover" />
                      <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        {isCurrent && isPlaying ? (
                          <Pause className="w-5 h-5 text-white fill-current" />
                        ) : (
                          <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Title, Artist, Tags */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 
                          onClick={() => onPlayTrack(track)}
                          className={`font-bold text-sm truncate cursor-pointer hover:underline ${
                            isCurrent ? 'text-[#ff2d55]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </h4>

                        {isOffline && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold shrink-0">
                            Offline
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-400 truncate mt-0.5">
                        <span className="font-medium text-neutral-300">{track.artist}</span>
                        {track.tags && (
                          <>
                            <span>•</span>
                            <span className="text-neutral-500 truncate">{track.tags}</span>
                          </>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Center: Camelot Key & BPM & Duration */}
                  <div className="hidden sm:flex items-center gap-3 px-4 shrink-0 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-amber-400 font-bold border border-neutral-700/60">
                      {track.analysis.camelot}
                    </span>
                    <span className="text-neutral-400 font-semibold">
                      {track.analysis.bpm} BPM
                    </span>
                    <span className="text-neutral-400">
                      {track.duration_formatted}
                    </span>
                  </div>

                  {/* Right: Creative Modules & Download Actions */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 text-neutral-400">
                    
                    {/* Studio DAW */}
                    <button
                      onClick={() => onOpenStudioDaw(track)}
                      className="p-2 rounded-xl hover:text-[#ff2d55] hover:bg-neutral-800 transition-colors"
                      title="Open in Studio DAW"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    {/* Karaoke */}
                    <button
                      onClick={() => onOpenKaraoke(track)}
                      className="p-2 rounded-xl hover:text-pink-400 hover:bg-neutral-800 transition-colors"
                      title="Sing Karaoke & Live Lyrics"
                    >
                      <Mic2 className="w-4 h-4" />
                    </button>

                    {/* 8D Spatial Audio */}
                    <button
                      onClick={() => onOpenSpatial8D(track)}
                      className="p-2 rounded-xl hover:text-indigo-400 hover:bg-neutral-800 transition-colors"
                      title="360° 8D Spatial Audio"
                    >
                      <Orbit className="w-4 h-4" />
                    </button>

                    {/* Chords & MIDI */}
                    <button
                      onClick={() => onOpenChordMidi(track)}
                      className="p-2 rounded-xl hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                      title="Chord Progression & MIDI Studio"
                    >
                      <Music className="w-4 h-4" />
                    </button>

                    {/* Save Offline */}
                    <button
                      onClick={() => onSaveOffline(track)}
                      className={`p-2 rounded-xl hover:bg-neutral-800 transition-colors ${
                        isOffline ? 'text-emerald-400' : 'hover:text-emerald-400'
                      }`}
                      title={isOffline ? 'Saved offline in browser vault' : 'Save to offline storage'}
                    >
                      <HardDrive className="w-4 h-4" />
                    </button>

                    {/* Quick Single Download */}
                    <button
                      onClick={() => onQuickDownload(track, selectedFormat)}
                      className="p-2 rounded-xl hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                      title={`Download ${selectedFormat.toUpperCase()}`}
                    >
                      <Download className="w-4 h-4" />
                    </button>

                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
