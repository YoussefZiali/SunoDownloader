import JSZip from 'jszip';
import { AudioFormat, SunoTrack, UserSettings } from '../types';

// Helper to format track filename based on settings pattern
export function formatFileName(track: SunoTrack, format: string, pattern: string): string {
  const sanitize = (s: string) => s.replace(/[/\\?%*:|"<>]/g, '_').trim();
  const title = sanitize(track.title || 'Untitled');
  const artist = sanitize(track.artist || 'Suno');
  const id = track.id.slice(0, 8);
  const tags = sanitize(track.tags || 'suno');

  let base = pattern
    .replace('{artist}', artist)
    .replace('{title}', title)
    .replace('{id}', id)
    .replace('{tags}', tags);

  if (!base) {
    base = `${artist} - ${title}`;
  }

  return `${base}.${format}`;
}

// Convert AudioBuffer to 16-bit or 24-bit PCM WAV Blob
export function encodeWAV(audioBuffer: AudioBuffer, bitDepth: '16-bit' | '24-bit' = '16-bit'): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const is24Bit = bitDepth === '24-bit';
  const bytesPerSample = is24Bit ? 3 : 2;
  const bitsPerSample = is24Bit ? 24 : 16;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const length = audioBuffer.length;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channel samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));

      if (is24Bit) {
        // 24-bit signed integer (-8388608 to 8388607)
        const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF;
        const clamped = Math.floor(intSample);
        view.setUint8(offset, clamped & 0xFF);
        view.setUint8(offset + 1, (clamped >> 8) & 0xFF);
        view.setUint8(offset + 2, (clamped >> 16) & 0xFF);
        offset += 3;
      } else {
        // 16-bit signed integer (-32768 to 32767)
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, Math.floor(intSample), true);
        offset += 2;
      }
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Fetch raw audio data safely, using proxy fallback if CORS blocks direct CDN
export async function fetchAudioData(url: string, onProgress?: (p: number) => void): Promise<ArrayBuffer> {
  const tryFetch = async (targetUrl: string): Promise<ArrayBuffer> => {
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    // Read stream with progress if available
    const contentLength = +(res.headers.get('content-length') || '0');
    if (!res.body || contentLength === 0) {
      return await res.arrayBuffer();
    }

    const reader = res.body.getReader();
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        if (onProgress && contentLength > 0) {
          onProgress(Math.min(95, Math.round((receivedBytes / contentLength) * 80)));
        }
      }
    }

    const merged = new Uint8Array(receivedBytes);
    let position = 0;
    for (const chunk of chunks) {
      merged.set(chunk, position);
      position += chunk.length;
    }
    return merged.buffer;
  };

  const proxyCandidates = [
    url,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `/api/suno/proxy-audio?url=${encodeURIComponent(url)}`,
  ];

  let lastError: any = null;
  for (const candidateUrl of proxyCandidates) {
    try {
      const buf = await tryFetch(candidateUrl);
      if (buf && buf.byteLength > 5000) {
        return buf;
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  throw new Error(`Failed to fetch audio stream: ${lastError?.message || 'Network blocked'}`);
}

// Helper to format short duration for filenames
function formatSecondsShort(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

// Process track conversion to specified format via high-fidelity backend encoder
export async function convertTrackToFormat(
  track: SunoTrack,
  format: AudioFormat,
  settings: UserSettings,
  onProgress?: (percent: number) => void,
  options?: {
    startTime?: number;
    endTime?: number;
    customMetadata?: {
      title?: string;
      artist?: string;
      album?: string;
      year?: string;
      genre?: string;
    };
    normalize?: boolean;
  }
): Promise<{ blob: Blob; fileName: string }> {
  const ext = format === 'aac' ? 'm4a' : format;
  const effectiveTrack: SunoTrack = {
    ...track,
    title: options?.customMetadata?.title?.trim() || track.title,
    artist: options?.customMetadata?.artist?.trim() || track.artist,
  };

  let baseFileName = formatFileName(effectiveTrack, ext, settings.namingPattern);
  if (options?.startTime != null && options?.endTime != null && !isNaN(options.startTime) && !isNaN(options.endTime)) {
    const rawNoExt = baseFileName.slice(0, -(ext.length + 1));
    baseFileName = `${rawNoExt} [Clip ${formatSecondsShort(options.startTime)}-${formatSecondsShort(options.endTime)}].${ext}`;
  }
  const fileName = baseFileName;

  onProgress?.(15);

  const bitrate = settings.mp3Bitrate || '320kbps';
  const bitDepth = settings.wavBitDepth || '24-bit';
  
  const queryParams = new URLSearchParams({
    id: track.id,
    format: format === 'aac' ? 'm4a' : format,
    bitrate: bitrate,
    bitDepth: bitDepth,
    title: effectiveTrack.title,
    artist: effectiveTrack.artist,
    cover: track.image_url || '',
  });

  if (options?.startTime != null && !isNaN(options.startTime)) {
    queryParams.set('startTime', String(options.startTime));
  }
  if (options?.endTime != null && !isNaN(options.endTime)) {
    queryParams.set('endTime', String(options.endTime));
  }
  if (options?.customMetadata?.album) {
    queryParams.set('album', options.customMetadata.album);
  }
  if (options?.customMetadata?.year) {
    queryParams.set('year', options.customMetadata.year);
  }
  if (options?.customMetadata?.genre) {
    queryParams.set('genre', options.customMetadata.genre);
  }
  if (options?.normalize || settings.volumeNormalization) {
    queryParams.set('normalize', 'true');
  }

  const downloadUrl = `/api/suno/download?${queryParams.toString()}`;

  onProgress?.(30);

  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    aac: 'audio/mp4',
    ogg: 'audio/ogg',
  };

  let res: Response | null = null;
  try {
    res = await fetch(downloadUrl);
  } catch {
    res = null;
  }

  if (res && res.ok) {
    onProgress?.(70);
    const rawBlob = await res.blob();
    const blob = rawBlob.type ? rawBlob : new Blob([rawBlob], { type: mimeMap[format] || 'audio/mpeg' });
    onProgress?.(100);
    return {
      blob,
      fileName,
    };
  }

  const directAudioUrl = (track.audio_url && track.audio_url.startsWith('http'))
    ? track.audio_url
    : `https://cdn1.suno.ai/${track.id}.mp3`;

  try {
    onProgress?.(50);
    const arrayBuffer = await fetchAudioData(directAudioUrl, onProgress);
    const blob = new Blob([arrayBuffer], { type: mimeMap[format] || 'audio/mpeg' });
    onProgress?.(100);
    return {
      blob,
      fileName,
    };
  } catch (err: any) {
    throw new Error(`Download failed: ${err.message || 'Direct audio download unavailable'}`);
  }
}

// Direct browser streaming download for single files - skips JS memory buffering
export function downloadTrackDirectly(
  track: SunoTrack,
  format: AudioFormat,
  settings: UserSettings
): void {
  const ext = format === 'aac' ? 'm4a' : format;
  const bitrate = settings.mp3Bitrate || '320kbps';
  const bitDepth = settings.wavBitDepth || '24-bit';
  const fileName = formatFileName(track, ext, settings.namingPattern);
  const downloadUrl = `/api/suno/download?id=${encodeURIComponent(track.id)}&format=${format === 'aac' ? 'm4a' : format}&bitrate=${encodeURIComponent(bitrate)}&bitDepth=${encodeURIComponent(bitDepth)}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}&cover=${encodeURIComponent(track.image_url || '')}`;

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
  }, 2000);
}

