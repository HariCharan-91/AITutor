import { useEffect, useRef, useState } from 'react';
import { RemoteParticipant, Track } from 'livekit-client';

interface RemoteVideoAreaProps {
  participant: RemoteParticipant;
}

export function RemoteVideoArea({ participant }: RemoteVideoAreaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    const setupRemoteVideo = async () => {
      if (!participant) return;
      if (!videoRef.current) return;
      try {
        const waitForTrack = async () => {
          let attempts = 0;
          while (attempts < 10) {
            const remoteVideoPublication = participant.getTrackPublication(Track.Source.Camera);
            if (remoteVideoPublication?.isSubscribed && remoteVideoPublication.track) {
              remoteVideoPublication.track.attach(videoRef.current!);
              setVideoError(null);
              return;
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          throw new Error('Remote video track not available after multiple attempts');
        };
        await waitForTrack();
      } catch (error) {
        setVideoError('No video available');
      }
    };
    setupRemoteVideo();
    return () => {
      const remoteVideoPublication = participant.getTrackPublication(Track.Source.Camera);
      if (remoteVideoPublication?.track) {
        remoteVideoPublication.track.detach();
      }
    };
  }, [participant]);

  return (
    <div className="w-full h-full relative bg-red-500 rounded-lg overflow-hidden flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {participant.name || participant.identity}
      </div>
      {videoError && (
        <div className="absolute top-2 left-2 bg-red-700 text-white px-2 py-1 rounded text-sm">
          {videoError}
        </div>
      )}
    </div>
  );
} 