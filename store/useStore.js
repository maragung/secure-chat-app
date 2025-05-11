// store/useStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // Theme state
      theme: 'light', // 'light' or 'dark'
      initializeTheme: () => {
        if (typeof window !== 'undefined') {
          const storedTheme = localStorage.getItem('theme');
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
          set({ theme: initialTheme });
        }
      },
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      // User state
      username: null,
      setUsername: (username) => set({ username }),
      logout: () => set({ username: null, currentRoomId: null, messages: [], peers: new Map(), roomPassword: null }),

      // Room state
      currentRoomId: null,
      roomPassword: null, // Password for the current room (if any)
      setCurrentRoomId: (roomId) => set({ currentRoomId: roomId }),
      setRoomPassword: (password) => set({ roomPassword: password }),

      // Chat messages
      // messages will be an array of { id, sender, text, timestamp, type: 'message' | 'notification' }
      messages: [], 
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      clearMessages: () => set({ messages: [] }),

      // Peers in the current room: Map<peerId, RTCPeerConnection>
      peers: new Map(),
      addPeer: (peerId, connection) => set(state => {
        const newPeers = new Map(state.peers);
        newPeers.set(peerId, connection);
        return { peers: newPeers };
      }),
      removePeer: (peerId) => set(state => {
        const newPeers = new Map(state.peers);
        if (newPeers.has(peerId)) {
            const peer = newPeers.get(peerId);
            if (peer.connection) peer.connection.close(); // Close RTCPeerConnection
            if (peer.dataChannel) peer.dataChannel.close(); // Close DataChannel
        }
        newPeers.delete(peerId);
        return { peers: newPeers };
      }),
      getPeer: (peerId) => get().peers.get(peerId),
      clearPeers: () => {
        get().peers.forEach(peer => {
            if (peer.connection) peer.connection.close();
            if (peer.dataChannel) peer.dataChannel.close();
        });
        set({ peers: new Map() });
      },
      
      // Online duration
      startTime: null,
      setStartTime: () => set({ startTime: Date.now() }),
      clearStartTime: () => set({ startTime: null }),

      // WebSocket connection
      socket: null,
      setSocket: (socket) => set({ socket }),
    }),
    {
      name: 'secure-chat-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      partialize: (state) => ({ username: state.username, theme: state.theme }), // Persist only username and theme
    }
  )
);
