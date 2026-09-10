import React from 'react';
import { 
  X, Check, Sliders, Music, FileAudio, Sparkles, Volume2, 
  CheckSquare, FolderTree, Lock, Clock, CheckCircle2, Trash2, Database 
} from 'lucide-react';
import { UserSettings, AudioFormat, WavBitDepth, Mp3Bitrate, NamingPattern } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  historyCount?: number;
  onClearHistory?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  historyCount,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const formats: { value: AudioFormat; label: string; desc: string; isLocked?: boolean }[] = [
    { value: 'mp3', label: 'MP3', desc: 'Universal 320 kbps with embedded song cover art and metadata', isLocked: false },
    { value: 'wav', label: 'WAV', desc: 'Lossless studio master audio (uncompressed 24-Bit PCM)', isLocked: true },
    { value: 'flac', label: 'FLAC', desc: 'Lossless compressed bit-perfect audio format', isLocked: true },
    { value: 'aac', label: 'AAC / M4A', desc: 'Apple standard advanced audio coding container', isLocked: true },
    { value: 'ogg', label: 'OGG Vorbis', desc: 'Open source compressed audio container', isLocked: true },
  ];

  const namingPatterns: { value: NamingPattern; label: string }[] = [
    { value: '{artist} - {title}', label: 'Artist - Title (e.g. Raymond - Dancing With My Eyes Closed.mp3)' },
    { value: '{title}', label: 'Title only (e.g. Dancing With My Eyes Closed.mp3)' },
    { value: '{artist} - {title} ({id})', label: 'Artist - Title (ID) (e.g. Raymond - Dancing With My Eyes Closed (226ef91f).mp3)' },
    { value: '{title} [{tags}]', label: 'Title [Tags] (e.g. Dancing With My Eyes Closed [pop, electro].mp3)' },
  ];

  const zipStructures = [
    { value: 'flat' as const, label: 'Standard Flat', desc: 'All files placed directly in root archive' },
    { value: 'artist_folder' as const, label: 'By Artist Folder', desc: 'Organized into subfolders: /Artist Name/Track.mp3' },
    { value: 'format_folder' as const, label: 'By Format Folder', desc: 'Organized into subfolders: /MP3/Track.mp3' },
  ];

  const batchFormats: AudioFormat[] = ['mp3'];

  const toggleBatchFormat = (fmt: AudioFormat) => {
    if (fmt !== 'mp3') return;
    onUpdateSettings({ ...settings, batchFormats: ['mp3'] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 text-white">
      <div 
        className="w-full max-w-lg bg-[#0e0f14] border border-neutral-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200"
        id="settings-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff2d55]/20 to-amber-500/20 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Audio & Export Preferences</h2>
              <p className="text-xs text-neutral-400">Formats, master bit depth, naming and ZIP organization</p>
            </div>
          </div>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1 text-sm">
          
          {/* Section: Preferred File Format */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#ff2d55]" />
                Default Download Format
              </label>
              <span className="text-[11px] text-neutral-500 font-medium">MP3 active</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {formats.map((f) => {
                const isSelected = settings.defaultFormat === f.value;
                const isLocked = f.isLocked;

                return (
                  <button
                    key={f.value}
                    id={`format-option-${f.value}`}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      if (!isLocked) {
                        onUpdateSettings({ ...settings, defaultFormat: f.value });
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isLocked
                        ? 'border-neutral-800/80 bg-neutral-950/40 opacity-60 cursor-not-allowed text-neutral-400'
                        : isSelected
                        ? 'border-[#ff2d55] bg-[#ff2d55]/10 text-white shadow-sm ring-1 ring-[#ff2d55]/40'
                        : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/60 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="font-bold text-sm text-white">{f.label}</span>
                      {isLocked ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          Coming Soon
                        </span>
                      ) : isSelected ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                          <Check className="w-4 h-4 text-[#ff2d55]" />
                        </div>
                      ) : null}
                    </div>
                    <p className="text-xs text-neutral-400 leading-tight">
                      {f.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Batch Download Format Selection */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#ff2d55]" />
                  Batch & Playlist File Formats
                </label>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Locked to MP3 right now. Additional formats coming soon.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                1 active (MP3)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {formats.map((f) => {
                const isChecked = f.value === 'mp3';
                const isLocked = f.isLocked;

                return (
                  <button
                    key={`batch-${f.value}`}
                    type="button"
                    disabled={isLocked}
                    onClick={() => toggleBatchFormat(f.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isLocked
                        ? 'border-neutral-800/80 bg-neutral-900/30 opacity-60 cursor-not-allowed text-neutral-500'
                        : isChecked
                        ? 'border-[#ff2d55]/60 bg-[#ff2d55]/10 text-white'
                        : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/60 text-neutral-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">{f.label}</span>
                        {isLocked && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                            <Lock className="w-2 h-2" />
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] block truncate text-neutral-400">
                        {f.value === 'mp3' ? '320k universal audio' : f.desc}
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                        isLocked
                          ? 'border-neutral-800 bg-neutral-900 text-neutral-600'
                          : isChecked
                          ? 'bg-[#ff2d55] text-white border-[#ff2d55]'
                          : 'border-neutral-700 bg-neutral-800'
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="w-2.5 h-2.5 text-neutral-500" />
                      ) : isChecked ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: ZIP Folder Structure Organization */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-[#ff2d55]" />
                ZIP Folder Structure
              </label>
              <p className="text-xs text-neutral-400 mt-0.5">
                Organize tracks neatly inside downloaded ZIP archives
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {zipStructures.map((struct) => {
                const isSelected = (settings.zipStructure || 'flat') === struct.value;
                return (
                  <button
                    key={struct.value}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, zipStructure: struct.value })}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#ff2d55] bg-[#ff2d55]/10 text-white'
                        : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/60 text-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{struct.label}</div>
                      <div className="text-[11px] text-neutral-400">{struct.desc}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-[#ff2d55] bg-[#ff2d55]' : 'border-neutral-600'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Loudness Normalization & Audio Quality */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#ff2d55]" />
                  Volume Normalization (-14 LUFS Target)
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Applies EBU R128 two-pass loudness normalization to prevent clipping and match streaming standards
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, volumeNormalization: !settings.volumeNormalization })}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  settings.volumeNormalization ? 'bg-[#ff2d55]' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.volumeNormalization ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* WAV Bit Depth */}
            {settings.defaultFormat === 'wav' && (
              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                <div>
                  <h4 className="font-bold text-white text-xs">WAV Bit Depth</h4>
                  <p className="text-[11px] text-neutral-400">Uncompressed linear PCM audio encoding</p>
                </div>
                <div className="flex gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                  {(['16-bit', '24-bit'] as WavBitDepth[]).map((depth) => (
                    <button
                      key={depth}
                      onClick={() => onUpdateSettings({ ...settings, wavBitDepth: depth })}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                        settings.wavBitDepth === depth
                          ? 'bg-[#ff2d55] text-white shadow-xs'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {depth}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MP3 Bitrate */}
            {settings.defaultFormat === 'mp3' && (
              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                <div>
                  <h4 className="font-bold text-white text-xs">MP3 Bitrate</h4>
                  <p className="text-[11px] text-neutral-400">LAME audio compression target</p>
                </div>
                <div className="flex gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                  {(['320kbps', '256kbps', '192kbps'] as Mp3Bitrate[]).map((bitrate) => (
                    <button
                      key={bitrate}
                      onClick={() => onUpdateSettings({ ...settings, mp3Bitrate: bitrate })}
                      className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                        settings.mp3Bitrate === bitrate
                          ? 'bg-[#ff2d55] text-white shadow-xs'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {bitrate}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: File Naming Pattern */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
              <FileAudio className="w-3.5 h-3.5 text-[#ff2d55]" />
              File Naming Convention
            </label>
            <div className="space-y-1.5">
              {namingPatterns.map((pat) => (
                <label
                  key={pat.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    settings.namingPattern === pat.value
                      ? 'border-[#ff2d55]/60 bg-[#ff2d55]/10 text-white'
                      : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/60 text-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="namingPattern"
                    checked={settings.namingPattern === pat.value}
                    onChange={() => onUpdateSettings({ ...settings, namingPattern: pat.value })}
                    className="accent-[#ff2d55]"
                  />
                  <span className="text-xs font-medium">{pat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section: Download History & Local Storage Management */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3.5" id="history-storage-settings">
            <div className="flex items-center justify-between gap-3">
              <div className="pr-2 min-w-0">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#ff2d55]" />
                  Auto-Clear Download History
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Automatically delete download logs older than a specified number of days to keep browser local storage clean
                </p>
              </div>
              <button
                type="button"
                id="toggle-auto-clear-history"
                onClick={() => onUpdateSettings({ ...settings, autoClearHistory: !settings.autoClearHistory })}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 focus:outline-hidden ${
                  settings.autoClearHistory ? 'bg-[#ff2d55]' : 'bg-neutral-800'
                }`}
                title={settings.autoClearHistory ? 'Disable auto-clearing history' : 'Enable auto-clearing history'}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.autoClearHistory ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Retention Day Options */}
            {settings.autoClearHistory ? (
              <div className="pt-3 border-t border-neutral-800/80 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Retention Period
                  </span>
                  <span className="text-[11px] font-semibold text-[#ff2d55]">
                    Delete older than {settings.autoClearHistoryDays || 7} day{(settings.autoClearHistoryDays || 7) > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { days: 1, label: '1 Day' },
                    { days: 3, label: '3 Days' },
                    { days: 7, label: '7 Days' },
                    { days: 14, label: '14 Days' },
                    { days: 30, label: '30 Days' },
                  ].map(({ days, label }) => {
                    const isSelected = (settings.autoClearHistoryDays || 7) === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        id={`retention-days-${days}`}
                        onClick={() => onUpdateSettings({ ...settings, autoClearHistoryDays: days })}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-[#ff2d55] text-white border-[#ff2d55] shadow-xs'
                            : 'bg-neutral-900/80 hover:bg-neutral-850 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Auto-clean active on export & startup
                  </span>
                  {historyCount !== undefined && (
                    <span className="text-neutral-500 font-mono">
                      {historyCount} log{historyCount === 1 ? '' : 's'} stored
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-neutral-600" />
                  Logs kept indefinitely until manually cleared
                </span>
                {historyCount !== undefined && (
                  <span className="font-mono">
                    {historyCount} record{historyCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            )}

            {/* Clear History Now Button */}
            {onClearHistory && historyCount !== undefined && historyCount > 0 && (
              <div className="pt-2 border-t border-neutral-800/60 flex justify-end">
                <button
                  type="button"
                  id="clear-all-history-btn"
                  onClick={() => {
                    if (window.confirm('Clear all stored download history now?')) {
                      onClearHistory();
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-900/50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All History Now</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800/80 flex items-center justify-between bg-neutral-900/40">
          <span className="text-xs text-neutral-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ff2d55]" />
            Engine configured for Suno v3.5 & v6 models
          </span>
          <button
            id="done-settings-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#d61d44] hover:opacity-95 text-white font-bold text-xs transition-opacity shadow-md shadow-[#ff2d55]/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
