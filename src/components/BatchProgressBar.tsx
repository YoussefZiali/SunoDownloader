import React from 'react';
import { 
  FolderArchive, CheckCircle2, Loader2, X, FileAudio, 
  Sparkles, Check, Disc3, ArrowRight, AlertTriangle
} from 'lucide-react';
import { BatchDownloadStatus } from '../types';

interface BatchProgressBarProps {
  batchStatus?: BatchDownloadStatus;
  onCancel?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const BatchProgressBar: React.FC<BatchProgressBarProps> = ({
  batchStatus,
  onCancel,
  className = '',
  isCompact = false,
}) => {
  if (!batchStatus || !batchStatus.isActive) return null;

  const {
    phase,
    percent,
    totalTracks,
    completedTracks,
    currentTrackTitle,
    currentTrackArtist,
    error,
  } = batchStatus;

  const isConverting = phase === 'converting';
  const isZipping = phase === 'zipping';
  const isDone = phase === 'done';
  const isError = phase === 'error';

  // Determine stage states
  const stage1State = isConverting ? 'active' : (isZipping || isDone) ? 'completed' : 'waiting';
  const stage2State = isZipping ? 'active' : isDone ? 'completed' : 'waiting';

  if (isCompact) {
    return (
      <div className={`p-3.5 rounded-2xl bg-neutral-900/95 border border-[#ff2d55]/40 shadow-xl backdrop-blur-md space-y-2.5 ${className}`}>
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {isZipping ? (
              <FolderArchive className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            ) : isDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-[#ff2d55] animate-spin shrink-0" />
            )}
            <span className="font-bold text-white truncate">
              {isZipping ? 'Stage 2: Packaging ZIP...' : isDone ? 'Batch Complete!' : `Converting (${completedTracks + 1}/${totalTracks})`}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono font-bold text-[#ff2d55]">{percent}%</span>
            {onCancel && !isDone && (
              <button
                onClick={onCancel}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                title="Cancel batch"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Linear Bar */}
        <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-[#ff2d55] via-pink-500 to-amber-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-[#ff2d55]/40 shadow-2xl shadow-black/60 space-y-4 relative overflow-hidden backdrop-blur-md ${className}`}
      id="batch-download-progress-container"
    >
      {/* Background Accent Gradient Glow */}
      <div 
        className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #ff2d55 0%, #f59e0b 100%)' }}
      />

      {/* Top Header Row: Status Icon, Title, and Main Controls */}
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#ff2d55]/15 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55] shrink-0 shadow-inner">
            {isZipping ? (
              <FolderArchive className="w-6 h-6 text-amber-400 animate-pulse" />
            ) : isDone ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : isError ? (
              <AlertTriangle className="w-6 h-6 text-red-400" />
            ) : (
              <Disc3 className="w-6 h-6 text-[#ff2d55] animate-spin" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#ff2d55] px-2 py-0.5 rounded-md bg-[#ff2d55]/15 border border-[#ff2d55]/25">
                Batch Download Manager
              </span>
              <span className="text-xs font-semibold text-neutral-400">
                {totalTracks} Tracks (MP3 320 kbps)
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white mt-1 truncate">
              {isZipping
                ? 'Stage 2: Compressing & Assembling ZIP Archive...'
                : isDone
                ? 'Batch Download Complete!'
                : isError
                ? error || 'Batch Download Encountered an Error'
                : `Stage 1: Converting Song ${Math.min(totalTracks, completedTracks + 1)} of ${totalTracks}`}
            </h3>
          </div>
        </div>

        {/* Right side: Big percentage pill and cancel button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-950 border border-[#ff2d55]/40 text-white font-mono font-black text-sm sm:text-base flex items-center gap-1.5 shadow-md">
            <span className="text-[#ff2d55]">{percent}%</span>
          </div>

          {onCancel && !isDone && (
            <button
              onClick={onCancel}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Stop and cancel batch export"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Linear Progress Bar */}
      <div className="space-y-1.5 relative z-10">
        <div className="relative w-full h-4 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 p-0.5 shadow-inner">
          {/* Animated Gradient Bar */}
          <div
            className="h-full bg-gradient-to-r from-[#ff2d55] via-pink-500 to-amber-400 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{ width: `${Math.max(3, percent)}%` }}
          >
            {/* Pulsing light sheen on the bar */}
            {!isDone && (
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            )}
          </div>

          {/* Stage divider line at 80% mark (Audio Conversion -> ZIP Packaging) */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-neutral-700 pointer-events-none z-10 opacity-70"
            style={{ left: '80%' }}
            title="Stage Transition (Conversion to ZIP Packaging)"
          />
        </div>

        {/* Milestone labels underneath bar */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 px-1">
          <span>0%</span>
          <span className="text-neutral-400 hidden sm:inline">80% Audio Transcoded</span>
          <span>100% ZIP Saved</span>
        </div>
      </div>

      {/* Two-Stage Linear Stepper Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10 pt-1">
        
        {/* STAGE 1: Audio Conversion */}
        <div className={`p-3 rounded-2xl border transition-all ${
          stage1State === 'active'
            ? 'bg-[#ff2d55]/10 border-[#ff2d55]/40 text-white shadow-sm'
            : stage1State === 'completed'
            ? 'bg-neutral-950 border-emerald-800/60 text-neutral-300'
            : 'bg-neutral-950 border-neutral-800/80 text-neutral-500'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <FileAudio className={`w-4 h-4 shrink-0 ${
                stage1State === 'active' ? 'text-[#ff2d55]' : stage1State === 'completed' ? 'text-emerald-400' : 'text-neutral-500'
              }`} />
              <span className="text-xs font-extrabold truncate">Stage 1: Audio Transcoding</span>
            </div>
            
            {stage1State === 'completed' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                <Check className="w-2.5 h-2.5" />
                Done
              </span>
            ) : stage1State === 'active' ? (
              <span className="px-2 py-0.5 rounded-full bg-[#ff2d55]/20 border border-[#ff2d55]/40 text-[#ff2d55] text-[10px] font-bold flex items-center gap-1 shrink-0 animate-pulse">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Encoding
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-neutral-600">Pending</span>
            )}
          </div>

          <p className="text-[11px] text-neutral-400 line-clamp-1">
            {stage1State === 'completed'
              ? `All ${totalTracks} songs converted to MP3 320 kbps.`
              : isConverting
              ? currentTrackTitle 
                ? `Active: ${currentTrackTitle} ${currentTrackArtist ? `(${currentTrackArtist})` : ''}`
                : `Transcoding audio tracks (${completedTracks}/${totalTracks})...`
              : 'Encoding Suno audio tracks with ID3 metadata.'}
          </p>

          <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>{completedTracks} of {totalTracks} tracks</span>
            <span className="text-neutral-400">MP3 320 kbps</span>
          </div>
        </div>

        {/* STAGE 2: ZIP Compression */}
        <div className={`p-3 rounded-2xl border transition-all ${
          stage2State === 'active'
            ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-sm'
            : stage2State === 'completed'
            ? 'bg-neutral-950 border-emerald-800/60 text-neutral-300'
            : 'bg-neutral-950 border-neutral-800/80 text-neutral-500'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <FolderArchive className={`w-4 h-4 shrink-0 ${
                stage2State === 'active' ? 'text-amber-400' : stage2State === 'completed' ? 'text-emerald-400' : 'text-neutral-500'
              }`} />
              <span className="text-xs font-extrabold truncate">Stage 2: Archive Packaging</span>
            </div>

            {stage2State === 'completed' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                <Check className="w-2.5 h-2.5" />
                Packaged
              </span>
            ) : stage2State === 'active' ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 shrink-0 animate-pulse">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Zipping
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-neutral-600">Waiting</span>
            )}
          </div>

          <p className="text-[11px] text-neutral-400 line-clamp-1">
            {stage2State === 'completed'
              ? 'ZIP archive generated and downloaded directly to browser.'
              : isZipping
              ? 'Packing clean MP3 tracks into single ZIP file (no images)...'
              : 'Deflates and packages audio files once all tracks are converted.'}
          </p>

          <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>Audio Only Archive</span>
            <span className="text-neutral-400">Clean .zip format</span>
          </div>
        </div>
      </div>

      {/* Footer Info Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-xs text-neutral-400 relative z-10">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="text-neutral-300">
            {isDone
              ? 'Finished! Download has been triggered.'
              : isZipping
              ? 'Finalizing ZIP bundle container...'
              : `Transcoding: ${currentTrackTitle || 'Preparing songs...'}`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-neutral-500">
          <span>Clean Audio Only</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">Auto-Triggered Download</span>
        </div>
      </div>
    </div>
  );
};
