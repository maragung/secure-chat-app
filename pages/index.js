// pages/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { v4 as uuidv4 } from 'uuid';
import ThemeToggle from '@/components/ThemeToggle';
import { LogIn, Users, KeyRound, PlusCircle, ArrowRightCircle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { username, setUsername, setCurrentRoomId, setRoomPassword: setGlobalRoomPassword, logout } = useStore();
  const [inputUsername, setInputUsername] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [createRoomPassword, setCreateRoomPassword] = useState('');
  const [joinRoomPassword, setJoinRoomPassword] = useState('');

  useEffect(() => {
    // If user is already logged in (e.g. from previous session), prefill username
    if (username) {
      setInputUsername(username);
    }
  }, [username]);

  const handleLoginAndCreateRoom = (e) => {
    e.preventDefault();
    if (!inputUsername.trim()) {
      alert('Please enter a username.');
      return;
    }
    setUsername(inputUsername.trim());
    const newRoomId = uuidv4();
    setCurrentRoomId(newRoomId);
    setGlobalRoomPassword(createRoomPassword || null); // Store password if provided
    router.push(`/chat/${newRoomId}`);
  };

  const handleLoginAndJoinRoom = (e) => {
    e.preventDefault();
    if (!inputUsername.trim()) {
      alert('Please enter a username.');
      return;
    }
    if (!joinRoomId.trim()) {
      alert('Please enter a room ID.');
      return;
    }
    setUsername(inputUsername.trim());
    setCurrentRoomId(joinRoomId.trim());
    setGlobalRoomPassword(joinRoomPassword || null); // Store password if provided
    router.push(`/chat/${joinRoomId.trim()}`);
  };
  
  // If username exists, means user is "logged in"
  if (username) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md p-8 space-y-6 bg-card shadow-xl rounded-lg border border-border">
          <div className="text-center">
            <Users size={48} className="mx-auto text-primary dark:text-dark_primary mb-4" />
            <h1 className="text-3xl font-bold text-primary dark:text-dark_primary">Welcome back, {username}!</h1>
            <p className="text-secondary-foreground mt-2">Create a new chat room or join an existing one.</p>
          </div>

          <form onSubmit={handleLoginAndCreateRoom} className="space-y-4">
            <div>
              <label htmlFor="createRoomPassword" className="block text-sm font-medium text-foreground mb-1">
                Create Room Password (Optional)
              </label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="createRoomPassword"
                  type="password"
                  value={createRoomPassword}
                  onChange={(e) => setCreateRoomPassword(e.target.value)}
                  placeholder="Leave blank for open room"
                  className="w-full pl-10 pr-3 py-2.5 border border-border rounded-md focus:ring-2 focus:ring-primary dark:focus:ring-dark_primary focus:border-primary dark:focus:border-dark_primary bg-background dark:bg-dark_background placeholder-gray-400"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary dark:bg-dark_primary text-primary-foreground dark:text-dark_primary-foreground rounded-md font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-dark_primary"
            >
              <PlusCircle size={20} /> Create New Room
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-secondary-foreground">Or</span>
            </div>
          </div>
          
          <form onSubmit={handleLoginAndJoinRoom} className="space-y-4">
            <div>
              <label htmlFor="joinRoomId" className="block text-sm font-medium text-foreground mb-1">
                Join Existing Room ID
              </label>
              <div className="relative">
                <ArrowRightCircle size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="joinRoomId"
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Enter Room ID"
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-border rounded-md focus:ring-2 focus:ring-primary dark:focus:ring-dark_primary focus:border-primary dark:focus:border-dark_primary bg-background dark:bg-dark_background placeholder-gray-400"
                />
              </div>
            </div>
             <div>
              <label htmlFor="joinRoomPassword" className="block text-sm font-medium text-foreground mb-1">
                Room Password (if required)
              </label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="joinRoomPassword"
                  type="password"
                  value={joinRoomPassword}
                  onChange={(e) => setJoinRoomPassword(e.target.value)}
                  placeholder="Enter room password"
                  className="w-full pl-10 pr-3 py-2.5 border border-border rounded-md focus:ring-2 focus:ring-primary dark:focus:ring-dark_primary focus:border-primary dark:focus:border-dark_primary bg-background dark:bg-dark_background placeholder-gray-400"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary dark:bg-dark_secondary text-secondary-foreground dark:text-dark_secondary-foreground rounded-md font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary dark:focus:ring-dark_secondary"
            >
              <LogIn size={20} /> Join Room
            </button>
          </form>
          <button
            onClick={() => {
              logout();
              setInputUsername(''); // Clear input field on logout
            }}
            className="w-full mt-4 py-2.5 px-4 border border-red-500 text-red-500 rounded-md font-semibold hover:bg-red-500 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Login form if username is not set
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm p-8 space-y-6 bg-card shadow-xl rounded-lg border border-border">
        <div className="text-center">
          <Users size={48} className="mx-auto text-primary dark:text-dark_primary mb-4" />
          <h1 className="text-3xl font-bold text-primary dark:text-dark_primary">Secure P2P Chat</h1>
          <p className="text-secondary-foreground mt-2">Enter a username to begin.</p>
        </div>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6"> {/* Prevent default form submission, let buttons handle logic */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">
              Username
            </label>
            <div className="relative">
               <LogIn size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="username"
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                placeholder="Choose a username"
                required
                className="w-full pl-10 pr-3 py-2.5 border border-border rounded-md focus:ring-2 focus:ring-primary dark:focus:ring-dark_primary focus:border-primary dark:focus:border-dark_primary bg-background dark:bg-dark_background placeholder-gray-400"
              />
            </div>
          </div>
          
          <p className="text-xs text-center text-secondary-foreground">First, set your username. Then you can create or join a room.</p>
          
          <button
            onClick={() => {
                 if (!inputUsername.trim()) {
                    alert('Please enter a username.');
                    return;
                  }
                  setUsername(inputUsername.trim());
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary dark:bg-dark_primary text-primary-foreground dark:text-dark_primary-foreground rounded-md font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-dark_primary"
          >
            Set Username
          </button>
        </form>
      </div>
       <footer className="mt-8 text-center text-sm text-secondary-foreground">
        <p>&copy; {new Date().getFullYear()} P2P Chat. Privacy First.</p>
      </footer>
    </div>
  );
}
