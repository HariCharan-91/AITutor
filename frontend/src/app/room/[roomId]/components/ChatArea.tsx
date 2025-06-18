import { Button } from '@/components/ui/Button';

interface ChatAreaProps {
  messages: Array<{ sender: string; message: string }>;
  newMessage: string;
  onNewMessageChange: (message: string) => void;
  onSendMessage: () => void;
  isAITutor?: boolean;
  onMicClick?: () => void;
}

export function ChatArea({ messages, newMessage, onNewMessageChange, onSendMessage, isAITutor = false, onMicClick }: ChatAreaProps) {
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
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 bg-gray-100 hover:bg-blue-100 transition-colors text-2xl font-bold text-blue-600"
            aria-label="Add"
            type="button"
          >
            +
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button
            onClick={onMicClick}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 bg-gray-100 hover:bg-blue-100 transition-colors"
            aria-label="Speech to text"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="#2563eb" viewBox="0 0 24 24" stroke="none" className="w-6 h-6">
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-2.08A7 7 0 0 0 17 12z" />
            </svg>
          </button>
          <Button onClick={onSendMessage}>Send</Button>
        </div>
      </div>
    </div>
  );
} 