import React, { useState, useRef } from 'react';
import { LogOut, User, Mail, Phone, Edit2, Shield, Bell, HelpCircle, Check, Cloud, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { uploadImageToImgBB, fileToDataUrl } from '../services/uploadService';
import { ImageCropperModal } from '../components/ImageCropperModal';

export const ProfileScreen: React.FC = () => {
  const { user, logout, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [status, setStatus] = useState(user?.status || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [croppingImageSrc, setCroppingImageSrc] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setCroppingImageSrc(dataUrl);
    } catch (err) {
      console.error('Failed to read image file:', err);
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setIsUploadingPhoto(true);
      const imgBbUrl = await uploadImageToImgBB(croppedBlob);
      updateUserProfile({ photoURL: imgBbUrl });
      setCroppingImageSrc(null);
    } catch (err) {
      console.error('Failed to upload cropped photo to ImgBB:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = () => {
    updateUserProfile({
      displayName: displayName.trim(),
      status: status.trim(),
    });
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 max-w-md mx-auto">
      {/* Interactive Crop Modal */}
      {croppingImageSrc && (
        <ImageCropperModal
          imageSrc={croppingImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setCroppingImageSrc(null)}
          isUploading={isUploadingPhoto}
        />
      )}

      {/* Hidden Avatar File Input */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Profile & Settings</h1>
        {isEditing ? (
          <button
            onClick={handleSave}
            className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save</span>
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-1 text-xs font-semibold text-sky-600 dark:text-sky-400 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        )}
      </header>

      {/* Profile Card */}
      <div className="p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
          <div className="relative mb-4">
            <Avatar
              src={user.photoURL}
              name={user.displayName}
              size="xl"
              className="shadow-md ring-4 ring-sky-50 dark:ring-sky-950/40"
            />
            {isEditing && (
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 cursor-pointer transition-transform active:scale-95"
                title="Change Photo via ImgBB"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="w-full space-y-3 mt-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full text-center font-bold text-base px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                placeholder="Display Name"
              />
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-center text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                placeholder="Status Message"
              />
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {user.displayName}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">@{user.username}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-full">
                {user.status || 'Available on Sky Chat'}
              </p>
            </>
          )}

          <div className="w-full grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-left">
            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
                <Phone className="w-3.5 h-3.5" />
                <span>Phone</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user.phoneNumber || 'Not linked'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
                <Mail className="w-3.5 h-3.5" />
                <span>Gmail / Email</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user.email || 'Not linked'}
              </p>
            </div>
          </div>
        </div>

        {/* Options List */}
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
          <div className="p-3.5 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
            <div className="flex items-center space-x-3">
              <Bell className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-medium">Notifications & Sounds</span>
            </div>
            <span className="text-xs text-slate-400">Enabled</span>
          </div>

          <div className="p-3.5 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
            <div className="flex items-center space-x-3">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium">Privacy & Security</span>
            </div>
            <span className="text-xs text-slate-400">E2E Encrypted</span>
          </div>

          <div className="p-3.5 flex flex-col justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Cloud className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-medium">App Version</span>
              </div>
              <span className="text-xs text-slate-400">Sky Chat 2.4</span>
            </div>
            <div className="mt-1.5 ml-7 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Developer: <span className="font-semibold text-sky-600 dark:text-sky-400">HT Saiful Islam</span>
            </div>
          </div>
        </div>

        {/* Logout Section */}
        <div className="mt-6">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-2xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 border border-rose-200/60 dark:border-rose-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out of Sky Chat</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal / Page */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Sign Out?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Are you sure you want to log out of Sky Chat?
            </p>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer shadow-sm shadow-rose-500/20"
              >
                Sign Out
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Developer <span className="font-semibold text-sky-600 dark:text-sky-400">HT Saiful Islam</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
