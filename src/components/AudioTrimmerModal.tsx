import React, { useState, useEffect, useRef } from 'react';
import { X, Scissors, Play, Pause, Download, RotateCcw, Volume2, Sparkles, Loader2, Check, Lock } from 'lucide-react';
import { SunoTrack, AudioFormat, UserSettings } from '../types';

interface AudioTrimmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: SunoTrack;
  settings: UserSettings;
  onExportClip: (
    track: SunoTrack,
    format: AudioFormat,
    startTime: number,
    endTime: number,
    normalize: boolean
  ) => Promise<void>;
  isExporting: boolean;
}

export const AudioTrimmerModal: React.FC<AudioTrimmerModalProps> = ({
  isOpen,
  onClose,
  track,
  settings,
  onExportClip,
  isExporting,
}) => {
  const totalDuration = Math.max(10, Math.round(track.duration || 180));
  
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Math.min(30, totalDuration));
  const [selectedFormat, setSelectedFormat] = useState<AudioFormat>(settings.defaultFormat || 'mp3');
  const [normalize, setNormalize] = useState(settings.volumeNormalization || false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setStartTime(0);
    setEndTime(Math.min(30, totalDuration));
    setIsPlayingPreview(false);
    setPreviewTime(0);
  }, [track.id, totalDuration]);

  // Audio setup
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingPreview(false);
      return;
    }

    const audio = new Audio(`/api/suno/stream/${track.id}.mp3`);
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setPreviewTime(audio.currentTime);
      if (audio.currentTime >= endTime) {
        audio.pause();
        audio.currentTime = startTime;
        setIsPlayingPreview(false);
      }
    };

    const onEnded = () => {
      setIsPlayingPreview(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, [isOpen, track.id, endTime, startTime]);

  if (!isOpen) return null;

  const togglePlayPreview = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlayingPreview) {
      audio.pause();
      setIsPlayingPreview(false);
    } else {
      if (audio.currentTime < startTime || audio.currentTime >= endTime) {
        audio.currentTime = startTime;
      }
      audio.play().catch(() => {});
      setIsPlayingPreview(true);
    }
  };

  const handleApplyPreset = (durationSec: number, offsetStart = 0) => {
    const s = Math.min(offsetStart, totalDuration - 5);
    const e = Math.min(s + durationSec, totalDuration);
    setStartTime(s);
    setEndTime(e);
    if (audioRef.current) {
      audioRef.current.currentTime = s;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const clipLength = Math.max(1, Math.round(endTime - startTime));

  const handleExport = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    }
    await onExportClip(track, selectedFormat, startTime, endTime, normalize);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div 
        className="w-full max-w-lg bg-[#0e0f14] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 text-white"
        id="audio-trimmer-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff2d55]/20 to-amber-500/20 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Audio Trimmer & Ringtone Clipper</h2>
              <p className="text-xs text-neutral-400 truncate max-w-[280px]">
                {track.title} • {track.artist}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Waveform timeline preview */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-neutral-400">
                Range: <strong className="text-white">{formatSeconds(startTime)}</strong> to <strong className="text-white">{formatSeconds(endTime)}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#ff2d55]/15 border border-[#ff2d55]/30 text-[#ff2d55] text-xs font-mono font-bold">
                Length: {clipLength}s
              </span>
            </div>

            {/* Visual Timeline Bar */}
            <div className="relative h-12 bg-neutral-900 rounded-lg overflow-hidden flex items-center px-1">
              {/* Fake waveform bars */}
              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-30 pointer-events-none">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-neutral-400"
                    style={{ height: `${20 + ((i * 17) % 70)}%` }}
                  />
                ))}
              </div>

              {/* Selected highlight zone */}
              <div
                className="absolute top-0 bottom-0 bg-[#ff2d55]/30 border-l-2 border-r-2 border-[#ff2d55]"
                style={{
                  left: `${(startTime / totalDuration) * 100}%`,
                  width: `${((endTime - startTime) / totalDuration) * 100}%`,
                }}
              />

              {/* Playhead position */}
              {isPlayingPreview && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow-sm"
                  style={{ left: `${(previewTime / totalDuration) * 100}%` }}
                />
              )}
            </div>

            {/* Sliders for Start & End */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-3 text-xs">
                <span className="w-12 text-neutral-400 font-mono">Start</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, endTime - 1)}
                  value={startTime}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStartTime(val);
                    if (audioRef.current) audioRef.current.currentTime = val;
                  }}
                  className="flex-1 accent-[#ff2d55]"
                />
                <span className="w-12 text-right font-mono font-bold">{formatSeconds(startTime)}</span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="w-12 text-neutral-400 font-mono">End</span>
                <input
                  type="range"
                  min={startTime + 1}
                  max={totalDuration}
                  value={endTime}
                  onChange={(e) => setEndTime(Number(e.target.value))}
                  className="flex-1 accent-[#ff2d55]"
                />
                <span className="w-12 text-right font-mono font-bold">{formatSeconds(endTime)}</span>
              </div>
            </div>

            {/* Preview play button */}
            <button
              type="button"
              onClick={togglePlayPreview}
              className="w-full py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-bold flex items-center justify-center gap-2 text-neutral-200 transition-colors"
            >
              {isPlayingPreview ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-[#ff2d55]" />
                  Pause Preview Loop
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#ff2d55]" />
                  Play Clipped Range ({formatSeconds(startTime)} - {formatSeconds(endTime)})
                </>
              )}
            </button>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Quick Length Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: '15s Intro', duration: 15, offset: 0 },
                { label: '30s Hook', duration: 30, offset: 30 },
                { label: '45s Chorus', duration: 45, offset: 45 },
                { label: '60s Ringtone', duration: 60, offset: 15 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p.duration, p.offset)}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 transition-colors text-center"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export Format & Loudness Normalization */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Clip Audio Format
              </span>
              <div className="flex gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800 items-center">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('mp3')}
                  className="px-2.5 py-1 text-xs font-bold rounded uppercase transition-all bg-[#ff2d55] text-white shadow-sm"
                >
                  MP3
                </button>
                <button
                  type="button"
                  disabled
                  className="px-2 py-1 text-[10px] font-bold rounded uppercase transition-all text-neutral-500 opacity-60 cursor-not-allowed flex items-center gap-1"
                  title="WAV format coming soon"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>WAV</span>
                </button>
                <button
                  type="button"
                  disabled
                  className="px-2 py-1 text-[10px] font-bold rounded uppercase transition-all text-neutral-500 opacity-60 cursor-not-allowed flex items-center gap-1"
                  title="FLAC format coming soon"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>FLAC</span>
                </button>
              </div>
            </div>

            {/* Loudness Normalization Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#ff2d55]" />
                  Volume Normalization (-14 LUFS)
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Normalizes ringtone / snippet loudness to standard mobile ringtone volume
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNormalize(!normalize)}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                  normalize ? 'bg-[#ff2d55]' : 'bg-neutral-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    normalize ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="export-clipped-audio-btn"
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#d61d44] hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-[#ff2d55]/20"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Encoding Clip...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Export {clipLength}s {selectedFormat.toUpperCase()} Clip
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
