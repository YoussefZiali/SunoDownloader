import React, { useState } from 'react';
import { 
  Zap, Disc, Sparkles, Layers, Download, CheckCircle2, 
  AlertCircle, Clipboard, Scissors, Tag, FileText, Wand2, 
  FolderArchive, ArrowRight, Play, Loader2
} from 'lucide-react';
import { SunoTrack, AudioFormat, UserSettings, BatchDownloadStatus } from '../types';
import { BatchProgressBar } from './BatchProgressBar';

interface SunoCoreIngestViewProps {
  onFetchUrl: (urlOrId: string) => Promise<void>;
  isLoadingUrl: boolean;
  errorMessage: string | null;
  onOpenBulkImporter: () => void;
  onOpenTrimmer: (track: SunoTrack) => void;
  onOpenMetadataEditor: (track: SunoTrack) => void;
  onOpenPromptExtractor: (track: SunoTrack) => void;
  onOpenStudioDaw: (track: SunoTrack) => void;
  currentTrack: SunoTrack | null;
  onQuickDownload: (track: SunoTrack, format: AudioFormat) => void;
  batchStatus?: BatchDownloadStatus;
  onCancelBatchZip?: () => void;
}

export const SunoCoreIngestView: React.FC<SunoCoreIngestViewProps> = ({
  onFetchUrl,
  isLoadingUrl,
  errorMessage,
  onOpenBulkImporter,
  onOpenTrimmer,
  onOpenMetadataEditor,
  onOpenPromptExtractor,
  onOpenStudioDaw,
  currentTrack,
  onQuickDownload,
  batchStatus,
  onCancelBatchZip,
}) => {
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onFetchUrl(urlInput.trim());
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrlInput(text.trim());
    } catch {}
  };

  return (
    <div className="w-full min-h-screen bg-[#0d0d0f] text-neutral-100 pb-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        
        {/* Ingest Console Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ff2d55] to-amber-500 shadow-xl shadow-[#ff2d55]/20 mb-1">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-['Syne']">
            Suno Core Ingest & Stream Engine
          </h1>
          
          <p className="text-neutral-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Resolve any Suno song link, playlist URL, or track ID into lossless 48kHz audio streams, prompt DNA, and multi-format DAW stems.
          </p>
        </div>

        {/* Universal URL Resolver Form */}
        <div className="p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://suno.com/song/... or playlist URL"
                  className="w-full px-4 py-3.5 bg-neutral-950 border border-neutral-800 focus:border-[#ff2d55] rounded-2xl text-xs sm:text-sm text-white placeholder:text-neutral-500 font-mono outline-none transition-all"
                />
                {urlInput && (
                  <button
                    type="button"
                    onClick={() => setUrlInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-3.5 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Clipboard className="w-4 h-4" />
                  <span>Paste</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoadingUrl || !urlInput.trim()}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#ff2d55] to-[#e02649] hover:from-[#ff3d63] hover:to-[#eb3154] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#ff2d55]/25 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {isLoadingUrl ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Ingest Track</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>

          {/* Quick Format & Ingest Options */}
          <div className="flex items-center justify-between pt-2 text-xs text-neutral-400 border-t border-neutral-800/80">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Direct Suno CDN stream resolution
            </span>
            <button
              onClick={onOpenBulkImporter}
              className="text-[#ff2d55] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Multi-URL Importer</span>
            </button>
          </div>
        </div>

        {/* Batch Status Bar */}
        {batchStatus && batchStatus.isActive && (
          <BatchProgressBar
            batchStatus={batchStatus}
            onCancel={onCancelBatchZip || (() => {})}
          />
        )}

        {/* Ingested Track Card (If track is active) */}
        {currentTrack && (
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#ff2d55]">
                Active Ingested Stream
              </span>
              <button
                onClick={() => onOpenStudioDaw(currentTrack)}
                className="text-xs font-bold text-white hover:text-[#ff2d55] flex items-center gap-1 cursor-pointer"
              >
                <span>Launch in DAW Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={currentTrack.image_url}
                alt={currentTrack.title}
                className="w-16 h-16 rounded-2xl object-cover shadow-md"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-white truncate">{currentTrack.title}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{currentTrack.artist}</p>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                  <span>Model {currentTrack.model || 'v4'}</span>
                  <span>•</span>
                  <span>{currentTrack.duration_formatted}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQuickDownload(currentTrack, 'mp3')}
                  className="px-4 py-2 rounded-xl bg-[#ff2d55] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP3</span>
                </button>
              </div>
            </div>

            {/* Ingest Tools Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <button
                onClick={() => onOpenPromptExtractor(currentTrack)}
                className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Wand2 className="w-4 h-4 text-purple-400" />
                <span>Prompt DNA</span>
              </button>

              <button
                onClick={() => onOpenMetadataEditor(currentTrack)}
                className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Tag className="w-4 h-4 text-[#ff2d55]" />
                <span>ID3 Tags</span>
              </button>

              <button
                onClick={() => onOpenTrimmer(currentTrack)}
                className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Scissors className="w-4 h-4 text-amber-400" />
                <span>Audio Trimmer</span>
              </button>

              <button
                onClick={() => onOpenStudioDaw(currentTrack)}
                className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Disc className="w-4 h-4 text-emerald-400" />
                <span>DAW Mastering</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
