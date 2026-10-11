import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../context/CallContext';
import { Avatar } from '../components/Avatar';
import { ringtoneService } from '../services/ringtoneService';

export const IncomingCallScreen: React.FC = () => {
  const { incomingCall, acceptCall, declineCall } = useCall();

  useEffect(() => {
    ringtoneService.startIncomingRingtone();
    return () => {
      ringtoneService.stopAll();
    };
  }, []);

  if (!incomingCall) return null;

  const caller = incomingCall.caller;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex flex-col justify-between p-8 text-white max-w-md mx-auto">
      <div className="text-center pt-8">
        <span className="text-xs uppercase tracking-wider text-sky-400 font-bold bg-sky-950/60 px-3 py-1 rounded-full border border-sky-800">
          Incoming {incomingCall.type} Call
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full ring-8 ring-sky-500/20 animate-ping flex items-center justify-center absolute inset-0" />
          <Avatar src={caller.photoURL} name={caller.displayName} size="xl" />
        </div>
        <h2 className="text-2xl font-bold">{caller.displayName}</h2>
        <p className="text-sm text-slate-400 mt-1">Sky Chat is ringing...</p>
      </div>

      <div className="flex items-center justify-around pb-6">
        {/* Decline */}
        <button
          onClick={declineCall}
          className="flex flex-col items-center space-y-2 cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-full bg-rose-600 group-hover:bg-rose-700 flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform active:scale-95">
            <PhoneOff className="w-7 h-7 text-white" />
          </div>
          <span className="text-xs font-semibold text-rose-400">Decline</span>
        </button>

        {/* Accept */}
        <button
          onClick={acceptCall}
          className="flex flex-col items-center space-y-2 cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-600 group-hover:bg-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 animate-bounce">
            {incomingCall.type === 'video' ? (
              <Video className="w-7 h-7 text-white" />
            ) : (
              <Phone className="w-7 h-7 text-white" />
            )}
          </div>
          <span className="text-xs font-semibold text-emerald-400">Accept</span>
        </button>
      </div>
    </div>
  );
};
