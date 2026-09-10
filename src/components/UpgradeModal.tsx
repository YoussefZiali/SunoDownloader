import React from 'react';
import { X, Crown, Check, Sparkles, Zap, ShieldCheck } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const benefits = [
    '24-bit Lossless Studio WAV Conversion (Linear PCM)',
    'Unlimited Batch Downloads & Instant .ZIP Packaging',
    'Full Playlist Grabber with 1-Click Extraction',
    'Official MP4 Moving Visualizer Video Downloads',
    'Time-Synced .LRC & Plain .TXT Lyrics Exporter',
    '100% Free & Client-Side Studio Performance',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div 
        id="upgrade-modal-sheet"
        className="w-full max-w-md bg-neutral-950 text-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 border border-neutral-800"
      >
        <div className="relative p-6 text-center overflow-hidden">
          {/* Ambient background glow */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-br from-amber-500/30 to-[#ff2d55]/30 rounded-full blur-2xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-neutral-950 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
            <Crown className="w-6 h-6 fill-neutral-950" />
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">Suno Studio Master</h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
            High-fidelity uncompressed sound conversion directly from Suno AI generations.
          </p>

          <div className="mt-6 space-y-2 text-left">
            {benefits.map((b, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-neutral-200">{b}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 py-3.5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-xs uppercase tracking-wide transition-all shadow-lg active:scale-95"
          >
            Unlocked & Ready (Enjoy Free)
          </button>
        </div>
      </div>
    </div>
  );
};
