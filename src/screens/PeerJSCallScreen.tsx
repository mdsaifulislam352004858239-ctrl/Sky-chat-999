import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, PhoneOff, User, Bell } from 'lucide-react';
import { useCall } from '../context/CallContext';
import { Avatar } from '../components/Avatar';
import { formatCallDuration } from '../utils/time';

export const PeerJSCallScreen: React.FC = () => {
  const {
    activeCall,
    callStatus,
    callDuration,
    endCall,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Optional live local camera stream for video calls
  useEffect(() => {
    let localStream: MediaStream | null = null;
    if (activeCall?.type === 'video' && !isVideoOff) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          localStream = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          // Camera not available or blocked, graceful fallback
        });
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeCall?.type, isVideoOff]);

  if (!activeCall) return null;

  const partner = activeCall.receiver;
  const isVideo = activeCall.type === 'video' && !isVideoOff;
  const isConnected = callStatus === 'connected';
  const isRinging = callStatus === 'calling' || callStatus === 'ringing';
  const isEnded = callStatus === 'ended';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 text-white max-w-md mx-auto animate-in fade-in select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between z-10 pt-4">
        <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-200">
          HD Encrypted {activeCall.type.toUpperCase()} Call
        </div>

        {/* Dynamic Status / Speaking Duration Timer */}
        {isConnected ? (
          <div className="bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-400 flex items-center space-x-1.5 animate-in zoom-in-95">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{formatCallDuration(callDuration)}</span>
          </div>
        ) : isRinging ? (
          <div className="bg-sky-500/20 border border-sky-500/40 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-sky-400 flex items-center space-x-1.5 animate-pulse">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>Ringing...</span>
          </div>
        ) : isEnded ? (
          <div className="bg-rose-500/20 border border-rose-500/40 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-rose-400">
            Call Ended
          </div>
        ) : null}
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center my-8 relative">
        {isVideo ? (
          <div className="w-full h-80 rounded-3xl overflow-hidden relative shadow-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            {partner.photoURL ? (
              <img
                src={partner.photoURL}
                alt={partner.displayName}
                className="w-full h-full object-cover opacity-90"
              />
            ) : (
              <User className="w-24 h-24 text-slate-600" />
            )}

            {/* Video Calling Overlay Status */}
            {isRinging && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center space-y-3">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full ring-4 ring-sky-400 animate-ping absolute inset-0 opacity-40" />
                  <Avatar src={partner.photoURL} name={partner.displayName} size="lg" />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-bold text-white">{partner.displayName}</h3>
                  <p className="text-xs text-sky-400 animate-pulse mt-0.5">Ringing video call...</p>
                </div>
              </div>
            )}

            {/* Small PiP of user's camera */}
            <div className="absolute top-3 right-3 w-24 h-32 rounded-xl bg-slate-800 border-2 border-white/20 overflow-hidden shadow-lg flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-slate-300">
                You
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Animated Ringing Wave Avatar */}
            <div className="relative mb-6">
              {isRinging && (
                <>
                  <div className="w-32 h-32 rounded-full bg-sky-500/20 animate-ping absolute -inset-2" />
                  <div className="w-36 h-36 rounded-full bg-sky-500/10 animate-pulse absolute -inset-4" />
                </>
              )}
              {isConnected && (
                <div className="w-30 h-30 rounded-full bg-emerald-500/20 animate-pulse absolute -inset-1" />
              )}
              <div className="w-28 h-28 rounded-full ring-4 ring-sky-500/30 flex items-center justify-center relative">
                <Avatar src={partner.photoURL} name={partner.displayName} size="xl" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-1.5">{partner.displayName}</h2>

            {/* Status Text under Name */}
            {isRinging && (
              <p className="text-sm font-medium text-sky-400 animate-pulse flex items-center space-x-1.5">
                <span>Ringing phone...</span>
              </p>
            )}
            {isConnected && (
              <div className="flex flex-col items-center space-y-1">
                <p className="text-sm font-semibold text-emerald-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Call Connected</span>
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  {formatCallDuration(callDuration)}
                </p>
              </div>
            )}
            {isEnded && (
              <p className="text-sm font-medium text-rose-400">
                Call Ended • {formatCallDuration(callDuration)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 border border-white/10 flex items-center justify-around z-10 mb-2">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isMuted ? 'bg-rose-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {activeCall.type === 'video' && (
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
        )}

        <button
          onClick={toggleSpeaker}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isSpeakerOn ? 'bg-sky-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
          }`}
          title="Speaker"
        >
          <Volume2 className="w-5 h-5" />
        </button>

        <button
          onClick={endCall}
          className="w-13 h-13 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
