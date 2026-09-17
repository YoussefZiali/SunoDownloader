import { SunoTrack, SunoPlaylist, AudioFormat } from '../types';
import { BEST_OF_V6_PLAYLIST } from './bestOfV6Playlist';
import { CURATED_SUNO_PLAYLISTS, CURATED_ALL_TRACKS } from './sunoCuratedPlaylists';

// Combine all tracks ensuring uniqueness by ID
const uniqueTracksMap = new Map<string, SunoTrack>();

// 1. Add Best of v6 playlist tracks
BEST_OF_V6_PLAYLIST.tracks.forEach((t) => uniqueTracksMap.set(t.id, t));

// 2. Add all curated playlist tracks
CURATED_ALL_TRACKS.forEach((t) => {
  if (!uniqueTracksMap.has(t.id)) {
    uniqueTracksMap.set(t.id, t);
  }
});

export const INITIAL_TRACKS: SunoTrack[] = Array.from(uniqueTracksMap.values());

export const INITIAL_PLAYLISTS: SunoPlaylist[] = [
  BEST_OF_V6_PLAYLIST,
  ...CURATED_SUNO_PLAYLISTS,
];

export const DEFAULT_USER_SETTINGS = {
  defaultFormat: 'mp3' as const,
  batchFormats: ['mp3'] as AudioFormat[],
  wavBitDepth: '24-bit' as const,
  sampleRate: 48000,
  mp3Bitrate: '320kbps' as const,
  autoDownloadOnPaste: false,
  downloadLyrics: false, // Prevents unintended companion .lrc downloads
  lyricsFormat: 'lrc' as const,
  namingPattern: '{artist} - {title}' as const,
  includeCoverArtInZip: false, // Do not include cover images in batch downloads
  batchDownloadMode: 'zip' as const,
  soundNotification: true,
  zipStructure: 'flat' as const,
  volumeNormalization: false,
  autoClearHistory: false,
  autoClearHistoryDays: 7,
};