// Generate synced or plain lyrics file
export function generateLyricsContent(track: SunoTrack, format: 'lrc' | 'txt'): { content: string; fileName: string } {
  const sanitize = (s: string) => s.replace(/[/\\?%*:|"<>]/g, '_').trim();
  const baseName = `${sanitize(track.artist)} - ${sanitize(track.title)}`;
  const ext = format === 'lrc' ? 'lrc' : 'txt';

  let text = '';
  if (format === 'lrc') {
    text += `[ti:${track.title}]\n`;
    text += `[ar:${track.artist}]\n`;
    text += `[al:Suno AI Collection]\n`;
    text += `[by:Suno Downloader]\n\n`;

    const lines = (track.prompt || track.tags || 'Instrumental').split('\n');
    let currentTime = 5; // start at 5s
    const interval = Math.max(3, Math.floor((track.duration || 180) / Math.max(lines.length, 1)));

    for (const line of lines) {
      if (line.trim()) {
        const mins = Math.floor(currentTime / 60).toString().padStart(2, '0');
        const secs = (currentTime % 60).toString().padStart(2, '0');
        text += `[${mins}:${secs}.00] ${line.trim()}\n`;
        currentTime += interval;
      }
    }
  } else {
    text += `Title: ${track.title}\n`;
    text += `Artist: ${track.artist} (${track.handle})\n`;
    text += `Duration: ${track.duration_formatted}\n`;
    text += `Style / Tags: ${track.tags || 'N/A'}\n`;
    text += `Model: Suno ${track.model || 'v3.5'}\n`;
    text += `------------------------------------\n\n`;
    text += track.prompt || 'No lyrics provided (Instrumental)';
  }

  return {
    content: text,
    fileName: `${baseName}.${ext}`,
  };
}

// Batch ZIP Creator
export async function createBatchZip(
  files: { track: SunoTrack; blob: Blob; fileName: string }[],
  settings: UserSettings,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const item = files[i];
    const sanitize = (s: string) => s.replace(/[/\\?%*:|"<>]/g, '_').trim();
    
    let targetFolder: JSZip = zip;
    if (settings.zipStructure === 'artist_folder') {
      const artistName = sanitize(item.track.artist || 'Unknown Artist');
      targetFolder = zip.folder(artistName) || zip;
    } else if (settings.zipStructure === 'format_folder') {
      const ext = item.fileName.split('.').pop()?.toUpperCase() || 'AUDIO';
      targetFolder = zip.folder(ext) || zip;
    }

    targetFolder.file(item.fileName, item.blob);

    // If lyrics enabled, add lyrics file
    if (settings.downloadLyrics) {
      const lyrics = generateLyricsContent(item.track, settings.lyricsFormat);
      targetFolder.file(lyrics.fileName, lyrics.content);
    }

    // Cover images are excluded from batch download per user preference

    onProgress?.(Math.round(((i + 1) / total) * 70));
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(70 + Math.round(metadata.percent * 0.3));
    }
  );

  return zipBlob;
}

// Trigger standard browser file download
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 60000);
}
