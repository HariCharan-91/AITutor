import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { RoomInfo } from '../utils/roomConnection';

interface PreJoinPageProps {
  roomInfo: RoomInfo | null;
  onJoin: () => Promise<void>;
  isAITutor?: boolean;
}

export function PreJoinPage({ roomInfo, onJoin, isAITutor = false }: PreJoinPageProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Function to check and request device permissions
  const checkDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      setDeviceError(null);
    } catch (err) {
      console.error('Error accessing devices:', err);
      setDeviceError('Please allow access to your camera and microphone to join the session.');
    }
  };

  // Check devices when component mounts
  useEffect(() => {
    checkDevices();
  }, []);

  // Cleanup local stream when component unmounts
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  const handleJoinSession = async () => {
    if (!localStream) {
      setDeviceError('Please allow access to your camera and microphone to join the session.');
      return;
    }
    await onJoin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Join Session</h1>
        
        {/* Device preview */}
        <div className="mb-6">
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
            {localStream && (
              <video
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                ref={video => {
                  if (video) video.srcObject = localStream;
                }}
              />
            )}
          </div>
          
          {/* Device controls */}
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => {
                if (localStream) {
                  const videoTrack = localStream.getVideoTracks()[0];
                  if (videoTrack) {
                    videoTrack.enabled = !videoTrack.enabled;
                    setIsVideoEnabled(videoTrack.enabled);
                  }
                }
              }}
              className={`flex items-center space-x-2 ${
                isVideoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <span>{isVideoEnabled ? '🎥' : '🚫'}</span>
              <span>{isVideoEnabled ? 'Camera On' : 'Camera Off'}</span>
            </Button>
            
            <Button
              onClick={() => {
                if (localStream) {
                  const audioTrack = localStream.getAudioTracks()[0];
                  if (audioTrack) {
                    audioTrack.enabled = !audioTrack.enabled;
                    setIsAudioEnabled(audioTrack.enabled);
                  }
                }
              }}
              className={`flex items-center space-x-2 ${
                isAudioEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <span>{isAudioEnabled ? '🎤' : '🔇'}</span>
              <span>{isAudioEnabled ? 'Mic On' : 'Mic Off'}</span>
            </Button>
          </div>
        </div>

        {/* Session info */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Session Information</h2>
          <p className="text-gray-600">
            {roomInfo?.subject} Session with {roomInfo?.tutorName}
          </p>
        </div>

        {/* Error message */}
        {deviceError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{deviceError}</p>
          </div>
        )}

        {/* Join button */}
        <div className="flex justify-end">
          <Button
            onClick={handleJoinSession}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!localStream}
          >
            Join Session
          </Button>
        </div>
      </div>
    </div>
  );
} 