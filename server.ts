import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

const CACHE_DIR = '/tmp/suno_cache';
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// In-flight transcode promises to avoid duplicate ffmpeg processes for the same track & format
const activeTranscodes = new Map<string, Promise<string>>();

// Fetches rights and decrypts Suno's AES-CTR encrypted audio stream into a valid local audio file
async function getDecryptedAudioPath(trackId: string): Promise<string> {
  const decryptedPath = path.join(CACHE_DIR, `${trackId}_decrypted.m4a`);
  if (fs.existsSync(decryptedPath) && fs.statSync(decryptedPath).size > 5000) {
    return decryptedPath;
  }

  // 1. Fetch decryption rights from the Suno rights service (with usesuno Origin & Referer)
  let rights: any = null;
  const rightsEndpoints = [
    'https://yellow-salad.aibiei.com/rights',
  ];

  for (const ep of rightsEndpoints) {
    try {
      const rightsRes = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://usesuno.com',
          'Referer': 'https://usesuno.com/tools/downloader/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          content_params: { content_id: trackId, content_type: 'clip' },
        }),
      });

      if (rightsRes.ok) {
        rights = await rightsRes.json();
        if (rights && rights.key && rights.iv && rights.glt) {
          break;
        }
      }
    } catch (e: any) {
      console.warn(`Rights fetch from ${ep} failed for ${trackId}:`, e.message);
    }
  }

  if (rights && rights.key && rights.iv && rights.glt) {
    try {
      // Derive userKey = sha256(rights.glt)
      const userKey = crypto.createHash('sha256').update(rights.glt).digest();

      // Unwrap helper using AES-256-GCM with AAD set to trackId
      const unwrap = (wrappedBase64: string): Buffer => {
        const buf = Buffer.from(wrappedBase64, 'base64');
        const iv = buf.subarray(0, 12);
        const ciphertextWithTag = buf.subarray(12);
        const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - 16);
        const tag = ciphertextWithTag.subarray(ciphertextWithTag.length - 16);
        const decipher = crypto.createDecipheriv('aes-256-gcm', userKey, iv);
        decipher.setAAD(Buffer.from(trackId, 'utf8'));
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      };

      const contentKey = unwrap(rights.key);
      const contentIv = unwrap(rights.iv);

      // Fetch encrypted audio stream from CloudFront
      const encAudioUrl = `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${trackId}.m4a`;
      const encRes = await fetch(encAudioUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });

      if (!encRes.ok) {
        throw new Error(`Failed to fetch encrypted audio stream: HTTP ${encRes.status}`);
      }

      const ct = (encRes.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/html') || ct.includes('application/json')) {
        throw new Error(`CloudFront returned ${ct} instead of audio stream`);
      }

      const encBuffer = Buffer.from(await encRes.arrayBuffer());

      // Decrypt audio using AES-128-CTR
      const algo = contentKey.length === 32 ? 'aes-256-ctr' : 'aes-128-ctr';
      const decipher = crypto.createDecipheriv(algo, contentKey, contentIv);
      const decryptedBuffer = Buffer.concat([decipher.update(encBuffer), decipher.final()]);

      if (decryptedBuffer.length > 50000 && !decryptedBuffer.subarray(0, 50).toString().includes('<html')) {
        fs.writeFileSync(decryptedPath, decryptedBuffer);
        return decryptedPath;
      }
    } catch (err: any) {
      console.warn(`Audio decryption failed for ${trackId}:`, err.message);
    }
  }

  // Fallback: Direct CDN stream if accessible (legacy public tracks)
  const candidateUrls = [
    `https://cdn1.suno.ai/${trackId}.mp4`,
    `https://cdn1.suno.ai/${trackId}.mp3`,
  ];

  for (const cdnUrl of candidateUrls) {
    try {
      const directRes = await fetch(cdnUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (directRes.ok) {
        const ct = (directRes.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html') || ct.includes('application/json')) {
          continue;
        }
        const buf = Buffer.from(await directRes.arrayBuffer());
        if (buf.length > 50000 && !buf.subarray(0, 50).toString().includes('<html')) {
          fs.writeFileSync(decryptedPath, buf);
          return decryptedPath;
        }
      }
    } catch {
      // continue
    }
  }

  throw new Error(`Unable to fetch or decrypt audio for track ${trackId}`);
}

