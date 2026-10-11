import React from 'react';
import { MessageSquare, Users, Phone, User as UserIcon } from 'lucide-react';

export type TabType = 'chats' | 'friends' | 'calls' | 'profile';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  unreadCount = 0,
}) => {
  const tabs = [
    { id: 'chats' as TabType, label: 'Chats', icon: MessageSquare, badge: unreadCount },
    { id: 'friends' as TabType, label: 'Friends', icon: Users },
    { id: 'calls' as TabType, label: 'Calls', icon: Phone },
    { id: 'profile' as TabType, label: 'Profile', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-6 py-2 z-30 transition-all">
      <div className="flex justify-between items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 relative transition-colors duration-200 ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-medium'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2.5 bg-sky-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
