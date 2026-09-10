import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import crypto from 'crypto';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';

const FFMPEG_BIN = (typeof ffmpegStatic === 'string' ? ffmpegStatic : (ffmpegStatic as any)?.default) || 'ffmpeg';

const app = express();

const CACHE_DIR = '/tmp/suno_cache';
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create CACHE_DIR:', e);
  }
}

// Global CORS & Range Headers Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Disposition');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use((req: Request, res: Response, next: any) => {
  if (req.body !== undefined && typeof req.body === 'object' && req.body !== null) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

// Cached detection of ffmpeg availability on host system
let hasFfmpegCache: boolean | null = null;
async function isFfmpegAvailable(): Promise<boolean> {
  if (hasFfmpegCache !== null) return hasFfmpegCache;
  return new Promise((resolve) => {
    execFile(FFMPEG_BIN, ['-version'], (err) => {
      hasFfmpegCache = !err;
      resolve(hasFfmpegCache);
    });
  });
}

// In-flight transcode promises to avoid duplicate transcode processes
const activeTranscodes = new Map<string, Promise<string>>();

// Fetches audio from Suno's CDN or fallback endpoints into a local cache file
async function getDecryptedAudioPath(trackId: string, audioUrl?: string): Promise<string> {
  const decryptedPath = path.join(CACHE_DIR, `${trackId}_decrypted.m4a`);
  if (fs.existsSync(decryptedPath) && fs.statSync(decryptedPath).size > 5000) {
    return decryptedPath;
  }

  const fastCandidates: string[] = [];
  if (audioUrl && audioUrl.startsWith('http')) fastCandidates.push(audioUrl);
  fastCandidates.push(`https://cdn1.suno.ai/${trackId}.mp3`);
  fastCandidates.push(`https://d2lwuy8qc234o3.cloudfront.net/1/clip/${trackId}.m4a`);
  fastCandidates.push(`https://cdn1.suno.ai/${trackId}.mp4`);

  for (const url of fastCandidates) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://suno.com/',
          'Origin': 'https://suno.com',
        },
        signal: AbortSignal.timeout(3500),
      });
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && !ct.includes('text/html') && !ct.includes('application/json')) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 5000) {
          fs.writeFileSync(decryptedPath, buf);
          return decryptedPath;
        }
      }
    } catch {
      // continue
    }
  }

  // Attempt Studio API metadata
  try {
    const apiRes = await fetch(`https://studio-api.prod.suno.com/api/clip/${trackId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://suno.com/',
        'Origin': 'https://suno.com',
      },
      signal: AbortSignal.timeout(3500),
    });
    if (apiRes.ok) {
      const clipJson = await apiRes.json();
      if (clipJson?.audio_url && typeof clipJson.audio_url === 'string' && clipJson.audio_url.startsWith('http')) {
        const audioRes = await fetch(clipJson.audio_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://suno.com/',
            'Origin': 'https://suno.com',
          },
          signal: AbortSignal.timeout(3500),
        });
        const ct = (audioRes.headers.get('content-type') || '').toLowerCase();
        if (audioRes.ok && !ct.includes('text/html')) {
          const buf = Buffer.from(await audioRes.arrayBuffer());
          if (buf.length > 5000) {
            fs.writeFileSync(decryptedPath, buf);
            return decryptedPath;
          }
        }
      }
    }
  } catch {
    // continue
  }

  // Legacy rights decryption fallback with 3s timeout
  let rights: any = null;
  const rightsEndpoints = ['https://yellow-salad.aibiei.com/rights'];
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
        signal: AbortSignal.timeout(3000),
      });

      if (rightsRes.ok) {
        rights = await rightsRes.json();
        if (rights && rights.key && rights.iv && rights.glt) {
          break;
        }
      }
    } catch {
      // continue
    }
  }

  if (rights && rights.key && rights.iv && rights.glt) {
    try {
      const userKey = crypto.createHash('sha256').update(rights.glt).digest();

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
      const encAudioUrls = [
        `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${trackId}.m4a`,
        `https://d2lwuy8qc234o3.cloudfront.net/2/clip/${trackId}.m4a`,
      ];

      for (const encAudioUrl of encAudioUrls) {
        try {
          const encRes = await fetch(encAudioUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            },
          });

          if (encRes.ok) {
            const encBuffer = Buffer.from(await encRes.arrayBuffer());
            const algo = contentKey.length === 32 ? 'aes-256-ctr' : 'aes-128-ctr';
            const decipher = crypto.createDecipheriv(algo, contentKey, contentIv);
            const decryptedBuffer = Buffer.concat([decipher.update(encBuffer), decipher.final()]);

            if (decryptedBuffer.length > 5000) {
              fs.writeFileSync(decryptedPath, decryptedBuffer);
              return decryptedPath;
            }
          }
        } catch {
          // try next url
        }
      }
    } catch (err: any) {
      console.warn(`Audio decryption failed for ${trackId}:`, err.message);
    }
  }

  // Fallback: Direct CDN stream if accessible (unencrypted mp4 / cdn streams)
  const directCandidateUrls = [
    ...(audioUrl && audioUrl.startsWith('http') ? [audioUrl] : []),
    `https://cdn1.suno.ai/${trackId}.mp3`,
    `https://cdn1.suno.ai/${trackId}.mp4`,
    `https://cdn1.suno.ai/${trackId}.m4a`,
    `https://cdn2.suno.ai/${trackId}.mp3`,
    `https://cdn2.suno.ai/${trackId}.mp4`,
    `https://audiopipe.suno.ai/v1/change_target?item_id=${trackId}`,
    `https://audiopipe.suno.ai/?item_id=${trackId}`,
  ];

  const candidateUrls: string[] = [];
  for (const u of directCandidateUrls) {
    candidateUrls.push(u);
    candidateUrls.push(`https://corsproxy.io/?${encodeURIComponent(u)}`);
    candidateUrls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`);
  }

  for (const cdnUrl of candidateUrls) {
    try {
      const directRes = await fetch(cdnUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://suno.com/',
        },
      });
      if (directRes.ok) {
        const buf = Buffer.from(await directRes.arrayBuffer());
        if (buf.length > 5000) {
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

// Transcode track with ffmpeg if available, otherwise return decrypted audio path cleanly
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
    audioUrl?: string;
  } = {}
): Promise<{ filePath: string; format: string; mimeType: string }> {
  const inputPath = await getDecryptedAudioPath(trackId, options.audioUrl);

  // Check if ffmpeg is installed on this host (Vercel serverless lacks ffmpeg binary)
  const hasFfmpeg = await isFfmpegAvailable();
  if (!hasFfmpeg) {
    console.log(`Host environment has no ffmpeg binary (e.g. Vercel Serverless). Providing direct decrypted stream.`);
    return {
      filePath: inputPath,
      format: 'm4a',
      mimeType: 'audio/mp4',
    };
  }

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

  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
  };

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    return { filePath: outPath, format, mimeType: mimeMap[format] || 'audio/mpeg' };
  }

  if (activeTranscodes.has(cacheKey)) {
    const p = await activeTranscodes.get(cacheKey)!;
    return { filePath: p, format, mimeType: mimeMap[format] || 'audio/mpeg' };
  }

  const promise = (async () => {
    let coverImagePath: string | null = null;
    if (format === 'mp3') {
      coverImagePath = await getCoverImagePath(trackId, coverUrl);
    }

    return new Promise<string>((resolve, reject) => {
      const inputArgs = ['-y'];

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

      execFile(FFMPEG_BIN, args, (err) => {
        activeTranscodes.delete(cacheKey);
        if (err) {
          console.warn(`ffmpeg transcode warning for ${trackId} (${format}):`, err.message);
          // If mp3 with cover failed, retry without cover
          if (format === 'mp3' && coverImagePath) {
            execFile(FFMPEG_BIN, ['-y', '-i', inputPath, '-vn', '-c:a', 'libmp3lame', '-b:a', safeBitrate || '320k', '-id3v2_version', '3', ...metaArgs, outPath], (fallbackErr) => {
              if (fallbackErr) {
                // If ffmpeg still fails, resolve to raw decrypted audio
                resolve(inputPath);
              } else {
                resolve(outPath);
              }
            });
            return;
          }
          // Fallback to raw decrypted file so download / stream never breaks
          resolve(inputPath);
        } else {
          resolve(outPath);
        }
      });
    });
  })();

  activeTranscodes.set(cacheKey, promise);
  const resolvedPath = await promise;
  const isTranscoded = resolvedPath === outPath;
  return {
    filePath: resolvedPath,
    format: isTranscoded ? format : 'm4a',
    mimeType: isTranscoded ? (mimeMap[format] || 'audio/mpeg') : 'audio/mp4',
  };
}

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

// Reusable Track Fetcher with multi-tiered resilient fallback
async function fetchTrackData(trackId: string): Promise<any> {
  let clipData: any = null;

  // 1. Try studio-api endpoints directly and via CORS proxy
  const apiUrls = [
    `https://studio-api.prod.suno.com/api/clip/${trackId}`,
    `https://studio-api.suno.ai/api/clip/${trackId}`,
    `https://corsproxy.io/?${encodeURIComponent(`https://studio-api.prod.suno.com/api/clip/${trackId}`)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://studio-api.prod.suno.com/api/clip/${trackId}`)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://studio-api.prod.suno.com/api/clip/${trackId}`)}`,
  ];

  for (const apiUrl of apiUrls) {
    try {
      const apiRes = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://suno.com/',
          'Origin': 'https://suno.com',
        },
        signal: AbortSignal.timeout(3500),
      });
      if (apiRes.ok) {
        const resData = await apiRes.json();
        if (resData && (resData.id || resData.title)) {
          clipData = resData;
          break;
        }
      }
    } catch {
      // continue to next endpoint
    }
  }

  // 2. Try Suno embed page JSON extraction
  if (!clipData) {
    try {
      const embedRes = await fetch(`https://suno.com/embed/${trackId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

  // 3. Fallback: Parse meta tags and JSON-LD from song page
  if (!clipData) {
    try {
      const songRes = await fetch(`https://suno.com/song/${trackId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
    clipData = {
      id: trackId,
      title: `Suno Track ${trackId.slice(0, 8)}`,
      display_name: 'Suno Artist',
      handle: 'suno_user',
      audio_url: `https://cdn1.suno.ai/${trackId}.mp3`,
      image_large_url: `https://cdn2.suno.ai/image_large_${trackId}.jpeg`,
      duration: 180,
    };
  }

  const duration = clipData.metadata?.duration
    ? Math.round(clipData.metadata.duration)
    : clipData.duration
    ? Math.round(clipData.duration)
    : 180;

  const audioUrl = clipData.audio_url && !clipData.audio_url.includes('forbidden') && clipData.audio_url.startsWith('http')
    ? clipData.audio_url
    : `https://cdn1.suno.ai/${trackId}.mp3`;

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

// Helper to create safe, RFC 6266 / RFC 5987 compliant Content-Disposition header
function makeContentDisposition(filename: string): string {
  const asciiFallback = filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\;\r\n]/g, '_')
    .trim() || 'suno-audio';

  const rfc5987 = encodeURIComponent(filename)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A');

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${rfc5987}`;
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

export async function parseRequestBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    if (Buffer.isBuffer(req.body)) {
      try { return JSON.parse(req.body.toString('utf-8')); } catch { return {}; }
    }
  }

  return new Promise((resolve) => {
    let data = '';
    req.on?.('data', (chunk: any) => {
      data += chunk;
    });
    req.on?.('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on?.('error', () => {
      resolve({});
    });
    if (req.readable === false || req.complete) {
      resolve({});
    }
  });
}

export function sendJsonResponse(res: any, statusCode: number, data: any) {
  try {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(statusCode).json(data);
    }
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  } catch (e) {
    console.error('Error sending JSON response:', e);
  }
}

export async function handleHealthReq(req: any, res: any) {
  const hasFfmpeg = await isFfmpegAvailable();
  return sendJsonResponse(res, 200, {
    status: 'ok',
    ffmpeg: hasFfmpeg,
    timestamp: new Date().toISOString(),
    platform: process.env.VERCEL ? 'vercel' : 'node',
  });
}

export async function handleResolveReq(req: any, res: any) {
  try {
    const body = await parseRequestBody(req);
    const url = (body?.url || req.query?.url) as string;
    if (!url || typeof url !== 'string') {
      return sendJsonResponse(res, 400, { error: 'URL is required' });
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
      } catch {}

      const playlist = await fetchPlaylistData(playlistId, sh);
      return sendJsonResponse(res, 200, {
        type: 'playlist',
        resolvedUrl,
        playlist,
      });
    }

    // 2. Check if it has a track UUID or generic UUID
    const uuidMatch = resolvedUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (uuidMatch) {
      const targetId = uuidMatch[0];

      if (resolvedUrl.includes('/song/') || resolvedUrl.includes('/clip/')) {
        const track = await fetchTrackData(targetId);
        return sendJsonResponse(res, 200, {
          type: 'song',
          resolvedUrl,
          track,
        });
      }

      try {
        const track = await fetchTrackData(targetId);
        return sendJsonResponse(res, 200, {
          type: 'song',
          resolvedUrl,
          track,
        });
      } catch {
        try {
          const playlist = await fetchPlaylistData(targetId, shareCode);
          return sendJsonResponse(res, 200, {
            type: 'playlist',
            resolvedUrl,
            playlist,
          });
        } catch {
          throw new Error(`Could not find track or playlist for ID ${targetId}`);
        }
      }
    }

    return sendJsonResponse(res, 404, { error: 'Could not recognize Suno song or playlist from this URL' });
  } catch (err: any) {
    console.error('Resolve error:', err);
    return sendJsonResponse(res, 404, { error: err.message || 'Failed to resolve Suno link' });
  }
}

export async function handleResolveBatchReq(req: any, res: any) {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const urls = body?.urls || req.query?.urls;
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
}

export async function handleParseReq(req: any, res: any) {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const input = body?.input || req.query?.input;
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
}

export async function handleTrackReq(req: any, res: any) {
  const rawId = (req.params?.id || req.query?.id) as string;
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
}

export async function handlePlaylistReq(req: any, res: any) {
  const playlistId = (req.params?.id || req.query?.id) as string;
  const sh = (req.query?.sh as string) || '';
  try {
    const playlist = await fetchPlaylistData(playlistId, sh);
    return res.json(playlist);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch Suno playlist' });
  }
}

export async function handleStreamReq(req: any, res: any) {
  const rawId = (req.params?.id || req.query?.id) as string;
  if (!rawId) {
    return res.status(400).json({ error: 'Track ID required' });
  }

  const uuidMatch = rawId.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackId = uuidMatch ? uuidMatch[0] : rawId.replace(/\.(mp3|m4a|wav|mp4)$/i, '').trim();

  req.query = { ...req.query, url: `https://cdn1.suno.ai/${trackId}.mp3` };
  return handleProxyAudioReq(req, res);
}