// Helper to fetch and cache track cover artwork
async function getCoverImagePath(trackId: string, coverUrl?: string): Promise<string | null> {
  const coverPath = path.join(CACHE_DIR, `${trackId}_cover.jpg`);
  if (fs.existsSync(coverPath) && fs.statSync(coverPath).size > 1000) {
    return coverPath;
  }

  const urlsToTry: string[] = [];
  if (coverUrl && coverUrl.startsWith('http')) urlsToTry.push(coverUrl);
  urlsToTry.push(`https://cdn2.suno.ai/image_large_${trackId}.jpeg`);
  urlsToTry.push(`https://cdn1.suno.ai/image_${trackId}.png`);

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1000) {
          fs.writeFileSync(coverPath, buf);
          return coverPath;
        }
      }
    } catch {
      // try next
    }
  }
  return null;
}

async function transcodeTrack(
  trackId: string,
  format: 'mp3' | 'wav' | 'flac' | 'm4a' | 'ogg',
  bitrate = '320k',
  bitDepth = '24-bit',
  title = '',
  artist = '',
  coverUrl = '',
  options: {
    startTime?: number | string;
    endTime?: number | string;
    album?: string;
    year?: string;
    genre?: string;
    normalize?: boolean;
  } = {}
): Promise<string> {
  const ext = format === 'm4a' ? 'm4a' : format;
  const safeBitrate = (bitrate || '320k').toLowerCase().replace('bps', '');
  
  const hasTrim = (options.startTime != null && options.startTime !== '') || (options.endTime != null && options.endTime !== '');
  const trimKey = hasTrim ? `_t${options.startTime || 0}-${options.endTime || 'end'}` : '';
  const normKey = options.normalize ? '_norm' : '';
  const metaKey = (options.album || options.year || options.genre) 
    ? `_m${Buffer.from((options.album || '') + (options.year || '') + (options.genre || '')).toString('hex').slice(0, 8)}` 
    : '';

  const cacheKey = `${trackId}_${format}_${format === 'mp3' ? `${safeBitrate}_cov` : (format === 'wav' ? bitDepth : 'std')}${trimKey}${normKey}${metaKey}.${ext}`;
  const outPath = path.join(CACHE_DIR, cacheKey);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    return outPath;
  }

  if (activeTranscodes.has(cacheKey)) {
    return activeTranscodes.get(cacheKey)!;
  }

  const promise = (async () => {
    // 1. Ensure audio is downloaded and decrypted locally
    const inputPath = await getDecryptedAudioPath(trackId);

    // 2. If mp3, attempt to get cover image to embed
    let coverImagePath: string | null = null;
    if (format === 'mp3') {
      coverImagePath = await getCoverImagePath(trackId, coverUrl);
    }

    return new Promise<string>((resolve, reject) => {
      const inputArgs = ['-y'];

      // Seek / trim before input for fast, accurate clipping
      if (options.startTime != null && options.startTime !== '' && !isNaN(Number(options.startTime))) {
        inputArgs.push('-ss', String(options.startTime));
      }
      if (options.endTime != null && options.endTime !== '' && !isNaN(Number(options.endTime))) {
        inputArgs.push('-to', String(options.endTime));
      }

      inputArgs.push('-i', inputPath);

      let audioArgs: string[] = [];
      const filters: string[] = [];

      if (options.normalize) {
        filters.push('loudnorm=I=-14:TP=-1:LRA=11');
      }

      if (format === 'mp3') {
        if (coverImagePath) {
          inputArgs.push('-i', coverImagePath);
          audioArgs = [
            '-map', '0:a',
            '-map', '1:v',
            '-c:a', 'libmp3lame',
            '-b:a', safeBitrate || '320k',
            '-c:v', 'copy',
            '-id3v2_version', '3',
            '-metadata:s:v', 'title=Album cover',
            '-metadata:s:v', 'comment=Cover (front)',
          ];
        } else {
          audioArgs = ['-vn', '-c:a', 'libmp3lame', '-b:a', safeBitrate || '320k', '-id3v2_version', '3'];
        }
      } else if (format === 'wav') {
        audioArgs = ['-vn', '-c:a', bitDepth === '16-bit' ? 'pcm_s16le' : 'pcm_s24le'];
      } else if (format === 'flac') {
        audioArgs = ['-vn', '-c:a', 'flac'];
      } else if (format === 'm4a') {
        audioArgs = ['-vn', '-c:a', 'aac', '-b:a', '256k'];
      } else if (format === 'ogg') {
        audioArgs = ['-vn', '-c:a', 'libvorbis', '-q:a', '7'];
      }

      if (filters.length > 0) {
        audioArgs.push('-af', filters.join(','));
      }

      const metaArgs: string[] = [];
      if (title) metaArgs.push('-metadata', `title=${title}`);
      if (artist) metaArgs.push('-metadata', `artist=${artist}`);
      metaArgs.push('-metadata', `album=${options.album || 'Suno AI'}`);
      if (options.year) metaArgs.push('-metadata', `date=${options.year}`);
      if (options.genre) metaArgs.push('-metadata', `genre=${options.genre}`);

      const args = [
        ...inputArgs,
        ...audioArgs,
        ...metaArgs,
        outPath,
      ];

      execFile('ffmpeg', args, (err) => {
        activeTranscodes.delete(cacheKey);
        if (err) {
          console.error(`ffmpeg transcode error for ${trackId} (${format}):`, err);
          // If mp3 with cover failed, fallback to audio only
          if (format === 'mp3' && coverImagePath) {
            execFile('ffmpeg', ['-y', '-i', inputPath, '-vn', '-c:a', 'libmp3lame', '-b:a', safeBitrate || '320k', '-id3v2_version', '3', ...metaArgs, outPath], (fallbackErr) => {
              if (fallbackErr) reject(fallbackErr);
              else resolve(outPath);
            });
            return;
          }
          reject(err);
        } else {
          resolve(outPath);
        }
      });
    });
  })();

  activeTranscodes.set(cacheKey, promise);
  return promise;
}

