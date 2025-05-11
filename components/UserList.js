// components/UserList.js
import { useStore } from '@/store/useStore';
import { UserCircle2 } from 'lucide-react';

export default function UserList() {
  const peers = useStore((state) => state.peers);
  const currentUser = useStore((state) => state.username);
  
  // The peers map stores peerId -> { connection, dataChannel, username (once received) }
  // We need to extract usernames for display.
  const peerUsernames = Array.from(peers.values())
                             .map(peer => peer.username) // Assuming username is stored in peer object
                             .filter(Boolean); // Filter out any undefined usernames

  return (
    <div className="w-full md:w-64 lg:w-72 p-4 border-l border-border dark:border-dark_border bg-background dark:bg-dark_background overflow-y-auto">
      <h3 className="text-lg font-semibold mb-3 text-primary dark:text-dark_primary">Online Users ({1 + peerUsernames.length})</h3>
      <ul className="space-y-2">
        {/* Current User */}
        <li className="flex items-center gap-2 p-2 bg-secondary dark:bg-dark_secondary rounded-md">
          <UserCircle2 size={20} className="text-green-500" />
          <span className="font-medium text-foreground dark:text-dark_foreground">{currentUser} (You)</span>
        </li>
        {/* Other Peers */}
        {peerUsernames.map((name, index) => (
          <li key={index} className="flex items-center gap-2 p-2 hover:bg-secondary/70 dark:hover:bg-dark_secondary/70 rounded-md">
            <UserCircle2 size={20} className="text-primary dark:text-dark_primary" />
            <span className="text-foreground dark:text-dark_foreground">{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
