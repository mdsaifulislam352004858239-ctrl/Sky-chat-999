import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, CallRecord } from '../types';
import { addCallRecord } from '../services/callService';
import { ringtoneService } from '../services/ringtoneService';
import { initialDemoUsers } from '../services/userService';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

interface CallContextType {
  activeCall: CallRecord | null;
  incomingCall: CallRecord | null;
  isCallScreenOpen: boolean;
  callStatus: CallStatus;
  callDuration: number;
  startCall: (receiver: User, type: 'audio' | 'video') => void;
  triggerIncomingCallSimulation: (callerUser?: User, type?: 'audio' | 'video') => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode; currentUser: User | null }> = ({
  children,
  currentUser,
}) => {
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);
  const [isCallScreenOpen, setIsCallScreenOpen] = useState<boolean>(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callDuration, setCallDuration] = useState<number>(0);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const answerTimerRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);

  // Sync Duration Timer - ONLY runs when callStatus is 'connected'
  useEffect(() => {
    if (callStatus === 'connected') {
      setCallDuration(0);
      durationTimerRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current !== null) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      if (callStatus === 'idle') {
        setCallDuration(0);
      }
    }

    return () => {
      if (durationTimerRef.current !== null) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [callStatus]);

  // Clean up ringtones when provider unmounts
  useEffect(() => {
    return () => {
      ringtoneService.stopAll();
      if (answerTimerRef.current !== null) {
        clearTimeout(answerTimerRef.current);
      }
      if (durationTimerRef.current !== null) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, []);

  // Listen for Cross-Tab Calling Events via LocalStorage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sky_chat_call_signal' && e.newValue) {
        try {
          const signal = JSON.parse(e.newValue);
          if (signal.type === 'INCOMING_CALL' && currentUser && signal.receiverId === currentUser.id) {
            setIncomingCall(signal.callRecord);
            ringtoneService.startIncomingRingtone();
          } else if (signal.type === 'CALL_ACCEPTED' && activeCall && activeCall.id === signal.callId) {
            ringtoneService.stopAll();
            ringtoneService.playCallConnectedSound();
            setCallStatus('connected');
          } else if (signal.type === 'CALL_ENDED') {
            ringtoneService.stopAll();
            ringtoneService.playCallEndedSound();
            if (activeCall || incomingCall) {
              setCallStatus('ended');
              setTimeout(() => {
                setActiveCall(null);
                setIncomingCall(null);
                setIsCallScreenOpen(false);
                setCallStatus('idle');
              }, 800);
            }
          }
        } catch {
          // ignore parsing error
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentUser, activeCall, incomingCall]);

  const startCall = (receiver: User, type: 'audio' | 'video') => {
    if (!currentUser) return;

    // Reset previous call states
    if (answerTimerRef.current !== null) {
      clearTimeout(answerTimerRef.current);
      answerTimerRef.current = null;
    }
    if (durationTimerRef.current !== null) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    const newCall: CallRecord = {
      id: 'call_' + Date.now(),
      caller: currentUser,
      receiver,
      type,
      status: 'completed',
      timestamp: Date.now(),
      duration: 0,
    };

    setActiveCall(newCall);
    setIsCallScreenOpen(true);
    setCallStatus('calling');
    setCallDuration(0);

    // 🎵 Start Outgoing Calling Ringtone
    ringtoneService.startOutgoingRingtone();

    // Broadcast call signal for other tabs / devices
    localStorage.setItem(
      'sky_chat_call_signal',
      JSON.stringify({
        type: 'INCOMING_CALL',
        receiverId: receiver.id,
        callRecord: newCall,
        timestamp: Date.now(),
      })
    );

    // Simulated Friend Response: Picks up after 3.8 seconds of ringing
    answerTimerRef.current = window.setTimeout(() => {
      // Transition to connected state
      ringtoneService.stopAll();
      ringtoneService.playCallConnectedSound();
      setCallStatus('connected');
    }, 3800);
  };

  const acceptCall = () => {
    if (incomingCall) {
      ringtoneService.stopAll();
      ringtoneService.playCallConnectedSound();

      setActiveCall(incomingCall);
      setIncomingCall(null);
      setIsCallScreenOpen(true);
      setCallStatus('connected');

      // Notify caller tab if multi-tab
      localStorage.setItem(
        'sky_chat_call_signal',
        JSON.stringify({
          type: 'CALL_ACCEPTED',
          callId: incomingCall.id,
          timestamp: Date.now(),
        })
      );
    }
  };

  const declineCall = () => {
    ringtoneService.stopAll();
    ringtoneService.playCallEndedSound();

    if (incomingCall) {
      addCallRecord({
        ...incomingCall,
        status: 'declined',
      });
      localStorage.setItem(
        'sky_chat_call_signal',
        JSON.stringify({
          type: 'CALL_ENDED',
          callId: incomingCall.id,
          timestamp: Date.now(),
        })
      );
      setIncomingCall(null);
    }
    setCallStatus('idle');
  };

  const endCall = () => {
    if (answerTimerRef.current !== null) {
      clearTimeout(answerTimerRef.current);
      answerTimerRef.current = null;
    }

    ringtoneService.stopAll();
    ringtoneService.playCallEndedSound();

    if (activeCall) {
      addCallRecord({
        ...activeCall,
        duration: callDuration,
        status: callDuration > 0 ? 'completed' : 'missed',
      });

      localStorage.setItem(
        'sky_chat_call_signal',
        JSON.stringify({
          type: 'CALL_ENDED',
          callId: activeCall.id,
          timestamp: Date.now(),
        })
      );
    }

    setCallStatus('ended');

    // Give a brief smooth closing transition
    setTimeout(() => {
      setActiveCall(null);
      setIncomingCall(null);
      setIsCallScreenOpen(false);
      setCallStatus('idle');
      setCallDuration(0);
    }, 700);
  };

  const triggerIncomingCallSimulation = (callerUser?: User, type: 'audio' | 'video' = 'audio') => {
    const caller: User = callerUser || (currentUser?.id === initialDemoUsers[0].id ? initialDemoUsers[1] : initialDemoUsers[0]);

    const incoming: CallRecord = {
      id: 'call_in_' + Date.now(),
      caller,
      receiver: currentUser || caller,
      type,
      status: 'completed',
      timestamp: Date.now(),
      duration: 0,
    };

    setIncomingCall(incoming);
    ringtoneService.startIncomingRingtone();
  };

  const toggleMute = () => setIsMuted((prev) => !prev);
  const toggleVideo = () => setIsVideoOff((prev) => !prev);
  const toggleSpeaker = () => setIsSpeakerOn((prev) => !prev);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        isCallScreenOpen,
        callStatus,
        callDuration,
        startCall,
        triggerIncomingCallSimulation,
        acceptCall,
        declineCall,
        endCall,
        isMuted,
        isVideoOff,
        isSpeakerOn,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
