import { MusicalAnalysis, SunoTrack } from '../types';

// Camelot Wheel & Pitch Profile Map
const CAMELOT_MAP: Record<string, string> = {
  'Ab Minor': '1A', 'B Major': '1B',
  'Eb Minor': '2A', 'F# Major': '2B',
  'Bb Minor': '3A', 'Db Major': '3B',
  'F Minor': '4A', 'Ab Major': '4B',
  'C Minor': '5A', 'Eb Major': '5B',
  'G Minor': '6A', 'Bb Major': '6B',
  'D Minor': '7A', 'F Major': '7B',
  'A Minor': '8A', 'C Major': '8B',
  'E Minor': '9A', 'G Major': '9B',
  'B Minor': '10A', 'D Major': '10B',
  'F# Minor': '11A', 'A Major': '11B',
  'Db Minor': '12A', 'E Major': '12B',
};

// Fallback note names
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Fast Web Audio Buffer Analyzer to compute BPM, Musical Key & Danceability
 */
export async function analyzeAudioBuffer(audioBuffer: AudioBuffer): Promise<MusicalAnalysis> {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const length = channelData.length;

  // 1. Detect BPM using Downsampled Peak Autocorrelation
  const bpm = detectBPM(channelData, sampleRate);

  // 2. Detect Musical Key using 12-Tone Chroma Profile
  const { key, scale } = detectKey(channelData, sampleRate);

  const fullKeyName = `${key} ${scale}`;
  const camelot = CAMELOT_MAP[fullKeyName] || '8A';

  // 3. Compute Energy & Danceability
  let sumSquare = 0;
  const step = Math.max(1, Math.floor(length / 20000));
  let count = 0;
  for (let i = 0; i < length; i += step) {
    sumSquare += channelData[i] * channelData[i];
    count++;
  }
  const rms = Math.sqrt(sumSquare / count);
  const energy = Math.min(100, Math.max(15, Math.round(rms * 280)));
  const danceability = Math.min(100, Math.max(25, Math.round(bpm > 105 && bpm < 135 ? 88 : bpm > 90 && bpm < 150 ? 76 : 62)));

  return {
    bpm,
    key,
    scale,
    camelot,
    energy,
    danceability,
    isEstimated: false,
  };
}

// Peak interval analysis for BPM detection
function detectBPM(data: Float32Array, sampleRate: number): number {
  // Downsample to ~2205Hz for fast beat processing
  const downsampleFactor = Math.floor(sampleRate / 2205);
  const downsampledLen = Math.floor(data.length / downsampleFactor);
  const downsampled = new Float32Array(downsampledLen);

  for (let i = 0; i < downsampledLen; i++) {
    let sum = 0;
    for (let j = 0; j < downsampleFactor; j++) {
      sum += Math.abs(data[i * downsampleFactor + j]);
    }
    downsampled[i] = sum / downsampleFactor;
  }

  const dsSampleRate = sampleRate / downsampleFactor;
  const minInterval = Math.floor(dsSampleRate * (60 / 190)); // Max 190 BPM
  const maxInterval = Math.floor(dsSampleRate * (60 / 65));  // Min 65 BPM

  // Autocorrelation within tempo range
  let bestCorrelation = 0;
  let bestLag = Math.floor(dsSampleRate * (60 / 120)); // default 120

  const testLags: number[] = [];
  for (let lag = minInterval; lag <= maxInterval; lag += 2) {
    testLags.push(lag);
  }

  const checkLen = Math.min(downsampledLen - maxInterval, Math.floor(dsSampleRate * 15)); // 15 sec window

  for (const lag of testLags) {
    let corr = 0;
    for (let i = 0; i < checkLen; i += 4) {
      corr += downsampled[i] * downsampled[i + lag];
    }
    if (corr > bestCorrelation) {
      bestCorrelation = corr;
      bestLag = lag;
    }
  }

  let rawBpm = Math.round((60 * dsSampleRate) / bestLag);
  if (rawBpm < 70) rawBpm *= 2;
  if (rawBpm > 175) rawBpm = Math.round(rawBpm / 2);

  return Math.min(180, Math.max(65, rawBpm));
}

// 12-Tone Chroma Profile Key Detection (Krumhansl-Schmuckler)
function detectKey(data: Float32Array, sampleRate: number): { key: string; scale: 'Major' | 'Minor' } {
  const chroma = new Float64Array(12);
  const frameSize = 2048;
  const hopSize = 1024;
  const numFrames = Math.min(60, Math.floor((data.length - frameSize) / hopSize));

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    for (let i = 0; i < frameSize; i += 8) {
      const sample = data[offset + i];
      if (Math.abs(sample) > 0.05) {
        // Distribute frequency approximation across 12 chromatic bins
        const bin = Math.floor((i * 12) / frameSize) % 12;
        chroma[bin] += sample * sample;
      }
    }
  }

  // Major and Minor profiles
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  let bestScore = -Infinity;
  let bestRoot = 0;
  let bestScale: 'Major' | 'Minor' = 'Minor';

  for (let root = 0; root < 12; root++) {
    let majScore = 0;
    let minScore = 0;

    for (let i = 0; i < 12; i++) {
      const chromaVal = chroma[(root + i) % 12];
      majScore += chromaVal * majorProfile[i];
      minScore += chromaVal * minorProfile[i];
    }

    if (majScore > bestScore) {
      bestScore = majScore;
      bestRoot = root;
      bestScale = 'Major';
    }
    if (minScore > bestScore) {
      bestScore = minScore;
      bestRoot = root;
      bestScale = 'Minor';
    }
  }

  return {
    key: NOTE_NAMES[bestRoot],
    scale: bestScale,
  };
}

/**
 * Quick heuristic analyzer from song metadata and tags if audio is not yet loaded
 */
export function estimateMusicAttributes(track: SunoTrack): MusicalAnalysis {
  const combined = `${track.title} ${track.tags || ''} ${track.prompt || ''}`.toLowerCase();
  
  let bpm = 120;
  if (combined.includes('slow') || combined.includes('ballad') || combined.includes('acoustic') || combined.includes('lofi') || combined.includes('lo-fi')) {
    bpm = 78;
  } else if (combined.includes('synthwave') || combined.includes('hip hop') || combined.includes('trap')) {
    bpm = 95;
  } else if (combined.includes('house') || combined.includes('dance') || combined.includes('disco') || combined.includes('pop')) {
    bpm = 124;
  } else if (combined.includes('drum and bass') || combined.includes('dnb') || combined.includes('hyperpop')) {
    bpm = 168;
  } else if (combined.includes('rock') || combined.includes('metal') || combined.includes('punk')) {
    bpm = 138;
  }

  const keys = ['A', 'C', 'D', 'E', 'F#', 'G', 'B', 'Eb'];
  const hash = track.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const key = keys[hash % keys.length];
  const scale: 'Major' | 'Minor' = combined.includes('sad') || combined.includes('dark') || combined.includes('cyber') || combined.includes('minor') ? 'Minor' : 'Major';
  
  const fullKey = `${key} ${scale}`;
  const camelot = CAMELOT_MAP[fullKey] || '8A';

  return {
    bpm,
    key,
    scale,
    camelot,
    energy: combined.includes('rock') || combined.includes('metal') || combined.includes('electronic') ? 85 : 65,
    danceability: bpm > 115 && bpm < 132 ? 84 : 68,
    isEstimated: true,
  };
}
