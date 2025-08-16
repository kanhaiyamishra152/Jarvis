
import React, { useEffect, useRef } from 'react';
import { type Message } from '../types';
import ChatMessage from './ChatMessage';

interface ChatInterfaceProps {
  messages: Message[];
  speak: (text: string, messageId: string) => void;
  stopSpeaking: () => void;
  speakingMessageId: string | null;
  onEditMessage: (messageId: string, newText: string) => void;
  onImageRegenerate: (messageId: string) => void;
  onImageCancel: (messageId: string) => void;
  onImageConfirm: (messageId: string, confirmed: boolean) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  speak, 
  stopSpeaking, 
  speakingMessageId, 
  onEditMessage,
  onImageRegenerate,
  onImageCancel,
  onImageConfirm,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.map((msg) => (
        <ChatMessage
            key={msg.id}
            message={msg}
            speak={speak}
            stopSpeaking={stopSpeaking}
            speakingMessageId={speakingMessageId}
            onEdit={onEditMessage}
            onImageRegenerate={onImageRegenerate}
            onImageCancel={onImageCancel}
            onImageConfirm={onImageConfirm}
        />
      ))}
    </div>
  );
};

export default ChatInterface;
