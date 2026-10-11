import { StoryItem, StoryViewer, User, UserStoryBundle } from '../types';
import { initialDemoUsers, getAllUsers } from './userService';

export interface ReactionItem {
  id: string;
  emoji: string;
  label: string;
}

export const FB_REACTIONS: ReactionItem[] = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'care', emoji: '🥰', label: 'Care' },
  { id: 'haha', emoji: '😆', label: 'Haha' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😡', label: 'Angry' },
];

export const STORY_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours lifespan
export const MAX_STORIES_PER_USER = 10; // Up to 10 stories per user
export const PHOTO_STORY_DURATION_MS = 20000; // 20 seconds for photos
export const VIDEO_STORY_MAX_DURATION_MS = 60000; // 60 seconds max for videos

const MY_STORIES_KEY = 'sky_chat_my_stories';
const LEGACY_STORY_KEY = 'sky_chat_my_story';

/**
 * Clean and validate a list of StoryViewer objects to ensure zero runtime crashes.
 */
export const sanitizeViewers = (viewers: unknown[]): StoryViewer[] => {
  if (!Array.isArray(viewers)) return [];
  const validUsers = getAllUsers();

  return viewers
    .filter((v): v is StoryViewer => {
      return Boolean(v && typeof v === 'object' && 'id' in v);
    })
    .map((v, idx) => {
      // If user is missing or broken, resolve with a valid friend
      const fallbackUser = validUsers[idx % validUsers.length] || initialDemoUsers[0];
      const user = v.user && v.user.displayName ? v.user : fallbackUser;
      return {
        id: String(v.id || `v_${idx}`),
        user,
        viewedAt: typeof v.viewedAt === 'number' ? v.viewedAt : Date.now() - 1000 * 60 * (idx + 5),
        reaction: typeof v.reaction === 'string' ? v.reaction : undefined,
      };
    });
};

/**
 * Generate realistic Facebook-style viewers and reactions for a story.
 */
export const generateDefaultViewersForStory = (): StoryViewer[] => {
  const users = getAllUsers();
  const reactions = ['❤️', '👍', '🥰', '😆', '😮'];

  const viewers: StoryViewer[] = [];
  users.slice(0, 4).forEach((u, i) => {
    if (!u) return;
    viewers.push({
      id: `viewer_${u.id}_${Date.now()}_${i}`,
      user: u,
      viewedAt: Date.now() - (i * 25 + 10) * 60 * 1000,
      reaction: reactions[i % reactions.length],
    });
  });

  return viewers;
};

/**
 * Get active stories for current user (up to 10, valid within 24 hours)
 */
export const getMyStories = (): StoryItem[] => {
  const now = Date.now();
  let list: StoryItem[] = [];

  const stored = localStorage.getItem(MY_STORIES_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } catch (err) {
      console.warn('Failed to parse my stories:', err);
    }
  }

  // Check legacy single story migration
  if (list.length === 0) {
    const legacy = localStorage.getItem(LEGACY_STORY_KEY);
    if (legacy) {
      try {
        const item = JSON.parse(legacy);
        if (item && item.url && now - item.createdAt < STORY_EXPIRATION_MS) {
          list = [
            {
              id: 'story_legacy_' + item.createdAt,
              url: item.url,
              mediaType: item.mediaType || 'image',
              createdAt: item.createdAt,
              viewers: generateDefaultViewersForStory(),
            },
          ];
          localStorage.setItem(MY_STORIES_KEY, JSON.stringify(list));
        }
      } catch (err) {
        console.warn('Failed to migrate legacy story:', err);
      }
    }
  }

  // Filter out stories older than 24 hours (automatic deletion) and sort newest first
  const nonExpired = list
    .filter((story) => now - story.createdAt < STORY_EXPIRATION_MS)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_STORIES_PER_USER);

  // Sanitize viewers on every story
  const cleaned = nonExpired.map((story) => ({
    ...story,
    viewers: sanitizeViewers(story.viewers || generateDefaultViewersForStory()),
  }));

  if (cleaned.length !== list.length) {
    localStorage.setItem(MY_STORIES_KEY, JSON.stringify(cleaned));
  }

  return cleaned;
};

/**
 * Add a new story (up to 10 stories limit)
 */
export const addMyStory = (
  newStory: { url: string; mediaType: 'image' | 'video' }
): { success: boolean; stories: StoryItem[]; message?: string } => {
  const current = getMyStories();

  if (current.length >= MAX_STORIES_PER_USER) {
    return {
      success: false,
      stories: current,
      message: `আপনি সর্বোচ্চ ${MAX_STORIES_PER_USER}টি স্টোরি শেয়ার করতে পারবেন। নতুন স্টোরি দেওয়ার জন্য আগের একটি স্টোরি ডিলিট করুন।`,
    };
  }

  const storyItem: StoryItem = {
    id: 'story_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    url: newStory.url,
    mediaType: newStory.mediaType,
    createdAt: Date.now(),
    viewers: generateDefaultViewersForStory(),
  };

  // Prepend latest story to the beginning so newly added story appears/plays first
  const updated = [storyItem, ...current];
  localStorage.setItem(MY_STORIES_KEY, JSON.stringify(updated));

  return {
    success: true,
    stories: updated,
  };
};

