import { useEffect } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';

interface VideoAreaProps {
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isAITutor?: boolean;
}

export function VideoArea({ localParticipant, remoteParticipants, isAITutor = false }: VideoAreaProps) {
  // Effect to handle local video
  useEffect(() => {
    let localVideoElement: HTMLVideoElement | null = null;

    if (localParticipant) {
      const localVideoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
      if (localVideoTrack?.track) {
        localVideoElement = localVideoTrack.track.attach();
        const localContainer = document.getElementById('local-participant');
        if (localContainer) {
          localContainer.innerHTML = '';
          localContainer.appendChild(localVideoElement);
          localVideoElement.style.width = '100%';
          localVideoElement.style.height = '100%';
          localVideoElement.style.objectFit = 'cover';
        }
      }
    }

    // Cleanup function
    return () => {
      if (localVideoElement) {
        localVideoElement.remove();
      }
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
    const videoElements: HTMLVideoElement[] = [];

    remoteParticipants.forEach(participant => {
      const remoteVideoTrack = participant.getTrackPublication(Track.Source.Camera);
      if (remoteVideoTrack?.track) {
        const videoElement = remoteVideoTrack.track.attach();
        videoElements.push(videoElement);
        const remoteContainer = document.getElementById(`participant-${participant.sid}`);
        if (remoteContainer) {
          remoteContainer.innerHTML = '';
          remoteContainer.appendChild(videoElement);
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.objectFit = 'cover';
        }
      }
    });

    // Cleanup function
    return () => {
      videoElements.forEach(element => element.remove());
      remoteParticipants.forEach(participant => {
        const remoteVideoTrack = participant.getTrackPublication(Track.Source.Camera);
        if (remoteVideoTrack?.track) {
          remoteVideoTrack.track.detach();
        }
      });
    };
  }, [remoteParticipants]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local participant video */}
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <div id="local-participant" className="w-full h-full" />
        </div>

        {/* Remote participants videos */}
        {remoteParticipants.map(participant => (
          <div
            key={participant.sid}
            className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden"
          >
            <div id={`participant-${participant.sid}`} className="w-full h-full" />
          </div>
        ))}
      </div>
    </div>
  );
} 