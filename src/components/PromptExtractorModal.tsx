import React, { useState } from 'react';
import { 
  X, Sparkles, Copy, Check, Tag, Music, ListMusic, 
  Layers, ArrowRight, Share2, FileText, Download 
} from 'lucide-react';
import { SunoTrack } from '../types';
import { triggerFileDownload } from '../utils/audioConverter';

interface PromptExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: SunoTrack | null;
}

export const PromptExtractorModal: React.FC<PromptExtractorModalProps> = ({
  isOpen,
  onClose,
  track,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedFormula, setCopiedFormula] = useState(false);

  if (!isOpen || !track) return null;

  const rawTags = (track.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const promptLines = (track.prompt || '').split('\n').map((l) => l.trim()).filter(Boolean);

  // Categorize tags
  const genreTags: string[] = [];
  const moodTags: string[] = [];
  const instrumentTags: string[] = [];
  const vocalTags: string[] = [];

  rawTags.forEach((t) => {
    const lower = t.toLowerCase();
    if (lower.includes('vocal') || lower.includes('voice') || lower.includes('male') || lower.includes('female') || lower.includes('choir') || lower.includes('duet')) {
      vocalTags.push(t);
    } else if (lower.includes('guitar') || lower.includes('piano') || lower.includes('synth') || lower.includes('drum') || lower.includes('bass') || lower.includes('strings') || lower.includes('brass')) {
      instrumentTags.push(t);
    } else if (lower.includes('dark') || lower.includes('happy') || lower.includes('epic') || lower.includes('chill') || lower.includes('energetic') || lower.includes('sad') || lower.includes('nostalgic')) {
      moodTags.push(t);
    } else {
      genreTags.push(t);
    }
  });

  const structuredFormula = `[Genre / Style: ${genreTags.join(', ') || 'Electronic Pop'}]\n[Vocal Style: ${vocalTags.join(', ') || 'Clean emotive vocals'}]\n[Instruments: ${instrumentTags.join(', ') || 'Synth pads, acoustic guitar, driving kick'}]\n[Mood: ${moodTags.join(', ') || 'Atmospheric, driving tempo'}]\n[Model: Suno v4/v3.5]`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(track.prompt || track.tags || '');
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyFormula = () => {
    navigator.clipboard.writeText(structuredFormula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  const handleDownloadRecipe = () => {
    const content = `SUNO AI SONG RECIPE & PROMPT FORMULA\n` +
      `===================================\n` +
      `Track: ${track.title}\n` +
      `Artist: ${track.artist}\n` +
      `URL: https://suno.com/song/${track.id}\n\n` +
      `STYLE TAGS:\n${track.tags || 'N/A'}\n\n` +
      `PROMPT / LYRICS:\n${track.prompt || 'N/A'}\n\n` +
      `STRUCTURED FORMULA:\n${structuredFormula}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const safeTitle = track.title.replace(/[/\\?%*:|"<>]/g, '_');
    triggerFileDownload(blob, `${safeTitle} (Suno Recipe).txt`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 lg:p-6 bg-black/90 backdrop-blur-2xl animate-fadeIn">
      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] max-w-2xl bg-neutral-900 md:border border-neutral-800 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Sticky Header with Safe-Area Inset */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-3.5 sm:p-5 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-xl shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                <span>Prompt & Style Recipe</span>
              </h2>
              <p className="text-xs text-neutral-400 truncate">
                Inspect AI musical DNA, style tags, and reuse formulas on Suno
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Prompt Recipe"
            className="p-2 sm:p-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-all shrink-0 cursor-pointer shadow-md flex items-center justify-center border border-neutral-700 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 custom-scrollbar pb-[max(2rem,env(safe-area-inset-bottom))]">
          
          {/* Song Overview */}
          <div className="flex items-center gap-4 p-4 bg-neutral-950 rounded-xl border border-neutral-800">
            <img 
              src={track.image_url} 
              alt={track.title} 
              className="w-14 h-14 rounded-lg object-cover border border-neutral-700"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{track.title}</h3>
              <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
              <span className="inline-block text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded mt-1">
                {track.model || 'Suno v3.5 / v4'}
              </span>
            </div>
          </div>

          {/* Categorized Tag DNA */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Analyzed Musical DNA Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {rawTags.length > 0 ? (
                rawTags.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="text-xs px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-neutral-400 italic">No specific style tags listed for this track.</span>
              )}
            </div>
          </div>

          {/* Structured Formula Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Suno Prompt Formula (Copy & Paste Ready)
              </label>
              <button
                onClick={handleCopyFormula}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                {copiedFormula ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFormula ? 'Copied Formula!' : 'Copy Formula'}</span>
              </button>
            </div>

            <pre className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-300 font-mono whitespace-pre-wrap leading-relaxed">
              {structuredFormula}
            </pre>
          </div>

          {/* Lyrics / Structure Preview */}
          {track.prompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Full Prompt & Lyrics
                </label>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Copied!' : 'Copy Prompt'}</span>
                </button>
              </div>

              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-300 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed custom-scrollbar">
                {track.prompt}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between gap-4">
          <button
            onClick={handleDownloadRecipe}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3.5 py-2 rounded-xl transition-all border border-neutral-700"
          >
            <Download className="w-3.5 h-3.5" />
            Download Recipe (.TXT)
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
