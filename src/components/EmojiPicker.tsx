import React, { useState } from 'react';
import { X } from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    id: 'popular',
    name: 'Popular',
    icon: '🔥',
    emojis: ['👍', '❤️', '😂', '🔥', '🎉', '😍', '👏', '🥳', '✨', '🥰', '🙏', '💯'],
  },
  {
    id: 'smileys',
    name: 'Smileys',
    icon: '😊',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏',
      '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤕', '🥶',
      '🥵', '🤯', '😎', '🥳', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳',
      '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
      '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '💩',
    ],
  },
  {
    id: 'gestures',
    name: 'Hands & Love',
    icon: '👋',
    emojis: [
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇',
      '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙌', '👏', '🤲', '🙏', '💪',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔', '❣️', '💕',
      '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💋', '💌', '💐', '🌹', '🌸',
    ],
  },
  {
    id: 'fun',
    name: 'Fun & Food',
    icon: '🎉',
    emojis: [
      '🎉', '🎊', '🎈', '🎂', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🎮',
      '🎵', '🎶', '🎸', '🍿', '🍕', '🍔', '🍟', '🍦', '🍩', '🍫', '☕', '🍻',
      '🚀', '⭐', '🌟', '💫', '⚡', '🌈', '☀️', '🌙', '🌊', '🐶', '🐱', '🦄',
    ],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  const [activeTab, setActiveTab] = useState(EMOJI_CATEGORIES[0].id);

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 w-72 max-w-[90vw] animate-in fade-in zoom-in-95 duration-150">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
        <div className="flex space-x-1">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={`px-2 py-1 rounded-lg text-sm transition-colors cursor-pointer ${
                activeTab === cat.id
                  ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
              }`}
              title={cat.name}
            >
              <span>{cat.icon}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-6 gap-1 max-h-52 overflow-y-auto pr-1">
        {currentCategory.emojis.map((emoji, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="text-xl hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-transform active:scale-125 hover:scale-110 flex items-center justify-center cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
