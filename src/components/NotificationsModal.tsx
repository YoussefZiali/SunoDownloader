import React from 'react';
import { X, Bell, CheckCircle2, Info, Sparkles, Download } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'download' | 'system' | 'tip';
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onClear: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-2.5 sm:p-4">
      <div 
        id="notifications-sheet"
        className="w-full max-w-md bg-white text-neutral-900 rounded-3xl shadow-2xl max-h-[85vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-neutral-800" />
            <h3 className="font-extrabold text-base text-neutral-900">Activity & Alerts</h3>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onClear}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-white shadow-2xs flex items-center justify-center shrink-0 mt-0.5">
                {n.type === 'download' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : n.type === 'tip' ? (
                  <Sparkles className="w-4 h-4 text-[#ff2d55]" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-bold text-xs text-neutral-900 truncate">{n.title}</h4>
                  <span className="text-[10px] text-neutral-400 shrink-0">{n.time}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
