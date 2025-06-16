import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AITutorJoinProps {
  onJoin: (sessionId: string) => void;
}

export function AITutorJoin({ onJoin }: AITutorJoinProps) {
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleJoin = () => {
    if (!sessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }
    onJoin(sessionId.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">AI Tutor Join Session</h1>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700 mb-1">
              Session ID
            </label>
            <Input
              id="sessionId"
              type="text"
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                setError(null);
              }}
              placeholder="Enter the session ID"
              className="w-full"
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <Button
            onClick={handleJoin}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Join Session
          </Button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Enter the session ID provided by the student to join their tutoring session.</p>
        </div>
      </div>
    </div>
  );
} 