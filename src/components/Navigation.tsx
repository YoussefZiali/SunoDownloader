import React from 'react';
import { Search, Sparkles, SlidersVertical, PlaySquare, Music } from 'lucide-react';
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#f7f7f6]/95 backdrop-blur-lg border-t border-neutral-200/80 px-4 py-2.5 max-w-xl mx-auto">
      <div className="flex items-center justify-around">
        
        {/* Tab 1: Explore / Home Feed */}
        <button
          id="nav-explore-tab"
          onClick={() => onChangeTab('explore')}
          className={`flex flex-col items-center justify-center w-12 h-11 transition-all active:scale-90 ${
            activeTab === 'explore' ? 'text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <div className="relative">
            <PlaySquare className={`w-5 h-5 ${activeTab === 'explore' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
        </button>

        {/* Tab 2: Search / URL Parser */}
        <button
          id="nav-search-tab"
          onClick={() => onChangeTab('search')}
          className={`flex flex-col items-center justify-center w-12 h-11 transition-all active:scale-90 ${
            activeTab === 'search' ? 'text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <Search className={`w-5 h-5 ${activeTab === 'search' ? 'stroke-[2.5]' : 'stroke-2'}`} />
        </button>

        {/* Tab 3: Downloader Studio (Center Music/Sparkle icon from screenshot) */}
        <button
          id="nav-downloader-tab"
          onClick={() => onChangeTab('downloader')}
          className={`flex flex-col items-center justify-center w-12 h-11 transition-all active:scale-90 relative ${
            activeTab === 'downloader' ? 'text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <div className="relative">
            <Music className={`w-5 h-5 ${activeTab === 'downloader' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <Sparkles className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-[#ff2d55]" />
          </div>
        </button>

        {/* Tab 4: Library / Downloads (Audio waveform bars from screenshot) */}
        <button
          id="nav-library-tab"
          onClick={() => onChangeTab('library')}
          className={`flex flex-col items-center justify-center w-12 h-11 transition-all active:scale-90 relative ${
            activeTab === 'library' ? 'text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <div className="relative flex items-center justify-center">
            {/* Custom 4-line Suno audio bars icon */}
            <div className="flex items-center gap-[3px] h-5 py-0.5">
              <span className={`w-[2.5px] h-3.5 rounded-full ${activeTab === 'library' ? 'bg-neutral-950' : 'bg-neutral-400'}`} />
              <span className={`w-[2.5px] h-5 rounded-full ${activeTab === 'library' ? 'bg-neutral-950' : 'bg-neutral-400'}`} />
              <span className={`w-[2.5px] h-3 rounded-full ${activeTab === 'library' ? 'bg-neutral-950' : 'bg-neutral-400'}`} />
              <span className={`w-[2.5px] h-4 rounded-full ${activeTab === 'library' ? 'bg-neutral-950' : 'bg-neutral-400'}`} />
            </div>
            {completedDownloadsCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-neutral-900 text-white text-[9px] font-bold flex items-center justify-center">
                {completedDownloadsCount}
              </span>
            )}
          </div>
        </button>

        {/* Tab 5: Profile (User avatar from screenshot) */}
        <button
          id="nav-profile-tab"
          onClick={() => onChangeTab('profile')}
          className={`flex flex-col items-center justify-center w-12 h-11 transition-all active:scale-90 ${
            activeTab === 'profile' ? 'ring-2 ring-neutral-900 rounded-full' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <div className="w-6 h-6 rounded-full overflow-hidden border border-neutral-300">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
              alt="ZAIVEN Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </button>

      </div>
    </nav>
  );
};
