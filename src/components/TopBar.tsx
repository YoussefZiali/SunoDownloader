import React from 'react';
import { Crown, Share2, Bell, Settings } from 'lucide-react';

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  hasUnreadNotifications?: boolean;
  onShare: () => void;
  onUpgradeClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenSettings,
  onOpenNotifications,
  hasUnreadNotifications = true,
  onShare,
  onUpgradeClick,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#f7f7f6]/95 backdrop-blur-md transition-colors border-b border-neutral-200/50">
      {/* Left: Upgrade Pill */}
      <button
        id="top-upgrade-btn"
        onClick={onUpgradeClick}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-900 font-bold text-xs tracking-tight transition-all active:scale-95"
      >
        <Crown className="w-3.5 h-3.5 text-neutral-800 fill-neutral-800/20" />
        <span>Upgrade</span>
      </button>

      {/* Right: Circular Icon Actions */}
      <div className="flex items-center gap-2">
        {/* Share Button */}
        <button
          id="top-share-btn"
          onClick={onShare}
          title="Share Downloader"
          className="w-9 h-9 rounded-full bg-neutral-200/80 hover:bg-neutral-300 flex items-center justify-center text-neutral-800 transition-all active:scale-95"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Notifications Button */}
        <button
          id="top-notifications-btn"
          onClick={onOpenNotifications}
          title="Download Activity & Notifications"
          className="w-9 h-9 rounded-full bg-neutral-200/80 hover:bg-neutral-300 flex items-center justify-center text-neutral-800 relative transition-all active:scale-95"
        >
          <Bell className="w-4 h-4" />
          {hasUnreadNotifications && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff2d55] ring-2 ring-[#f7f7f6]" />
          )}
        </button>

        {/* Settings Button */}
        <button
          id="top-settings-btn"
          onClick={onOpenSettings}
          title="Audio & Download Settings"
          className="w-9 h-9 rounded-full bg-neutral-200/80 hover:bg-neutral-300 flex items-center justify-center text-neutral-800 transition-all active:scale-95"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
