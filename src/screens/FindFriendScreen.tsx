import React, { useState } from 'react';
import { ArrowLeft, Search, UserPlus, Check } from 'lucide-react';
import { User } from '../types';
import { getAllUsers } from '../services/userService';
import { sendFriendRequest } from '../services/friendService';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';

interface FindFriendScreenProps {
  onBack: () => void;
  onOpenChat: (user: User) => void;
}

export const FindFriendScreen: React.FC<FindFriendScreenProps> = ({ onBack, onOpenChat }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});

  const allUsers = getAllUsers().filter((u) => u.id !== user?.id);
  const results = allUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(query.toLowerCase()) ||
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(query.toLowerCase())) ||
      (u.phoneNumber && u.phoneNumber.includes(query))
  );

  const handleSendRequest = (targetUser: User) => {
    if (!user) return;
    sendFriendRequest(user, targetUser.id);
    setSentMap((prev) => ({ ...prev, [targetUser.id]: true }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 py-2.5 flex items-center space-x-2">
        <button
          onClick={onBack}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Find People</h2>
          <p className="text-xs text-slate-400">Search by name, @username, or phone</p>
        </div>
      </header>

      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or @username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
          />
        </div>
      </div>

      {/* Results */}
      <div className="px-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {query ? 'Search Results' : 'Suggested for You'}
        </p>

        {results.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No people found matching "{query}"
          </div>
        ) : (
          results.map((u) => {
            const isSent = sentMap[u.id];

            return (
              <div
                key={u.id}
                className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-xs"
              >
                <div
                  onClick={() => onOpenChat(u)}
                  className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                >
                  <Avatar src={u.photoURL} name={u.displayName} size="md" isOnline={u.isOnline} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {u.displayName}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                    <p className="text-[11px] text-slate-500 truncate">{u.status}</p>
                  </div>
                </div>

                <div className="ml-2">
                  {isSent ? (
                    <span className="flex items-center text-xs text-emerald-500 font-semibold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Request Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(u)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