app.use(express.json());

// Helper to follow redirects for Suno short share links (e.g. https://suno.com/s/XTNqttZkkO99zJ8I)
async function resolveSunoShareUrl(rawUrl: string): Promise<{ resolvedUrl: string; shareCode?: string }> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const shareMatch = targetUrl.match(/suno\.(?:com|ai)\/s\/([a-zA-Z0-9_-]+)/i);
  if (shareMatch) {
    const shareCode = shareMatch[1];
    try {
      // Try manual redirect to inspect Location header
      const res = await fetch(targetUrl, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const loc = res.headers.get('location');
      if (loc) {
        const fullLoc = loc.startsWith('/') ? `https://suno.com${loc}` : loc;
        return { resolvedUrl: fullLoc, shareCode };
      }

      // If no location header, follow redirect
      const followRes = await fetch(targetUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });
      return { resolvedUrl: followRes.url, shareCode };
    } catch (e: any) {
      console.warn('Error following share redirect:', e.message);
    }
  }

  return { resolvedUrl: targetUrl };
}

// Reusable Playlist Fetcher
async function fetchPlaylistData(playlistId: string, sh?: string): Promise<any> {
  const queryParam = sh ? `?sh=${encodeURIComponent(sh)}` : '';
  const endpoints = [
    `https://studio-api.prod.suno.com/api/playlist/${playlistId}${queryParam}`,
    `https://studio-api.suno.ai/api/playlist/${playlistId}${queryParam}`,
    `https://studio-api.prod.suno.com/api/playlist/${playlistId}/?page=1`,
  ];

  let rawData: any = null;
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });
      if (r.ok) {
        rawData = await r.json();
        if (rawData && (rawData.playlist_clips || rawData.clips)) {
          break;
        }
      }
    } catch {
      // continue
    }
  }

  // Fallback: If studio-api fails, fetch playlist page HTML and extract clips
  if (!rawData || !(rawData.playlist_clips || rawData.clips)) {
    try {
      const pageUrl = `https://suno.com/playlist/${playlistId}${queryParam}`;
      const pageRes = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const extractedClips: any[] = [];
        const seenIds = new Set<string>();

        const clipMatches = html.matchAll(/"clip"\s*:\s*\{([^}]+"id"\s*:\s*"([a-f0-9-]{36})"[^}]*)\}/g);
        for (const m of clipMatches) {
          const cId = m[2];
          if (!seenIds.has(cId)) {
            seenIds.add(cId);
            try {
              const fullClipStr = `{${m[1]}}`;
              const parsedClip = JSON.parse(fullClipStr);
              extractedClips.push(parsedClip);
            } catch {
              extractedClips.push({ id: cId, title: `Track ${cId.slice(0, 8)}` });
            }
          }
        }

        if (extractedClips.length > 0) {
          let plTitle = `Playlist ${playlistId.slice(0, 8)}`;
          const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
          if (titleMatch) {
            plTitle = titleMatch[1].replace(/\s*\|\s*Suno\s*$/i, '').trim();
          }
          rawData = {
            name: plTitle,
            playlist_clips: extractedClips.map((c) => ({ clip: c })),
          };
        }
      }
    } catch (e: any) {
      console.warn('Flight HTML fallback error for playlist:', e.message);
    }
  }

  if (rawData) {
    const rawClips = rawData.playlist_clips || rawData.clips || [];
    const tracks = rawClips.map((item: any) => {
      const clip = item.clip || item;
      const trackId = clip.id;
      const duration = clip.metadata?.duration
        ? Math.round(clip.metadata.duration)
        : clip.duration
        ? Math.round(clip.duration)
        : 180;

      const cdnAudio = `/api/suno/stream/${trackId}.mp3`;

      return {
        id: trackId,
        title: clip.title || `Suno Track ${trackId?.slice(0, 8)}`,
        artist: clip.display_name || clip.handle || 'Suno Artist',
        handle: clip.handle ? `@${clip.handle}` : '@suno_user',
        audio_url: cdnAudio,
        video_url: clip.video_url || `https://cdn1.suno.ai/${trackId}.mp4`,
        image_url: clip.image_large_url || clip.image_url || `https://cdn2.suno.ai/image_large_${trackId}.jpeg`,
        duration,
        duration_formatted: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
        play_count: clip.play_count || 0,
        upvote_count: clip.upvote_count || 0,
        tags: clip.metadata?.tags || clip.display_tags || '',
        model: clip.major_model_version || 'v6',
        created_at: clip.created_at || new Date().toISOString(),
        iframe_url: `https://suno.com/embed/${trackId}`,
      };
    });

    return {
      id: playlistId,
      title: rawData.name || rawData.title || 'Suno Playlist',
      description: rawData.description || '',
      cover_url: rawData.image_url || tracks[0]?.image_url || '',
      tracks,
    };
  }

  throw new Error('Playlist not found on Suno');
}

