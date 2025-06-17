'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { VideoArea } from './components/VideoArea';
import { ParticipantList } from './components/ParticipantList';
import { ChatArea } from './components/ChatArea';
import { Controls } from './components/Controls';
import { PreJoinPage } from './components/PreJoinPage';
import { connectToRoom, leaveRoom, RoomInfo } from './utils/roomConnection';
import { Room, RemoteParticipant, LocalParticipant, RemoteTrack, ConnectionState, RoomEvent, Track, RemoteTrackPublication } from 'livekit-client';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [messages, setMessages] = useState<Array<{ sender: string; message: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPreJoin, setIsPreJoin] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(2);
  const isAITutor = searchParams.get('isAITutor') === 'true';

  const handleConnectionStateChange = (state: ConnectionState) => {
    console.log('Connection state changed:', state);
    setIsConnected(state === ConnectionState.Connected);
    
    if (state === ConnectionState.Disconnected) {
      setError('Connection lost. Attempting to reconnect...');
    } else if (state === ConnectionState.Connected) {
      setError(null);
    } else if (state === ConnectionState.SignalReconnecting) {
      setError('Reconnecting to session...');
    }
  };

  const handleParticipantConnected = (participant: RemoteParticipant) => {
    setRemoteParticipants(prev => {
      const existing = prev.find(p => p.identity === participant.identity);
      if (!existing) {
        console.log(`Participant connected: ${participant.identity}`);
        return [...prev, participant];
      }
      return prev;
    });
  };

  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    setRemoteParticipants(prev => prev.filter(p => p.identity !== participant.identity));
  };

  const handleTrackSubscribed = (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
    console.log(`Track subscribed: ${track.kind} for ${participant.identity} (SID: ${participant.sid})`);
  };

  const handleTrackUnsubscribed = (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
    console.log(`Track unsubscribed: ${track.kind} for ${participant.identity}`);
    track.detach().forEach(element => element.remove());
  };

  const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
    const decoder = new TextDecoder();
    const message = decoder.decode(payload);
    setMessages(prev => [...prev, { sender: participant?.identity || 'Unknown', message }]);
  };

  const handleConnectToRoom = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { room: newRoom, localParticipant: newLocalParticipant } = await connectToRoom(
        resolvedParams.roomId,
        handleConnectionStateChange,
        handleParticipantConnected,
        handleParticipantDisconnected,
        handleTrackSubscribed,
        handleTrackUnsubscribed,
        handleDataReceived
      );

      // Set room and local participant immediately
      setRoom(newRoom);
      setLocalParticipant(newLocalParticipant);
      setIsConnected(true);
      setError(null);

      // Re-add event listeners directly to the room object for clearer reactivity
      newRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
      newRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      newRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      newRoom.on(RoomEvent.DataReceived, handleDataReceived);
      newRoom.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);

      // Handle participants already in the room when connecting
      // Set remote participants first to ensure VideoArea renders their containers
      const initialRemoteParticipants: RemoteParticipant[] = Array.from(newRoom.remoteParticipants.values());
      setRemoteParticipants(initialRemoteParticipants);

    } catch (err) {
      console.error('Connection error:', err);
      if (err instanceof Error && err.message.includes('room is full')) {
        setError('Room is at maximum capacity. Please try again later.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to connect to room');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAudio = async () => {
    if (room && localParticipant) {
      try {
        await localParticipant.setMicrophoneEnabled(!isAudioEnabled);
        setIsAudioEnabled(!isAudioEnabled);
      } catch (err) {
        console.error('Error toggling audio:', err);
        setError('Failed to toggle microphone');
      }
    }
  };

  const handleToggleVideo = async () => {
    if (room && localParticipant) {
      try {
        await localParticipant.setCameraEnabled(!isVideoEnabled);
        setIsVideoEnabled(!isVideoEnabled);
      } catch (err) {
        console.error('Error toggling video:', err);
        setError('Failed to toggle camera');
      }
    }
  };

  const handleLeaveSession = async () => {
    try {
      // First, disable camera and microphone
      if (localParticipant) {
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setMicrophoneEnabled(false);
      }

      // Then leave the room
      await leaveRoom(room, resolvedParams.roomId);
      
      // Reset all state
      setRoom(null);
      setLocalParticipant(null);
      setRemoteParticipants([]);
      setMessages([]);
      setIsAudioEnabled(false);
      setIsVideoEnabled(false);
      setIsConnected(false);
      
      // Navigate back
      window.history.back();
    } catch (error) {
      console.error('Error leaving session:', error);
      setError('Failed to leave session properly. Please try again.');
      
      // Even if there's an error, try to force disconnect
      if (room) {
        try {
          await room.disconnect();
        } catch (disconnectError) {
          console.error('Error during forced disconnect:', disconnectError);
        }
      }
    }
  };

  const handleSendMessage = () => {
    if (room && newMessage.trim()) {
      const encoder = new TextEncoder();
      room.localParticipant.publishData(encoder.encode(newMessage));
      setMessages(prev => [...prev, { sender: 'You', message: newMessage }]);
      setNewMessage('');
    }
  };

  useEffect(() => {
    const tutorName = searchParams.get('tutorName');
    const subject = searchParams.get('subject');
    const participantName = searchParams.get('participantName');

    if (tutorName && subject && participantName) {
      setRoomInfo({
        tutorName,
        subject,
        participantName
      });
    } else {
      setError('Missing required session information');
      setIsLoading(false);
    }

    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [resolvedParams.roomId, searchParams]);

  if (isPreJoin) {
    return (
      <PreJoinPage
        roomInfo={roomInfo}
        onJoin={async () => {
          setIsPreJoin(false);
          await handleConnectToRoom();
        }}
        isAITutor={isAITutor}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connecting to Session...</h2>
          <p className="text-gray-600">Please wait while we set up your video call</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Join Session</h2>
          <p className="text-gray-600 mb-6">
            {roomInfo?.subject} Session with {roomInfo?.tutorName}
          </p>
          <Button
            onClick={handleConnectToRoom}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Join Session'}
          </Button>
          {error && (
            <p className="mt-4 text-red-600">{error}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={handleConnectToRoom}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with session info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {roomInfo?.subject} Session
              </h1>
              <p className="text-gray-600">
                with {roomInfo?.tutorName}
                {isAITutor && <span className="ml-2 text-blue-600">(AI Tutor)</span>}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Participants: {remoteParticipants.length + 1}/{maxParticipants}
                {remoteParticipants.length + 1 >= maxParticipants && (
                  <span className="ml-2 text-red-500">(Room Full)</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <div>
                  <p className="text-sm text-gray-500">Session ID</p>
                  <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {resolvedParams.roomId}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resolvedParams.roomId);
                    const button = document.getElementById('copyButton');
                    if (button) {
                      const originalText = button.textContent;
                      button.textContent = 'Copied!';
                      button.classList.add('bg-green-600');
                      setTimeout(() => {
                        button.textContent = originalText;
                        button.classList.remove('bg-green-600');
                      }, 2000);
                    }
                  }}
                  id="copyButton"
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Copy ID
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video area */}
          <div className="lg:col-span-2">
            <VideoArea
              localParticipant={localParticipant}
              remoteParticipants={remoteParticipants}
              isAITutor={isAITutor}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ParticipantList
              participantName={roomInfo?.participantName || ''}
              tutorName={roomInfo?.tutorName || ''}
              remoteParticipants={remoteParticipants}
              isAITutor={isAITutor}
            />

            <ChatArea
              messages={messages}
              newMessage={newMessage}
              onNewMessageChange={setNewMessage}
              onSendMessage={handleSendMessage}
              isAITutor={isAITutor}
            />

            <Controls
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              isConnected={isConnected}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onLeaveSession={handleLeaveSession}
              isAITutor={isAITutor}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 