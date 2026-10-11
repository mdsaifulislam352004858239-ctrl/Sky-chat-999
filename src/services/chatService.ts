import { Message, Chat, User } from '../types';
import { initialDemoUsers } from './userService';

const MESSAGES_KEY = 'sky_chat_messages';

export const getStoredMessages = (): Message[] => {
  const stored = localStorage.getItem(MESSAGES_KEY);
  if (!stored) {
    const defaultMessages: Message[] = [
      {
        id: 'msg_1',
        chatId: 'user_alex',
        senderId: 'user_alex',
        receiverId: 'me',
        text: 'Hey! Ki khobor? Free thakle ekta call dio.',
        timestamp: Date.now() - 3600000,
        status: 'read',
      },
      {
        id: 'msg_2',
        chatId: 'user_sarah',
        senderId: 'user_sarah',
        receiverId: 'me',
        text: 'Hey there! How is everything going?',
        timestamp: Date.now() - 1800000,
        status: 'read',
      },
    ];
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(defaultMessages));
    return defaultMessages;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const saveMessage = (msg: Message): void => {
  const msgs = getStoredMessages();
  msgs.push(msg);
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
};

export const deleteMessage = (messageId: string): void => {
  const msgs = getStoredMessages();
  const updated = msgs.map((m) => {
    if (m.id === messageId) {
      return {
        ...m,
        isDeleted: true,
        text: 'This message was unsent',
        mediaUrl: undefined,
        mediaType: undefined,
      };
    }
    return m;
  });
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
};

export const toggleReactionOnMessage = (messageId: string, userId: string, emoji: string): Message | null => {
  const msgs = getStoredMessages();
  let updatedMsg: Message | null = null;

  const updated = msgs.map((m) => {
    if (m.id === messageId) {
      const existing = m.reactions || [];
      const userReactionIndex = existing.findIndex((r) => r.userId === userId);

      let newReactions = [...existing];
      if (userReactionIndex >= 0) {
        if (newReactions[userReactionIndex].emoji === emoji) {
          // Remove if clicking same reaction
          newReactions.splice(userReactionIndex, 1);
        } else {
          // Replace with new reaction
          newReactions[userReactionIndex] = { userId, emoji };
        }
      } else {
        newReactions.push({ userId, emoji });
      }

      updatedMsg = { ...m, reactions: newReactions };
      return updatedMsg;
    }
    return m;
  });

  localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
  return updatedMsg;
};

export const togglePinMessage = (messageId: string): Message | null => {
  const msgs = getStoredMessages();
  let target: Message | null = null;
  const updated = msgs.map((m) => {
    if (m.id === messageId) {
      target = { ...m, isPinned: !m.isPinned };
      return target;
    }
    return m;
  });
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
  return target;
};

export const getMessagesForChat = (currentUserId: string, otherUserId: string): Message[] => {
  const msgs = getStoredMessages();
  return msgs.filter(
    (m) =>
      (m.senderId === currentUserId && m.receiverId === otherUserId) ||
      (m.senderId === otherUserId && (m.receiverId === currentUserId || m.receiverId === 'me'))
  );
};

export const getRecentChats = (currentUserId: string): Chat[] => {
  const allMessages = getStoredMessages();
  const demoPartners = initialDemoUsers;

  return demoPartners.map((partner) => {
    const chatMsgs = allMessages.filter(
      (m) =>
        (m.senderId === currentUserId && m.receiverId === partner.id) ||
        (m.senderId === partner.id && (m.receiverId === currentUserId || m.receiverId === 'me'))
    );
    const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : undefined;
    return {
      id: partner.id,
      participant: partner,
      lastMessage: lastMsg,
      unreadCount: partner.id === 'user_sarah' ? 1 : 0,
      updatedAt: lastMsg ? lastMsg.timestamp : partner.createdAt,
    };
  });
};

const THEMES_KEY_PREFIX = 'sky_chat_theme_';

export const getChatTheme = (chatId: string): string => {
  return localStorage.getItem(`${THEMES_KEY_PREFIX}${chatId}`) || 'sky';
};

export const setChatTheme = (chatId: string, themeId: string): void => {
  localStorage.setItem(`${THEMES_KEY_PREFIX}${chatId}`, themeId);
};

export const playMessengerSound = (type: 'send' | 'receive' | 'reaction' = 'send'): void => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'send') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } else if (type === 'receive') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'reaction') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(740, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch {
    // browser audio policies can mute unclicked interactions safely
  }
};