// Reusable Track Fetcher
async function fetchTrackData(trackId: string): Promise<any> {
  let clipData: any = null;

  // 1. Try studio-api.prod.suno.com/api/clip/:id
  try {
    const apiRes = await fetch(`https://studio-api.prod.suno.com/api/clip/${trackId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (apiRes.ok) {
      clipData = await apiRes.json();
    }
  } catch {
    // continue
  }

  // 2. Try Suno embed page JSON extraction
  if (!clipData) {
    try {
      const embedRes = await fetch(`https://suno.com/embed/${trackId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (embedRes.ok) {
        const html = await embedRes.text();
        const escapedClipIdx = html.indexOf('\\"clip\\":');
        if (escapedClipIdx !== -1) {
          const sub = html.slice(escapedClipIdx + 9);
          let depth = 0;
          let endIdx = -1;
          let inEscape = false;
          for (let i = 0; i < sub.length; i++) {
            if (inEscape) {
              inEscape = false;
              continue;
            }
            if (sub[i] === '\\') {
              inEscape = true;
              continue;
            }
            if (sub[i] === '{') depth++;
            else if (sub[i] === '}') {
              depth--;
              if (depth === 0) {
                endIdx = i + 1;
                break;
              }
            }
          }
          if (endIdx !== -1) {
            const rawEscaped = sub.slice(0, endIdx);
            const unescaped = rawEscaped.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            clipData = JSON.parse(unescaped);
          }
        }
      }
    } catch {
      // continue
    }
  }

  // 3. Fallback: Parse meta tags from song page
  if (!clipData) {
    try {
      const songRes = await fetch(`https://suno.com/song/${trackId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });
      if (songRes.ok) {
        const html = await songRes.text();
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);

        let artist = 'Suno Artist';
        let handle = '@suno_user';
        if (descMatch) {
          const authorMatch = descMatch[1].match(/by\s+([^(@]+)\s*\((@[^)]+)\)/i);
          if (authorMatch) {
            artist = authorMatch[1].trim();
            handle = authorMatch[2].trim();
          }
        }

        clipData = {
          id: trackId,
          title: titleMatch ? titleMatch[1] : `Suno Track ${trackId.slice(0, 8)}`,
          display_name: artist,
          handle: handle.replace('@', ''),
          image_large_url: imageMatch ? imageMatch[1] : `https://cdn2.suno.ai/image_large_${trackId}.jpeg`,
          duration: 180,
        };
      }
    } catch {
      // continue
    }
  }

  if (!clipData) {
    throw new Error('Track not found on Suno');
  }

  const duration = clipData.metadata?.duration
    ? Math.round(clipData.metadata.duration)
    : clipData.duration
    ? Math.round(clipData.duration)
    : 180;

  const audioUrl = clipData.audio_url && !clipData.audio_url.includes('forbidden')
    ? clipData.audio_url
    : `/api/suno/stream/${trackId}.mp3`;

  return {
    id: trackId,
    title: clipData.title || `Suno Track ${trackId.slice(0, 8)}`,
    artist: clipData.display_name || clipData.handle || 'Suno Artist',
    handle: clipData.handle ? `@${clipData.handle}` : '@suno_user',
    audio_url: audioUrl,
    video_url: clipData.video_url || `https://cdn1.suno.ai/${trackId}.mp4`,
    image_url: clipData.image_large_url || clipData.image_url || `https://cdn2.suno.ai/image_large_${trackId}.jpeg`,
    duration,
    duration_formatted: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
    play_count: clipData.play_count || 120,
    upvote_count: clipData.upvote_count || 12,
    tags: clipData.metadata?.tags || clipData.display_tags || '',
    model: clipData.major_model_version || 'v6',
    created_at: clipData.created_at || new Date().toISOString(),
    isVerified: clipData.is_verified || false,
    iframe_url: `https://suno.com/embed/${trackId}`,
  };
}

