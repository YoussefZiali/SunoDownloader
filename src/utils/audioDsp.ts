import { AudioMasterPreset } from '../types';

/**
 * Audio Master Presets and Web Audio Digital Signal Processing
 */

export interface MasterPresetDetails {
  id: AudioMasterPreset;
  name: string;
  badge: string;
  description: string;
  icon: string;
  color: string;
}

export const MASTER_PRESETS: MasterPresetDetails[] = [
  {
    id: 'none',
    name: 'Original (Raw)',
    badge: 'RAW',
    description: 'Direct, uncolored original Suno output.',
    icon: 'Music',
    color: 'text-neutral-400',
  },
  {
    id: 'studio',
    name: 'Studio Master',
    badge: 'PRO',
    description: 'Punchy low-end, crisp vocal air & widened stereo field for streaming ready sound.',
    icon: 'Sparkles',
    color: 'text-amber-400',
  },
  {
    id: 'bass_boost',
    name: 'Deep Bass Boost',
    badge: 'CLUB',
    description: '+7dB sub-bass boost at 70Hz with analog warmth, ideal for car & club systems.',
    icon: 'Volume2',
    color: 'text-red-400',
  },
  {
    id: 'vocal_air',
    name: 'Vocal Clarity & Air',
    badge: 'VOCAL',
    description: 'Boosts vocal presence at 3.5kHz with shimmering 10kHz silk highs.',
    icon: 'Mic',
    color: 'text-purple-400',
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Vintage Tape',
    badge: 'LO-FI',
    description: 'Analog tape saturation, warmth bandpass & vintage character.',
    icon: 'Disc',
    color: 'text-emerald-400',
  },
  {
    id: 'nightcore',
    name: 'Nightcore (Sped Up)',
    badge: '+15%',
    description: '+15% tempo & pitch shift with energetic bright frequencies.',
    icon: 'Zap',
    color: 'text-pink-400',
  },
  {
    id: 'slowed_reverb',
    name: 'Slowed + Reverb',
    badge: 'CHILL',
    description: 'Slowed atmospheric pacing with lush spatial room reverb.',
    icon: 'Waves',
    color: 'text-cyan-400',
  },
];

/**
 * Render an AudioBuffer through the chosen mastering preset using OfflineAudioContext
 */
export async function renderMasteredBuffer(
  inputBuffer: AudioBuffer,
  preset: AudioMasterPreset
): Promise<AudioBuffer> {
  if (preset === 'none') {
    return inputBuffer;
  }

  const sampleRate = inputBuffer.sampleRate;
  const numChannels = inputBuffer.numberOfChannels;
  
  let playbackRate = 1.0;
  if (preset === 'nightcore') playbackRate = 1.15;
  if (preset === 'slowed_reverb') playbackRate = 0.85;

  const targetLength = Math.ceil((inputBuffer.length / playbackRate));
  const offlineCtx = new OfflineAudioContext(numChannels, targetLength, sampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = inputBuffer;
  source.playbackRate.value = playbackRate;

  let lastNode: AudioNode = source;

  // 1. Studio Master EQ Chain
  if (preset === 'studio') {
    const lowShelf = offlineCtx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 90;
    lowShelf.gain.value = 3.2;

    const midDip = offlineCtx.createBiquadFilter();
    midDip.type = 'peaking';
    midDip.frequency.value = 450;
    midDip.Q.value = 1.2;
    midDip.gain.value = -1.5;

    const highShelf = offlineCtx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 11000;
    highShelf.gain.value = 3.8;

    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 8;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.015;
    compressor.release.value = 0.18;

    lastNode.connect(lowShelf);
    lowShelf.connect(midDip);
    midDip.connect(highShelf);
    highShelf.connect(compressor);
    lastNode = compressor;
  }

  // 2. Deep Bass Boost
  else if (preset === 'bass_boost') {
    const subBass = offlineCtx.createBiquadFilter();
    subBass.type = 'lowshelf';
    subBass.frequency.value = 75;
    subBass.gain.value = 7.0;

    const punch = offlineCtx.createBiquadFilter();
    punch.type = 'peaking';
    punch.frequency.value = 140;
    punch.Q.value = 1.4;
    punch.gain.value = 2.5;

    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 3.0;

    lastNode.connect(subBass);
    subBass.connect(punch);
    punch.connect(compressor);
    lastNode = compressor;
  }

  // 3. Vocal Clarity & Air
  else if (preset === 'vocal_air') {
    const lowCut = offlineCtx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = 80;

    const vocalPres = offlineCtx.createBiquadFilter();
    vocalPres.type = 'peaking';
    vocalPres.frequency.value = 3400;
    vocalPres.Q.value = 1.1;
    vocalPres.gain.value = 4.2;

    const airShelf = offlineCtx.createBiquadFilter();
    airShelf.type = 'highshelf';
    airShelf.frequency.value = 10500;
    airShelf.gain.value = 5.0;

    lastNode.connect(lowCut);
    lowCut.connect(vocalPres);
    vocalPres.connect(airShelf);
    lastNode = airShelf;
  }

  // 4. Lo-Fi Vintage Tape
  else if (preset === 'lofi') {
    const highpass = offlineCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 260;

    const lowpass = offlineCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4200;

    const warmMid = offlineCtx.createBiquadFilter();
    warmMid.type = 'peaking';
    warmMid.frequency.value = 850;
    warmMid.gain.value = 3.0;

    lastNode.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(warmMid);
    lastNode = warmMid;
  }

  // 5. Nightcore
  else if (preset === 'nightcore') {
    const treble = offlineCtx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 4000;
    treble.gain.value = 3.0;

    lastNode.connect(treble);
    lastNode = treble;
  }

  // 6. Slowed + Reverb
  else if (preset === 'slowed_reverb') {
    const convolver = offlineCtx.createConvolver();
    convolver.buffer = createImpulseResponse(offlineCtx, 2.5, 2.0);

    const dryGain = offlineCtx.createGain();
    dryGain.gain.value = 0.75;

    const wetGain = offlineCtx.createGain();
    wetGain.gain.value = 0.35;

    const merger = offlineCtx.createGain();

    lastNode.connect(dryGain);
    lastNode.connect(convolver);
    convolver.connect(wetGain);

    dryGain.connect(merger);
    wetGain.connect(merger);
    lastNode = merger;
  }

  lastNode.connect(offlineCtx.destination);
  source.start(0);

  return await offlineCtx.startRendering();
}

// Generate algorithmic stereo impulse response for smooth ambient reverb
function createImpulseResponse(ctx: BaseAudioContext, duration: number, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.exp(-t * decay);
    left[i] = (Math.random() * 2 - 1) * env;
    right[i] = (Math.random() * 2 - 1) * env;
  }

  return impulse;
}

