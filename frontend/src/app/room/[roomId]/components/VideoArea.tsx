import { useEffect, useRef } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';

interface VideoAreaProps {
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isAITutor?: boolean;
}

export function VideoArea({ localParticipant, remoteParticipants, isAITutor = false }: VideoAreaProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Effect to handle local video
  useEffect(() => {
    if (localParticipant && localVideoRef.current) {
      const localVideoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
      if (localVideoTrack?.track) {
        localVideoTrack.track.attach(localVideoRef.current);
      }
    }

    return () => {
      if (localParticipant) {
        const localVideoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
        if (localVideoTrack?.track) {
          localVideoTrack.track.detach();
        }
      }
    };
  }, [localParticipant]);

  // Effect to handle remote videos
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    remoteParticipants.forEach(participant => {
      const remoteVideoPublication = participant.getTrackPublication(Track.Source.Camera);
      if (remoteVideoPublication?.isSubscribed && remoteVideoPublication.track) {
        const videoElement = remoteVideoRefs.current.get(participant.sid);
        if (videoElement) {
          remoteVideoPublication.track.attach(videoElement);
          cleanupFunctions.push(() => {
            remoteVideoPublication.track.detach();
          });
        }
      }
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [remoteParticipants]);

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
            You
          </div>
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
              {participant.name || participant.identity}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 