// Helper to extract Suno UUIDs from various formats
function extractSunoIds(input: string): { type: 'song' | 'playlist' | 'profile' | 'unknown'; ids: string[] } {
  const trimmed = input.trim();

  // Playlist pattern: suno.com/playlist/[uuid]
  const playlistMatch = trimmed.match(/suno\.(?:com|ai)\/playlist\/([a-zA-Z0-9_-]+)/i);
  if (playlistMatch) {
    return { type: 'playlist', ids: [playlistMatch[1]] };
  }

  // Find all UUIDs (e.g. from pasted text or multiple URLs)
  const uuidMatches = trimmed.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi);
  if (uuidMatches && uuidMatches.length > 0) {
    const uniqueIds = Array.from(new Set(uuidMatches));
    return { type: 'song', ids: uniqueIds };
  }

  // Profile pattern: suno.com/@username
  const profileMatch = trimmed.match(/suno\.(?:com|ai)\/@([a-zA-Z0-9_-]+)/i);
  if (profileMatch) {
    return { type: 'profile', ids: [profileMatch[1]] };
  }

  return { type: 'unknown', ids: [] };
}

// Master API to resolve ANY Suno link (including short links https://suno.com/s/...)
app.all('/api/suno/resolve', async (req: Request, res: Response) => {
  try {
    const url = (req.body?.url || req.query?.url) as string;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const { resolvedUrl, shareCode } = await resolveSunoShareUrl(url);

    // 1. Check if it is explicitly a playlist URL
    const playlistMatch = resolvedUrl.match(/suno\.(?:com|ai)\/playlist\/([a-zA-Z0-9_-]+)/i);
    if (playlistMatch) {
      const playlistId = playlistMatch[1];
      let sh = shareCode || '';
      try {
        const parsedUrl = new URL(resolvedUrl);
        const urlSh = parsedUrl.searchParams.get('sh');
        if (urlSh) sh = urlSh;
      } catch {
        // ignore
      }

      const playlist = await fetchPlaylistData(playlistId, sh);
      return res.json({
        type: 'playlist',
        resolvedUrl,
        playlist,
      });
    }

    // 2. Check if it has a track UUID or generic UUID
    const uuidMatch = resolvedUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (uuidMatch) {
      const targetId = uuidMatch[0];

      // If URL explicitly points to song/clip
      if (resolvedUrl.includes('/song/') || resolvedUrl.includes('/clip/')) {
        const track = await fetchTrackData(targetId);
        return res.json({
          type: 'song',
          resolvedUrl,
          track,
        });
      }

      // Otherwise, attempt track first, then fallback to playlist
      try {
        const track = await fetchTrackData(targetId);
        return res.json({
          type: 'song',
          resolvedUrl,
          track,
        });
      } catch (trackErr: any) {
        try {
          const playlist = await fetchPlaylistData(targetId, shareCode);
          return res.json({
            type: 'playlist',
            resolvedUrl,
            playlist,
          });
        } catch (playlistErr: any) {
          throw new Error(`Could not find track or playlist for ID ${targetId}`);
        }
      }
    }

    return res.status(404).json({ error: 'Could not recognize Suno song or playlist from this URL' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to resolve Suno link' });
  }
});

// API to resolve multiple Suno URLs in bulk
app.post('/api/suno/resolve-batch', async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls array is required' });
    }

    const uniqueUrls = Array.from(new Set(urls.map((u: string) => String(u).trim()).filter(Boolean))).slice(0, 50);

    const resolveSingle = async (rawUrl: string) => {
      try {
        const { resolvedUrl, shareCode } = await resolveSunoShareUrl(rawUrl);

        const playlistMatch = resolvedUrl.match(/suno\.(?:com|ai)\/playlist\/([a-zA-Z0-9_-]+)/i);
        if (playlistMatch) {
          const playlistId = playlistMatch[1];
          let sh = shareCode || '';
          try {
            const parsedUrl = new URL(resolvedUrl);
            const urlSh = parsedUrl.searchParams.get('sh');
            if (urlSh) sh = urlSh;
          } catch {}
          const playlist = await fetchPlaylistData(playlistId, sh);
          return { url: rawUrl, success: true, type: 'playlist', playlist };
        }

        const uuidMatch = resolvedUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
        if (uuidMatch) {
          const targetId = uuidMatch[0];
          try {
            const track = await fetchTrackData(targetId);
            return { url: rawUrl, success: true, type: 'song', track };
          } catch {
            const playlist = await fetchPlaylistData(targetId, shareCode);
            return { url: rawUrl, success: true, type: 'playlist', playlist };
          }
        }

        return { url: rawUrl, success: false, error: 'Could not extract valid Suno song or playlist ID' };
      } catch (err: any) {
        return { url: rawUrl, success: false, error: err.message || 'Resolution failed' };
      }
    };

    const results = await Promise.all(uniqueUrls.map(resolveSingle));
    return res.json({ results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Batch resolve failed' });
  }
});

// API to parse arbitrary text/URLs
app.post('/api/suno/parse', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input text or URL is required' });
    }

    const extraction = extractSunoIds(input);
    return res.json({
      success: true,
      ...extraction,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to parse Suno input' });
  }
});