/**
 * Delete a specific story by ID
 */
export const deleteMyStoryById = (storyId: string): StoryItem[] => {
  const current = getMyStories();
  const updated = current.filter((s) => s.id !== storyId);
  localStorage.setItem(MY_STORIES_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * Save viewer / reaction to a specific story
 */
export const saveViewerToStory = (
  storyId: string,
  viewerUser: User,
  emoji?: string
): void => {
  const stories = getMyStories();
  const target = stories.find((s) => s.id === storyId);
  if (!target) return;

  const viewers = target.viewers || [];
  const existingIndex = viewers.findIndex((v) => v.user.id === viewerUser.id);

  if (existingIndex >= 0) {
    viewers[existingIndex] = {
      ...viewers[existingIndex],
      viewedAt: Date.now(),
      reaction: emoji || viewers[existingIndex].reaction,
    };
  } else {
    viewers.unshift({
      id: 'viewer_' + viewerUser.id + '_' + Date.now(),
      user: viewerUser,
      viewedAt: Date.now(),
      reaction: emoji,
    });
  }

  target.viewers = viewers;
  localStorage.setItem(MY_STORIES_KEY, JSON.stringify(stories));
};

/**
 * Format remaining time within 24 hours
 */
export const getRemainingStoryTime = (createdAt: number): string => {
  const elapsed = Date.now() - createdAt;
  const remaining = STORY_EXPIRATION_MS - elapsed;
  if (remaining <= 0) return 'Expired';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h left`;
  }
  return `${minutes}m left`;
};

/**
 * Record a reaction to friend's story
 */
export const reactToFriendStory = (
  storyAuthorId: string,
  currentUser: User,
  emoji: string
): void => {
  const key = `sky_chat_story_reaction_${storyAuthorId}`;
  localStorage.setItem(key, emoji);
};

export const getMyReactionForStory = (storyAuthorId: string): string | null => {
  return localStorage.getItem(`sky_chat_story_reaction_${storyAuthorId}`);
};

/**
 * Get Friend Story Bundles for demo friends with multiple stories per friend!
 * Allows testing multi-story queue and auto-advancing on friends' stories.
 */
export const getFriendStoryBundles = (): UserStoryBundle[] => {
  const users = getAllUsers();
  const now = Date.now();

  const bundles: UserStoryBundle[] = [
    {
      user: users[0] || initialDemoUsers[0],
      stories: [
        {
          id: 'demo_alex_1',
          url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&auto=format&fit=crop&q=80',
          mediaType: 'image',
          createdAt: now - 3 * 3600 * 1000,
          viewers: generateDefaultViewersForStory(),
        },
        {
          id: 'demo_alex_2',
          url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&auto=format&fit=crop&q=80',
          mediaType: 'image',
          createdAt: now - 2 * 3600 * 1000,
          viewers: generateDefaultViewersForStory(),
        },
        {
          id: 'demo_alex_3',
          url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&auto=format&fit=crop&q=80',
          mediaType: 'image',
          createdAt: now - 1 * 3600 * 1000,
          viewers: generateDefaultViewersForStory(),
        },
      ],
    },
    {
      user: users[1] || initialDemoUsers[1],
      stories: [
        {
          id: 'demo_sarah_1',
          url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1080&auto=format&fit=crop&q=80',
          mediaType: 'image',
          createdAt: now - 5 * 3600 * 1000,
          viewers: generateDefaultViewersForStory(),
        },
        {
          id: 'demo_sarah_2',
          url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1080&auto=format&fit=crop&q=80',
          mediaType: 'image',
          createdAt: now - 3 * 3600 * 1000,
          viewers: generateDefaultViewersForStory(),
        },
      ],
    },
    {
      user: users[2] || initialDemoUsers[2],
      stories: [
        {
          id: 'demo_tariq_1',
          url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&auto=format&fit=crop&q=80',
          mediaType: 'image',
          createdAt: now - 7 * 3600 * 1000,
          viewers: generateDefaultViewersForStory(),
        },
        {
          id: 'demo_tariq_2',
          url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=1080&auto=format&fit=crop&q=80',
          mediaType: 'image',
          createdAt: now - 4 * 3600 * 1000,
          viewers: generateDefaultViewersForStory(),
        },
      ],
    },
  ];

  return bundles;
};
