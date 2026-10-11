import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  Send,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  CheckCheck,
  Loader2,
  Mic,
  Square,
  Trash2,
  ThumbsUp,
  Search,
  X,
  CornerUpLeft,
  Copy,
  Pin,
  Palette,
  Check,
  Download,
} from 'lucide-react';
import { User, Message, QuotedMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import {
  getMessagesForChat,
  saveMessage,
  deleteMessage,
  toggleReactionOnMessage,
  togglePinMessage,
  getChatTheme,
  setChatTheme,
  playMessengerSound,
} from '../services/chatService';
import {
  uploadImageToImgBB,
  uploadVideoToCloudinary,
  isVideo,
  resolveMediaUrl,
} from '../services/uploadService';
import { saveMediaToIndexedDB } from '../services/mediaStore';
import { compressImage } from '../utils/imageCompress';
import { Avatar } from '../components/Avatar';
import { formatMessageTime } from '../utils/time';
import { VoiceMessageBubble } from '../components/VoiceMessageBubble';
import { EmojiPicker } from '../components/EmojiPicker';
import { ChatThemeModal, CHAT_THEMES } from '../components/ChatThemeModal';
import { PartnerDetailsModal } from '../components/PartnerDetailsModal';
import { createSyntheticVoiceBlob, getBestAudioMimeType } from '../utils/audioHelper';

const FB_CHAT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥'];

const ChatMediaBubble: React.FC<{
  mediaUrl: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  onImageClick?: (url: string) => void;
}> = ({ mediaUrl, mediaType, onImageClick }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(mediaUrl);

  useEffect(() => {
    let isMounted = true;
    resolveMediaUrl(mediaUrl).then((url) => {
      if (isMounted) {
        setResolvedUrl(url || mediaUrl);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [mediaUrl]);

  const isVid = mediaType === 'video' || isVideo(mediaUrl);

  return (
    <div className="rounded-2xl overflow-hidden max-w-[280px] sm:max-w-xs md:max-w-sm">
      {isVid ? (
        <video
          key={resolvedUrl}
          src={resolvedUrl}
          controls
          playsInline
          className="w-full max-h-72 rounded-2xl bg-black object-contain block shadow-sm"
        />
      ) : (
        <img
          key={resolvedUrl}
          src={resolvedUrl}
          alt="Shared media"
          onClick={() => onImageClick?.(resolvedUrl)}
          className="w-full max-h-72 object-cover rounded-2xl block hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
          loading="lazy"
        />
      )}
    </div>
  );
};

interface ChatScreenProps {
  partner: User;
  onBack: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ partner, onBack }) => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  // Chat Theme
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => getChatTheme(partner.id));
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Emoji Picker & Modals
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Reply / Quoting
  const [replyingTo, setReplyingTo] = useState<QuotedMessage | null>(null);

  // Reaction picker hover/open state for a specific message id
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  // Context menu for a specific message id
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);

  // In-Chat Search
  const [isSearching, setIsSearching] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSimulatedAudio, setIsSimulatedAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Toast / Feedback
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInitialMountRef = useRef(true);

  // Initialize messages immediately from storage so the screen renders instantly with messages
  const [messages, setMessages] = useState<Message[]>(() => {
    if (user) {
      return getMessagesForChat(user.id, partner.id);
    }
    return [];
  });

  const currentTheme = CHAT_THEMES.find((t) => t.id === currentThemeId) || CHAT_THEMES[0];

  // Refresh messages if partner or user changes
  useEffect(() => {
    if (user) {
      setMessages(getMessagesForChat(user.id, partner.id));
    }
  }, [user, partner]);

  // Synchronous jump to bottom before first browser paint
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  // Fast scroll to bottom on open and on new message
  useEffect(() => {
    const scrollToBottomNow = (isInstant: boolean) => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: isInstant ? 'auto' : 'smooth',
          block: 'end',
        });
      }
    };

    if (isInitialMountRef.current) {
      // 1. Immediately jump to bottom without smooth animation
      scrollToBottomNow(true);

      // 2. Schedule follow-ups to catch any async render, layout reflow, or image decoding
      const rAF1 = requestAnimationFrame(() => {
        scrollToBottomNow(true);
      });
      const t1 = setTimeout(() => {
        scrollToBottomNow(true);
        isInitialMountRef.current = false;
      }, 50);

      const t2 = setTimeout(() => {
        scrollToBottomNow(true);
      }, 150);

      return () => {
        cancelAnimationFrame(rAF1);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      scrollToBottomNow(false);
    }
  }, [messages, isPartnerTyping]);

  // Handle Theme Change
  const handleSelectTheme = (themeId: string) => {
    setCurrentThemeId(themeId);
    setChatTheme(partner.id, themeId);
  };

  // Pinned message in this chat
  const pinnedMessage = messages.find((m) => m.isPinned && !m.isDeleted);

  // Handle Text Send
  const handleSend = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || !user) return;

    const newMsg: Message = {
      id: 'msg_' + Date.now(),
      chatId: partner.id,
      senderId: user.id,
      receiverId: partner.id,
      text: text,
      replyTo: replyingTo || undefined,
      timestamp: Date.now(),
      status: 'sent',
    };

    saveMessage(newMsg);
    playMessengerSound('send');
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
  };

  // Messenger Thumbs-Up Quick Send
  const handleSendLike = () => {
    handleSend('👍');
  };

  // Handle Media File Upload (Photo or Video)
  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      const isVid = file.type.startsWith('video/') || (file.name ? /\.(mp4|webm|mov|mkv)$/i.test(file.name) : false);
      let uploadedUrl: string;

      if (isVid) {
        uploadedUrl = await uploadVideoToCloudinary(file);
      } else {
        const compressedBlob = await compressImage(file);
        uploadedUrl = await uploadImageToImgBB(compressedBlob);
      }

      const mediaMsg: Message = {
        id: 'msg_media_' + Date.now(),
        chatId: partner.id,
        senderId: user.id,
        receiverId: partner.id,
        text: '',
        mediaUrl: uploadedUrl,
        mediaType: isVid ? 'video' : 'image',
        replyTo: replyingTo || undefined,
        timestamp: Date.now(),
        status: 'sent',
      };

      saveMessage(mediaMsg);
      playMessengerSound('send');
      setMessages((prev) => [...prev, mediaMsg]);
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to upload media:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    audioChunksRef.current = [];
    setIsRecording(true);
    setRecordingSeconds(0);
    setIsSimulatedAudio(false);

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setIsSimulatedAudio(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mimeType = getBestAudioMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = options
        ? new MediaRecorder(stream, options)
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
    } catch (err) {
      console.warn('Microphone access restricted, switching to simulated audio note:', err);
      setIsSimulatedAudio(true);
    }
  };

  const stopRecordingAndSend = async () => {
    if (!isRecording || !user) return;

    const finalSeconds = Math.max(1, recordingSeconds);

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    const finalizeAndSendBlob = async (audioBlob: Blob) => {
      try {
        const savedRef = await saveMediaToIndexedDB(audioBlob);
        const voiceMsg: Message = {
          id: 'msg_voice_' + Date.now(),
          chatId: partner.id,
          senderId: user.id,
          receiverId: partner.id,
          text: '',
          mediaUrl: savedRef,
          mediaType: 'audio',
          audioDuration: finalSeconds,
          replyTo: replyingTo || undefined,
          timestamp: Date.now(),
          status: 'sent',
        };

        saveMessage(voiceMsg);
        playMessengerSound('send');
        setMessages((prev) => [...prev, voiceMsg]);
        setReplyingTo(null);
      } catch (err) {
        console.error('Failed to save audio message:', err);
      } finally {
        setIsRecording(false);
        setRecordingSeconds(0);
        setIsSimulatedAudio(false);
      }
    };

    if (isSimulatedAudio || !mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      const syntheticBlob = createSyntheticVoiceBlob(finalSeconds);
      await finalizeAndSendBlob(syntheticBlob);
      return;
    }

    const recorder = mediaRecorderRef.current;
    recorder.onstop = async () => {
      let audioBlob: Blob;
      if (audioChunksRef.current.length > 0) {
        audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
      } else {
        audioBlob = createSyntheticVoiceBlob(finalSeconds);
      }
      await finalizeAndSendBlob(audioBlob);
    };

    try {
      recorder.stop();
    } catch {
      const syntheticBlob = createSyntheticVoiceBlob(finalSeconds);
      await finalizeAndSendBlob(syntheticBlob);
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    setIsSimulatedAudio(false);
  };

  // Toggle Reaction on a message
  const handleToggleReaction = (msgId: string, emoji: string) => {
    if (!user) return;
    const updated = toggleReactionOnMessage(msgId, user.id, emoji);
    playMessengerSound('reaction');
    setActiveReactionMsgId(null);
    if (updated) {
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
    }
  };

  // Toggle Pin message
  const handleTogglePin = (msgId: string) => {
    const updated = togglePinMessage(msgId);
    setActiveMenuMsgId(null);
    if (updated) {
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
    }
  };

  // Delete / Unsend message
  const handleDeleteMessage = (msgId: string) => {
    deleteMessage(msgId);
    setActiveMenuMsgId(null);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              isDeleted: true,
              text: 'This message was unsent',
              mediaUrl: undefined,
              mediaType: undefined,
            }
          : m
      )
    );
  };

  // Copy Message Text
  const handleCopyText = (text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setActiveMenuMsgId(null);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 1800);
  };

  // Quoted Reply Trigger
  const handleQuoteReply = (msg: Message) => {
    const senderName = msg.senderId === user?.id ? 'You' : partner.displayName;
    let snippet = msg.text;
    if (!snippet && msg.mediaType) {
      snippet = `[Shared ${msg.mediaType}]`;
    }
    setReplyingTo({
      id: msg.id,
      senderName,
      text: snippet || 'Attachment',
      mediaType: msg.mediaType,
    });
    setActiveMenuMsgId(null);
    inputRef.current?.focus();
  };

  // Filter messages for search
  const visibleMessages = chatSearchQuery.trim()
    ? messages.filter((m) =>
        m.text?.toLowerCase().includes(chatSearchQuery.toLowerCase().trim())
      )
    : messages;

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 dark:bg-slate-950 relative select-none w-full overflow-x-hidden touch-pan-y overscroll-x-none">
      {/* Toast Notification */}
      {copiedFeedback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center space-x-1.5 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Copied to clipboard</span>
        </div>
      )}

      {/* Theme Modal */}
      {showThemeModal && (
        <ChatThemeModal
          currentThemeId={currentThemeId}
          onSelectTheme={handleSelectTheme}
          onClose={() => setShowThemeModal(false)}
        />
      )}

      {/* Partner Profile & Shared Media Details Modal */}
      {showDetailsModal && (
        <PartnerDetailsModal
          partner={partner}
          messages={messages}
          onClose={() => setShowDetailsModal(false)}
          onAudioCall={() => startCall(partner, 'audio')}
          onVideoCall={() => startCall(partner, 'video')}
          onOpenTheme={() => setShowThemeModal(true)}
          onToggleSearch={() => {
            setIsSearching(true);
          }}
        />
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Clickable Avatar & Name opens Conversation Details Modal */}
            <div
              onClick={() => setShowDetailsModal(true)}
              className="flex items-center space-x-2 cursor-pointer group"
            >
              <Avatar
                src={partner.photoURL}
                name={partner.displayName}
                size="sm"
                isOnline={partner.isOnline}
              />

              <div className="leading-tight">
                <div className="flex items-center space-x-1.5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[130px] group-hover:text-sky-500 transition-colors">
                    {partner.displayName}
                  </h2>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold shrink-0 ${
                      partner.isOnline
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1 ${
                        partner.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {partner.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {isPartnerTyping
                    ? 'typing...'
                    : partner.isOnline
                    ? 'Active now'
                    : 'Last seen recently'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => startCall(partner, 'audio')}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Audio Call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => startCall(partner, 'video')}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Video Call"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowThemeModal(true)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Change Chat Theme"
            >
              <Palette className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDetailsModal(true)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Chat Details"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional In-Chat Search Bar */}
        {isSearching && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2 animate-in slide-in-from-top-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search in this chat..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-xs px-3 py-1.5 rounded-full text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            {chatSearchQuery && (
              <span className="text-[10px] text-slate-400 shrink-0">
                {visibleMessages.length} found
              </span>
            )}
            <button
              onClick={() => {
                setIsSearching(false);
                setChatSearchQuery('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pinned Message Banner */}
        {pinnedMessage && (
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center space-x-2 truncate">
              <Pin className="w-3.5 h-3.5 text-sky-500 fill-sky-500 shrink-0" />
              <div className="truncate">
                <span className="font-bold text-sky-700 dark:text-sky-300 text-[11px] block">
                  Pinned message
                </span>
                <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">
                  {pinnedMessage.text || '[Attachment]'}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleTogglePin(pinnedMessage.id)}
              className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 shrink-0 cursor-pointer"
            >
              Unpin
            </button>
          </div>
        )}
      </header>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3.5 w-full max-w-full touch-pan-y overscroll-x-none select-none"
        onClick={() => {
          setActiveReactionMsgId(null);
          setActiveMenuMsgId(null);
          setShowEmojiPicker(false);
        }}
      >
        <div className="text-center my-1">
          <span className="text-[10px] bg-slate-200/70 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full">
            End-to-end encrypted • Messenger synced
          </span>
        </div>

        {visibleMessages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          const isLikeOnly = msg.text === '👍' && !msg.mediaUrl;
          const isDeleted = Boolean(msg.isDeleted);
          const hasMedia = Boolean(msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'video'));
          const isMediaOnly = hasMedia && !msg.text;

          // Group reactions by emoji and count
          const reactionCounts = (msg.reactions || []).reduce<Record<string, number>>(
            (acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            },
            {}
          );
          const hasUserReacted = (msg.reactions || []).some((r) => r.userId === user?.id);

          return (
            <div
              key={msg.id}
              className={`flex flex-col relative group ${isMe ? 'items-end' : 'items-start'}`}
            >
              {/* Message Bubble Container with Action Hover */}
              <div className="relative max-w-[82%]">
                {/* Floating Reaction Bar (when opened for this message) */}
                {activeReactionMsgId === msg.id && !isDeleted && (
                  <div
                    className={`absolute -top-10 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-full px-2 py-1 flex items-center space-x-1 animate-in zoom-in-90 ${
                      isMe ? 'right-0' : 'left-0'
                    }`}
                  >
                    {FB_CHAT_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleReaction(msg.id, emoji);
                        }}
                        className="text-lg hover:scale-135 transition-transform active:scale-100 p-0.5 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quoted / Replied message header preview */}
                {msg.replyTo && (
                  <div
                    className={`text-[10px] px-3 py-1 mb-1 rounded-t-xl border-l-2 ${
                      isMe
                        ? 'bg-sky-600/30 text-white/90 border-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-sky-500'
                    }`}
                  >
                    <span className="font-bold">{msg.replyTo.senderName}</span>
                    <p className="truncate opacity-80">{msg.replyTo.text}</p>
                  </div>
                )}

                {/* Main Message Bubble */}
                {isLikeOnly ? (
                  // Large iconic Facebook Thumbs-Up Sticker
                  <div className="py-1 cursor-pointer select-none">
                    <span className="text-5xl inline-block hover:scale-110 active:scale-95 transition-transform drop-shadow-md">
                      👍
                    </span>
                  </div>
                ) : isMediaOnly ? (
                  // Clean standalone Photo / Video - NO blue box or padding around media!
                  <div className="relative rounded-2xl overflow-hidden shadow-sm group/media cursor-pointer select-none max-w-[280px] sm:max-w-xs md:max-w-sm">
                    <ChatMediaBubble
                      mediaUrl={msg.mediaUrl!}
                      mediaType={msg.mediaType}
                      onImageClick={(url) => setPreviewMediaUrl(url)}
                    />
                    {/* Clean translucent timestamp pill on bottom-right corner (Messenger style) */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] flex items-center space-x-1 shadow-sm select-none pointer-events-none">
                      {msg.isPinned && <Pin className="w-2.5 h-2.5 fill-current" />}
                      <span>{formatMessageTime(msg.timestamp)}</span>
                      {isMe && !isDeleted && (
                        <CheckCheck className="w-3 h-3 text-sky-300 inline" />
                      )}
                    </div>
                  </div>
                ) : hasMedia ? (
                  // Media with caption text - media is flush without blue side borders
                  <div
                    className={`rounded-2xl text-sm leading-relaxed shadow-xs relative overflow-hidden max-w-[280px] sm:max-w-xs md:max-w-sm ${
                      isDeleted
                        ? 'p-3 italic text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700'
                        : isMe
                        ? `${currentTheme.bubbleClass} rounded-br-xs`
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/60 rounded-bl-xs'
                    }`}
                  >
                    <div className="w-full overflow-hidden">
                      <ChatMediaBubble
                        mediaUrl={msg.mediaUrl!}
                        mediaType={msg.mediaType}
                        onImageClick={(url) => setPreviewMediaUrl(url)}
                      />
                    </div>
                    <div className="px-3.5 py-2">
                      <p className="break-words">
                        {chatSearchQuery.trim() &&
                        msg.text.toLowerCase().includes(chatSearchQuery.toLowerCase()) ? (
                          <span>
                            {msg.text.split(new RegExp(`(${chatSearchQuery})`, 'gi')).map((part, i) =>
                              part.toLowerCase() === chatSearchQuery.toLowerCase() ? (
                                <mark key={i} className="bg-amber-300 text-slate-900 font-bold px-0.5 rounded-xs">
                                  {part}
                                </mark>
                              ) : (
                                part
                              )
                            )}
                          </span>
                        ) : (
                          msg.text
                        )}
                      </p>
                      <div
                        className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${
                          isMe ? 'text-white/80' : 'text-slate-400'
                        }`}
                      >
                        {msg.isPinned && <Pin className="w-2.5 h-2.5 fill-current" />}
                        <span>{formatMessageTime(msg.timestamp)}</span>
                        {isMe && !isDeleted && (
                          <CheckCheck className="w-3 h-3 text-sky-200 inline" />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Regular text or voice bubble
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs relative ${
                      isDeleted
                        ? 'italic text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700'
                        : isMe
                        ? `${currentTheme.bubbleClass} rounded-br-xs`
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/60 rounded-bl-xs'
                    }`}
                  >
                    {/* Voice Message Bubble */}
                    {msg.mediaUrl && msg.mediaType === 'audio' && (
                      <VoiceMessageBubble
                        mediaUrl={msg.mediaUrl}
                        duration={msg.audioDuration}
                        isMe={isMe}
                      />
                    )}

                    {/* Text content with search match highlight */}
                    {msg.text && (
                      <p className="break-words">
                        {chatSearchQuery.trim() &&
                        msg.text.toLowerCase().includes(chatSearchQuery.toLowerCase()) ? (
                          <span>
                            {msg.text.split(new RegExp(`(${chatSearchQuery})`, 'gi')).map((part, i) =>
                              part.toLowerCase() === chatSearchQuery.toLowerCase() ? (
                                <mark key={i} className="bg-amber-300 text-slate-900 font-bold px-0.5 rounded-xs">
                                  {part}
                                </mark>
                              ) : (
                                part
                              )
                            )}
                          </span>
                        ) : (
                          msg.text
                        )}
                      </p>
                    )}

                    {/* Timestamp, Pin, Status indicator */}
                    <div
                      className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${
                        isMe ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      {msg.isPinned && <Pin className="w-2.5 h-2.5 fill-current" />}
                      <span>{formatMessageTime(msg.timestamp)}</span>
                      {isMe && !isDeleted && (
                        <CheckCheck className="w-3 h-3 text-sky-200 inline" />
                      )}
                    </div>
                  </div>
                )}

                {/* Reaction Pill Badge at bottom corner of bubble */}
                {Object.keys(reactionCounts).length > 0 && !isDeleted && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                    }}
                    className={`absolute -bottom-2.5 ${
                      isMe ? 'right-2' : 'left-2'
                    } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-full px-1.5 py-0.5 flex items-center space-x-1 text-[11px] cursor-pointer hover:scale-110 transition-transform ${
                      hasUserReacted ? 'ring-1 ring-sky-500' : ''
                    }`}
                  >
                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                      <span key={emoji} className="flex items-center">
                        <span>{emoji}</span>
                        {count > 1 && <span className="text-[9px] font-bold ml-0.5">{count}</span>}
                      </span>
                    ))}
                  </button>
                )}

                {/* Action Trigger Buttons (Smile / Reply / More) - on hover */}
                {!isDeleted && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 hidden group-hover:flex items-center space-x-1 z-10 ${
                      isMe ? 'right-full mr-1.5' : 'left-full ml-1.5'
                    }`}
                  >
                    {/* Reaction trigger */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                        setActiveMenuMsgId(null);
                      }}
                      className="p-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-sky-500 shadow-xs cursor-pointer"
                      title="React"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    {/* Reply trigger */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuoteReply(msg);
                      }}
                      className="p-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-sky-500 shadow-xs cursor-pointer"
                      title="Reply"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* More Menu */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                        setActiveReactionMsgId(null);
                      }}
                      className="p-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shadow-xs cursor-pointer"
                      title="Options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Message Dropdown Menu */}
                {activeMenuMsgId === msg.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute z-40 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 w-36 text-xs animate-in zoom-in-95 ${
                      isMe ? 'right-0' : 'left-0'
                    }`}
                  >
                    <button
                      onClick={() => handleQuoteReply(msg)}
                      className="w-full px-3 py-1.5 flex items-center space-x-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5 text-sky-500" />
                      <span>Reply</span>
                    </button>

                    {msg.text && (
                      <button
                        onClick={() => handleCopyText(msg.text)}
                        className="w-full px-3 py-1.5 flex items-center space-x-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy text</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleTogglePin(msg.id)}
                      className="w-full px-3 py-1.5 flex items-center space-x-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                    >
                      <Pin className="w-3.5 h-3.5 text-amber-500" />
                      <span>{msg.isPinned ? 'Unpin' : 'Pin message'}</span>
                    </button>

                    {isMe && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="w-full px-3 py-1.5 flex items-center space-x-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left border-t border-slate-100 dark:border-slate-800 mt-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Unsend message</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Real-time Partner Typing Indicator Bubble */}
        {isPartnerTyping && (
          <div className="flex items-center space-x-2 animate-in fade-in">
            <Avatar src={partner.photoURL} name={partner.displayName} size="xs" />
            <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl rounded-bl-xs border border-slate-100 dark:border-slate-700 flex items-center space-x-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
            </div>
          </div>
        )}

        {/* Uploading Media Indicator */}
        {isUploading && (
          <div className="flex flex-col items-end animate-in fade-in">
            <div className="flex items-center space-x-2 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs shadow-xs border border-slate-200 dark:border-slate-700">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Uploading media...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-3 z-40">
          <EmojiPicker
            onSelectEmoji={(emoji) => {
              setInputText((prev) => prev + emoji);
              inputRef.current?.focus();
            }}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Replying Banner Above Input Box */}
      {replyingTo && (
        <div className="bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-1 h-7 rounded-full bg-sky-500 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Replying to {replyingTo.senderName}
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                {replyingTo.text}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Input Bottom Bar */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 sm:px-3 py-1.5 sm:py-2 relative">
        {/* Active Audio Recording Mode */}
        {isRecording ? (
          <div className="flex items-center space-x-2.5 py-1 px-2.5 bg-rose-50/80 dark:bg-rose-950/40 rounded-full border border-rose-200/60 dark:border-rose-900/40 animate-in fade-in">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-full transition-colors cursor-pointer"
              title="Cancel recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* Pulsing Recording Dot and Timer */}
            <div className="flex-1 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                {Math.floor(recordingSeconds / 60)}:
                {recordingSeconds % 60 < 10 ? '0' : ''}
                {recordingSeconds % 60}
              </span>
              <span className="text-[11px] text-rose-500/80 italic hidden sm:inline">
                Recording audio note...
              </span>
            </div>

            <button
              type="button"
              onClick={stopRecordingAndSend}
              className={`px-3.5 py-1.5 rounded-full ${currentTheme.bubbleClass} text-xs font-bold shadow-md hover:opacity-95 transition-all flex items-center space-x-1 cursor-pointer`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-1.5 sm:space-x-2"
          >
            {/* Hidden Media Picker */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleMediaFileChange}
              accept="image/*,video/*"
              className="hidden"
            />

            {/* Media (Photo/Video) Button - Enlarged Vibrant Emerald */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-90 text-white flex items-center justify-center shadow-xs hover:scale-105 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="Share photo or video"
            >
              {isUploading ? (
                <Loader2 className="w-4.5 h-4.5 text-white animate-spin" />
              ) : (
                <ImageIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              )}
            </button>

            {/* Voice Message Mic Button - Enlarged Vibrant Rose */}
            <button
              type="button"
              onClick={startRecording}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center shadow-xs hover:scale-105 transition-all cursor-pointer shrink-0"
              title="Record voice message"
            >
              <Mic className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>

            {/* Emoji Picker Button - Enlarged Vibrant Amber/Gold */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center shadow-xs hover:scale-105 active:scale-90 transition-all cursor-pointer shrink-0 ${
                showEmojiPicker
                  ? 'bg-amber-600 ring-2 ring-amber-300'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
              title="Add emoji"
            >
              <Smile className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>

            {/* Message Input Box (Aa ...) - Compact and slightly smaller */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Aa (Type a message...)"
              className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 px-3 py-1 rounded-full text-xs sm:text-[13px] h-8 sm:h-8.5 focus:outline-none focus:ring-1.5 focus:ring-sky-500 transition-all"
            />

            {/* Send Button if text entered */}
            {inputText.trim() && (
              <button
                type="submit"
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${currentTheme.bubbleClass} flex items-center justify-center text-white shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 animate-in zoom-in-75`}
                title="Send message"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            )}

            {/* Iconic Messenger Like Button (Thumbs Up) - Enlarged Vibrant Sky Blue */}
            <button
              type="button"
              onClick={handleSendLike}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-xs hover:scale-110 active:scale-90 transition-all cursor-pointer shrink-0"
              title="Send Like (Facebook Thumbs Up)"
            >
              <ThumbsUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-white" />
            </button>
          </form>
        )}
      </footer>

      {/* Full-screen Photo Lightbox / Media Viewer */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in select-none"
          onClick={() => setPreviewMediaUrl(null)}
        >
          {/* Top toolbar */}
          <div
            className="absolute top-4 right-4 flex items-center space-x-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={previewMediaUrl}
              download="sky-chat-media"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              title="Download media"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setPreviewMediaUrl(null)}
              className="p-2.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="max-w-4xl max-h-[85vh] flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo(previewMediaUrl) ? (
              <video
                src={previewMediaUrl}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain"
              />
            ) : (
              <img
                src={previewMediaUrl}
                alt="Full preview"
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
