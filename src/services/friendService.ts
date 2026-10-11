import { User, FriendRequest } from '../types';
import { initialDemoUsers } from './userService';

const FRIENDS_KEY = 'sky_chat_friends';
const REQUESTS_KEY = 'sky_chat_friend_requests';

export const getFriends = (): User[] => {
  const stored = localStorage.getItem(FRIENDS_KEY);
  if (!stored) {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(initialDemoUsers));
    return initialDemoUsers;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return initialDemoUsers;
  }
};

export const getFriendRequests = (): FriendRequest[] => {
  const stored = localStorage.getItem(REQUESTS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const sendFriendRequest = (sender: User, receiverId: string): void => {
  const requests = getFriendRequests();
  requests.push({
    id: 'req_' + Date.now(),
    sender,
    receiverId,
    status: 'pending',
    createdAt: Date.now(),
  });
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
};
