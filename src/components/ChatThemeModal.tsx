import React from 'react';
import { X, Check } from 'lucide-react';

export interface ChatTheme {
  id: string;
  name: string;
  bubbleClass: string;
  previewBg: string;
  accentText: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'sky',
    name: 'Sky Blue (Classic)',
    bubbleClass: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white',
    previewBg: 'from-sky-500 to-blue-600',
    accentText: 'text-sky-500',
  },
  {
    id: 'berry',
    name: 'Berry Sunset',
    bubbleClass: 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white',
    previewBg: 'from-purple-500 via-pink-500 to-rose-500',
    accentText: 'text-pink-500',
  },
  {
    id: 'emerald',
    name: 'Emerald Mint',
    bubbleClass: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white',
    previewBg: 'from-emerald-500 to-teal-600',
    accentText: 'text-emerald-500',
  },
  {
    id: 'sunset',
    name: 'Sunset Flame',
    bubbleClass: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white',
    previewBg: 'from-amber-500 via-orange-500 to-rose-500',
    accentText: 'text-orange-500',
  },
  {
    id: 'cyber',
    name: 'Neon Cyber',
    bubbleClass: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white',
    previewBg: 'from-indigo-600 to-purple-600',
    accentText: 'text-indigo-500',
  },
  {
    id: 'fuchsia',
    name: 'Bubblegum Fuchsia',
    bubbleClass: 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white',
    previewBg: 'from-pink-500 to-fuchsia-600',
    accentText: 'text-fuchsia-500',
  },
];

interface ChatThemeModalProps {
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
  onClose: () => void;
}

export const ChatThemeModal: React.FC<ChatThemeModalProps> = ({
  currentThemeId,
  onSelectTheme,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Chat Theme & Color
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize the vibe for this conversation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {CHAT_THEMES.map((theme) => {
            const isSelected = currentThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  onSelectTheme(theme.id);
                  onClose();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-2 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-r ${theme.previewBg} flex items-center justify-center shadow-md relative`}
                >
                  {isSelected && <Check className="w-6 h-6 text-white stroke-[3]" />}
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {theme.name}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