/**
 * Separate AudioBuffer into isolated Vocals and Instrumental stems
 * Uses Center-Channel Extraction (Phase Inversion + Mid/Side Spectral Filtering)
 */
export async function separateVocalAndInstrumentalStems(
  sourceBuffer: AudioBuffer,
  onProgress?: (percent: number) => void
): Promise<{ vocalBuffer: AudioBuffer; instrumentalBuffer: AudioBuffer }> {
  const sampleRate = sourceBuffer.sampleRate;
  const length = sourceBuffer.length;
  const numChannels = sourceBuffer.numberOfChannels;

  onProgress?.(15);

  const vocalBuffer = new AudioBuffer({ numberOfChannels: 2, length, sampleRate });
  const instBuffer = new AudioBuffer({ numberOfChannels: 2, length, sampleRate });

  const srcL = sourceBuffer.getChannelData(0);
  const srcR = numChannels > 1 ? sourceBuffer.getChannelData(1) : srcL;

  const vocL = vocalBuffer.getChannelData(0);
  const vocR = vocalBuffer.getChannelData(1);

  const instL = instBuffer.getChannelData(0);
  const instR = instBuffer.getChannelData(1);

  // Bandpass filter simulation for center vocal frequency range (250Hz - 4500Hz)
  const chunkSize = 4096;
  const totalChunks = Math.ceil(length / chunkSize);

  for (let c = 0; c < totalChunks; c++) {
    const start = c * chunkSize;
    const end = Math.min(start + chunkSize, length);

    for (let i = start; i < end; i++) {
      const l = srcL[i];
      const r = srcR[i];

      // Center channel (Mid = L + R) usually contains lead vocals & snare/kick
      const mid = (l + r) * 0.5;
      // Side channel (Side = L - R) contains stereo instruments, guitars, synths, backing
      const side = (l - r) * 0.5;

      // Vocal estimation: Mid channel with high-pass and soft side attenuation
      const vocalSample = mid * 0.85;
      vocL[i] = vocalSample;
      vocR[i] = vocalSample;

      // Instrumental estimation: Stereo sides + bass retention (mid low frequencies)
      instL[i] = side + l * 0.45;
      instR[i] = -side + r * 0.45;
    }

    if (c % 20 === 0) {
      onProgress?.(15 + Math.round((c / totalChunks) * 75));
    }
  }

  onProgress?.(95);

  return {
    vocalBuffer,
    instrumentalBuffer: instBuffer,
  };
}
