'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, RoomEvent } from 'livekit-client';

// Generate a unique ID for each session
const generateUniqueId = () => {
  return 'user_' + Math.random().toString(36).substring(2, 9);
};

const RoomPage = () => {
  const params = useParams() as { roomId: string };
  const router = useRouter();
  const roomId = params.roomId;
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId] = useState(() => generateUniqueId());

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: roomId,
            identity: userId,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch token');
        }

        const data = await response.json();
        setToken(data.token);
      } catch (error) {
        console.error('Error fetching token:', error);
        setError(error instanceof Error ? error.message : 'Failed to join room');
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [roomId, userId]);

  const handleDisconnect = () => {
    router.push('/');
  };

  const handleError = (error: Error) => {
    console.error('LiveKit error:', error);
    setError(error.message);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading room...</div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">
          {error || 'Failed to join room'}
          <button 
            onClick={() => router.push('/')}
            className="block mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880'}
        video={true}
        audio={true}
        onDisconnected={handleDisconnect}
        onError={handleError}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            simulcast: true,
          },
        }}
      >
        <div className="h-screen">
          <VideoConference
            className="h-full"
          />
          <RoomAudioRenderer />
        </div>
      </LiveKitRoom>
    </div>
  );
};

export default RoomPage; 