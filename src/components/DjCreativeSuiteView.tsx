import React, { useState } from 'react';
import { 
  Radio, Disc, Sparkles, Sliders, Mic, Orbit, Video, 
  Play, Pause, Download, Layers, Music, ArrowRight, Wand2, Activity
} from 'lucide-react';
import { SunoTrack } from '../types';

interface DjCreativeSuiteViewProps {
  track: SunoTrack | null;
  allTracks: SunoTrack[];
  onOpenMashup: (track: SunoTrack) => void;
  onOpenAutoDj: (tracks: SunoTrack[]) => void;
  onOpenSpatial8D: (track: SunoTrack) => void;
  onOpenKaraoke: (track: SunoTrack) => void;
  onOpenVideoMaker: (track: SunoTrack) => void;
  onOpenPromptExtractor: (track: SunoTrack) => void;
  onOpenStudioDaw: (track: SunoTrack) => void;
}

export const DjCreativeSuiteView: React.FC<DjCreativeSuiteViewProps> = ({
  track,
  allTracks,
  onOpenMashup,
  onOpenAutoDj,
  onOpenSpatial8D,
  onOpenKaraoke,
  onOpenVideoMaker,
  onOpenPromptExtractor,
  onOpenStudioDaw,
}) => {
  const currentTrack = track || allTracks[0];

  return (
    <div className="w-full min-h-screen bg-[#0d0d0f] text-neutral-100 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Top Creative Suite Banner */}
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900/80 to-neutral-900 border border-neutral-800 shadow-xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Performance & Creator Hub
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
              6 Creative Engines
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Syne']">
            DJ Performance & Creative Suite
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Create real-time stem mashups, generate continuous Camelot harmonic DJ sets, render 360° 8D binaural spatial audio, sing in cinema karaoke mode, and export 60fps social visualizers.
          </p>
        </div>

        {/* Creative Tools Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Tool 1: Dual-Deck Stem Mashup Remixer */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-[#ff2d55]/60 transition-all shadow-lg flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#ff2d55]/20 text-[#ff2d55] flex items-center justify-center border border-[#ff2d55]/30">
                <Disc className="w-6 h-6 animate-[spin_10s_linear_infinite]" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-[#ff2d55] transition-colors">
                Dual-Deck Stem Mashup Remixer
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Mix Vocals from Deck A over Beats from Deck B in real time with interactive crossfader, pitch shifting, and tempo sync.
              </p>
            </div>
            <button
              onClick={() => onOpenMashup(currentTrack)}
              className="mt-5 w-full py-3 rounded-2xl bg-neutral-800 hover:bg-[#ff2d55] text-neutral-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Launch Mashup Remixer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tool 2: Harmonic Auto-DJ Continuous Set */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-amber-400/60 transition-all shadow-lg flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                Harmonic Auto-DJ Continuous Set
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Sequence your music library using Camelot harmonic keys (e.g. 8A → 9A) with 8-bar crossfades and download a continuous .CUE set.
              </p>
            </div>
            <button
              onClick={() => onOpenAutoDj(allTracks)}
              className="mt-5 w-full py-3 rounded-2xl bg-neutral-800 hover:bg-amber-500 hover:text-black text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Generate Auto-DJ Mixset</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tool 3: 360° 8D Spatial Binaural Audio */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-indigo-400/60 transition-all shadow-lg flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Orbit className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                360° 8D Spatial Binaural Audio
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Simulate 3D orbital headphone panning with customizable rotational velocity and room convolution reverb.
              </p>
            </div>
            <button
              onClick={() => onOpenSpatial8D(currentTrack)}
              className="mt-5 w-full py-3 rounded-2xl bg-neutral-800 hover:bg-indigo-600 text-neutral-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Launch 8D Spatial Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tool 4: Karaoke Cinema Teleprompter */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-emerald-400/60 transition-all shadow-lg flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                Karaoke Cinema Teleprompter
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Full-screen synchronized lyrics teleprompter with live microphone input monitor, vocal pitch feedback, and .LRC export.
              </p>
            </div>
            <button
              onClick={() => onOpenKaraoke(currentTrack)}
              className="mt-5 w-full py-3 rounded-2xl bg-neutral-800 hover:bg-emerald-600 text-neutral-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Open Cinema Karaoke</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tool 5: 60fps Social Video Reel Maker */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-pink-400/60 transition-all shadow-lg flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">
                Social Video Visualizer Maker
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Render 60fps audio-reactive visualizer videos (9:16 vertical for TikTok/Shorts, 1:1 Square, 16:9 Landscape) with animated waveforms.
              </p>
            </div>
            <button
              onClick={() => onOpenVideoMaker(currentTrack)}
              className="mt-5 w-full py-3 rounded-2xl bg-neutral-800 hover:bg-pink-600 text-neutral-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Export Social Video</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tool 6: Prompt & Style DNA Extractor */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-purple-400/60 transition-all shadow-lg flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Wand2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                Prompt & Style DNA Extractor
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Deconstruct Suno generative prompts, lyric structures, meta tags, and instruments to reuse in your own AI music workflow.
              </p>
            </div>
            <button
              onClick={() => onOpenPromptExtractor(currentTrack)}
              className="mt-5 w-full py-3 rounded-2xl bg-neutral-800 hover:bg-purple-600 text-neutral-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Inspect Prompt DNA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
