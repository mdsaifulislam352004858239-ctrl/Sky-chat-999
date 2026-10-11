import { CallRecord } from '../types';
import { initialDemoUsers } from './userService';

const CALLS_KEY = 'sky_chat_calls';

export const getCallHistory = (): CallRecord[] => {
  const stored = localStorage.getItem(CALLS_KEY);
  if (!stored) {
    const defaultCalls: CallRecord[] = [
      {
        id: 'call_1',
        caller: initialDemoUsers[0],
        receiver: initialDemoUsers[1],
        type: 'video',
        status: 'completed',
        duration: 245,
        timestamp: Date.now() - 3600000 * 5,
      },
      {
        id: 'call_2',
        caller: initialDemoUsers[1],
        receiver: initialDemoUsers[0],
        type: 'audio',
        status: 'missed',
        timestamp: Date.now() - 3600000 * 24,
      },
      {
        id: 'call_3',
        caller: initialDemoUsers[2],
        receiver: initialDemoUsers[0],
        type: 'video',
        status: 'completed',
        duration: 112,
        timestamp: Date.now() - 86400000 * 2,
      },
    ];
    localStorage.setItem(CALLS_KEY, JSON.stringify(defaultCalls));
    return defaultCalls;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const addCallRecord = (call: CallRecord): void => {
  const calls = getCallHistory();
  calls.unshift(call);
  localStorage.setItem(CALLS_KEY, JSON.stringify(calls));
};
