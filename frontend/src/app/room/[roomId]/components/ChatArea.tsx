import { Button } from '@/components/ui/Button';
import { useState } from 'react';

interface ChatAreaProps {
  messages: Array<{ sender: string; message: string }>;
  newMessage: string;
  onNewMessageChange: (message: string) => void;
  onSendMessage: () => void;
  isAITutor?: boolean;
}

export function ChatArea({ messages, newMessage, onNewMessageChange, onSendMessage, isAITutor = false }: ChatAreaProps) {
  const [isListening, setIsListening] = useState(false);

  // Placeholder for speech-to-text logic
  const handleSpeech = () => {
    setIsListening((prev) => !prev);
    // Add speech-to-text logic here
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat</h2>
      <div className="h-[220px] bg-gray-50 rounded-lg p-4 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg border text-sm break-words '
                  ${msg.sender === 'You'
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-gray-200 text-gray-900 border-gray-300'}
                `}
              >
                <span className="block font-medium mb-1">{msg.sender}</span>
                <span>{msg.message}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex space-x-2 items-center">
          <button
            onClick={handleSpeech}
            className={`w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 bg-gray-100 hover:bg-blue-100 transition-colors ${isListening ? 'ring-2 ring-blue-400' : ''}`}
            aria-label="Speech to text"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v1.5m0 0h3.375m-3.375 0H8.625M12 3.75v9m0 0a3 3 0 01-3 3m3-3a3 3 0 003 3m-7.5 0a7.5 7.5 0 0015 0" />
            </svg>
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <Button onClick={onSendMessage}>Send</Button>
        </div>
      </div>
    </div>
  );
} 