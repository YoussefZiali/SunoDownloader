import React from 'react';
import { Play, Pause, Download, ChevronRight, User, Plus, Sparkles, Music, Share2, MoreVertical } from 'lucide-react';
import { SunoTrack, AudioFormat } from '../types';

interface ProfileViewProps {
  tracks: SunoTrack[];
  activeTrack: SunoTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: SunoTrack) => void;
  onQuickDownload: (track: SunoTrack) => void;
  onDownloadAllArtist: (tracks: SunoTrack[]) => void;
  onOpenTrackMenu: (track: SunoTrack) => void;
  defaultFormat: AudioFormat;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  tracks,
  activeTrack,
  isPlaying,
  onPlayTrack,
  onQuickDownload,
  onDownloadAllArtist,
  onOpenTrackMenu,
  defaultFormat,
}) => {
  const artistTracks = tracks.filter((t) => t.artist === 'ZAIVEN');
  const featuredTrack = artistTracks[artistTracks.length - 1] || tracks[0];
  const isPlayingArtist = isPlaying && activeTrack?.artist === 'ZAIVEN';

  return (
    <div className="pb-32 pt-0 max-w-xl mx-auto text-neutral-900">
      
      {/* HERO HEADER SECTION (Exact match to Screenshot 1) */}
      <div className="relative pt-10 pb-6 px-4 bg-gradient-to-b from-neutral-800 via-neutral-600 to-[#f7f7f6] overflow-hidden">
        {/* Cinematic Blurred Background Banner (Night city & person silhouette) */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 filter blur-xs mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80")',
          }}
        />

        {/* Ambient Overlay gradient for high readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#f7f7f6] pointer-events-none" />

        {/* Creator Info Row */}
        <div className="relative z-10 flex items-end justify-between mt-6">
          <div className="flex items-center gap-3.5">
            {/* Avatar Circle */}
            <div className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/80 shadow-lg bg-neutral-900 shrink-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                alt="ZAIVEN"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name, Handle, Stats */}
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide uppercase drop-shadow-sm">
                ZAIVEN
              </h1>
              <p className="text-xs font-semibold text-neutral-200 drop-shadow-xs">
                @iamzaiven
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-white/90 mt-1">
                <span>▶ 2K</span>
                <span>👍 36</span>
              </div>
            </div>
          </div>

          {/* Big Black Circle Play Button (Screenshot 1) */}
          <button
            id="profile-play-all-btn"
            onClick={() => onPlayTrack(artistTracks[0])}
            className="w-14 h-14 rounded-full bg-neutral-950 hover:bg-black text-white shadow-xl flex items-center justify-center transition-all active:scale-95 hover:scale-105 shrink-0"
          >
            {isPlayingArtist ? (
              <Pause className="w-6 h-6 fill-white" />
            ) : (
              <Play className="w-6 h-6 fill-white translate-x-0.5" />
            )}
          </button>
        </div>

        {/* STATS PILLS (Screenshot 1: 19 songs, 18 followers, 2 following) */}
        <div className="relative z-10 flex items-center gap-2 mt-5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-xs font-bold text-neutral-900 shadow-xs shrink-0">
            <span>🎵</span>
            <span>19 songs</span>
          </div>
          <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-xs font-bold text-neutral-900 shadow-xs shrink-0">
            <span>👥</span>
            <span>18 followers</span>
          </div>
          <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-xs font-bold text-neutral-900 shadow-xs shrink-0">
            <span>👥</span>
            <span>2 following</span>
          </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="px-4 space-y-5 mt-4">
        
        {/* BATCH DOWNLOAD ACTION FOR THIS ARTIST */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 text-white shadow-md">
          <div>
            <h4 className="font-bold text-xs tracking-wide uppercase">Batch Download Discography</h4>
            <p className="text-[11px] text-neutral-300">Package all {artistTracks.length} ZAIVEN songs as {defaultFormat.toUpperCase()} .ZIP</p>
          </div>
          <button
            id="download-artist-discography-btn"
            onClick={() => onDownloadAllArtist(artistTracks)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-neutral-900 font-bold text-xs hover:bg-neutral-100 transition-all active:scale-95 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All</span>
          </button>
        </div>

        {/* COMPLETE YOUR PROFILE CARD (Exact match to Screenshot 1) */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-extrabold text-base text-neutral-900">Complete Your Profile</h3>
            <span className="text-xs font-semibold text-neutral-500">Step 3 of 3</span>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-colors cursor-pointer group">
            <div>
              <h4 className="font-bold text-sm text-neutral-900">Add a bio</h4>
              <p className="text-xs text-neutral-500 mt-0.5">Say a little something about yourself</p>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
          </div>
        </div>

        {/* PINNED HERO SONG CARD (Screenshot 1: STAY AWHILE - ZAIVEN) */}
        <div>
          <div className="relative rounded-3xl overflow-hidden shadow-md group">
            {/* Background artwork */}
            <div className="h-52 w-full bg-neutral-900 relative">
              <img
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
                alt="STAY AWHILE"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
            </div>

            {/* Mini overlay artwork with play button + Title */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="relative w-14 h-14 rounded-xl overflow-hidden ring-2 ring-white/40 cursor-pointer"
                  onClick={() => onPlayTrack(featuredTrack)}
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white leading-tight">STAY AWHILE</h3>
                  <p className="text-xs font-semibold text-neutral-300">ZAIVEN</p>
                  <p className="text-xs text-neutral-400 font-medium">▶ 10</p>
                </div>
              </div>

              {/* Quick download button for featured */}
              <button
                onClick={() => onQuickDownload(featuredTrack)}
                title={`Download STAY AWHILE (${defaultFormat.toUpperCase()})`}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md flex items-center justify-center transition-all"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* "Add a caption" pill button (Screenshot 1 bottom right of card) */}
            <div className="absolute bottom-3.5 right-4">
              <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-neutral-900 font-bold text-xs shadow-md backdrop-blur-md transition-all active:scale-95">
                <div className="w-4 h-4 rounded-full overflow-hidden bg-neutral-800">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=50&q=80"
                    alt="mini avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span>Add a caption</span>
              </button>
            </div>
          </div>

          {/* Carousel Pagination dots (Screenshot 1) */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            <span className="w-2 h-2 rounded-full bg-neutral-900" />
            <span className="w-2 h-2 rounded-full bg-neutral-300" />
          </div>
        </div>

        {/* ZAIVEN SONGS LIST */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-lg text-neutral-900">ZAIVEN Releases</h3>
            <span className="text-xs font-bold text-neutral-500">{artistTracks.length} tracks</span>
          </div>

          <div className="space-y-2">
            {artistTracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-neutral-200/60 shadow-2xs hover:border-neutral-300 transition-all cursor-pointer group"
                onClick={() => onPlayTrack(track)}
              >
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 shrink-0 mr-3">
                  <img
                    src={track.image_url}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-bold text-sm text-neutral-900 truncate leading-snug">{track.title}</h4>
                  <p className="text-xs text-neutral-500 truncate">
                    ▶ {track.play_count} • {track.duration_formatted} • {track.tags?.split(',')[0]}
                  </p>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onQuickDownload(track)}
                    title={`Download ${track.title} (${defaultFormat.toUpperCase()})`}
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
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
