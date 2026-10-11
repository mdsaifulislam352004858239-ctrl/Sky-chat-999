export const formatMessageTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatChatTimestamp = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const oneDay = 86400000;

  if (diff < oneDay) {
    return formatMessageTime(timestamp);
  } else if (diff < oneDay * 7) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(timestamp).getDay()];
  } else {
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export const formatCallDuration = (seconds?: number): string => {
  if (!seconds) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
