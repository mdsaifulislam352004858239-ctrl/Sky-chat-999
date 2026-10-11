import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { resolveMediaUrl } from '../services/uploadService';

interface VoiceMessageBubbleProps {
  mediaUrl: string;
  duration?: number;
  isMe: boolean;
}

export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  mediaUrl,
  duration = 0,
  isMe,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [resolvedUrl, setResolvedUrl] = useState<string>(
    mediaUrl.startsWith('idb:') ? '' : mediaUrl
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    resolveMediaUrl(mediaUrl).then((url) => {
      if (isMounted) {
        setResolvedUrl(url || mediaUrl);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [mediaUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setAudioDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((err) => console.log('Audio playback error:', err));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Simulated static waveform bar heights for Messenger look
  const waveHeights = [20, 45, 75, 35, 90, 60, 40, 80, 50, 95, 70, 40, 60, 85, 30, 50, 70, 90];

  const progressPercent = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center space-x-2.5 py-1 min-w-[210px] max-w-xs">
      <audio ref={audioRef} src={resolvedUrl || mediaUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 cursor-pointer ${
          isMe
            ? 'bg-white text-sky-600 hover:bg-slate-100'
            : 'bg-sky-500 text-white hover:bg-sky-600'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform and Progress Bar */}
      <div className="flex-1 flex flex-col justify-center space-y-1">
        <div className="flex items-center space-x-0.5 h-6">
          {waveHeights.map((h, i) => {
            const barPercent = (i / waveHeights.length) * 100;
            const isFilled = progressPercent >= barPercent;

            return (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  isMe
                    ? isFilled
                      ? 'bg-white'
                      : 'bg-white/40'
                    : isFilled
                    ? 'bg-sky-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Hidden Range Slider for interactive dragging */}
        <input
          type="range"
          min="0"
          max={audioDuration || 1}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 opacity-0 -my-1 cursor-pointer"
        />

        {/* Time Labels */}
        <div
          className={`flex items-center justify-between text-[10px] ${
            isMe ? 'text-white/80' : 'text-slate-400 dark:text-slate-400'
          }`}
        >
          <span>{formatTime(currentTime)}</span>
          <span className="flex items-center space-x-1">
            <Volume2 className="w-2.5 h-2.5 inline" />
            <span>{formatTime(audioDuration || duration)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
