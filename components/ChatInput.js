// components/ChatInput.js
import { useState } from 'react';
import { SendHorizonal } from 'lucide-react';

export default function ChatInput({ onSendMessage }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border dark:border-dark_border bg-background dark:bg-dark_background">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow p-3 border border-border dark:border-dark_border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark_primary bg-secondary/50 dark:bg-dark_secondary/50 placeholder-gray-500 dark:placeholder-gray-400"
        />
        <button
          type="submit"
          className="p-3 bg-primary dark:bg-dark_primary text-primary-foreground dark:text-dark_primary-foreground rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary dark:focus:ring-dark_primary"
          aria-label="Send message"
        >
          <SendHorizonal size={20} />
        </button>
      </div>
    </form>
  );
}