// API to fetch Suno Track metadata by ID or URL
app.get('/api/suno/track/:id', async (req: Request, res: Response) => {
  const rawId = req.params.id;
  if (!rawId) {
    return res.status(400).json({ error: 'Track ID is required' });
  }

  const uuidMatch = rawId.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackId = uuidMatch ? uuidMatch[0] : rawId.trim();

  try {
    const track = await fetchTrackData(trackId);
    return res.json(track);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch Suno track' });
  }
});

// API to fetch Suno playlist
app.get('/api/suno/playlist/:id', async (req: Request, res: Response) => {
  const playlistId = req.params.id;
  const sh = (req.query.sh as string) || '';
  try {
    const playlist = await fetchPlaylistData(playlistId, sh);
    return res.json(playlist);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch Suno playlist' });
  }
});

// Direct Audio Stream endpoint with HTTP Range & Seeking support
app.get('/api/suno/stream/:id', async (req: Request, res: Response) => {
  const rawId = req.params.id;
  if (!rawId) {
    return res.status(400).json({ error: 'Track ID required' });
  }

  const uuidMatch = rawId.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackId = uuidMatch ? uuidMatch[0] : rawId.replace(/\.(mp3|m4a|wav|mp4)$/i, '').trim();

  try {
    const filePath = await transcodeTrack(trackId, 'mp3', '320k');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.sendFile(filePath, { acceptRanges: true });
  } catch (err: any) {
    console.warn(`Stream transcode fallback for ${trackId}:`, err.message);
    try {
      const rawPath = await getDecryptedAudioPath(trackId);
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      return res.sendFile(rawPath, { acceptRanges: true });
    } catch (fallbackErr: any) {
      console.error(`Stream delivery failure for ${trackId}:`, fallbackErr.message);
      return res.status(500).json({ error: `Audio stream unavailable: ${err.message}` });
    }
  }
});

