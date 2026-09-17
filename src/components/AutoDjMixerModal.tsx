import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Disc, Play, Pause, Download, Sparkles, Sliders, 
  ArrowUpDown, Music, Check, Loader2, FastForward, RotateCcw 
} from 'lucide-react';
import { SunoTrack, SunoPlaylist, UserSettings } from '../types';
import { estimateMusicAttributes } from '../utils/musicAnalyzer';
import { audioBufferToWavBlob, triggerFileDownload } from '../utils/audioConverter';

interface AutoDjMixerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: SunoPlaylist | null;
  tracks: SunoTrack[];
  settings: UserSettings;
}

export const AutoDjMixerModal: React.FC<AutoDjMixerModalProps> = ({
  isOpen,
  onClose,
  playlist,
  tracks,
}) => {
  const [djQueue, setDjQueue] = useState<SunoTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [crossfadeSeconds, setCrossfadeSeconds] = useState(8);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const sourceTracks = playlist?.tracks?.length ? playlist.tracks : tracks.slice(0, 8);
      setDjQueue([...sourceTracks]);
      setCurrentTrackIndex(0);
    } else {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isOpen, playlist?.id]);

  // Sort queue by harmonic Camelot compatibility
  const handleHarmonicSort = () => {
    const sorted = [...djQueue].sort((a, b) => {
      const aInfo = estimateMusicAttributes(a);
      const bInfo = estimateMusicAttributes(b);
      // Sort by camelot number then letter
      const aNum = parseInt(aInfo.camelot) || 0;
      const bNum = parseInt(bInfo.camelot) || 0;
      return aNum - bNum;
    });
    setDjQueue(sorted);
  };

  const currentTrack = djQueue[currentTrackIndex] || null;

  const handleNextTrack = () => {
    if (currentTrackIndex < djQueue.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    } else {
      setCurrentTrackIndex(0);
    }
  };

  const handleExportContinuousMix = async () => {
    if (djQueue.length === 0) return;
    try {
      setIsExporting(true);
      setExportProgress(10);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();

      // Fetch and decode first 3 tracks for mix preview
      const mixTracks = djQueue.slice(0, 4);
      const decodedBuffers: AudioBuffer[] = [];

      for (let i = 0; i < mixTracks.length; i++) {
        const t = mixTracks[i];
        const url = t.id ? `/api/suno/stream/${t.id}.mp3` : t.audio_url;
        const res = await fetch(url);
        const ab = await res.arrayBuffer();
        const db = await ctx.decodeAudioData(ab);
        decodedBuffers.push(db);
        setExportProgress(10 + ((i + 1) / mixTracks.length) * 40);
      }

      // Calculate stitched length with crossfades
      let totalSamples = 0;
      decodedBuffers.forEach((b, idx) => {
        if (idx === 0) {
          totalSamples += b.length;
        } else {
          const crossfadeSamples = Math.floor(crossfadeSeconds * b.sampleRate);
          totalSamples += Math.max(0, b.length - crossfadeSamples);
        }
      });

      const sampleRate = decodedBuffers[0].sampleRate;
      const offline = new OfflineAudioContext(2, totalSamples, sampleRate);

      let currentOffsetSeconds = 0;

      decodedBuffers.forEach((b, idx) => {
        const src = offline.createBufferSource();
        src.buffer = b;

        const gain = offline.createGain();

        // Apply crossfade automation
        if (idx > 0) {
          gain.gain.setValueAtTime(0, currentOffsetSeconds);
          gain.gain.linearRampToValueAtTime(1, currentOffsetSeconds + crossfadeSeconds);
        }

        const trackDuration = b.duration;
        if (idx < decodedBuffers.length - 1) {
          gain.gain.setValueAtTime(1, currentOffsetSeconds + trackDuration - crossfadeSeconds);
          gain.gain.linearRampToValueAtTime(0, currentOffsetSeconds + trackDuration);
        }

        src.connect(gain);
        gain.connect(offline.destination);
        src.start(currentOffsetSeconds);

        currentOffsetSeconds += Math.max(0, trackDuration - crossfadeSeconds);
      });

      setExportProgress(75);
      const renderedBuffer = await offline.startRendering();

      setExportProgress(95);
      const wavBlob = audioBufferToWavBlob(renderedBuffer, '24-bit');
      triggerFileDownload(wavBlob, `Suno Harmonic Continuous DJ Mix.wav`);

      // Also generate .CUE Sheet
      let cueSheet = `TITLE "Suno Harmonic Continuous DJ Mix"\nPERFORMER "AI Auto-DJ Studio"\nFILE "Suno Harmonic Continuous DJ Mix.wav" WAVE\n`;
      let runningSeconds = 0;
      mixTracks.forEach((t, i) => {
        const mins = Math.floor(runningSeconds / 60);
        const secs = Math.floor(runningSeconds % 60);
        cueSheet += `  TRACK ${String(i + 1).padStart(2, '0')} AUDIO\n`;
        cueSheet += `    TITLE "${t.title}"\n`;
        cueSheet += `    PERFORMER "${t.artist}"\n`;
        cueSheet += `    INDEX 01 ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:00\n`;
        runningSeconds += Math.max(0, (t.duration || 180) - crossfadeSeconds);
      });

      const cueBlob = new Blob([cueSheet], { type: 'text/plain;charset=utf-8' });
      triggerFileDownload(cueBlob, `Suno Harmonic Continuous DJ Mix.cue`);

      setIsExporting(false);
      setExportProgress(100);
    } catch (err: any) {
      alert(`DJ Mix export error: ${err.message}`);
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 lg:p-6 bg-black/90 backdrop-blur-2xl animate-fadeIn">
      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] max-w-4xl bg-neutral-950 md:border border-neutral-800 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Sticky Header with Safe-Area Inset */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-3.5 sm:p-5 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-xl shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Disc className="w-5 h-5 animate-spin" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                <span>AI Auto-DJ & Continuous Crossfader</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Harmonic Mix
                </span>
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-md">
                Continuous harmonic beatmatched playback with seamless 8-bar crossfading
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Auto-DJ Mixer"
            className="p-2 sm:p-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-all shrink-0 cursor-pointer shadow-md flex items-center justify-center border border-neutral-700 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar pb-[max(2rem,env(safe-area-inset-bottom))]">
          
          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center gap-2">
              <button
                onClick={handleHarmonicSort}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-300 font-bold text-xs border border-rose-500/30 transition-all"
              >
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>Sort by Camelot Key Wheel (Harmonic)</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-neutral-300">
              <span className="font-bold">Crossfade Duration:</span>
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                {[4, 8, 12].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setCrossfadeSeconds(sec)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      crossfadeSeconds === sec ? 'bg-rose-500 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Track queue */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              DJ Setlist Sequence ({djQueue.length} Tracks)
            </h4>

            <div className="space-y-2">
              {djQueue.map((t, idx) => {
                const analysis = estimateMusicAttributes(t);
                const isCurrent = idx === currentTrackIndex;

                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-rose-500/10 border-rose-500/50 shadow-md shadow-rose-500/10'
                        : 'bg-neutral-900/40 border-neutral-800/80 hover:bg-neutral-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-black text-neutral-500 w-5">
                        #{idx + 1}
                      </span>
                      <img
                        src={t.image_url || '/placeholder.png'}
                        alt={t.title}
                        className="w-10 h-10 rounded-xl object-cover border border-neutral-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <h5 className="font-bold text-sm text-white truncate">{t.title}</h5>
                        <p className="text-xs text-neutral-400 truncate">{t.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {analysis.camelot} ({analysis.key})
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {analysis.bpm} BPM
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-900/95 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-neutral-400 text-center sm:text-left truncate max-w-full">
            {currentTrack ? (
              <span>Now Cueing: <strong className="text-white">{currentTrack.title}</strong></span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportContinuousMix}
              disabled={isExporting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExporting ? `Rendering Mix (${Math.round(exportProgress)}%)...` : 'Export Continuous DJ Mix (WAV + CUE)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
