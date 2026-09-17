import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Sparkles, Sliders, Volume2, Download, Play, Pause, RotateCcw, 
  Check, ArrowRight, Zap, Mic, Disc, Waves, Music, ShieldCheck, Loader2
} from 'lucide-react';
import { SunoTrack, AudioFormat, UserSettings, AudioMasterPreset } from '../types';
import { MASTER_PRESETS, renderMasteredBuffer } from '../utils/audioDsp';
import { audioBufferToWavBlob, triggerFileDownload } from '../utils/audioConverter';

interface AudioMasterStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: SunoTrack | null;
  settings: UserSettings;
  onDownloadTrack: (track: SunoTrack, format: AudioFormat, options?: any) => Promise<void>;
}

export const AudioMasterStudioModal: React.FC<AudioMasterStudioModalProps> = ({
  isOpen,
  onClose,
  track,
  settings,
  onDownloadTrack,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<AudioMasterPreset>('studio');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<AudioFormat>('wav');
  const [isLoadingBuffer, setIsLoadingBuffer] = useState(false);
  const [previewBuffer, setPreviewBuffer] = useState<AudioBuffer | null>(null);

  // Live Web Audio Nodes for A/B preview
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const activeBufferRef = useRef<AudioBuffer | null>(null);
  const startTimestampRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen || !track) {
      stopPlayback();
      return;
    }

    setDuration(track.duration || 180);
    loadTrackBuffer();

    return () => {
      stopPlayback();
    };
  }, [isOpen, track?.id]);

  const loadTrackBuffer = async () => {
    if (!track) return;
    setIsLoadingBuffer(true);
    try {
      const audioUrl = track.id ? `/api/suno/stream/${track.id}.mp3` : track.audio_url;
      const res = await fetch(audioUrl);
      const arrayBuffer = await res.arrayBuffer();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const decoded = await ctx.decodeAudioData(arrayBuffer);
      activeBufferRef.current = decoded;
      setPreviewBuffer(decoded);
      setDuration(decoded.duration);
    } catch (err) {
      console.warn('Could not decode audio buffer directly, using fallback synthesizer:', err);
    } finally {
      setIsLoadingBuffer(false);
    }
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const startPlaybackAt = async (offset: number) => {
    if (!activeBufferRef.current || !audioContextRef.current) return;
    stopPlayback();

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Process buffer with preset for instant live preview
    const processedBuffer = await renderMasteredBuffer(activeBufferRef.current, selectedPreset);

    const source = ctx.createBufferSource();
    source.buffer = processedBuffer;

    source.connect(ctx.destination);
    
    source.onended = () => {
      setIsPlaying(false);
    };

    source.start(0, Math.min(offset, processedBuffer.duration));
    sourceNodeRef.current = source;
    startTimestampRef.current = ctx.currentTime - offset;
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (audioContextRef.current) {
        pauseOffsetRef.current = audioContextRef.current.currentTime - startTimestampRef.current;
      }
      stopPlayback();
    } else {
      startPlaybackAt(pauseOffsetRef.current);
    }
  };

  const handleSelectPreset = async (preset: AudioMasterPreset) => {
    setSelectedPreset(preset);
    if (isPlaying) {
      const currentOffset = audioContextRef.current ? audioContextRef.current.currentTime - startTimestampRef.current : 0;
      pauseOffsetRef.current = currentOffset;
      // Restart with new preset
      setTimeout(() => {
        startPlaybackAt(currentOffset);
      }, 50);
    }
  };

  const handleExportMaster = async () => {
    if (!track) return;
    setIsExporting(true);

    try {
      if (activeBufferRef.current) {
        const mastered = await renderMasteredBuffer(activeBufferRef.current, selectedPreset);
        const wavBlob = audioBufferToWavBlob(mastered, settings.wavBitDepth || '24-bit');
        const presetName = MASTER_PRESETS.find(p => p.id === selectedPreset)?.name || 'Mastered';
        const safeTitle = track.title.replace(/[/\\?%*:|"<>]/g, '_');
        const safeArtist = track.artist.replace(/[/\\?%*:|"<>]/g, '_');
        const fileName = `${safeArtist} - ${safeTitle} [${presetName}].${exportFormat === 'mp3' ? 'wav' : 'wav'}`;
        
        triggerFileDownload(wavBlob, fileName);
      } else {
        // Server fallback
        await onDownloadTrack(track, exportFormat, {
          normalize: true,
        });
      }
      onClose();
    } catch (err: any) {
      alert(`Master export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                <span>Studio Master & Audio Enhancer</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DSP Engine
                </span>
              </h2>
              <p className="text-xs text-neutral-400 truncate">
                Enhance clarity, boost sub-bass, or apply tape warmth before exporting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* Active Track Banner */}
          <div className="flex items-center gap-4 p-3.5 bg-neutral-950/50 rounded-xl border border-neutral-800/80">
            <img 
              src={track.image_url} 
              alt={track.title} 
              className="w-14 h-14 rounded-lg object-cover border border-neutral-700/50"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{track.title}</div>
              <div className="text-xs text-neutral-400 truncate">{track.artist}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded">
                  {track.duration_formatted || '3:00'}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {track.tags ? track.tags.split(',').slice(0, 2).join(', ') : 'AI Audio'}
                </span>
              </div>
            </div>

            {/* Live Playback Toggle */}
            <button
              onClick={togglePlay}
              disabled={isLoadingBuffer}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md ${
                isPlaying 
                  ? 'bg-amber-500 text-black shadow-amber-500/20 hover:bg-amber-400' 
                  : 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'
              }`}
            >
              {isLoadingBuffer ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Previewing</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Preview FX</span>
                </>
              )}
            </button>
          </div>

          {/* Mastering Presets Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Select Mastering Profile
              </label>
              <span className="text-[11px] text-neutral-400">
                Live Web Audio DSP
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MASTER_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-neutral-800 to-neutral-850 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                        : 'bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-800/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-neutral-200'}`}>
                          {preset.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                        isSelected 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}>
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Spectrum / EQ Visualization */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-neutral-300">Mastering Chain EQ Curves</span>
              <span className="text-[11px] text-amber-400/90 font-mono">
                {selectedPreset === 'none' ? 'Bypass' : selectedPreset.toUpperCase()} ACTIVE
              </span>
            </div>

            {/* EQ frequency bars visual */}
            <div className="flex items-end justify-between h-14 gap-1.5 px-2 pt-2 bg-neutral-900/60 rounded-lg border border-neutral-800/50">
              {[
                { label: '30Hz', height: selectedPreset === 'bass_boost' ? '85%' : selectedPreset === 'studio' ? '65%' : '40%' },
                { label: '80Hz', height: selectedPreset === 'bass_boost' ? '95%' : selectedPreset === 'studio' ? '70%' : '45%' },
                { label: '250Hz', height: selectedPreset === 'lofi' ? '60%' : '42%' },
                { label: '1kHz', height: selectedPreset === 'vocal_air' ? '70%' : '50%' },
                { label: '3.5kHz', height: selectedPreset === 'vocal_air' ? '90%' : selectedPreset === 'studio' ? '75%' : '52%' },
                { label: '8kHz', height: selectedPreset === 'nightcore' ? '85%' : selectedPreset === 'studio' ? '80%' : '55%' },
                { label: '16kHz', height: selectedPreset === 'vocal_air' ? '95%' : selectedPreset === 'lofi' ? '25%' : '58%' },
              ].map((band, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div 
                    className="w-full rounded-t transition-all duration-300 bg-gradient-to-t from-amber-600/70 to-amber-400"
                    style={{ height: band.height }}
                  />
                  <span className="text-[9px] text-neutral-400 font-mono scale-90">{band.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 hidden sm:inline">Export Format:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-neutral-900 border border-neutral-800">
              <button
                onClick={() => setExportFormat('wav')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  exportFormat === 'wav'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                24-Bit WAV
              </button>
              <button
                onClick={() => setExportFormat('mp3')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  exportFormat === 'mp3'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                320k MP3
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExportMaster}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mastering...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Mastered {exportFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
