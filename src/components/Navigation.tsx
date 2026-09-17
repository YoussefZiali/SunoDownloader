import React from 'react';
import { 
  Library, Sliders, Radio, Zap, FolderDown, Music, Disc, Compass
} from 'lucide-react';
import { ActiveTab } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  completedDownloadsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  completedDownloadsCount = 0,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0f]/95 backdrop-blur-xl border-t border-neutral-800/90 px-1.5 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Tab 0: Explore */}
        <button
          id="nav-explore-tab"
          onClick={() => onChangeTab('explore')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'explore'
              ? 'text-[#ff2d55]'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Compass className={`w-5 h-5 ${activeTab === 'explore' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-0.5">Explore</span>
        </button>

        {/* Tab 1: Library */}
        <button
          id="nav-library-tab"
          onClick={() => onChangeTab('library')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'library'
              ? 'text-[#ff2d55]'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Library className={`w-5 h-5 ${activeTab === 'library' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-0.5">Library</span>
        </button>

        {/* Tab 2: DAW Studio */}
        <button
          id="nav-studio-tab"
          onClick={() => onChangeTab('studio')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'studio'
              ? 'text-[#ff2d55]'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sliders className={`w-5 h-5 ${activeTab === 'studio' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-0.5">DAW Studio</span>
        </button>

        {/* Tab 3: DJ & Creative */}
        <button
          id="nav-dj-tab"
          onClick={() => onChangeTab('dj_creative')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dj_creative'
              ? 'text-[#ff2d55]'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Radio className={`w-5 h-5 ${activeTab === 'dj_creative' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-0.5">DJ Creative</span>
        </button>

        {/* Tab 4: Suno Ingest */}
        <button
          id="nav-ingest-tab"
          onClick={() => onChangeTab('ingest')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'ingest'
              ? 'text-amber-400'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Zap className={`w-5 h-5 ${activeTab === 'ingest' ? 'stroke-[2.5] fill-amber-400' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-0.5">Ingest</span>
        </button>

        {/* Tab 5: Exports */}
        <button
          id="nav-exports-tab"
          onClick={() => onChangeTab('exports')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative cursor-pointer ${
            activeTab === 'exports'
              ? 'text-[#ff2d55]'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <FolderDown className={`w-5 h-5 ${activeTab === 'exports' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {completedDownloadsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ff2d55]" />
            )}
          </div>
          <span className="text-[10px] font-bold mt-0.5">Vault</span>
        </button>

      </div>
    </nav>
  );
};
