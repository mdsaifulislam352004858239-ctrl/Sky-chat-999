import React, { useState, useRef } from 'react';
import { Camera, Check, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { uploadImageToImgBB, fileToDataUrl } from '../services/uploadService';
import { ImageCropperModal } from '../components/ImageCropperModal';

export const ProfileSetupScreen: React.FC = () => {
  const { user, updateUserProfile, setIsNewUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [status, setStatus] = useState(user?.status || 'Hey there! I am using Sky Chat.');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isUploading, setIsUploading] = useState(false);
  const [croppingImageSrc, setCroppingImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarOptions = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  ];

  const handleCustomPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setCroppingImageSrc(dataUrl);
    } catch (err) {
      console.error('Failed to read photo:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setIsUploading(true);
      const imgBbUrl = await uploadImageToImgBB(croppedBlob);
      setPhotoURL(imgBbUrl);
      setCroppingImageSrc(null);
    } catch (err) {
      console.error('Failed to upload cropped photo to ImgBB:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    updateUserProfile({
      displayName: displayName.trim(),
      username: (username || displayName.toLowerCase().replace(/\s+/g, '_')).trim(),
      status: status.trim(),
      photoURL: photoURL || undefined,
    });
    setIsNewUser(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center px-4 py-8">
      {/* Interactive Crop Modal */}
      {croppingImageSrc && (
        <ImageCropperModal
          imageSrc={croppingImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setCroppingImageSrc(null)}
          isUploading={isUploading}
        />
      )}

      {/* Hidden File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCustomPhotoUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Profile Setup</h2>
          <p className="text-sm text-slate-500 mt-1">
            Choose your avatar and tell people who you are
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Preview & Selection */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar
                src={photoURL}
                name={displayName || 'Sky User'}
                size="xl"
                className="ring-4 ring-sky-100 dark:ring-sky-900/40"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 cursor-pointer"
                title="Upload Photo via ImgBB"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3 mb-2 font-medium">Choose an Avatar</p>
            <div className="flex gap-2">
              {avatarOptions.map((opt, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setPhotoURL(opt)}
                  className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all ${
                    photoURL === opt
                      ? 'border-sky-500 scale-110 shadow-md shadow-sky-500/20'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={opt} alt="option" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. John Doe"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-400 text-sm font-semibold">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Status Message
              </label>
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="Available on Sky Chat"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/25 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 mr-2" />
            <span>Complete Setup</span>
          </button>
        </form>
      </div>
    </div>
  );
};
