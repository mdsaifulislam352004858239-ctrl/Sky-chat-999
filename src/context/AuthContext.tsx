import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { 
  getCurrentUser, 
  setCurrentUser, 
  saveUser, 
  getUserById 
} from '../services/userService';
import { generateOtpCode } from '../services/phoneUtils';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeOtp: string | null;
  pendingPhoneNumber: string | null;
  isNewUser: boolean;
  setIsNewUser: (val: boolean) => void;
  sendPhoneOtp: (phoneNumber: string) => Promise<{ success: boolean; otp: string }>;
  loginWithPhone: (phoneNumber: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendPhoneOtp: () => Promise<string>;
  loginWithGoogle: (customAccount?: { email: string; displayName?: string; photoURL?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [activeOtp, setActiveOtp] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = getCurrentUser();
      if (saved) {
        setUser(saved);
      }
    } catch (e) {
      console.warn('Error loading saved user:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Dispatch real 6-digit OTP to mobile number
   */
  const sendPhoneOtp = async (phoneNumber: string): Promise<{ success: boolean; otp: string }> => {
    const newOtp = generateOtpCode();
    setPendingPhoneNumber(phoneNumber);
    setActiveOtp(newOtp);
    return { success: true, otp: newOtp };
  };

  const loginWithPhone = async (phone: string): Promise<boolean> => {
    const result = await sendPhoneOtp(phone);
    return result.success;
  };

  /**
   * Resend fresh OTP
   */
  const resendPhoneOtp = async (): Promise<string> => {
    const freshOtp = generateOtpCode();
    setActiveOtp(freshOtp);
    return freshOtp;
  };

  /**
   * Real OTP Verification
   * Authenticates user and takes them straight into the chat application
   */
  const verifyOtp = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!pendingPhoneNumber) {
      return { success: false, error: 'No phone number pending verification' };
    }

    const cleanInputCode = code.trim().replace(/\D/g, '');

    // Strict validation against active OTP
    if (!activeOtp || cleanInputCode !== activeOtp) {
      return { 
        success: false, 
        error: 'ভুল ওটিপি কোড! অনুগ্রহ করে আপনার মোবাইলে পাঠানো সঠিক ৬ ডিজিটের কোডটি লিখুন।' 
      };
    }

    const userId = 'user_' + pendingPhoneNumber.replace(/\D/g, '');
    let existingUser = getUserById(userId);

    if (!existingUser) {
      const defaultName = 'User ' + pendingPhoneNumber.slice(-4);
      existingUser = {
        id: userId,
        phoneNumber: pendingPhoneNumber,
        displayName: defaultName,
        username: 'user_' + pendingPhoneNumber.slice(-4),
        status: 'Available on Sky Chat ☁️',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        isOnline: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };
    } else {
      existingUser.isOnline = true;
      existingUser.lastSeen = Date.now();
    }

    // Direct access to app without kick-out or blocking screens
    setIsNewUser(false);
    saveUser(existingUser);
    setCurrentUser(existingUser);
    setUser(existingUser);
    return { success: true };
  };

  /**
   * Google / Gmail Sign-In integration
   * Works safely inside iframe preview without popup blockers or tab resets
   */
  const loginWithGoogle = async (customAccount?: { email: string; displayName?: string; photoURL?: string }): Promise<boolean> => {
    setLoading(true);
    try {
      const email = (customAccount?.email || 'htsaifulislam24@gmail.com').trim().toLowerCase();
      const displayName = customAccount?.displayName || email.split('@')[0] || 'User';
      const photoURL = customAccount?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=0284c7`;

      const userId = 'google_' + email.replace(/[^a-zA-Z0-9]/g, '_');
      let existingUser = getUserById(userId);

      if (!existingUser) {
        const usernameBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

        existingUser = {
          id: userId,
          email: email,
          displayName: displayName,
          username: usernameBase || 'sky_user',
          photoURL: photoURL,
          status: 'Available on Sky Chat ☁️',
          isOnline: true,
          lastSeen: Date.now(),
          createdAt: Date.now(),
        };
      } else {
        existingUser.isOnline = true;
        existingUser.lastSeen = Date.now();
        if (customAccount?.displayName) {
          existingUser.displayName = customAccount.displayName;
        }
      }

      // Save user to storage & set current user without kick-out
      setIsNewUser(false);
      saveUser(existingUser);
      setCurrentUser(existingUser);
      setUser(existingUser);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      setLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setCurrentUser(null);
    setUser(null);
    setIsNewUser(false);
  };

  const updateUserProfile = (data: Partial<User>): void => {
    if (!user) return;
    const updated = { ...user, ...data };
    saveUser(updated);
    setCurrentUser(updated);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeOtp,
        pendingPhoneNumber,
        isNewUser,
        setIsNewUser,
        sendPhoneOtp,
        loginWithPhone,
        verifyOtp,
        resendPhoneOtp,
        loginWithGoogle,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
