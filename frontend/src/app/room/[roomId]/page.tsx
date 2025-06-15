'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeRoom = async () => {
      try {
        setIsLoading(true);
        // TODO: Initialize LiveKit room connection here
        console.log('Initializing room:', roomId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize room');
      } finally {
        setIsLoading(false);
      }
    };

    initializeRoom();
  }, [roomId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Room: {roomId}</h1>
        <div className="bg-white rounded-lg shadow p-4">
          {/* TODO: Add LiveKit room components here */}
          <p>Room content will be added here</p>
        </div>
      </div>
    </div>
  );
} 