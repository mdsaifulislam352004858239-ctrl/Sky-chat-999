import React from 'react';
import { ArrowLeft, Bell, MessageSquare, PhoneCall, UserPlus } from 'lucide-react';

interface NotificationsScreenProps {
  onBack: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  const notifications = [
    {
      id: 1,
      icon: MessageSquare,
      title: 'New Message',
      desc: 'Sarah Chen sent you a message in Sky Chat',
      time: '15m ago',
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/50',
    },
    {
      id: 2,
      icon: PhoneCall,
      title: 'Missed Audio Call',
      desc: 'Missed audio call from Alex Rivers',
      time: '2h ago',
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50',
    },
    {
      id: 3,
      icon: UserPlus,
      title: 'Friend Request',
      desc: 'Tariq Ahmed sent you a friend request',
      time: '1d ago',
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 max-w-md mx-auto">
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 py-2.5 flex items-center space-x-2">
        <button
          onClick={onBack}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Notifications</h2>
      </header>

      <div className="p-4 space-y-3">
        {notifications.map((n) => {
          const Icon = n.icon;
          return (
            <div
              key={n.id}
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start space-x-3 shadow-xs"
            >
              <div className={`p-2 rounded-xl shrink-0 ${n.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</h4>
                  <span className="text-[10px] text-slate-400">{n.time}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
