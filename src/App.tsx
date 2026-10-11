import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider, useCall } from './context/CallContext';
import { SplashScreen } from './screens/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileSetupScreen } from './screens/ProfileSetupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ChatScreen } from './screens/ChatScreen';
import { FriendsScreen } from './screens/FriendsScreen';
import { FindFriendScreen } from './screens/FindFriendScreen';
import { CallsScreen } from './screens/CallsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PeerJSCallScreen } from './screens/PeerJSCallScreen';
import { IncomingCallScreen } from './screens/IncomingCallScreen';
import { BottomNav, TabType } from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { User } from './types';

const MainApp: React.FC = () => {
  const { user, loading, isNewUser } = useAuth();
  const { isCallScreenOpen, incomingCall } = useCall();

  const [currentTab, setCurrentTab] = useState<TabType>('chats');
  const [activeChatPartner, setActiveChatPartner] = useState<User | null>(null);
  const [isFindFriendOpen, setIsFindFriendOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Android hardware back button handling
  useEffect(() => {
    const handlePopState = () => {
      if (activeChatPartner) {
        setActiveChatPartner(null);
      } else if (isFindFriendOpen) {
        setIsFindFriendOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeChatPartner, isFindFriendOpen]);

  const handleOpenChat = (partner: User) => {
    window.history.pushState({ screen: 'chat' }, '');
    setActiveChatPartner(partner);
  };

  const handleOpenFindFriend = () => {
    window.history.pushState({ screen: 'find_friend' }, '');
    setIsFindFriendOpen(true);
  };

  if (loading || showSplash) {
    return <SplashScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-between w-full max-w-full overflow-x-hidden">
      {/* Active Call Fullscreen Overlay */}
      {isCallScreenOpen && <PeerJSCallScreen />}

      {/* Incoming Call Dialog Overlay */}
      {incomingCall && <IncomingCallScreen />}

      {/* Sub Screens (Chat or Find Friend) */}
      {activeChatPartner ? (
        <ChatScreen partner={activeChatPartner} onBack={() => setActiveChatPartner(null)} />
      ) : isFindFriendOpen ? (
        <FindFriendScreen
          onBack={() => setIsFindFriendOpen(false)}
          onOpenChat={(partner) => {
            setIsFindFriendOpen(false);
            setActiveChatPartner(partner);
          }}
        />
      ) : (
        /* Root Tabs */
        <>
          <main className="flex-1">
            {currentTab === 'chats' && (
              <HomeScreen
                onOpenChat={handleOpenChat}
                onOpenFindFriend={handleOpenFindFriend}
              />
            )}
            {currentTab === 'friends' && (
              <FriendsScreen
                onOpenChat={handleOpenChat}
                onOpenFindFriend={handleOpenFindFriend}
              />
            )}
            {currentTab === 'calls' && (
              <CallsScreen onOpenChat={handleOpenChat} />
            )}
            {currentTab === 'profile' && <ProfileScreen />}
          </main>

          {/* Bottom Navigation */}
          <BottomNav
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            unreadCount={1}
          />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const AuthConsumer: React.FC = () => {
  const { user } = useAuth();
  return (
    <CallProvider currentUser={user}>
      <MainApp />
    </CallProvider>
  );
};
