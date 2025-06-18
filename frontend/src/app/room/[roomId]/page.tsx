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
import { useCallback } from 'react';
import { io } from 'socket.io-client';
import { RemoteVideoArea } from './components/RemoteVideoArea';

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
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [socket, setSocket] = useState<any>(null);

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

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = io('http://localhost:5000');
    setSocket(socket);

    socket.on('connect', () => {
      console.log('Connected to transcription server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from transcription server');
    });

    socket.on('transcription', (data: { text: string }) => {
      setTranscript(prev => prev + ' ' + data.text);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Join room when connected
  useEffect(() => {
    if (socket && room) {
      socket.emit('join_room', { room_name: room.name });
    }
  }, [socket, room]);

  const startTranscription = useCallback(async () => {
    try {
      if (!room) {
        throw new Error('Room not connected');
      }

      const response = await fetch('http://localhost:5000/api/transcription/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ room_name: room.name }),
      });

      if (!response.ok) {
        throw new Error('Failed to start transcription');
      }

      setIsTranscribing(true);
    } catch (error) {
      console.error('Error starting transcription:', error);
    }
  }, [room]);

  const stopTranscription = useCallback(async () => {
    try {
      if (room) {
        const response = await fetch('http://localhost:5000/api/transcription/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ room_name: room.name }),
        });

        if (!response.ok) {
          throw new Error('Failed to stop transcription');
        }

        setIsTranscribing(false);
      }
    } catch (error) {
      console.error('Error stopping transcription:', error);
    }
  }, [room]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTranscribing) {
        stopTranscription();
      }
    };
  }, [isTranscribing, stopTranscription]);

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
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gradient-to-br from-blue-900 via-blue-700 to-blue-400" style={{ minHeight: '100vh', minWidth: '100vw' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white bg-opacity-80 rounded-b-lg shadow-md m-4 flex-shrink-0">
        <div className="flex-1">
          <input
            type="text"
            value={roomInfo?.tutorName ? `${roomInfo.tutorName} - session` : 'AI Tutor name - session'}
            className="w-full px-4 py-2 rounded bg-gray-100 text-lg font-semibold text-black font-bold"
            readOnly
          />
        </div>
        <div className="mx-4 flex-1">
          <input
            type="text"
            value={resolvedParams.roomId || ''}
            className="w-full px-4 py-2 rounded bg-gray-100 text-lg text-black font-bold"
            readOnly
            placeholder="room name:"
          />
        </div>
        <button
          onClick={handleLeaveSession}
          className="px-6 py-2 bg-red-600 text-white rounded-lg text-lg font-semibold shadow hover:bg-red-700 transition-colors font-bold"
        >
          leave session
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 gap-4 px-6 pb-4 h-0 min-h-0 overflow-hidden">
        {/* Left side: Camera and chat */}
        <div className="flex flex-col flex-[2] gap-4 min-h-0 overflow-hidden">
          {/* Main webcam area */}
          <div className="flex-1 bg-gray-200 rounded-lg flex items-center justify-center relative min-h-0 overflow-hidden">
            {/* Integrate VideoArea for main webcam */}
            <div className="w-full h-full flex items-center justify-center">
              <VideoArea
                localParticipant={localParticipant}
                remoteParticipants={remoteParticipants}
                isAITutor={isAITutor}
              />
            </div>
            {/* Controls centered at the bottom of the main webcam area, no white background, no Leave Session button */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <Controls
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isConnected={isConnected}
                onToggleAudio={handleToggleAudio}
                onToggleVideo={handleToggleVideo}
                isAITutor={isAITutor}
                hideLeaveSession={true}
              />
            </div>
            {/* Web cam 2 (remote participant) - no red background */}
            {remoteParticipants.length > 0 && (
              <div className="absolute bottom-4 right-4 z-10 min-w-[220px] min-h-[120px] flex items-center justify-center">
                <RemoteVideoArea participant={remoteParticipants[0]} />
              </div>
            )}
          </div>
          {/* Chat area below webcam, does not extend under whiteboard */}
          <div className="flex-shrink-0">
            <ChatArea
              messages={messages}
              newMessage={newMessage}
              onNewMessageChange={setNewMessage}
              onSendMessage={handleSendMessage}
              isAITutor={isAITutor}
            />
          </div>
        </div>
        {/* Whiteboard area, full right portion from top to bottom */}
        <div className="flex-1 bg-black rounded-lg flex items-center justify-center text-3xl font-medium text-white min-h-0 overflow-hidden">
          white board
        </div>
      </div>
    </div>
  );
} 