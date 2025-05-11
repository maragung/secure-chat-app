// components/Message.js
import { useStore } from '@/store/useStore';

export default function Message({ message }) {
  const currentUser = useStore((state) => state.username);
  const isCurrentUser = message.sender === currentUser;
  const isNotification = message.type === 'notification';

  if (isNotification) {
    return (
      <div className="my-2 text-center">
        <p className="text-xs text-secondary-foreground dark:text-dark_secondary-foreground italic px-2 py-1 bg-secondary dark:bg-dark_secondary rounded-md inline-block">
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex my-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[70%] p-3 rounded-lg shadow ${
          isCurrentUser 
            ? 'bg-primary dark:bg-dark_primary text-primary-foreground dark:text-dark_primary-foreground rounded-br-none' 
            : 'bg-card dark:bg-dark_card text-foreground dark:text-dark_foreground border border-border dark:border-dark_border rounded-bl-none'
        }`}
      >
        {!isCurrentUser && (
          <p className="text-xs font-semibold mb-1 text-indigo-500 dark:text-indigo-400">{message.sender}</p>
        )}
        <p className="text-sm break-words">{message.text}</p>
        <p className={`text-xs mt-1 ${isCurrentUser ? 'text-slate-300 dark:text-slate-500' : 'text-gray-500 dark:text-gray-400'} text-right`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