export async function handleDownloadReq(req: any, res: any) {
  const rawId = req.query?.id as string;
  const uuidMatch = rawId?.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackId = uuidMatch ? uuidMatch[0] : rawId?.trim();

  if (!trackId) {
    return res.status(400).json({ error: 'Valid Suno track ID required' });
  }

  const rawFormat = ((req.query?.format as string) || 'mp3').toLowerCase();
  const format = (['wav', 'flac', 'm4a', 'ogg'].includes(rawFormat) ? rawFormat : 'mp3') as 'mp3' | 'wav' | 'flac' | 'm4a' | 'ogg';
  const bitrate = (req.query?.bitrate as string) || '320k';
  const bitDepth = ((req.query?.bitDepth as string) || '24-bit') as '16-bit' | '24-bit';
  const title = (req.query?.title as string) || 'Suno Song';
  const artist = (req.query?.artist as string) || 'Suno Artist';
  const coverUrl = (req.query?.cover as string) || '';
  const audioUrl = (req.query?.audioUrl as string) || '';

  const sanitize = (s: string) => s.replace(/[/\\?%*:|"<>]/g, '_').trim();
  
  const startTime = req.query?.startTime ? Number(req.query.startTime) : undefined;
  const endTime = req.query?.endTime ? Number(req.query.endTime) : undefined;
  const album = (req.query?.album as string) || undefined;
  const year = (req.query?.year as string) || undefined;
  const genre = (req.query?.genre as string) || undefined;
  const normalize = req.query?.normalize === 'true';



  try {
    const result = await transcodeTrack(trackId, format, bitrate, bitDepth, title, artist, coverUrl, {
      startTime,
      endTime,
      album,
      year,
      genre,
      normalize,
      audioUrl,
    });

    const effectiveExt = result.format === 'm4a' ? 'm4a' : result.format;
    let safeFilename = `${sanitize(artist)} - ${sanitize(title)}.${effectiveExt}`;
    if (startTime != null && endTime != null && !isNaN(startTime) && !isNaN(endTime)) {
      const sMin = Math.floor(startTime / 60);
      const sSec = Math.floor(startTime % 60);
      const eMin = Math.floor(endTime / 60);
      const eSec = Math.floor(endTime % 60);
      safeFilename = `${sanitize(artist)} - ${sanitize(title)} [Clip ${sMin}m${sSec}s-${eMin}m${eSec}s].${effectiveExt}`;
    }

    const fileBuffer = fs.readFileSync(result.filePath);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', makeContentDisposition(safeFilename));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', fileBuffer.length);
    return res.send(fileBuffer);
  } catch (err: any) {
    console.error(`Download failed for ${trackId}:`, err);
    try {
      const rawFallback = await getDecryptedAudioPath(trackId, audioUrl);
      const fallbackFilename = `${sanitize(artist)} - ${sanitize(title)}.m4a`;
      const fileBuffer = fs.readFileSync(rawFallback);
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Content-Disposition', makeContentDisposition(fallbackFilename));
      res.setHeader('Content-Length', fileBuffer.length);
      return res.send(fileBuffer);
    } catch {
      return res.status(500).json({ error: `Audio processing error: ${err.message}` });
    }
  }
}

export async function handleProxyAudioReq(req: any, res: any) {
  const audioUrl = req.query?.url as string;
  if (!audioUrl) {
    return res.status(400).json({ error: 'Missing url query param' });
  }

  const uuidMatch = audioUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  const trackUuid = uuidMatch ? uuidMatch[0] : null;

  const candidates: string[] = [audioUrl];
  if (trackUuid) {
    const mp3Url = `https://cdn1.suno.ai/${trackUuid}.mp3`;
    const m4aUrl = `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${trackUuid}.m4a`;
    const mp4Url = `https://cdn1.suno.ai/${trackUuid}.mp4`;
    if (!candidates.includes(mp3Url)) candidates.push(mp3Url);
    if (!candidates.includes(m4aUrl)) candidates.push(m4aUrl);
    if (!candidates.includes(mp4Url)) candidates.push(mp4Url);
  }

  const reqHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'https://suno.com/',
    'Origin': 'https://suno.com',
  };

  if (req.headers?.range) {
    reqHeaders['Range'] = req.headers.range as string;
  }

  let upstreamRes: any = null;
  let successfulUrl = audioUrl;

  for (const url of candidates) {
    try {
      const resp = await fetch(url, {
        headers: reqHeaders,
        signal: AbortSignal.timeout(3500),
      });
      const ct = (resp.headers.get('content-type') || '').toLowerCase();
      if ((resp.ok || resp.status === 206) && !ct.includes('text/html') && !ct.includes('application/json')) {
        upstreamRes = resp;
        successfulUrl = url;
        break;
      }
    } catch {
      // Continue to next candidate
    }
  }

  if (upstreamRes && upstreamRes.body) {
    try {
      const isPartial = upstreamRes.status === 206;
      res.status(isPartial ? 206 : 200);

      let contentType = upstreamRes.headers.get('content-type') || '';
      if (!contentType || contentType === 'application/octet-stream') {
        if (successfulUrl.endsWith('.m4a') || successfulUrl.includes('.m4a')) {
          contentType = 'audio/mp4';
        } else if (successfulUrl.endsWith('.mp4') || successfulUrl.includes('.mp4')) {
          contentType = 'video/mp4';
        } else {
          contentType = 'audio/mpeg';
        }
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');

      const contentRange = upstreamRes.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);

      const contentLength = upstreamRes.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      if (req.query?.download === 'true') {
        const filename = (req.query.filename as string) || 'suno-song.mp3';
        res.setHeader('Content-Disposition', makeContentDisposition(filename));
      }

      const nodeStream = Readable.fromWeb(upstreamRes.body as any);
      return nodeStream.pipe(res);
    } catch {
      // fallback
    }
  }

  if (trackUuid) {
    try {
      const localFile = await getDecryptedAudioPath(trackUuid, audioUrl);
      const stat = fs.statSync(localFile);
      const range = req.headers.range;

      if (req.query?.download === 'true') {
        const filename = (req.query.filename as string) || 'suno-song.mp3';
        res.setHeader('Content-Disposition', makeContentDisposition(filename));
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = (end - start) + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', chunksize);
        const stream = fs.createReadStream(localFile, { start, end });
        return stream.pipe(res);
      } else {
        res.setHeader('Content-Length', stat.size);
        const stream = fs.createReadStream(localFile);
        return stream.pipe(res);
      }
    } catch (e: any) {
      console.warn(`proxy-audio fallback failed for ${trackUuid}:`, e.message);
    }
  }

  return res.status(404).json({ error: 'Audio stream unavailable' });
}

export async function handleProxyImageReq(req: any, res: any) {
  const imageUrl = req.query?.url as string;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url query param' });
  }

  try {
    const upstreamRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Failed to fetch image');
    }
    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Image proxy error' });
  }
}

app.get('/api/health', handleHealthReq);
app.all('/api/suno/resolve', handleResolveReq);
app.post('/api/suno/resolve-batch', handleResolveBatchReq);
app.post('/api/suno/parse', handleParseReq);
app.get('/api/suno/track/:id', handleTrackReq);
app.get('/api/suno/playlist/:id', handlePlaylistReq);
app.get('/api/suno/stream/:id', handleStreamReq);
app.get('/api/suno/download', handleDownloadReq);
app.get('/api/suno/proxy-audio', handleProxyAudioReq);
app.get('/api/suno/proxy-image', handleProxyImageReq);

export { app };
export default app;
