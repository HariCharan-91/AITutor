import { Button } from '@/components/ui/Button';

interface ControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isConnected: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveSession: () => void;
}

export function Controls({
  isAudioEnabled,
  isVideoEnabled,
  isConnected,
  onToggleAudio,
  onToggleVideo,
  onLeaveSession,
}: ControlsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-center space-x-4">
        <Button
          onClick={onToggleAudio}
          className={`${isAudioEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
          disabled={!isConnected}
        >
          {isAudioEnabled ? 'Mute' : 'Unmute'}
        </Button>
        <Button
          onClick={onToggleVideo}
          className={`${isVideoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
          disabled={!isConnected}
        >
          {isVideoEnabled ? 'Stop Video' : 'Start Video'}
        </Button>
        <Button
          onClick={onLeaveSession}
          className="bg-red-600 hover:bg-red-700"
        >
          Leave Session
        </Button>
      </div>
    </div>
  );
} 