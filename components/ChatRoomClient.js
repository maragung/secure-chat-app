// components/ChatRoomClient.js
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import useWebRTC from '@/hooks/useWebRTC';
import MessageList from '@/components/MessageList';
import ChatInput from '@/components/ChatInput';
import UserList from '@/components/UserList';
import ThemeToggle from '@/components/ThemeToggle';
import { LogOut, Copy, Clock, MessageSquare } from 'lucide-react'; // Added MessageSquare back for consistency
import { useRouter } from 'next/router';

export default function ChatRoomClient({ roomId }) {
  const { username, logout: storeLogout, setCurrentRoomId, setStartTime, startTime, roomPassword } = useStore();
  const { sendMessageToAllPeers } = useWebRTC(roomId);
  const [onlineDuration, setOnlineDuration] = useState('00:00:00');
  const router = useRouter();

  useEffect(() => {
    // username is already checked by the parent page component before rendering this
    setCurrentRoomId(roomId);
  }, [roomId, setCurrentRoomId]);

  useEffect(() => {
    setStartTime(); // Set start time when component mounts
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
      clearInterval(timer); // Cleanup timer on unmount
    };
  }, [startTime, setStartTime]);

  const handleLogout = () => {
    storeLogout();
    router.replace('/');
  };

  const handleSendMessage = (text) => {
    sendMessageToAllPeers(text);
  };

  const copyRoomId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomId)
        .then(() => alert('Room ID copied to clipboard!'))
        .catch(err => console.error('Failed to copy Room ID: ', err));
    } else {
      // Fallback for older browsers or non-secure contexts (e.g. HTTP)
      const textArea = document.createElement("textarea");
      textArea.value = roomId;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Room ID copied to clipboard!');
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        alert('Failed to copy Room ID. Please copy it manually.');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-3 border-b border-border dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
           <MessageSquare size={28} className="text-primary dark:text-dark_primary" />
          <div>
            <h1 className="text-xl font-semibold text-primary dark:text-dark_primary truncate max-w-[150px] sm:max-w-xs md:max-w-sm" title={roomId}>Room: {roomId}</h1>
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

      <div className="flex flex-grow overflow-hidden">
        <main className="flex flex-col flex-grow">
          <MessageList />
          <ChatInput onSendMessage={handleSendMessage} />
        </main>
        <UserList />
      </div>
    </div>
  );
}
