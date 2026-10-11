import { User } from '../types';

const USERS_STORAGE_KEY = 'sky_chat_users';
const CURRENT_USER_KEY = 'sky_chat_current_user';

export const initialDemoUsers: User[] = [
  {
    id: 'user_alex',
    displayName: 'Alex Rivers',
    username: 'alex_rivers',
    email: 'alex@example.com',
    phoneNumber: '+8801700000001',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'Busy creating great things 🚀',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'user_sarah',
    displayName: 'Sarah Chen',
    username: 'sarah_c',
    email: 'sarah@example.com',
    phoneNumber: '+8801700000002',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'Hey there! I am using Sky Chat.',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'user_tariq',
    displayName: 'Tariq Ahmed',
    username: 'tariq_dev',
    email: 'tariq@example.com',
    phoneNumber: '+8801700000003',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'Coding is life 💻',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'user_nadia',
    displayName: 'Nadia Karim',
    username: 'nadia_k',
    email: 'nadia@example.com',
    phoneNumber: '+8801700000004',
    photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    status: 'Living life one photo at a time ✨',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'user_rohan',
    displayName: 'Rohan Sharma',
    username: 'rohan_s',
    email: 'rohan@example.com',
    phoneNumber: '+8801700000005',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'Exploring the world 🌍',
    isOnline: false,
    lastSeen: Date.now() - 3600000 * 4,
    createdAt: Date.now() - 86400000 * 8,
  },
];

export const getAllUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialDemoUsers));
    return initialDemoUsers;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return initialDemoUsers;
  }
};

export const saveUser = (user: User): void => {
  const users = getAllUsers();
  const existingIdx = users.findIndex((u) => u.id === user.id);
  if (existingIdx >= 0) {
    users[existingIdx] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const getUserById = (id: string): User | undefined => {
  const users = getAllUsers();
  return users.find((u) => u.id === id);
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    saveUser(user);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};
