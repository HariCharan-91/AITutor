import { useEffect, useRef, useState } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';

interface VideoAreaProps {
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isAITutor?: boolean;
}

export function VideoArea({ localParticipant, remoteParticipants, isAITutor = false }: VideoAreaProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [localVideoError, setLocalVideoError] = useState<string | null>(null);
  const [remoteVideoErrors, setRemoteVideoErrors] = useState<Map<string, string>>(new Map());

  // Effect to handle local video
  useEffect(() => {
    const setupLocalVideo = async () => {
      if (!localParticipant) {
        console.log('No local participant available');
        return;
      }

      if (!localVideoRef.current) {
        console.log('No local video element available');
        return;
      }

      try {
        console.log('Setting up local video...');
        
        // First ensure camera is enabled
        await localParticipant.setCameraEnabled(true);
        console.log('Camera enabled');

        // Get the video track
        const localVideoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
        console.log('Local video track:', localVideoTrack);

        if (localVideoTrack?.track) {
          console.log('Attaching local video track');
          localVideoTrack.track.attach(localVideoRef.current);
          setLocalVideoError(null);
        } else {
          console.warn('No local video track found');
          setLocalVideoError('No video track available');
        }
      } catch (error) {
        console.error('Error setting up local video:', error);
        setLocalVideoError('Failed to setup video');
      }
    };

    setupLocalVideo();

    return () => {
      if (localParticipant) {
        const localVideoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
        if (localVideoTrack?.track) {
          console.log('Detaching local video track');
          localVideoTrack.track.detach();
        }
      }
    };
  }, [localParticipant]);

  // Effect to handle remote videos
  useEffect(() => {
    const setupRemoteVideos = async () => {
      const cleanupFunctions: (() => void)[] = [];
      const newErrors = new Map<string, string>();

      for (const participant of remoteParticipants) {
        try {
          console.log(`Setting up video for participant ${participant.identity}...`);
          
          const remoteVideoPublication = participant.getTrackPublication(Track.Source.Camera);
          console.log('Remote video publication:', remoteVideoPublication);

          if (remoteVideoPublication?.isSubscribed && remoteVideoPublication.track) {
            const videoElement = remoteVideoRefs.current.get(participant.sid);
            if (videoElement) {
              console.log('Attaching remote video track');
              remoteVideoPublication.track.attach(videoElement);
              cleanupFunctions.push(() => {
                console.log('Detaching remote video track');
                remoteVideoPublication.track.detach();
              });
              newErrors.delete(participant.sid);
            } else {
              console.warn(`No video element found for participant ${participant.identity}`);
              newErrors.set(participant.sid, 'No video element available');
            }
          } else {
            console.warn(`No video track for participant ${participant.identity}`);
            newErrors.set(participant.sid, 'No video track available');
          }
        } catch (error) {
          console.error(`Error setting up video for participant ${participant.identity}:`, error);
          newErrors.set(participant.sid, 'Failed to setup video');
        }
      }

      setRemoteVideoErrors(newErrors);

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    };

    setupRemoteVideos();
  }, [remoteParticipants]);

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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local participant video */}
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            {localParticipant ? `${getParticipantDisplayName(localParticipant)} (You)` : 'You'}
          </div>
          {localVideoError && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
              {localVideoError}
            </div>
          )}
        </div>

        {/* Remote participants videos */}
        {remoteParticipants.map(participant => (
          <div
            key={participant.sid}
            className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden"
          >
            <video
              ref={el => {
                if (el) {
                  remoteVideoRefs.current.set(participant.sid, el);
                } else {
                  remoteVideoRefs.current.delete(participant.sid);
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              {`${getParticipantDisplayName(participant)} (${getParticipantRole(participant)})`}
            </div>
            {remoteVideoErrors.get(participant.sid) && (
              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
                {remoteVideoErrors.get(participant.sid)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 