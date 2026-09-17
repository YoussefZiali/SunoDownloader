import React from 'react';
import { 
  Radio, Library, Sliders, Disc, Sparkles, FolderDown, 
  Settings, History, HardDrive, Play, Pause, Music, Zap, Compass
} from 'lucide-react';
import { ActiveTab, SunoTrack } from '../types';

interface StudioHeaderProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  historyCount: number;
  offlineCount: number;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  activeTab,
  onChangeTab,
  onOpenHistory,
  onOpenSettings,
  historyCount,
  offlineCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d0d0f]/95 backdrop-blur-xl border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand Logo & Engine Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onChangeTab('explore')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff2d55] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#ff2d55]/25 group-hover:scale-105 transition-transform">
                <Disc className="w-5 h-5 animate-[spin_8s_linear_infinite]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-white tracking-tight font-['Syne']">
                    SUNO STUDIO
                  </span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/30">
                    CORE PRO
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>320k Lossless Audio Engine</span>
                </div>
              </div>
            </button>
          </div>

          {/* Primary Workstation Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            
            {/* Tab 0: Explore & Discover */}
            <button
              id="header-tab-explore"
              onClick={() => onChangeTab('explore')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'explore'
                  ? 'bg-gradient-to-r from-[#ff2d55] to-[#e02649] text-white shadow-sm shadow-[#ff2d55]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore</span>
            </button>

            {/* Tab 1: Music Library & Crates */}
            <button
              id="header-tab-library"
              onClick={() => onChangeTab('library')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'library' || activeTab === 'playlist'
                  ? 'bg-gradient-to-r from-[#ff2d55] to-[#e02649] text-white shadow-sm shadow-[#ff2d55]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Library className="w-4 h-4" />
              <span>Library & Playlists</span>
            </button>

            {/* Tab 2: Studio DAW & Mastering */}
            <button
              id="header-tab-studio"
              onClick={() => onChangeTab('studio')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-gradient-to-r from-[#ff2d55] to-[#e02649] text-white shadow-sm shadow-[#ff2d55]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>DAW Studio</span>
            </button>

            {/* Tab 3: DJ & Creative Suite */}
            <button
              id="header-tab-dj"
              onClick={() => onChangeTab('dj_creative')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dj_creative'
                  ? 'bg-gradient-to-r from-[#ff2d55] to-[#e02649] text-white shadow-sm shadow-[#ff2d55]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Auto-DJ</span>
            </button>

            {/* Tab 4: Suno Core Ingest */}
            <button
              id="header-tab-ingest"
              onClick={() => onChangeTab('ingest')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ingest'
                  ? 'bg-gradient-to-r from-[#ff2d55] to-[#e02649] text-white shadow-sm shadow-[#ff2d55]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Import Suno</span>
            </button>

            {/* Tab 5: Exports & Vault */}
            <button
              id="header-tab-exports"
              onClick={() => onChangeTab('exports')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'exports'
                  ? 'bg-gradient-to-r from-[#ff2d55] to-[#e02649] text-white shadow-sm shadow-[#ff2d55]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <FolderDown className="w-4 h-4" />
              <span>Downloads</span>
              {historyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-mono">
                  {historyCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            
            {/* Offline Vault Status Badge */}
            {offlineCount > 0 && (
              <button
                onClick={() => onChangeTab('exports')}
                title={`${offlineCount} tracks saved offline`}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] font-bold text-emerald-400 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{offlineCount} offline</span>
              </button>
            )}

            {/* History Drawer Trigger */}
            <button
              id="header-history-btn"
              onClick={onOpenHistory}
              title="Download & Conversion History"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-xs font-bold text-neutral-300 hover:text-white transition-all flex items-center gap-1.5 relative cursor-pointer"
            >
              <History className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">History</span>
              {historyCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#ff2d55] absolute top-1.5 right-1.5 sm:static sm:w-auto sm:h-auto sm:px-1.5 sm:py-0.2 sm:text-[10px] sm:bg-[#ff2d55] sm:text-white sm:font-mono">
                  <span className="hidden sm:inline">{historyCount}</span>
                </span>
              )}
            </button>

            {/* Audio Settings & Preferences */}
            <button
              id="header-settings-btn"
              onClick={onOpenSettings}
              title="Workstation Settings"
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden items-center justify-between gap-1 mt-2.5 pt-2.5 border-t border-neutral-800/60 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onChangeTab('explore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'explore' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => onChangeTab('library')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'library' || activeTab === 'playlist' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Library
          </button>
          <button
            onClick={() => onChangeTab('studio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'studio' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Studio DAW
          </button>
          <button
            onClick={() => onChangeTab('dj_creative')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'dj_creative' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Auto-DJ
          </button>
          <button
            onClick={() => onChangeTab('ingest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'ingest' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Import
          </button>
          <button
            onClick={() => onChangeTab('exports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
              activeTab === 'exports' ? 'bg-[#ff2d55] text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Vault
          </button>
        </div>

      </div>
    </header>
  );
};
