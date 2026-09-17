import { KaraokeLyricLine, SunoTrack } from '../types';
import { triggerFileDownload } from './audioConverter';

export interface RetrievedLyricsData {
  trackId: string;
  title: string;
  artist: string;
  duration: number;
  rawLyrics: string;
  hasLyrics: boolean;
  structuredLines: KaraokeLyricLine[];
  lrc: string;
  srt: string;
}

// Fetch synchronized lyrics from server
export async function fetchTrackLyrics(trackId: string): Promise<RetrievedLyricsData> {
  const res = await fetch(`/api/suno/lyrics/${encodeURIComponent(trackId)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to retrieve track lyrics');
  }
  return await res.json();
}

// Download lyrics in LRC, SRT, or TXT
export async function downloadLyricsFile(
  track: SunoTrack, 
  format: 'lrc' | 'srt' | 'txt', 
  customLyrics?: string
): Promise<void> {
  const sanitize = (s: string) => s.replace(/[/\\?%*:|"<>]/g, '_').trim();
  const baseName = `${sanitize(track.artist)} - ${sanitize(track.title)}`;

  if (!customLyrics) {
    // Direct server stream download
    const url = `/api/suno/lyrics/${track.id}/download?format=${format}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Generate client-side blob if custom lyrics provided
  const syncedLines = parseAndSyncLyrics(track, customLyrics);
  let content = '';
  let mimeType = 'text/plain;charset=utf-8';
  let ext = format;

  if (format === 'lrc') {
    content = generateLrcContent(track, syncedLines);
  } else if (format === 'srt') {
    content = generateSrtContent(syncedLines);
  } else {
    content = customLyrics;
  }

  const blob = new Blob([content], { type: mimeType });
  triggerFileDownload(blob, `${baseName}.${ext}`);
}

// Parse text or LRC timestamps into Karaoke lines
export function parseAndSyncLyrics(
  track: SunoTrack,
  customLyrics?: string
): KaraokeLyricLine[] {
  const text = customLyrics || track.prompt || '';
  if (!text.trim()) {
    return [
      { id: 'line-0', time: 0, endTime: (track.duration || 180), text: `♪ ${track.title} ♪`, section: 'Intro' }
    ];
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const totalDuration = Math.max(30, track.duration || 180);
  
  // Check if text already has LRC timestamps like [01:23.45]
  const hasLrcTimestamps = lines.some((l) => /^\[\d{2}:\d{2}(?:\.\d{1,3})?\]/.test(l));

  if (hasLrcTimestamps) {
    const parsedLrc: KaraokeLyricLine[] = [];
    let currentSection = 'Verse';

    lines.forEach((l, idx) => {
      const match = l.match(/^\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)/);
      if (match) {
        const mins = parseFloat(match[1]);
        const secs = parseFloat(match[2]);
        const lyricText = match[3].trim();
        const time = mins * 60 + secs;

        if (lyricText.startsWith('[') && lyricText.endsWith(']')) {
          currentSection = lyricText.slice(1, -1);
        } else if (lyricText) {
          parsedLrc.push({
            id: `line-${idx}`,
            time: Math.round(time * 10) / 10,
            text: lyricText,
            section: currentSection,
          });
        }
      } else if (l.startsWith('[') && l.endsWith(']')) {
        currentSection = l.slice(1, -1);
      }
    });

    if (parsedLrc.length > 0) {
      // Calculate endTimes
      for (let i = 0; i < parsedLrc.length; i++) {
        parsedLrc[i].endTime = i < parsedLrc.length - 1 
          ? parsedLrc[i + 1].time 
          : Math.min(totalDuration, parsedLrc[i].time + 5);
      }
      return parsedLrc;
    }
  }

  const result: KaraokeLyricLine[] = [];
  let currentSection = 'Verse';
  const validLyricLines: { text: string; section: string }[] = [];

  lines.forEach((l) => {
    if (l.startsWith('[') && l.endsWith(']')) {
      currentSection = l.slice(1, -1);
    } else {
      validLyricLines.push({ text: l, section: currentSection });
    }
  });

  if (validLyricLines.length === 0) {
    return [
      { id: 'line-0', time: 0, endTime: totalDuration, text: `♪ ${track.title} ♪`, section: 'Instrumental' }
    ];
  }

  // Distribute lines across song duration leaving intro and outro buffer
  const introBuffer = 5; // 5 seconds intro
  const outroBuffer = 5; // 5 seconds outro
  const usableDuration = Math.max(10, totalDuration - introBuffer - outroBuffer);
  const timePerLine = usableDuration / validLyricLines.length;

  validLyricLines.forEach((item, index) => {
    const startTime = introBuffer + (index * timePerLine);
    const endTime = startTime + timePerLine;
    result.push({
      id: `line-${index}`,
      time: Math.round(startTime * 10) / 10,
      endTime: Math.round(endTime * 10) / 10,
      text: item.text,
      section: item.section,
    });
  });

  return result;
}

// Format seconds into [mm:ss.xx] for LRC
export function formatLrcTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds % 1) * 100);
  return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}]`;
}

// Generate standard LRC string
export function generateLrcContent(track: SunoTrack, lyrics: KaraokeLyricLine[]): string {
  let content = `[ti:${track.title}]\n[ar:${track.artist}]\n[al:Suno AI Studio]\n[by:Suno Audio Studio]\n\n`;

  lyrics.forEach((line) => {
    content += `${formatLrcTimestamp(line.time)}${line.text}\n`;
  });

  return content;
}

// Generate standard SRT subtitle string
export function generateSrtContent(lyrics: KaraokeLyricLine[]): string {
  const formatSrtTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  let content = '';
  lyrics.forEach((line, index) => {
    const end = line.endTime || (line.time + 3);
    content += `${index + 1}\n`;
    content += `${formatSrtTime(line.time)} --> ${formatSrtTime(end)}\n`;
    content += `${line.text}\n\n`;
  });

  return content;
}
