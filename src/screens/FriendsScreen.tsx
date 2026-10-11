import React, { useState, useEffect } from 'react';
import { UserPlus, MessageSquare, Phone, Video, Search } from 'lucide-react';
import { User } from '../types';
import { getFriends } from '../services/friendService';
import { Avatar } from '../components/Avatar';
import { useCall } from '../context/CallContext';

interface FriendsScreenProps {
  onOpenChat: (user: User) => void;
  onOpenFindFriend: () => void;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = ({
  onOpenChat,
  onOpenFindFriend,
}) => {
  const [friends, setFriends] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { startCall } = useCall();

  useEffect(() => {
    setFriends(getFriends());
  }, []);

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Friends</h1>
            <p className="text-xs text-slate-400">{friends.length} connections</p>
          </div>

          <button
            onClick={onOpenFindFriend}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Friend</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </header>

      {/* Friends List */}
      <div className="p-3 space-y-2">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No friends found matching your search
          </div>
        ) : (
          filteredFriends.map((friend) => (
            <div
              key={friend.id}
              className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-xs hover:border-sky-200 dark:hover:border-sky-900/40 transition-all"
            >
              <div
                onClick={() => onOpenChat(friend)}
                className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
              >
                <Avatar src={friend.photoURL} name={friend.displayName} size="md" isOnline={friend.isOnline} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {friend.displayName}
                    </h3>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                        friend.isOnline
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          friend.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {friend.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">@{friend.username}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{friend.status}</p>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0 ml-2">
                <button
                  onClick={() => onOpenChat(friend)}
                  className="p-2 text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startCall(friend, 'audio')}
                  className="p-2 text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startCall(friend, 'video')}
                  className="p-2 text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