// Helper to create safe, RFC 6266 / RFC 5987 compliant Content-Disposition header
// Prevents TypeError [ERR_INVALID_CHAR]: Invalid character in header content ["Content-Disposition"]
function makeContentDisposition(filename: string): string {
  // 1. ASCII-only fallback for filename="" parameter
  // Normalize unicode (decompose accents) and strip all non-printable ASCII
  const asciiFallback = filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\;\r\n]/g, '_')
    .trim() || 'suno-audio';

  // 2. RFC 5987 percent-encoded UTF-8 format for modern browsers to preserve full Unicode titles
  const rfc5987 = encodeURIComponent(filename)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A');

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${rfc5987}`;
}

// Dedicated high-fidelity audio & video export endpoint
app.get('/api/suno/download', async (req: Request, res: Response) => {
  const rawId = req.query.id as string;
  const uuidMatch = rawId?.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackId = uuidMatch ? uuidMatch[0] : rawId?.trim();

  if (!trackId) {
    return res.status(400).json({ error: 'Valid Suno track ID required' });
  }

  const rawFormat = ((req.query.format as string) || 'mp3').toLowerCase();
  const format = (['wav', 'flac', 'm4a', 'ogg'].includes(rawFormat) ? rawFormat : 'mp3') as 'mp3' | 'wav' | 'flac' | 'm4a' | 'ogg';
  const bitrate = (req.query.bitrate as string) || '320k';
  const bitDepth = ((req.query.bitDepth as string) || '24-bit') as '16-bit' | '24-bit';
  const title = (req.query.title as string) || 'Suno Song';
  const artist = (req.query.artist as string) || 'Suno Artist';
  const coverUrl = (req.query.cover as string) || '';

  const ext = format === 'm4a' ? 'm4a' : format;
  const sanitize = (s: string) => s.replace(/[/\\?%*:|"<>]/g, '_').trim();
  
  const startTime = req.query.startTime ? Number(req.query.startTime) : undefined;
  const endTime = req.query.endTime ? Number(req.query.endTime) : undefined;
  const album = (req.query.album as string) || undefined;
  const year = (req.query.year as string) || undefined;
  const genre = (req.query.genre as string) || undefined;
  const normalize = req.query.normalize === 'true';

  const duplicateIndex = req.query.duplicateIndex ? Number(req.query.duplicateIndex) : undefined;
  const dupStr = duplicateIndex && duplicateIndex > 1 ? ` (${duplicateIndex})` : '';

  let safeFilename = `${sanitize(artist)} - ${sanitize(title)}${dupStr}.${ext}`;
  if (startTime != null && endTime != null && !isNaN(startTime) && !isNaN(endTime)) {
    const sMin = Math.floor(startTime / 60);
    const sSec = Math.floor(startTime % 60);
    const eMin = Math.floor(endTime / 60);
    const eSec = Math.floor(endTime % 60);
    safeFilename = `${sanitize(artist)} - ${sanitize(title)}${dupStr} [Clip ${sMin}m${sSec}s-${eMin}m${eSec}s].${ext}`;
  }

  try {
    const filePath = await transcodeTrack(trackId, format, bitrate, bitDepth, title, artist, coverUrl, {
      startTime,
      endTime,
      album,
      year,
      genre,
      normalize,
    });
    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      flac: 'audio/flac',
      m4a: 'audio/mp4',
      ogg: 'audio/ogg',
    };

    res.setHeader('Content-Type', mimeMap[format] || 'application/octet-stream');
    res.setHeader('Content-Disposition', makeContentDisposition(safeFilename));
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.sendFile(filePath, { acceptRanges: true });
  } catch (err: any) {
    console.error(`Download failed for ${trackId}:`, err);
    return res.status(500).json({ error: `Audio processing error: ${err.message}` });
  }
});

// Audio proxy to bypass browser CORS for WebAudio decoding (WAV conversion) and direct downloads
app.get('/api/suno/proxy-audio', async (req: Request, res: Response) => {
  const audioUrl = req.query.url as string;
  if (!audioUrl) {
    return res.status(400).json({ error: 'Missing url query param' });
  }

  // Extract possible UUID for fallback
  const uuidMatch = audioUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackUuid = uuidMatch ? uuidMatch[0] : null;

  if (trackUuid) {
    try {
      const localFile = await getDecryptedAudioPath(trackUuid);
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      return res.sendFile(localFile, { acceptRanges: true });
    } catch (e: any) {
      console.warn(`proxy-audio decrypt fallback for ${trackUuid}:`, e.message);
    }
  }

  // Potential stream candidate URLs to try in order
  const candidates: string[] = [audioUrl];
  if (trackUuid) {
    const m4aUrl = `https://d2lwuy8qc234o3.cloudfront.net/2/clip/${trackUuid}.m4a`;
    const mp4Url = `https://cdn1.suno.ai/${trackUuid}.mp4`;
    if (!candidates.includes(m4aUrl)) candidates.push(m4aUrl);
    if (!candidates.includes(mp4Url)) candidates.push(mp4Url);
  }

  const reqHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'https://suno.com/',
  };

  // Forward Range header for HTML5 <audio> streaming & seeking
  if (req.headers.range) {
    reqHeaders['Range'] = req.headers.range as string;
  }

  let upstreamRes: any = null;
  let successfulUrl = audioUrl;

  for (const url of candidates) {
    try {
      const resp = await fetch(url, { headers: reqHeaders });
      if (resp.ok || resp.status === 206) {
        upstreamRes = resp;
        successfulUrl = url;
        break;
      }
    } catch {
      // Continue to next candidate
    }
  }

  if (!upstreamRes) {
    return res.status(404).json({ error: 'Audio stream could not be reached' });
  }

  try {
    const isPartial = upstreamRes.status === 206;
    res.status(isPartial ? 206 : 200);

    let contentType = upstreamRes.headers.get('content-type') || '';
    if (!contentType || contentType === 'application/octet-stream' || contentType.includes('text/')) {
      if (successfulUrl.endsWith('.m4a') || successfulUrl.includes('.m4a')) {
        contentType = 'audio/mp4';
      } else if (successfulUrl.endsWith('.mp4') || successfulUrl.includes('.mp4')) {
        contentType = 'video/mp4';
      } else if (successfulUrl.endsWith('.mp3') || successfulUrl.includes('.mp3')) {
        contentType = 'audio/mpeg';
      } else {
        contentType = 'audio/mp4';
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (req.query.download === 'true') {
      const filename = (req.query.filename as string) || 'suno-song.mp3';
      res.setHeader('Content-Disposition', makeContentDisposition(filename));
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Proxy error' });
  }
});

// Image proxy for clean thumbnail loading & album art bundling
app.get('/api/suno/proxy-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url query param' });
  }

  try {
    const upstreamRes = await fetch(imageUrl);
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Failed to fetch image');
    }
    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Image proxy error' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
