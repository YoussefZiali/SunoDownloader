export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg';
export type WavBitDepth = '16-bit' | '24-bit';
export type Mp3Bitrate = '320kbps' | '256kbps' | '192kbps' | '128kbps';
export type NamingPattern = 
  | '{artist} - {title}' 
  | '{title}' 
  | '{artist} - {title} ({id})' 
  | '{title} [{tags}]';

export interface SunoTrack {
  id: string;
  title: string;
  artist: string;
  handle: string;
  audio_url: string;
  video_url?: string;
  iframe_url?: string;
  image_url: string;
  duration: number; // in seconds
  duration_formatted: string;
  play_count?: number | string;
  upvote_count?: number | string;
  comment_count?: number | string;
  prompt?: string;
  tags?: string;
  model?: string;
  created_at?: string;
  isVerified?: boolean;
}

export type DownloadStatus = 'idle' | 'queued' | 'fetching' | 'converting' | 'completed' | 'error';

export interface BatchDownloadStatus {
  isActive: boolean;
  totalTracks: number;
  completedTracks: number;
  currentTrackTitle: string;
  currentTrackArtist?: string;
  currentTrackId?: string;
  percent: number;
  phase: 'idle' | 'converting' | 'zipping' | 'done' | 'error';
  error?: string;
  completedTrackIds: string[];
}

export interface DownloadItem {
  id: string; // unique item id (e.g. timestamp + trackId)
  trackId: string;
  track: SunoTrack;
  format: AudioFormat;
  status: DownloadStatus;
  progress: number;
  fileName: string;
  fileSize?: number; // in bytes
  blob?: Blob;
  downloadUrl?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface UserSettings {
  defaultFormat: AudioFormat;
  batchFormats: AudioFormat[];
  wavBitDepth: WavBitDepth;
  sampleRate: number; // 44100 or 48000
  mp3Bitrate: Mp3Bitrate;
  autoDownloadOnPaste: boolean;
  downloadLyrics: boolean;
  lyricsFormat: 'lrc' | 'txt';
  namingPattern: NamingPattern;
  includeCoverArtInZip: boolean;
  batchDownloadMode: 'zip' | 'individual';
  soundNotification: boolean;
  zipStructure: 'flat' | 'artist_folder' | 'format_folder';
  volumeNormalization: boolean;
  autoClearHistory: boolean;
  autoClearHistoryDays: number;
}

export interface TrackMetadataCustomization {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
}

export interface AudioClipRange {
  enabled: boolean;
  startTime: number; // in seconds
  endTime: number; // in seconds
}

export interface DownloadHistoryEntry {
  id: string;
  trackId: string;
  trackTitle: string;
  artist: string;
  imageUrl: string;
  format: AudioFormat;
  fileSizeFormatted?: string;
  downloadedAt: number;
  durationFormatted: string;
  wasClipped?: boolean;
  clipRange?: string;
  isNormalized?: boolean;
}

export interface SunoPlaylist {
  id: string;
  title: string;
  creator: string;
  creatorHandle?: string;
  description?: string;
  cover_url?: string;
  shareUrl?: string;
  shareCode?: string;
  tracks: SunoTrack[];
}

export type ActiveTab = 'explore' | 'search' | 'downloader' | 'library' | 'profile';
