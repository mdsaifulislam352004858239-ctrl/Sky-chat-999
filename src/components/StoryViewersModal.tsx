import React, { useState } from 'react';
import { X, Eye, MessageSquare, Users, Sparkles } from 'lucide-react';
import { StoryViewer, User } from '../types';
import { Avatar } from './Avatar';
import { formatChatTimestamp } from '../utils/time';

interface StoryViewersModalProps {
  viewers: StoryViewer[];
  storyIndex?: number;
  totalStories?: number;
  onClose: () => void;
  onOpenChat: (user: User) => void;
}

export const StoryViewersModal: React.FC<StoryViewersModalProps> = ({
  viewers = [],
  storyIndex,
  totalStories,
  onClose,
  onOpenChat,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Defensive validation: ensure each viewer has a valid user object to prevent ANY white screen crash
  const safeViewers = viewers.filter(
    (v): v is StoryViewer => Boolean(v && v.user && (v.user.displayName || v.user.id))
  );

  const totalViews = safeViewers.length;
  const reactionsList = safeViewers.filter((v) => Boolean(v.reaction));
  const totalReactions = reactionsList.length;

  // Count per emoji
  const reactionCounts: Record<string, number> = {};
  reactionsList.forEach((v) => {
    if (v.reaction) {
      reactionCounts[v.reaction] = (reactionCounts[v.reaction] || 0) + 1;
    }
  });

  const filteredViewers = safeViewers.filter((v) => {
    if (selectedFilter === 'all') return true;
    return v.reaction === selectedFilter;
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex flex-col justify-end max-w-md mx-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200/80 dark:border-slate-800 p-4 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />

        {/* Facebook Story Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Story Activity
              </h3>
              {typeof storyIndex === 'number' && typeof totalStories === 'number' && totalStories > 1 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Story {storyIndex + 1} of {totalStories}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold flex items-center">
                <Eye className="w-3.5 h-3.5 mr-1" />
                {totalViews} {totalViews === 1 ? 'view' : 'views'}
              </span>
              {totalReactions > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-xs text-rose-500 font-semibold flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Facebook Reaction Filter Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto py-3 scrollbar-none border-b border-slate-100 dark:border-slate-800/50">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              selectedFilter === 'all'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All ({totalViews})</span>
          </button>

          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => setSelectedFilter(emoji)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                selectedFilter === emoji
                  ? 'bg-sky-500 text-white shadow-sm scale-105'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-sm">{emoji}</span>
              <span>{count}</span>
            </button>
          ))}
        </div>

        {/* Viewers & Reacters List (Facebook UI) */}
        <div className="flex-1 overflow-y-auto space-y-1.5 py-2 max-h-[52vh] pr-1 scrollbar-none">
          {filteredViewers.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Eye className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No viewers yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                When friends view this story or send reactions, they will show up here.
              </p>
            </div>
          ) : (
            filteredViewers.map((viewer) => {
              const u = viewer.user;
              const displayName = u?.displayName || 'Friend';
              const photoURL = u?.photoURL;
              const isOnline = Boolean(u?.isOnline);

              return (
                <div
                  key={viewer.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <Avatar
                        src={photoURL}
                        name={displayName}
                        size="md"
                        isOnline={isOnline}
                      />
                      {/* Floating Facebook Reaction Badge on Avatar */}
                      {viewer.reaction && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-xs shadow-md border border-slate-200 dark:border-slate-700 transform group-hover:scale-110 transition-transform">
                          {viewer.reaction}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {displayName}
                        </h4>
                        {viewer.reaction && (
                          <span className="text-sm shrink-0" title={`Reacted with ${viewer.reaction}`}>
                            {viewer.reaction}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {viewer.viewedAt ? `Viewed ${formatChatTimestamp(viewer.viewedAt)}` : 'Recently viewed'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenChat(u);
                    }}
                    className="p-2 text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0 ml-2 flex items-center space-x-1"
                    title="Send message to friend"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-medium hidden sm:inline">Message</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
