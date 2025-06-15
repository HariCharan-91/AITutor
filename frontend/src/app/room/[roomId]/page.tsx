'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const RoomPage = () => {
  const params = useParams() as { roomId: string };
  const roomId = params.roomId;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Initialize LiveKit connection here
    setIsLoading(false);
  }, [roomId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Room: {roomId}</h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-600">
            LiveKit integration coming soon...
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoomPage; 