import { useEffect, useRef, useState } from 'react';
import { LocalParticipant, RemoteParticipant, Track, RemoteTrackPublication } from 'livekit-client';

interface VideoAreaProps {
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isAITutor?: boolean;
}

export function VideoArea({ localParticipant }: VideoAreaProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localVideoError, setLocalVideoError] = useState<string | null>(null);

  // Effect to handle local video
  useEffect(() => {
    const setupLocalVideo = async () => {
      if (!localParticipant) {
        return;
      }
      if (!localVideoRef.current) {
        return;
      }
      try {
        await localParticipant.setCameraEnabled(true);
        const waitForTrack = async () => {
          let attempts = 0;
          while (attempts < 10) {
            const localVideoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
            if (localVideoTrack?.track) {
              localVideoTrack.track.attach(localVideoRef.current!);
              setLocalVideoError(null);
              return;
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          throw new Error('Local video track not available after multiple attempts');
        };
        await waitForTrack();
      } catch (error) {
        setLocalVideoError('Failed to setup video');
      }
    };
    setupLocalVideo();
    return () => {
      if (localParticipant) {
        const localVideoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
        if (localVideoTrack?.track) {
          localVideoTrack.track.detach();
        }
      }
    };
  }, [localParticipant]);

  const getParticipantDisplayName = (participant: LocalParticipant | RemoteParticipant) => {
    if (participant.name) {
      return participant.name;
    }

    try {
      const metadata = JSON.parse(participant.metadata || '{}');
      if (metadata.originalName) {
        return metadata.originalName;
      }
    } catch (e) {
      console.warn('Failed to parse participant metadata:', e);
    }

    const identity = participant.identity;
    if (identity.includes('-')) {
      return identity.split('-')[0];
    }
    return identity;
  };

  const getParticipantRole = (participant: LocalParticipant | RemoteParticipant) => {
    try {
      const metadata = JSON.parse(participant.metadata || '{}');
      if (metadata.isAITutor) return 'AI Tutor';
      if (metadata.isTutor) return 'Tutor';
    } catch (e) {
      console.warn('Failed to parse participant metadata:', e);
    }
    return 'Student';
  };

  return (
    <div className="w-full h-full relative bg-gray-100 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {localParticipant ? 'You' : ''}
          </div>
          {localVideoError && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
              {localVideoError}
            </div>
          )}
    </div>
  );
} 