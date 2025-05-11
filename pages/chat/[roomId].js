// pages/chat/[roomId].js
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';

// Dynamically import the component that uses WebRTC and other client-side features
const ChatRoomClient = dynamic(() => import('@/components/ChatRoomClient'), { // Assume ChatRoomClient contains the previous page content
  ssr: false, // This is key
  loading: () => <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><p>Loading Chat...</p></div>
});

export default function ChatRoomPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const { username } = useStore();

  useEffect(() => {
    if (!username && roomId) { // Only redirect if not logged in AND we are on a chat page attempt
      router.replace('/');
    }
  }, [username, roomId, router]);

  if (!username && !roomId) { // Still loading router query or genuinely no username
      return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><p>Loading...</p></div>;
  }
  
  if (!username && roomId) { // User is not logged in but tried to access a room directly
    // useEffect will handle redirect, show loading or a message
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><p>Redirecting to login...</p></div>;
  }

  if (!roomId) { // roomId not available yet from router.query
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><p>Loading room details...</p></div>;
  }
  
  // Only render ChatRoomClient if we have a username and roomId
  return username && roomId ? <ChatRoomClient roomId={roomId} /> : null; 
}
