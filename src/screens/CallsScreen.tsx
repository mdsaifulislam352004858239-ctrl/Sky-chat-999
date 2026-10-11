import React, { useState, useEffect } from 'react';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall } from 'lucide-react';
import { CallRecord, User } from '../types';
import { getCallHistory } from '../services/callService';
import { useCall } from '../context/CallContext';
import { Avatar } from '../components/Avatar';
import { formatChatTimestamp, formatCallDuration } from '../utils/time';
import { initialDemoUsers } from '../services/userService';

interface CallsScreenProps {
  onOpenChat: (user: User) => void;
}

export const CallsScreen: React.FC<CallsScreenProps> = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const { startCall, triggerIncomingCallSimulation } = useCall();

  useEffect(() => {
    setCalls(getCallHistory());
  }, []);

  const getStatusIcon = (status: CallRecord['status']) => {
    switch (status) {
      case 'missed':
        return <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />;
      case 'declined':
        return <PhoneIncoming className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Recent Calls</h1>
          <p className="text-xs text-slate-400">Audio and video call history</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (initialDemoUsers[0]) {
                startCall(initialDemoUsers[0], 'audio');
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>New Call</span>
          </button>
        </div>
      </header>

      {/* Call History List */}
      <div className="p-3 space-y-2">
        {calls.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No recent calls
          </div>
        ) : (
          calls.map((call) => {
            const partner = call.receiver;

            return (
              <div
                key={call.id}
                className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Avatar
                    src={partner.photoURL}
                    name={partner.displayName}
                    size="md"
                    isOnline={partner.isOnline}
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {partner.displayName}
                    </h3>
                    <div className="flex items-center space-x-1.5 mt-0.5 text-xs text-slate-400">
                      {getStatusIcon(call.status)}
                      <span className="capitalize">{call.type} Call</span>
                      <span>•</span>
                      <span>{formatChatTimestamp(call.timestamp)}</span>
                    </div>
                    {call.duration ? (
                      <span className="text-[11px] text-slate-400">
                        Duration: {formatCallDuration(call.duration)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => startCall(partner, call.type)}
                    className="p-2.5 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title={`Call again with ${call.type}`}
                  >
                    {call.type === 'video' ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
