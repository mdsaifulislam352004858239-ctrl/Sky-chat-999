import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Phone,
  Video,
  Cloud,
  CheckCheck,
  Loader2,
  X,
  Volume2,
  VolumeX,
  Trash2,
  Eye,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Send,
  Pause,
  Play,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { getRecentChats, saveMessage } from '../services/chatService';
import { uploadImageToImgBB, uploadVideoToCloudinary, isVideo, resolveMediaUrl } from '../services/uploadService';
import { deleteMediaFromIndexedDB } from '../services/mediaStore';
import { Chat, User, StoryItem, StoryViewer, Message, UserStoryBundle } from '../types';
import { Avatar } from '../components/Avatar';
import { formatChatTimestamp } from '../utils/time';
import { StoryViewersModal } from '../components/StoryViewersModal';
import {
  FB_REACTIONS,
  PHOTO_STORY_DURATION_MS,
  VIDEO_STORY_MAX_DURATION_MS,
  MAX_STORIES_PER_USER,
  getMyStories,
  addMyStory,
  deleteMyStoryById,
  saveViewerToStory,
  getRemainingStoryTime,
  getFriendStoryBundles,
  reactToFriendStory,
} from '../services/storyService';

interface HomeScreenProps {
  onOpenChat: (user: User) => void;
  onOpenFindFriend: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenChat,
  onOpenFindFriend,
}) => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Story queue for logged-in user (up to 10 stories)
  const [myStories, setMyStories] = useState<StoryItem[]>(() => getMyStories());
  const [friendBundles] = useState<UserStoryBundle[]>(() => getFriendStoryBundles());
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [uploadLimitMessage, setUploadLimitMessage] = useState<string | null>(null);

  // Active Story Viewer State (Facebook Story Bundle)
  const [activeStoryBundle, setActiveStoryBundle] = useState<UserStoryBundle | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [resolvedStoryUrl, setResolvedStoryUrl] = useState<string>('');
  const [isStoryMuted, setIsStoryMuted] = useState(false);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0); // 0 to 100%
  const [remainingSeconds, setRemainingSeconds] = useState(20);

  // Facebook Story Reactions & Viewers Modal States
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [storyReplyText, setStoryReplyText] = useState('');
  const [reactionFeedback, setReactionFeedback] = useState<string | null>(null);

  const storyInputRef = useRef<HTMLInputElement>(null);

  // Load recent chats
  useEffect(() => {
    if (user) {
      setChats(getRecentChats(user.id));
    }
  }, [user]);

  // Periodic check to auto-refresh stories (24h expiration)
  useEffect(() => {
    const interval = setInterval(() => {
      const refreshed = getMyStories();
      setMyStories(refreshed);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredChats = chats.filter((c) =>
    c.participant.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.participant.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Current active story being viewed
  const currentStory: StoryItem | null =
    activeStoryBundle && activeStoryBundle.stories[activeStoryIndex]
      ? activeStoryBundle.stories[activeStoryIndex]
      : null;

  // Resolve media URL (indexedDB blob or cloud URL) whenever currentStory changes
  useEffect(() => {
    if (!currentStory) {
      setResolvedStoryUrl('');
      setStoryProgress(0);
      setIsStoryPaused(false);
      return;
    }

    let isMounted = true;
    resolveMediaUrl(currentStory.url).then((url) => {
      if (isMounted) {
        setResolvedStoryUrl(url || currentStory.url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentStory]);

  // Facebook-Style Auto-Advance & Progress Bar Timer
  useEffect(() => {
    if (!activeStoryBundle || !currentStory) {
      setStoryProgress(0);
      return;
    }

    const isVid = currentStory.mediaType !== 'image' && (currentStory.mediaType === 'video' || isVideo(currentStory.url));
    const totalDuration = isVid ? VIDEO_STORY_MAX_DURATION_MS : PHOTO_STORY_DURATION_MS; // 20s for photo!
    const stepInterval = 100;
    const stepIncrement = (stepInterval / totalDuration) * 100;

    setRemainingSeconds(Math.ceil(totalDuration / 1000));
    setStoryProgress(0);

    const interval = setInterval(() => {
      if (isStoryPaused) return; // Paused by user touch/click

      setStoryProgress((prev) => {
        const next = prev + stepIncrement;
        const currentRemaining = Math.max(0, Math.ceil(((100 - next) / 100) * (totalDuration / 1000)));
        setRemainingSeconds(currentRemaining);

        if (next >= 100) {
          clearInterval(interval);
          handleNextStory();
          return 100;
        }
        return next;
      });
    }, stepInterval);

    return () => clearInterval(interval);
  }, [activeStoryBundle, activeStoryIndex, isStoryPaused]);

  // Navigate to Next Story in the reel
  const handleNextStory = () => {
    if (!activeStoryBundle) return;
    if (activeStoryIndex < activeStoryBundle.stories.length - 1) {
      // Auto-advance to next story in user's queue!
      setActiveStoryIndex((prev) => prev + 1);
      setStoryProgress(0);
    } else {
      // Reel completed
      setActiveStoryBundle(null);
    }
  };

  // Navigate to Previous Story in the reel
  const handlePrevStory = () => {
    if (!activeStoryBundle) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
      setStoryProgress(0);
    } else {
      // Restart current story from 0
      setStoryProgress(0);
    }
  };

  // Upload a new story (photos: 20s, videos: supported, up to 10 stories per user)
  const handleStoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check maximum 10 stories limit
    const currentList = getMyStories();
    if (currentList.length >= MAX_STORIES_PER_USER) {
      setUploadLimitMessage(`আপনি ইতিমধ্যে সর্বোচ্চ ${MAX_STORIES_PER_USER}টি স্টোরি শেয়ার করেছেন। নতুন স্টোরি দেওয়ার জন্য আগের একটি স্টোরি ডিলিট করুন।`);
      setTimeout(() => setUploadLimitMessage(null), 5000);
      if (storyInputRef.current) storyInputRef.current.value = '';
      return;
    }

    try {
      setIsUploadingStory(true);
      // Strictly detect if file is a video
      const isVid = file.type.startsWith('video/') || (file.name ? /\.(mp4|webm|ogg|mov|m4v|mkv|3gp)$/i.test(file.name) : false);
      let uploadedUrl: string;

      if (isVid) {
        uploadedUrl = await uploadVideoToCloudinary(file);
      } else {
        uploadedUrl = await uploadImageToImgBB(file);
      }

      // Add to stories array (up to 10 stories supported, newest first)
      const res = addMyStory({
        url: uploadedUrl,
        mediaType: isVid ? 'video' : 'image',
      });

      if (!res.success && res.message) {
        setUploadLimitMessage(res.message);
        setTimeout(() => setUploadLimitMessage(null), 5000);
      } else {
        setMyStories(res.stories);
        // Automatically open the user's stories starting at the newly posted story (which is at index 0)!
        if (user) {
          setActiveStoryBundle({
            user,
            stories: res.stories,
          });
          setActiveStoryIndex(0);
        }
      }
    } catch (err) {
      console.error('Failed to upload story:', err);
    } finally {
      setIsUploadingStory(false);
      if (storyInputRef.current) storyInputRef.current.value = '';
    }
  };

  // Delete the currently displayed story from own reel
  const handleDeleteCurrentStory = () => {
    if (!currentStory || !activeStoryBundle || !user) return;
    if (currentStory.url) {
      deleteMediaFromIndexedDB(currentStory.url);
    }

    const updated = deleteMyStoryById(currentStory.id);
    setMyStories(updated);

    if (updated.length === 0) {
      setActiveStoryBundle(null);
    } else {
      const nextIdx = Math.min(activeStoryIndex, updated.length - 1);
      setActiveStoryBundle({
        user,
        stories: updated,
      });
      setActiveStoryIndex(nextIdx);
      setStoryProgress(0);
    }
  };

  // React to current story with Facebook emojis (👍, ❤️, 🥰, 😆, 😮, 😢, 😡)
  const handleReactToStory = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeStoryBundle || !currentStory || !user) return;

    // Trigger floating animated reaction
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 16;
    const newId = Date.now() + Math.random();
    setFloatingReactions((prev) => [...prev, { id: newId, emoji, x }]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newId));
    }, 1500);

    setReactionFeedback(`Reacted with ${emoji}`);
    setTimeout(() => setReactionFeedback(null), 2000);

    if (activeStoryBundle.user.id === user.id) {
      // User reacted to own story
      saveViewerToStory(currentStory.id, user, emoji);
      const updated = getMyStories();
      setMyStories(updated);
      setActiveStoryBundle({
        user,
        stories: updated,
      });
    } else {
      // User reacted to friend's story
      reactToFriendStory(activeStoryBundle.user.id, user, emoji);

      // Send a reaction message into friend's chat
      const msg: Message = {
        id: 'msg_react_' + Date.now(),
        chatId: activeStoryBundle.user.id,
        senderId: user.id,
        receiverId: activeStoryBundle.user.id,
        text: `Reacted ${emoji} to your story`,
        timestamp: Date.now(),
        status: 'sent',
      };
      saveMessage(msg);
    }
  };

  // Quick reply to story author
  const handleSendStoryReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyReplyText.trim() || !activeStoryBundle || !user) return;

    const reply = storyReplyText.trim();
    const msg: Message = {
      id: 'msg_reply_' + Date.now(),
      chatId: activeStoryBundle.user.id,
      senderId: user.id,
      receiverId: activeStoryBundle.user.id,
      text: `Replied to your story: "${reply}"`,
      timestamp: Date.now(),
      status: 'sent',
    };
    saveMessage(msg);
    setStoryReplyText('');
    setReactionFeedback('Reply sent!');
    setTimeout(() => setReactionFeedback(null), 2000);
  };

  // Open own stories
  const handleOpenMyStories = () => {
    if (!user) return;
    if (myStories.length > 0) {
      setActiveStoryBundle({
        user,
        stories: myStories,
      });
      setActiveStoryIndex(0);
    } else {
      storyInputRef.current?.click();
    }
  };

  // Open friend's stories bundle
  const handleOpenFriendStories = (bundle: UserStoryBundle) => {
    setActiveStoryBundle(bundle);
    setActiveStoryIndex(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 max-w-md mx-auto w-full overflow-x-hidden touch-pan-y overscroll-x-none select-none">
      {/* Hidden Story File Input */}
      <input
        type="file"
        ref={storyInputRef}
        onChange={handleStoryFileChange}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Upload limit warning toast */}
      {uploadLimitMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-70 bg-amber-500 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-semibold max-w-[90%] animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{uploadLimitMessage}</span>
          <button
            onClick={() => setUploadLimitMessage(null)}
            className="ml-auto p-1 hover:bg-white/20 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Story Viewers & Reactions Modal Sheet (Facebook style, Zero-crash) */}
      {showViewersModal && currentStory && (
        <StoryViewersModal
          viewers={currentStory.viewers || []}
          storyIndex={activeStoryIndex}
          totalStories={activeStoryBundle?.stories.length || 1}
          onClose={() => setShowViewersModal(false)}
          onOpenChat={onOpenChat}
        />
      )}

      {/* Fullscreen Story Viewer Modal (Auto-advancing 10-story queue with segmented progress bar) */}
      {activeStoryBundle && currentStory && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between w-full h-full overflow-hidden animate-in fade-in duration-200 select-none">
          {/* Floating Reaction Emojis (Facebook style) */}
          {floatingReactions.map((item) => (
            <div
              key={item.id}
              style={{ left: `${item.x}px` }}
              className="absolute bottom-28 z-40 text-4xl pointer-events-none select-none animate-[floatUp_1.5s_ease-out_forwards]"
            >
              {item.emoji}
            </div>
          ))}

          {/* Reaction / Reply toast message */}
          {reactionFeedback && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-black/85 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-semibold shadow-2xl border border-white/20 animate-in fade-in duration-150">
              {reactionFeedback}
            </div>
          )}

          {/* Top Story Header with Segmented Progress Bar for Multi-Stories (Overlaid) */}
          <div className="absolute top-0 inset-x-0 z-30 pt-4 px-4 pb-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
            <div className="max-w-2xl mx-auto w-full">
              {/* Segmented Progress Bars (Facebook & Instagram style for all stories in the user's reel) */}
              <div className="flex items-center space-x-1.5 w-full mb-3">
                {activeStoryBundle.stories.map((st, idx) => (
                  <div
                    key={st.id || idx}
                    className="flex-1 bg-white/30 h-1.5 rounded-full overflow-hidden"
                  >
                    <div
                      className="bg-sky-400 h-full rounded-full transition-all duration-100 ease-linear"
                      style={{
                        width:
                          idx < activeStoryIndex
                            ? '100%'
                            : idx === activeStoryIndex
                            ? `${storyProgress}%`
                            : '0%',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-2.5">
                  <Avatar
                    src={activeStoryBundle.user.photoURL}
                    name={activeStoryBundle.user.displayName}
                    size="sm"
                    className="ring-2 ring-sky-400"
                  />
                  <div className="leading-tight">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-sm font-bold text-white drop-shadow-md">
                        {activeStoryBundle.user.displayName}
                      </h4>
                      {activeStoryBundle.stories.length > 1 && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-white/20 text-white/90">
                          {activeStoryIndex + 1}/{activeStoryBundle.stories.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-[11px] text-sky-200 drop-shadow-xs font-medium">
                      <span>
                        {currentStory.mediaType === 'video' || isVideo(currentStory.url)
                          ? 'Video Story'
                          : 'Story (20s)'}
                      </span>
                      <span>•</span>
                      <span className="text-amber-300 font-semibold">{remainingSeconds}s left</span>
                      <span>•</span>
                      <span>{getRemainingStoryTime(currentStory.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {/* Pause / Resume Button */}
                  <button
                    type="button"
                    onClick={() => setIsStoryPaused(!isStoryPaused)}
                    className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                    title={isStoryPaused ? 'Resume story' : 'Pause story'}
                  >
                    {isStoryPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
                  </button>

                  {(currentStory.mediaType === 'video' || isVideo(currentStory.url)) && (
                    <button
                      type="button"
                      onClick={() => setIsStoryMuted(!isStoryMuted)}
                      className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                      title={isStoryMuted ? 'Unmute' : 'Mute'}
                    >
                      {isStoryMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                  )}

                  {/* Owner Delete Story Button (Deletes this specific story from user's 10 stories) */}
                  {activeStoryBundle.user.id === user?.id && (
                    <button
                      type="button"
                      onClick={handleDeleteCurrentStory}
                      className="p-2 text-white/90 hover:text-rose-400 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                      title="Delete this story"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    onClick={() => setActiveStoryBundle(null)}
                    className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                    title="Close Story"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Facebook-style Fullscreen Story Media Display + Left/Right Tap zones */}
          <div
            onPointerDown={() => setIsStoryPaused(true)}
            onPointerUp={() => setIsStoryPaused(false)}
            onPointerCancel={() => setIsStoryPaused(false)}
            className="absolute inset-0 z-10 flex items-center justify-center w-full h-full overflow-hidden select-none"
          >
            {/* Left Tap Zone -> Previous Story */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                handlePrevStory();
              }}
              className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer flex items-center justify-start pl-4 group"
              title="Previous Story"
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm p-3 rounded-full text-white shadow-lg">
                <ChevronLeft className="w-6 h-6" />
              </div>
            </div>

            {/* Right Tap Zone -> Next Story */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleNextStory();
              }}
              className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer flex items-center justify-end pr-4 group"
              title="Next Story"
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm p-3 rounded-full text-white shadow-lg">
                <ChevronRight className="w-6 h-6" />
              </div>
            </div>

            {isStoryPaused && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-xs font-medium border border-white/20 shadow-xl animate-in fade-in">
                Paused (Release to continue)
              </div>
            )}

            {/* Blurred ambient background for non-standard aspect ratio media */}
            <div
              className="absolute inset-0 z-0 bg-cover bg-center filter blur-2xl opacity-40 scale-110 pointer-events-none"
              style={{
                backgroundImage: `url(${resolvedStoryUrl || currentStory.url})`,
              }}
            />

            {/* Main story media filling fullscreen like Facebook */}
            {currentStory.mediaType === 'image' ? (
              <img
                key={resolvedStoryUrl || currentStory.url}
                src={resolvedStoryUrl || currentStory.url}
                alt="Story"
                className="relative z-10 w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <video
                key={resolvedStoryUrl || currentStory.url}
                src={resolvedStoryUrl || currentStory.url}
                autoPlay
                playsInline
                muted={isStoryMuted}
                className="relative z-10 w-full h-full object-contain pointer-events-none"
                onEnded={handleNextStory}
              />
            )}
          </div>

          {/* Facebook Story Footer: Own Story vs Friend Story (Overlaid at bottom) */}
          <div className="absolute bottom-0 inset-x-0 z-30 p-4 pb-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto">
            <div className="max-w-md mx-auto w-full">
              {activeStoryBundle.user.id === user?.id ? (
                /* Own Story: Viewers Count & Facebook Activity Drawer Trigger */
                <button
                  type="button"
                  onClick={() => setShowViewersModal(true)}
                  className="w-full flex items-center justify-between bg-white/20 hover:bg-white/30 active:scale-[0.99] backdrop-blur-md px-4 py-3 rounded-2xl text-white text-xs font-semibold cursor-pointer transition-all border border-white/20 shadow-xl group"
                >
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                    <span>{(currentStory.viewers || []).length} views</span>
                    <span className="text-white/40">•</span>
                    <div className="flex items-center -space-x-1">
                      {Array.from(new Set((currentStory.viewers || []).map((v) => v.reaction).filter(Boolean)))
                        .slice(0, 4)
                        .map((emoji, i) => (
                          <span key={i} className="text-sm drop-shadow-xs">
                            {emoji}
                          </span>
                        ))}
                    </div>
                    <span>
                      {(currentStory.viewers || []).filter((v) => Boolean(v.reaction)).length} reactions
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 text-sky-300">
                    <span className="text-[11px] font-medium">Activity</span>
                    <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </button>
              ) : (
                /* Friend's Story: Facebook 7 Reactions Bar + Quick Reply */
                <div className="flex flex-col space-y-2.5">
                  {/* All 7 Facebook Reactions (Like, Love, Care, Haha, Wow, Sad, Angry) */}
                  <div className="flex items-center justify-around bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-xl">
                    {FB_REACTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => handleReactToStory(item.emoji, e)}
                        className="text-2xl hover:scale-135 active:scale-90 transition-transform p-1 cursor-pointer transform"
                        title={item.label}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>

                  {/* Quick Reply Form */}
                  <form onSubmit={handleSendStoryReply} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder={`Send message to ${activeStoryBundle.user.displayName.split(' ')[0]}...`}
                      value={storyReplyText}
                      onChange={(e) => setStoryReplyText(e.target.value)}
                      className="flex-1 bg-white/20 backdrop-blur-md text-white placeholder-white/60 text-xs px-4 py-2.5 rounded-full border border-white/20 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!storyReplyText.trim()}
                      className="w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white flex items-center justify-center shadow-md transition-all cursor-pointer shrink-0"
                      title="Send reply"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <Cloud className="w-5 h-5 fill-white/30" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Sky Chat</h1>
              <span className="text-[11px] text-emerald-500 font-medium flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                Connected
              </span>
            </div>
          </div>

          <button
            onClick={onOpenFindFriend}
            className="w-9 h-9 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center hover:bg-sky-100 transition-colors cursor-pointer"
            title="Find new friends"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations & friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
          />
        </div>
      </header>

      {/* Online Active Contacts & Stories Strip (Multi-Story Reel up to 10 stories) */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Stories & Active Now
          </p>
          {myStories.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              {myStories.length}/{MAX_STORIES_PER_USER} stories
            </span>
          )}
        </div>

        <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-none items-center touch-pan-x overscroll-x-contain">
          {/* User's Own Story Button (Multi-Story support up to 10 stories) */}
          <div className="flex flex-col items-center shrink-0 space-y-1">
            <div className="relative">
              <button
                type="button"
                onClick={handleOpenMyStories}
                className={`w-12 h-12 rounded-full p-0.5 transition-transform active:scale-95 cursor-pointer relative ${
                  myStories.length > 0
                    ? 'ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-900'
                    : 'border-2 border-dashed border-slate-300 dark:border-slate-700'
                }`}
              >
                {isUploadingStory ? (
                  <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
                  </div>
                ) : (
                  <Avatar
                    src={user?.photoURL}
                    name={user?.displayName || 'Me'}
                    size="md"
                  />
                )}
              </button>

              {/* Add Story (+) button: can add another story up to 10 stories */}
              <button
                type="button"
                onClick={() => {
                  if (myStories.length >= MAX_STORIES_PER_USER) {
                    setUploadLimitMessage(`সর্বোচ্চ ${MAX_STORIES_PER_USER}টি স্টোরি পূর্ণ হয়েছে। নতুন স্টোরি দেওয়ার জন্য আগের একটি স্টোরি ডিলিট করুন।`);
                    setTimeout(() => setUploadLimitMessage(null), 5000);
                  } else {
                    storyInputRef.current?.click();
                  }
                }}
                className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-sky-500 hover:bg-sky-600 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer border-2 border-white dark:border-slate-900 transition-transform hover:scale-110"
                title={`Add story (${myStories.length}/${MAX_STORIES_PER_USER})`}
              >
                <Plus className="w-3 h-3 stroke-[3]" />
              </button>
            </div>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[64px] truncate text-center">
              {myStories.length > 0 ? `My Story (${myStories.length})` : 'Add Story'}
            </span>
          </div>

          {/* Friends Multi-Story Bundles */}
          {friendBundles.map((bundle) => {
            const friendUser = bundle.user;
            return (
              <button
                key={friendUser.id}
                onClick={() => handleOpenFriendStories(bundle)}
                className="flex flex-col items-center shrink-0 space-y-1 cursor-pointer group"
                title={`View ${friendUser.displayName}'s stories (${bundle.stories.length} stories)`}
              >
                <div className="relative p-0.5 rounded-full ring-2 ring-sky-500/80 group-hover:ring-sky-400 group-hover:scale-105 transition-all">
                  <Avatar
                    src={friendUser.photoURL}
                    name={friendUser.displayName}
                    size="md"
                    isOnline={friendUser.isOnline}
                  />
                  {bundle.stories.length > 1 && (
                    <span className="absolute -top-1 -right-1 px-1 bg-sky-500 text-white text-[9px] font-bold rounded-full border border-white dark:border-slate-900 shadow-xs">
                      {bundle.stories.length}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[60px] truncate group-hover:text-sky-500">
                  {friendUser.displayName.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat List - strictly locked against horizontal drag/shifting */}
      <div className="px-2 py-2 w-full max-w-full overflow-x-hidden touch-pan-y overscroll-x-none select-none">
        {filteredChats.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-slate-500">No chats found</p>
            <button
              onClick={onOpenFindFriend}
              className="mt-3 text-xs font-semibold text-sky-500 hover:underline cursor-pointer"
            >
              Start a new conversation
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onOpenChat(chat.participant)}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer group w-full max-w-full overflow-hidden select-none touch-pan-y"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Avatar
                  src={chat.participant.photoURL}
                  name={chat.participant.displayName}
                  size="md"
                  isOnline={chat.participant.isOnline}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {chat.participant.displayName}
                    </h3>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatChatTimestamp(chat.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center">
                      {chat.lastMessage?.senderId === user?.id && (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-500 inline mr-1 shrink-0" />
                      )}
                      <span>{chat.lastMessage?.text || 'Started a new conversation'}</span>
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="ml-2 w-4 h-4 bg-sky-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shrink-0">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Call Action on Hover / Desktop */}
              <div className="hidden sm:flex items-center space-x-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startCall(chat.participant, 'audio');
                  }}
                  className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startCall(chat.participant, 'video');
                  }}
                  className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
