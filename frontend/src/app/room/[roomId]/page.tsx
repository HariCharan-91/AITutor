'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
  RemoteTrack,
  Track,
  VideoPresets,
  RoomOptions,
  LocalTrackPublication,
  LocalTrack,
  ConnectionState
} from 'livekit-client';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{
    tutorName: string;
    subject: string;
    participantName: string;
  } | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [messages, setMessages] = useState<Array<{ sender: string; message: string }>>([]);
  const [newMessage, setNewMessage] = useState('');

  const connectToRoom = async () => {
    try {
      console.log('Starting connection process...');
      setIsLoading(true);
      setError(null);

      // Generate or retrieve persistent identity
      let participantIdentity = localStorage.getItem('livekit_participant_identity');
      if (!participantIdentity) {
        participantIdentity = 'user-' + Math.random().toString(36).substring(7);
        localStorage.setItem('livekit_participant_identity', participantIdentity);
      }
      console.log('Using participant identity:', participantIdentity);

      // Request token from backend
      console.log('Requesting token from backend...');
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: participantIdentity,
          room: resolvedParams.roomId,
        }),
      });

      console.log('Token response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Token request failed:', errorData);
        throw new Error(errorData.error || 'Failed to get token');
      }

      const data = await response.json();
      console.log('Token received successfully');
      
      if (!data.token) {
        console.error('No token in response:', data);
        throw new Error('No token received');
      }

      // Create new room instance
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          simulcast: true,
        },
      });
      setRoom(newRoom);

      // Connect to room
      console.log('Connecting to room...');
      await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, data.token, {
        autoSubscribe: true,
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });
      console.log('Successfully connected to room');

      // Initialize camera and microphone
      console.log('Initializing camera and microphone...');
      try {
        await newRoom.localParticipant.enableCameraAndMicrophone();
        console.log('Camera and microphone enabled');
        setIsAudioEnabled(true);
        setIsVideoEnabled(true);
      } catch (mediaError) {
        console.error('Error enabling camera/microphone:', mediaError);
        setError('Please allow camera and microphone access to join the session');
        return;
      }

      // Set up event listeners
      console.log('Setting up event listeners...');
      
      // Handle connection state changes
      newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('Connection state changed:', state);
        setIsConnected(state === ConnectionState.Connected);
        
        if (state === ConnectionState.Disconnected) {
          setError('Connection lost. Attempting to reconnect...');
          // Let LiveKit handle reconnection automatically
          setTimeout(() => {
            if (newRoom.state === ConnectionState.Disconnected) {
              console.log('Attempting to reconnect...');
              newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, data.token);
            }
          }, 2000);
        } else if (state === ConnectionState.Connected) {
          setError(null);
        } else if (state === ConnectionState.SignalReconnecting) {
          setError('Reconnecting to session...');
        }
      });

      // Handle participant events
      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity);
        if (participant.identity !== newRoom.localParticipant.identity) {
          setRemoteParticipants(prev => {
            const existing = prev.find(p => p.identity === participant.identity);
            if (!existing) {
              return [...prev, participant];
            }
            return prev;
          });
        }
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant disconnected:', participant.identity);
        setRemoteParticipants(prev => prev.filter(p => p.identity !== participant.identity));
      });

      // Handle track events
      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, 'from participant:', participant.identity);
        handleTrackSubscribed(track, publication, participant);
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('Track unsubscribed:', track.kind, 'from participant:', participant.identity);
        handleTrackUnsubscribed(track, publication, participant);
      });

      // Handle data messages
      newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
        console.log('Data received from:', participant?.identity);
        handleDataReceived(payload, participant);
      });

      // Get initial participants
      console.log('Getting initial participants...');
      const initialParticipants = Array.from(newRoom.remoteParticipants.values()).filter(p => p.identity !== newRoom.localParticipant.identity) as RemoteParticipant[];
      console.log('Initial participants:', initialParticipants.map(p => ({ id: p.identity, sid: p.sid })));
      
      // Check if room is full (2 participants max)
      if (initialParticipants.length >= 1) {
        console.log('Room is full');
        setError('This session is already full. Only one tutor and one student are allowed per session.');
        newRoom.disconnect();
        setIsLoading(false);
        return;
      }
      
      setRemoteParticipants(initialParticipants);
      setLocalParticipant(newRoom.localParticipant);
      setIsConnected(true);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to room');
      setIsLoading(false);
    }
  };

  // Effect to attach local participant video
  useEffect(() => {
    if (localParticipant) {
      console.log('Attempting to attach local video for participant: [ID]', localParticipant.identity, '[SID]', localParticipant.sid);
      const localVideoTrackPublication = localParticipant.getTrackPublication(Track.Source.Camera);
      if (localVideoTrackPublication && localVideoTrackPublication.track) {
        const videoElement = localVideoTrackPublication.track.attach();
        const localContainer = document.getElementById('local-participant');
        if (localContainer) {
          localContainer.innerHTML = ''; // Clear previous attachments
          localContainer.appendChild(videoElement);
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.objectFit = 'cover';
          console.log('Attached local video to #local-participant');
        } else {
          console.warn('Could not find #local-participant container for local video');
        }
      } else {
        console.warn('Local video track publication not found or track is null');
      }
    }
  }, [localParticipant]);

  useEffect(() => {
    const tutorName = searchParams.get('tutorName');
    const subject = searchParams.get('subject');
    const participantName = searchParams.get('participantName');

    if (tutorName && subject && participantName) {
      console.log('Setting room info:', { tutorName, subject, participantName });
      setRoomInfo({
        tutorName,
        subject,
        participantName
      });
      // Automatically connect to room when info is available
      connectToRoom();
    } else {
      console.error('Missing required room info');
      setError('Missing required session information');
      setIsLoading(false);
    }

    return () => {
      if (room) {
        console.log('Cleaning up room connection...');
        room.disconnect();
      }
    };
  }, [resolvedParams.roomId, searchParams]);

  const handleTrackSubscribed = (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
    console.log('Handling track subscription: [Kind]', track.kind, '[Source]', track.source, 'from participant: [ID]', participant.identity, '[SID]', participant.sid);
    const element = track.attach();
    const container = document.getElementById(`participant-${participant.sid}`);
    if (container) {
      container.innerHTML = ''; // Clear previous attachments
      container.appendChild(element);
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.objectFit = 'cover';
      console.log('Attached remote video to #participant-' + participant.sid);
    } else {
      console.warn('Could not find #participant-' + participant.sid + ' container for remote video');
    }
  };

  const handleTrackUnsubscribed = (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
    console.log('Handling track unsubscription: [Kind]', track.kind, '[Source]', track.source, 'from participant: [ID]', participant.identity, '[SID]', participant.sid);
    track.detach().forEach(element => element.remove());
  };

  const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
    // Handle chat messages
    const decoder = new TextDecoder();
    const message = decoder.decode(payload);
    setMessages(prev => [...prev, { sender: participant?.identity || 'Unknown', message }]);
  };

  const toggleAudio = async () => {
    if (room && localParticipant) {
      try {
        if (isAudioEnabled) {
          await localParticipant.setMicrophoneEnabled(false);
          console.log('Microphone disabled');
        } else {
          await localParticipant.setMicrophoneEnabled(true);
          console.log('Microphone enabled');
        }
        setIsAudioEnabled(!isAudioEnabled);
      } catch (err) {
        console.error('Error toggling audio:', err);
        setError('Failed to toggle microphone');
      }
    }
  };

  const toggleVideo = async () => {
    if (room && localParticipant) {
      try {
        if (isVideoEnabled) {
          await localParticipant.setCameraEnabled(false);
          console.log('Camera disabled');
        } else {
          await localParticipant.setCameraEnabled(true);
          console.log('Camera enabled');
        }
        setIsVideoEnabled(!isVideoEnabled);
      } catch (err) {
        console.error('Error toggling video:', err);
        setError('Failed to toggle camera');
      }
    }
  };

  const sendMessage = () => {
    if (room && newMessage.trim()) {
      const encoder = new TextEncoder();
      room.localParticipant.publishData(encoder.encode(newMessage));
      setMessages(prev => [...prev, { sender: 'You', message: newMessage }]);
      setNewMessage('');
    }
  };

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
            onClick={connectToRoom}
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
            onClick={connectToRoom}
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
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Room ID</p>
              <p className="font-mono text-sm">{resolvedParams.roomId}</p>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 min-h-[600px] flex flex-col gap-4">
              {/* Local participant video */}
              {localParticipant && (
                <div className="relative ${remoteParticipants.length === 0 ? 'flex-grow' : 'flex-1'}">
                  <div id="local-participant" className="w-full h-full bg-gray-200 rounded-lg overflow-hidden">
                    {/* Local video will be attached here */}
                  </div>
                  <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                    You
                  </div>
                </div>
              )}

              {/* Remote participants */}
              {remoteParticipants.length > 0 && (
                remoteParticipants.map(participant => (
                  <div key={participant.sid} className="relative flex-1">
                    <div id={`participant-${participant.sid}`} className="w-full h-full bg-gray-200 rounded-lg overflow-hidden">
                      {/* Remote video will be attached here */}
                    </div>
                    <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                      {participant.identity}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participant info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600">👤</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{roomInfo?.participantName}</p>
                    <p className="text-sm text-gray-500">You</p>
                  </div>
                </div>
                {remoteParticipants.map(participant => (
                  <div key={participant.sid} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600">👨‍🏫</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{participant.identity}</p>
                      <p className="text-sm text-gray-500">
                        {roomInfo?.tutorName === participant.identity ? 'Tutor' : 'Participant'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat area */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat</h2>
              <div className="h-[300px] bg-gray-50 rounded-lg p-4 flex flex-col">
                <div className="flex-1 overflow-y-auto mb-4">
                  {messages.map((msg, index) => (
                    <div key={index} className="mb-2">
                      <p className="text-sm font-medium text-gray-900">{msg.sender}</p>
                      <p className="text-sm text-gray-600">{msg.message}</p>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button onClick={sendMessage}>Send</Button>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={toggleAudio}
                  className={`${isAudioEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                  disabled={!isConnected}
                >
                  {isAudioEnabled ? 'Mute' : 'Unmute'}
                </Button>
                <Button
                  onClick={toggleVideo}
                  className={`${isVideoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                  disabled={!isConnected}
                >
                  {isVideoEnabled ? 'Stop Video' : 'Start Video'}
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      // Properly disconnect from the room
                      if (room) {
                        // First, stop all local tracks
                        if (room.localParticipant) {
                          // Stop camera and microphone
                          await room.localParticipant.setCameraEnabled(false);
                          await room.localParticipant.setMicrophoneEnabled(false);
                        }
                        
                        // Remove all event listeners to prevent reconnection attempts
                        room.removeAllListeners();
                        
                        // Then disconnect from the room with stopLocalTracks
                        await room.disconnect(true);
                      }
                      
                      // If this is the last participant, try to delete the room
                      if (remoteParticipants.length === 0) {
                        try {
                          const response = await fetch(`/api/livekit/rooms/${resolvedParams.roomId}`, {
                            method: 'DELETE',
                          });
                          
                          if (!response.ok) {
                            console.warn('Failed to delete room, but continuing with disconnect:', await response.text());
                          }
                        } catch (deleteError) {
                          console.warn('Error during room deletion, but continuing with disconnect:', deleteError);
                        }
                      }
                      
                      // Clear any remaining state
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
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Leave Session
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 