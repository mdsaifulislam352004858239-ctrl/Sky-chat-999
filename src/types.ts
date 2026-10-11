export interface User {
  id: string;
  phoneNumber?: string;
  email?: string;
  displayName: string;
  username: string;
  photoURL?: string;
  status?: string;
  isOnline: boolean;
  lastSeen: number;
  createdAt: number;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface QuotedMessage {
  id: string;
  senderName: string;
  text: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  audioDuration?: number; // seconds
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  reactions?: MessageReaction[];
  replyTo?: QuotedMessage;
  isDeleted?: boolean;
  isPinned?: boolean;
}

export interface Chat {
  id: string;
  participant: User;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: number;
}

export interface CallRecord {
  id: string;
  caller: User;
  receiver: User;
  type: 'audio' | 'video';
  status: 'missed' | 'completed' | 'declined';
  duration?: number;
  timestamp: number;
}

export interface FriendRequest {
  id: string;
  sender: User;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface StoryViewer {
  id: string;
  user: User;
  viewedAt: number;
  reaction?: string;
}

export interface StoryItem {
  id: string;
  url: string;
  mediaType: 'image' | 'video';
  createdAt: number;
  viewers?: StoryViewer[];
}

export interface UserStoryBundle {
  user: User;
  stories: StoryItem[];
}

