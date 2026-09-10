// Web Audio Synthesizer for instant preview playback & offline demo rendering

class SoundEngine {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private activeTrackId: string | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Generate pleasant genre-specific musical audio buffer
  public generateTrackAudioBuffer(genre: string, durationSec: number = 20): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    const numChannels = 2;
    const totalSamples = sampleRate * durationSec;
    const buffer = ctx.createBuffer(numChannels, totalSamples, sampleRate);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Chords / notes based on genre
    const chords = genre.includes('r&b') || genre.includes('soul') 
      ? [220, 261.63, 329.63, 392.0] // Am7
      : genre.includes('rock') 
      ? [146.83, 220, 293.66, 370] // D power
      : genre.includes('synth') || genre.includes('electronic')
      ? [130.81, 164.81, 196.0, 246.94] // Cmaj7
      : [174.61, 220, 261.63, 349.23]; // Fmaj

    const beatInterval = sampleRate * 0.5; // 120 bpm

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beatProgress = (i % beatInterval) / beatInterval;
      
      // Kick & Snare rhythm
      const isKick = (Math.floor(i / beatInterval) % 2 === 0);
      const drumDecay = Math.exp(-beatProgress * (isKick ? 15 : 25));
      const drumSound = isKick ? Math.sin(t * 120 * Math.PI) * drumDecay * 0.4 : (Math.random() * 2 - 1) * drumDecay * 0.2;

      // Harmony
      const chordNote = chords[Math.floor(t * 1.5) % chords.length];
      const melody = Math.sin(t * chordNote * 2 * Math.PI) * 0.15;
      const subBass = Math.sin(t * (chords[0] / 2) * 2 * Math.PI) * 0.2;

      const sample = (drumSound + melody + subBass) * 0.6;

      // Slight stereo spread
      left[i] = sample;
      right[i] = sample * (0.85 + 0.15 * Math.sin(t * 2));
    }

    return buffer;
  }

  public playTrackPreview(trackId: string, genre: string = '', onEnded?: () => void) {
    this.stop();
    const ctx = this.getContext();
    const buffer = this.generateTrackAudioBuffer(genre, 30);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);

    source.connect(gain);
    gain.connect(ctx.destination);

    source.onended = () => {
      this.isPlaying = false;
      this.activeTrackId = null;
      onEnded?.();
    };

    source.start(0);
    this.currentSource = source;
    this.gainNode = gain;
    this.isPlaying = true;
    this.activeTrackId = trackId;
  }

  public stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // ignore
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.activeTrackId = null;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getActiveTrackId(): string | null {
    return this.activeTrackId;
  }
}

export const soundEngine = new SoundEngine();
