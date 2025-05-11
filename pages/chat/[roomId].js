// pages/chat/[roomId].js
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import useWebRTC from '@/hooks/useWebRTC';
import MessageList from '@/components/MessageList';
import ChatInput from '@/components/ChatInput';
import UserList from '@/components/UserList';
import ThemeToggle from '@/components/ThemeToggle';
import { LogOut, Users, MessageSquare, Copy, Settings, Clock } from 'lucide-react';

export default function ChatRoomPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const { username, logout: storeLogout, currentRoomId, setCurrentRoomId, clearMessages, clearPeers, setStartTime, startTime, roomPassword } = useStore();
  const { sendMessageToAllPeers } = useWebRTC(roomId);
  const [onlineDuration, setOnlineDuration] = useState('00:00:00');

  useEffect(() => {
    if (!username) {
      router.replace('/'); // Redirect to home if not logged in
    } else if (roomId && currentRoomId !== roomId) {
      // This can happen if user navigates directly to a chat room URL
      // or if state is lost and re-established.
      // We ensure the store reflects the current room from the URL.
      setCurrentRoomId(roomId);
    }
  }, [username, router, roomId, currentRoomId, setCurrentRoomId]);

  useEffect(() => {
    setStartTime(); // Set start time when component mounts (and user is in room)
    const timer = setInterval(() => {
      if (startTime) {
        const now = Date.now();
        const diff = now - startTime;
        const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
        const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
        setOnlineDuration(`${hours}:${minutes}:${seconds}`);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [startTime, setStartTime]);


  const handleLogout = () => {
    storeLogout(); // This will clear username, currentRoomId, messages, peers, roomPassword
    // useWebRTC hook's cleanup will handle socket.close and peer connection closures
    router.replace('/');
  };

  const handleSendMessage = (text) => {
    sendMessageToAllPeers(text);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
      .then(() => alert('Room ID copied to clipboard!'))
      .catch(err => console.error('Failed to copy Room ID: ', err));
  };

  if (!username || !roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading or redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-border dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
           <MessageSquare size={28} className="text-primary dark:text-dark_primary" />
          <div>
            <h1 className="text-xl font-semibold text-primary dark:text-dark_primary">Room: {roomId}</h1>
            {roomPassword && <span className="text-xs text-orange-500">(Password Protected)</span>}
          </div>
          <button
            onClick={copyRoomId}
            title="Copy Room ID"
            className="p-1.5 text-secondary-foreground dark:text-dark_secondary-foreground hover:text-primary dark:hover:text-dark_primary hover:bg-secondary dark:hover:bg-dark_secondary rounded-md transition-colors"
          >
            <Copy size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-secondary-foreground dark:text-dark_secondary-foreground">
            <Clock size={16} />
            <span>{onlineDuration}</span>
          </div>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 py-2 px-3 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex flex-grow overflow-hidden">
        {/* Chat Messages */}
        <main className="flex flex-col flex-grow">
          <MessageList />
          <ChatInput onSendMessage={handleSendMessage} />
        </main>

        {/* User List (Sidebar) */}
        <UserList />
      </div>
    </div>
  );
}
