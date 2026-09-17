import { Spatial8DSettings } from '../types';

export function createSyntheticImpulse(
  ctx: BaseAudioContext,
  duration = 2.0,
  decay = 2.0
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = length - i;
    const factor = Math.pow(n / length, decay);
    left[i] = (Math.random() * 2 - 1) * factor;
    right[i] = (Math.random() * 2 - 1) * factor;
  }

  return impulse;
}

export interface SpatialPannerNodeChain {
  input: GainNode;
  output: GainNode;
  panner: StereoPannerNode;
  filter: BiquadFilterNode;
  convolver: ConvolverNode;
  dryGain: GainNode;
  wetGain: GainNode;
  updatePosition: (angleRad: number) => void;
}

export function createSpatial8DChain(
  ctx: AudioContext | BaseAudioContext,
  settings: Spatial8DSettings
): SpatialPannerNodeChain {
  const input = ctx.createGain();
  const output = ctx.createGain();

  // Stereo Panner
  const panner = (ctx as AudioContext).createStereoPanner ? (ctx as AudioContext).createStereoPanner() : (ctx as any).createPanner();
  if (panner.pan) {
    panner.pan.value = 0;
  }

  // Lowpass filter simulating head shadow effect (sound behind listener gets slightly muffled)
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 20000;

  // Reverb space simulation
  const convolver = ctx.createConvolver();
  convolver.buffer = createSyntheticImpulse(ctx, 1.8, 2.5);
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();

  dryGain.gain.value = 1.0;
  wetGain.gain.value = settings.reverbAmount * 0.4;

  // Signal graph: input -> filter -> panner -> dryGain -> output
  //                                       \-> convolver -> wetGain -> output
  input.connect(filter);
  filter.connect(panner);

  panner.connect(dryGain);
  panner.connect(convolver);

  convolver.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  const updatePosition = (angleRad: number) => {
    // angle 0 is front, PI/2 is right, PI is back, 3PI/2 is left
    const panVal = Math.sin(angleRad) * Math.min(1, settings.stereoWidth);
    if (panner.pan) {
      panner.pan.value = Math.max(-1, Math.min(1, panVal));
    }

    // Behind head dampening
    const isBehind = Math.cos(angleRad) < 0;
    const behindDepth = Math.abs(Math.cos(angleRad));
    if (isBehind) {
      filter.frequency.value = 20000 - (behindDepth * 8000); // dips to 12kHz
    } else {
      filter.frequency.value = 20000;
    }
  };

  return {
    input,
    output,
    panner,
    filter,
    convolver,
    dryGain,
    wetGain,
    updatePosition,
  };
}

// Render full 8D AudioBuffer offline for downloading
export async function renderSpatial8DBuffer(
  sourceBuffer: AudioBuffer,
  settings: Spatial8DSettings,
  onProgress?: (progress: number) => void
): Promise<AudioBuffer> {
  const sampleRate = sourceBuffer.sampleRate;
  const length = sourceBuffer.length;
  const numChannels = 2; // Always stereo for 8D

  const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate);

  const srcNode = offlineCtx.createBufferSource();
  srcNode.buffer = sourceBuffer;

  const chain = createSpatial8DChain(offlineCtx as unknown as AudioContext, settings);

  srcNode.connect(chain.input);
  chain.output.connect(offlineCtx.destination);

  // Automate panning parameter across duration
  const period = Math.max(4, settings.speedSeconds);
  const totalSeconds = sourceBuffer.duration;
  const numSteps = Math.ceil(totalSeconds * 20); // 20 updates per sec

  for (let i = 0; i <= numSteps; i++) {
    const t = (i / numSteps) * totalSeconds;
    const angle = (t / period) * Math.PI * 2;
    const panVal = Math.sin(angle) * Math.min(1, settings.stereoWidth);
    
    if (chain.panner.pan) {
      chain.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal)), t);
    }
  }

  srcNode.start(0);

  if (onProgress) onProgress(30);

  const renderedBuffer = await offlineCtx.startRendering();
  if (onProgress) onProgress(100);

  return renderedBuffer;
}
