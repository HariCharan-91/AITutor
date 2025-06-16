import { Button } from '@/components/ui/Button';

interface ChatAreaProps {
  messages: Array<{ sender: string; message: string }>;
  newMessage: string;
  onNewMessageChange: (message: string) => void;
  onSendMessage: () => void;
}

export function ChatArea({ messages, newMessage, onNewMessageChange, onSendMessage }: ChatAreaProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat</h2>
      <div className="h-[300px] bg-gray-50 rounded-lg p-4 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4">
          {messages.map((msg, index) => (
            <div key={index} className="mb-2">
              <p className="text-sm font-medium text-gray-900">{msg.sender}</p>
              <p className="text-sm text-gray-600">{msg.message}</p>
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={onSendMessage}>Send</Button>
        </div>
      </div>
    </div>
  );
} 