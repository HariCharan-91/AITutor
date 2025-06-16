'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<{
    tutorName: string;
    subject: string;
    participantName: string;
  } | null>(null);

  useEffect(() => {
    const tutorName = searchParams.get('tutorName');
    const subject = searchParams.get('subject');
    const participantName = searchParams.get('participantName');

    if (tutorName && subject && participantName) {
      setRoomInfo({
        tutorName,
        subject,
        participantName
      });
    }

    const checkLiveKitConfig = async () => {
      try {
        // Try to create a room to check if LiveKit is configured
        const response = await fetch('/api/livekit/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: resolvedParams.roomId,
            metadata: JSON.stringify({
              tutorName,
              subject,
              participantName
            })
          }),
        });

        const data = await response.json();
        
        if (data.status === 'error') {
          setError('LiveKit integration is still in progress. Please try again later.');
        }
      } catch (err) {
        setError('LiveKit integration is still in progress. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    checkLiveKitConfig();
  }, [resolvedParams.roomId, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with session info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {roomInfo?.subject} Session
              </h1>
              <p className="text-gray-600">
                with {roomInfo?.tutorName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Room ID</p>
              <p className="font-mono text-sm">{resolvedParams.roomId}</p>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 h-[600px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-4xl">🎥</span>
                </div>
                <p className="text-gray-600">Video will appear here when LiveKit is configured</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participant info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600">👤</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{roomInfo?.participantName}</p>
                    <p className="text-sm text-gray-500">You</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600">👨‍🏫</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{roomInfo?.tutorName}</p>
                    <p className="text-sm text-gray-500">Tutor</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat area */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat</h2>
              <div className="h-[300px] bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                <p className="text-gray-500">Chat will be available when LiveKit is configured</p>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => window.history.back()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Leave Session
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 