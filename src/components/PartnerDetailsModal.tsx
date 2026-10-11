import React, { useState, useEffect } from 'react';
import { X, Phone, Video, Palette, Image as ImageIcon, Search, Shield, Bell, BellOff } from 'lucide-react';
import { User, Message } from '../types';
import { Avatar } from '../components/Avatar';
import { resolveMediaUrl } from '../services/uploadService';

interface PartnerDetailsModalProps {
  partner: User;
  messages: Message[];
  onClose: () => void;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onOpenTheme: () => void;
  onToggleSearch: () => void;
}

export const PartnerDetailsModal: React.FC<PartnerDetailsModalProps> = ({
  partner,
  messages,
  onClose,
  onAudioCall,
  onVideoCall,
  onOpenTheme,
  onToggleSearch,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'media'>('info');
  const [isMuted, setIsMuted] = useState(false);
  const [resolvedMediaList, setResolvedMediaList] = useState<{ id: string; url: string; type: string }[]>([]);

  // Collect shared media in this chat
  const mediaMessages = messages.filter((m) => Boolean(m.mediaUrl && !m.isDeleted));

  useEffect(() => {
    let isMounted = true;
    Promise.all(
      mediaMessages.map(async (m) => {
        const resolved = await resolveMediaUrl(m.mediaUrl!);
        return {
          id: m.id,
          url: resolved || m.mediaUrl!,
          type: m.mediaType || 'image',
        };
      })
    ).then((res) => {
      if (isMounted) setResolvedMediaList(res);
    });

    return () => {
      isMounted = false;
    };
  }, [messages]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-10 sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Conversation Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Partner Avatar & Profile */}
          <div className="flex flex-col items-center text-center space-y-2">
            <Avatar src={partner.photoURL} name={partner.displayName} size="xl" isOnline={partner.isOnline} />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{partner.displayName}</h2>
              <p className="text-xs text-slate-400 font-mono">@{partner.username}</p>
            </div>
            {partner.status && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-3 py-1 rounded-full max-w-xs">
                "{partner.status}"
              </p>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => {
                onClose();
                onAudioCall();
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Audio</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onVideoCall();
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Video className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Video</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onToggleSearch();
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Search</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenTheme();
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Palette className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Theme</span>
            </button>
          </div>

          {/* Navigation Tabs (Info / Shared Media) */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'info'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Options
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'media'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>Shared Media</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {mediaMessages.length}
              </span>
            </button>
          </div>

          {activeTab === 'info' ? (
            <div className="space-y-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  {isMuted ? (
                    <BellOff className="w-5 h-5 text-rose-500" />
                  ) : (
                    <Bell className="w-5 h-5 text-slate-500" />
                  )}
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Mute Notifications
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {isMuted ? 'Muted' : 'Sound alerts enabled'}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors p-0.5 ${
                    isMuted ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isMuted ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center space-x-3">
                <Shield className="w-5 h-5 text-emerald-500" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    End-to-end Encryption
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Messages and calls are secured with peer encryption
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {resolvedMediaList.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No media shared in this conversation yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {resolvedMediaList.map((m) => (
                    <div
                      key={m.id}
                      className="aspect-square rounded-xl overflow-hidden bg-black/10 dark:bg-white/5 relative group cursor-pointer"
                    >
                      {m.type === 'video' ? (
                        <video src={m.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={m.url} alt="Shared" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
