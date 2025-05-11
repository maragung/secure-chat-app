// components/MessageList.js
import { useEffect, useRef } from 'react';
import Message from './Message';
import { useStore } from '@/store/useStore';

export default function MessageList() {
  const messages = useStore((state) => state.messages);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  return (
    <div className="flex-grow p-4 space-y-2 overflow-y-auto bg-secondary/30 dark:bg-dark_secondary/30 rounded-md">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-secondary-foreground dark:text-dark_secondary-foreground">No messages yet. Say hello!</p>
        </div>
      )}
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
