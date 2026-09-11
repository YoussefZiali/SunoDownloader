import React, { useState } from 'react';
import { X, Layers, Download, Loader2, Trash2, CheckCircle2, AlertTriangle, Disc, ArrowRight, Sparkles, FolderArchive, Lock } from 'lucide-react';
import { SunoTrack, AudioFormat, UserSettings } from '../types';

interface MultiUrlImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadBatchZip: (tracks: SunoTrack[], format: AudioFormat) => Promise<void>;
  onDownloadTrack: (track: SunoTrack, format: AudioFormat, options?: any) => Promise<void>;
  settings: UserSettings;
  onSelectTrackForPlayer?: (track: SunoTrack) => void;
}

export const MultiUrlImporterModal: React.FC<MultiUrlImporterModalProps> = ({
  isOpen,
  onClose,
  onDownloadBatchZip,
  onDownloadTrack,
  settings,
  onSelectTrackForPlayer,
}) => {
  const [inputText, setInputText] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [queuedTracks, setQueuedTracks] = useState<SunoTrack[]>([]);
  const [resolveErrors, setResolveErrors] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<AudioFormat>(settings.defaultFormat || 'mp3');
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [downloadStep, setDownloadStep] = useState<string>('');

  if (!isOpen) return null;

  const handleParseAndQueue = async () => {
    if (!inputText.trim()) return;
    setIsResolving(true);
    setResolveErrors([]);

    // Split by newlines, commas, or spaces
    const rawLines = inputText
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 5);

    if (rawLines.length === 0) {
      setResolveErrors(['Please paste at least one valid Suno URL or link.']);
      setIsResolving(false);
      return;
    }

    try {
      const res = await fetch('/api/suno/resolve-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: rawLines }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const newTracks: SunoTrack[] = [];
      const errors: string[] = [];

      for (const item of data.results || []) {
        if (item.success) {
          if (item.type === 'song' && item.track) {
            newTracks.push(item.track);
          } else if (item.type === 'playlist' && item.playlist?.tracks) {
            newTracks.push(...item.playlist.tracks);
          }
        } else {
          errors.push(item.error || `Could not resolve: ${item.url}`);
        }
      }

      // Deduplicate by track ID
      const existingIds = new Set(queuedTracks.map((t) => t.id));
      const filteredNew = newTracks.filter((t) => !existingIds.has(t.id));

      setQueuedTracks((prev) => [...prev, ...filteredNew]);
      setResolveErrors(errors);
      setInputText('');
    } catch (err: any) {
      setResolveErrors([err.message || 'Failed to process URLs']);
    } finally {
      setIsResolving(false);
    }
  };

  const removeTrackFromQueue = (trackId: string) => {
    setQueuedTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const handleDownloadAllZip = async () => {
    if (queuedTracks.length === 0) return;
    setIsBatchDownloading(true);
    setDownloadStep(`Packaging ${queuedTracks.length} tracks into ZIP...`);
    try {
      await onDownloadBatchZip(queuedTracks, selectedFormat);
    } catch (err: any) {
      alert(`Batch download failed: ${err.message}`);
    } finally {
      setIsBatchDownloading(false);
      setDownloadStep('');
    }
  };

  const handleDownloadIndividualAll = async () => {
    if (queuedTracks.length === 0) return;
    setIsBatchDownloading(true);
    try {
      const nameOccurrences = new Map<string, number>();
      for (let i = 0; i < queuedTracks.length; i++) {
        const track = queuedTracks[i];
        const trackKey = `${(track.artist || 'Suno').trim().toLowerCase()}:::${(track.title || 'Untitled').trim().toLowerCase()}`;
        const duplicateIndex = (nameOccurrences.get(trackKey) || 0) + 1;
        nameOccurrences.set(trackKey, duplicateIndex);

        const dupSuffix = duplicateIndex > 1 ? ` (${duplicateIndex})` : '';
        setDownloadStep(`Downloading ${i + 1}/${queuedTracks.length}: ${track.title}${dupSuffix}...`);
        await onDownloadTrack(track, selectedFormat, { duplicateIndex });
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err: any) {
      alert(`Download error: ${err.message}`);
    } finally {
      setIsBatchDownloading(false);
      setDownloadStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div 
        className="w-full max-w-2xl bg-[#0e0f13] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        id="multi-url-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff2d55]/20 to-amber-500/20 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Bulk URL Importer</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Batch Mode
                </span>
              </div>
              <p className="text-xs text-neutral-400">Queue up to 50 Suno song or playlist links for one-click export</p>
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* URL Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="multi-url-textarea" className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Paste Suno URLs (one per line)
              </label>
              <button
                type="button"
                onClick={() => setInputText(`https://suno.com/song/386ddb56-4c28-4a77-a0ad-2aad565ac22c\nhttps://suno.com/song/b1d4c208-1f19-4f76-809f-6821d3f9261a\nhttps://suno.com/s/sample-track`)}
                className="text-xs text-[#ff2d55] hover:text-[#ff436b] transition-colors"
              >
                Insert Sample Links
              </button>
            </div>
            <textarea
              id="multi-url-textarea"
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="https://suno.com/song/...\nhttps://suno.com/s/...\nhttps://suno.com/playlist/..."
              className="w-full p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-[#ff2d55] text-xs font-mono text-neutral-200 placeholder:text-neutral-600 outline-none transition-all resize-none shadow-inner"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">
                Supports song links, short share links (/s/), and public playlists
              </span>
              <button
                id="parse-bulk-links-btn"
                type="button"
                onClick={handleParseAndQueue}
                disabled={isResolving || !inputText.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#e02649] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#ff2d55]/20"
              >
                {isResolving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Resolving Links...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Parse & Queue Tracks
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resolve Errors */}
          {resolveErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Notice
              </div>
              {resolveErrors.map((err, i) => (
                <div key={i} className="text-[11px] text-amber-300/80">{err}</div>
              ))}
            </div>
          )}

          {/* Queued Tracks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Batch Queue
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-[#ff2d55] text-xs font-mono font-bold">
                  {queuedTracks.length} tracks
                </span>
              </div>
              {queuedTracks.length > 0 && (
                <button
                  onClick={() => setQueuedTracks([])}
                  className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {queuedTracks.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-neutral-800 text-center space-y-2">
                <Disc className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
                <p className="text-xs text-neutral-400">No songs in the bulk queue yet.</p>
                <p className="text-[11px] text-neutral-600">Paste your Suno links above and hit "Parse & Queue".</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {queuedTracks.map((track, idx) => (
                  <div
                    key={track.id}
                    className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800/80 flex items-center justify-between hover:border-neutral-700 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-neutral-500 w-5 text-right">{idx + 1}</span>
                      <img
                        src={track.image_url}
                        alt={track.title}
                        className="w-10 h-10 rounded-lg object-cover bg-neutral-800 shrink-0 border border-neutral-800"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                        <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-neutral-400">{track.duration_formatted}</span>
                      {onSelectTrackForPlayer && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTrackForPlayer(track);
                            onClose();
                          }}
                          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300 transition-colors"
                        >
                          Load
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTrackFromQueue(track.id)}
                        className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export Options */}
          {queuedTracks.length > 0 && (
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Target Audio Format
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

              {downloadStep && (
                <div className="p-2.5 rounded-lg bg-[#ff2d55]/10 border border-[#ff2d55]/30 text-xs text-[#ff2d55] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">{downloadStep}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  id="bulk-download-zip-btn"
                  onClick={handleDownloadAllZip}
                  disabled={isBatchDownloading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#d61d44] hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-[#ff2d55]/20"
                >
                  <FolderArchive className="w-4 h-4" />
                  Download All as {selectedFormat.toUpperCase()} ZIP
                </button>
                <button
                  type="button"
                  id="bulk-download-individual-btn"
                  onClick={handleDownloadIndividualAll}
                  disabled={isBatchDownloading}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-neutral-700"
                >
                  <Download className="w-4 h-4" />
                  Download Individually
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800/80 bg-neutral-900/30 flex items-center justify-between text-xs text-neutral-500">
          <span>Engine: High-fidelity multi-stream processor</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
