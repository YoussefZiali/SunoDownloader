import React from 'react';
import { Disc3, ShieldCheck, Zap, Sliders, History, Layers, Heart } from 'lucide-react';

interface FooterProps {
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  onOpenBulkImporter?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenSettings,
  onOpenHistory,
  onOpenBulkImporter,
}) => {
  return (
    <footer 
      id="app-global-footer"
      className="w-full mt-16 border-t border-neutral-800/80 bg-[#09090b] text-neutral-400 py-10 px-4 sm:px-6"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Grid: Brand + Quick Links + Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-neutral-800/60">
          
          {/* Brand & Overview */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff2d55] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#ff2d55]/20">
                <Disc3 className="w-4 h-4" />
              </div>
              <span className="font-black text-white text-base tracking-tight">Suno Downloader</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Lossless and high-fidelity Suno song and playlist downloader with 320 kbps MP3 encoding, ID3 tag editing, and batch ZIP archiving.
            </p>
          </div>

          {/* Quick Tools & Utilities */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Quick Utilities
            </h4>
            <div className="flex flex-col gap-2 text-xs">
              {onOpenBulkImporter && (
                <button
                  type="button"
                  onClick={onOpenBulkImporter}
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-left"
                >
                  <Layers className="w-3.5 h-3.5 text-[#ff2d55]" />
                  <span>Bulk Multi-URL Importer</span>
                </button>
              )}
              {onOpenHistory && (
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-left"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download History & Logs</span>
                </button>
              )}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-left"
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Preferences & File Naming</span>
                </button>
              )}
            </div>
          </div>

          {/* Privacy & Engine */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Privacy & Performance
            </h4>
            <div className="space-y-2 text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>100% In-Browser audio transcoding</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Instant 320 kbps MP3 conversion</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-emerald-400 font-medium">All systems operational</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Disclaimer and Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p className="text-center sm:text-left">
            © 2026 Suno Downloader. Not affiliated with or endorsed by Suno, Inc.
          </p>

          <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
            <span>Crafted for high-fidelity audio archiving</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
