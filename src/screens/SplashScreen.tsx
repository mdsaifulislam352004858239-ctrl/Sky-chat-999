import React from 'react';
import { Cloud, Sparkles } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-500 via-sky-600 to-blue-700 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30 animate-bounce">
          <Cloud className="w-14 h-14 text-white fill-white/80" />
        </div>
        <div className="absolute -top-1 -right-1 bg-amber-400 text-sky-900 rounded-full p-1.5 shadow-md">
          <Sparkles className="w-4 h-4 fill-amber-300" />
        </div>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Sky Chat</h1>
      <p className="text-sky-100/90 text-sm max-w-xs font-medium">
        Fast, crystal-clear messaging & HD calling
      </p>

      <div className="mt-12 flex items-center space-x-2">
        <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/70 animate-pulse delay-150" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/40 animate-pulse delay-300" />
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs font-medium text-sky-100/80 tracking-wide">
          Developer  HT Saiful Islam
        </p>
      </div>
    </div>
  );
};
