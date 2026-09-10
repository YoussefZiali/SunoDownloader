import { SunoTrack, SunoPlaylist, AudioFormat } from '../types';
import { BEST_OF_V6_PLAYLIST } from './bestOfV6Playlist';

export const INITIAL_TRACKS: SunoTrack[] = [
  {
    id: '386ddb56-4c28-4a77-a0ad-2aad565ac22c',
    title: 'Just Imagine',
    artist: 'brody',
    handle: '@brody',
    duration: 140,
    duration_formatted: '2:20',
    play_count: '8.5K',
    upvote_count: '290',
    comment_count: '28',
    image_url: 'https://cdn2.suno.ai/image_large_video_upload_d2e75791-4cc3-44dc-babd-be7c4021cd99_snapshot_0s.jpeg',
    audio_url: '/api/suno/stream/386ddb56-4c28-4a77-a0ad-2aad565ac22c.mp3',
    video_url: 'https://cdn1.suno.ai/386ddb56-4c28-4a77-a0ad-2aad565ac22c.mp4',
    tags: 'indie pop, sweet melodies, acoustic guitar, emotional vocals',
    model: 'v4',
    created_at: '2024-11-20T14:00:00Z',
    prompt: `[Verse 1]
Oh, just imagine
How much fun we'd be having
Not holding this addiction for love
Oh, just imagine
How much easier it'd be
If you just smiled back at me`,
    isVerified: true,
  },
  {
    id: 'd859e804-bcdb-4c34-9e0b-04f74efe30f2',
    title: 'Ruins Of Perception',
    artist: 'Tuutikki2202',
    handle: '@tuutikki2202',
    duration: 179,
    duration_formatted: '2:59',
    play_count: '420K',
    upvote_count: '6.7K',
    comment_count: '76',
    image_url: 'https://cdn2.suno.ai/image_large_d859e804-bcdb-4c34-9e0b-04f74efe30f2.jpeg',
    audio_url: '/api/suno/stream/d859e804-bcdb-4c34-9e0b-04f74efe30f2.mp3',
    video_url: 'https://cdn1.suno.ai/d859e804-bcdb-4c34-9e0b-04f74efe30f2.mp4',
    tags: 'cyberpunk, dark synthwave, heavy distortion, futuristic',
    model: 'v4',
    created_at: '2024-12-15T20:12:07Z',
    prompt: `[Cybernetic Intro - Heavy Synthesizer Pulse]
Neon reflections through shattered rain
Echoes of memories that remain
Standing in the ruins of perception
Searching through a digital deception!`,
    isVerified: true,
  },
  {
    id: '7fcbc22d-fb68-48f2-a6b8-39cdfde3dc9f',
    title: 'No Go Judge Me',
    artist: 'Oyojee',
    handle: '@oyojee',
    duration: 184,
    duration_formatted: '3:04',
    play_count: '54K',
    upvote_count: '1.2K',
    comment_count: '45',
    image_url: 'https://cdn2.suno.ai/image_large_video_upload_7fcbc22d-fb68-48f2-a6b8-39cdfde3dc9f.jpeg',
    audio_url: '/api/suno/stream/7fcbc22d-fb68-48f2-a6b8-39cdfde3dc9f.mp3',
    video_url: 'https://cdn1.suno.ai/7fcbc22d-fb68-48f2-a6b8-39cdfde3dc9f.mp4',
    tags: 'afrobeat, infectious groove, percussion, dance',
    model: 'v4',
    created_at: '2024-10-12T16:00:00Z',
    prompt: `[Afrobeats Rhythm - Upbeat Horns]
I dey do my thing on my own
Nobody tell me how to build my home
No go judge me, let the music play
Sunshine coming to brighten up the day!`,
    isVerified: true,
  },
  {
    id: '24a3b2a3-f110-417f-aa62-0cf8dc60ffa8',
    title: 'Baby Boy was Bad (Remastered)',
    artist: 'sonoa',
    handle: '@sonoa',
    duration: 156,
    duration_formatted: '2:36',
    play_count: '32K',
    upvote_count: '840',
    comment_count: '32',
    image_url: 'https://cdn2.suno.ai/image_large_24a3b2a3-f110-417f-aa62-0cf8dc60ffa8.jpeg',
    audio_url: '/api/suno/stream/24a3b2a3-f110-417f-aa62-0cf8dc60ffa8.mp3',
    video_url: 'https://cdn1.suno.ai/24a3b2a3-f110-417f-aa62-0cf8dc60ffa8.mp4',
    tags: 'pop rock, energetic guitars, high tempo, catchy hooks',
    model: 'v4',
    created_at: '2024-09-28T11:20:00Z',
    prompt: `[Punchy Guitar Riff]
Walking down the boulevard at 2 AM
Swore I'd never fall in that trap again
Baby boy was bad from the very start
Stealing all the keys right into my heart!`,
    isVerified: true,
  },
];

export const INITIAL_PLAYLISTS: SunoPlaylist[] = [
  BEST_OF_V6_PLAYLIST,
  {
    id: 'suno-top-v4-vibes',
    title: 'Featured Suno Showcase',
    creator: 'Suno Editorial',
    creatorHandle: '@suno_curated',
    description: 'Top trending high-fidelity creations across genres on Suno',
    cover_url: 'https://cdn2.suno.ai/image_large_video_upload_d2e75791-4cc3-44dc-babd-be7c4021cd99_snapshot_0s.jpeg',
    tracks: INITIAL_TRACKS,
  },
  {
    id: 'cyberpunk-electronic-lab',
    title: 'Neural Cyberpunk & Beats',
    creator: 'Tuutikki Sound',
    creatorHandle: '@tuutikki2202',
    description: 'Dark synth, cyberpunk atmospheres, and driving rhythms',
    cover_url: 'https://cdn2.suno.ai/image_large_d859e804-bcdb-4c34-9e0b-04f74efe30f2.jpeg',
    tracks: [INITIAL_TRACKS[1], INITIAL_TRACKS[0]],
  },
  {
    id: 'groove-and-guitars',
    title: 'Grooves & Indie Guitars',
    creator: 'Suno Community',
    creatorHandle: '@suno_grooves',
    description: 'Upbeat Afrobeat rhythms and energetic indie pop rock',
    cover_url: 'https://cdn2.suno.ai/image_large_video_upload_7fcbc22d-fb68-48f2-a6b8-39cdfde3dc9f.jpeg',
    tracks: [INITIAL_TRACKS[2], INITIAL_TRACKS[3]],
  }
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
