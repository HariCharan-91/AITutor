'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useRoomContext,
  useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, RoomEvent } from 'livekit-client';

// Generate a unique ID for each session
const generateUniqueUserId = () => {
  return 'user_' + Math.random().toString(36).substring(2, 9);
};

// Generate a unique room ID based on subject, tutor, and timestamp
const generateUniqueSessionRoomId = (subject: string, tutorName: string) => {
  const subjectPart = subject.replace(/\s+/g, '-').toLowerCase();
  const tutorPart = tutorName.replace(/\s+/g, '-').toLowerCase();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${subjectPart}-${tutorPart}-${timestamp}-${random}`;
};

interface StoredSession {
  roomId: string;
  participantName: string;
  subject: string;
  tutorName: string;
  timestamp: number;
}

// Component to handle media enabling within LiveKitRoom context
const MediaEnabler = () => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    console.log('MediaEnabler: useEffect triggered. Room state:', room?.state, 'Local participant:', localParticipant);
    const enableMedia = async () => {
      if (room && localParticipant && room.state === 'connected' && !localParticipant.isCameraEnabled && !localParticipant.isMicrophoneEnabled) {
        console.log('MediaEnabler: Attempting to enable camera and microphone...');
        try {
          await localParticipant.setCameraEnabled(true);
          await localParticipant.setMicrophoneEnabled(true);
          console.log('LiveKit: Camera and Microphone enabled successfully.');
        } catch (e) {
          console.error('LiveKit: Failed to enable camera/microphone:', e);
          // Optionally, propagate this error up to RoomPage if needed
        }
      } else if (room && room.state !== 'connected') {
        console.log('MediaEnabler: Room not yet connected, skipping media enable.');
      } else if (localParticipant && (localParticipant.isCameraEnabled || localParticipant.isMicrophoneEnabled)) {
        console.log('MediaEnabler: Camera/Microphone already enabled, skipping.');
      }
    };
    enableMedia();
  }, [room, localParticipant]);
  
  return null;
};

const RoomPage = () => {
  const params = useParams() as { roomId: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const [actualRoomId, setActualRoomId] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId] = useState(() => generateUniqueUserId());
  const [participantName, setParticipantName] = useState('');
  const [isNewSession, setIsNewSession] = useState(false);

  // Function to save sessions to localStorage
  const saveSessionToLocalStorage = (session: StoredSession) => {
    try {
      const savedSessionsStr = localStorage.getItem('tutoringSessions');
      const savedSessions: StoredSession[] = savedSessionsStr ? JSON.parse(savedSessionsStr) : [];

      // Add new session, ensure uniqueness by roomId
      const updatedSessions = [...savedSessions.filter(s => s.roomId !== session.roomId), session];
      localStorage.setItem('tutoringSessions', JSON.stringify(updatedSessions));
      console.log('RoomPage: Session saved to localStorage.', session);
    } catch (error) {
      console.error("Failed to save session to localStorage:", error);
    }
  };

  useEffect(() => {
    console.log('RoomPage: useEffect triggered. isLoading:', isLoading, 'token present:', !!token, 'actualRoomId present:', !!actualRoomId);

    const initializeRoom = async () => {
      console.log('RoomPage: initializeRoom started.');
      // Prevent re-running if already processing or finished
      if (!isLoading && token && actualRoomId) {
        console.log('RoomPage: initializeRoom skipped, already loaded.');
        return; 
      }

      setIsLoading(true);
      setError(null); // Clear previous errors on new attempt
      let currentRoomId: string;
      let effectiveParticipantName: string = '';
      let sessionSubject: string | undefined;
      let sessionTutorName: string | undefined;
      let isNew: boolean = false;

      // --- Step 1: Determine if it's a new session or a rejoin from URL params or localStorage ---
      const isNewParam = searchParams?.get('isNew');
      if (isNewParam === 'true') {
        console.log('RoomPage: New session detected from URL params.');
        isNew = true;
        setIsNewSession(true);
        sessionTutorName = searchParams?.get('tutorName') || undefined;
        sessionSubject = searchParams?.get('subject') || undefined;
        effectiveParticipantName = searchParams?.get('participantName') || '';
        console.log('RoomPage: New session details - Subject:', sessionSubject, 'Tutor:', sessionTutorName, 'Participant:', effectiveParticipantName);

        // Generate a new unique room ID for this new session
        if (sessionSubject && sessionTutorName) {
          currentRoomId = generateUniqueSessionRoomId(sessionSubject, sessionTutorName);
          console.log('RoomPage: Generated new roomId:', currentRoomId);
        } else {
          setError('Missing subject or tutor name for new session. Please ensure you booked from the homepage.');
          setIsLoading(false);
          return;
        }

      } else {
        // Rejoining an existing session or direct URL access
        currentRoomId = params.roomId;
        console.log('RoomPage: Rejoining existing session or direct access. Room ID from params:', currentRoomId);
        try {
          const savedSessionsStr = localStorage.getItem('tutoringSessions');
          const savedSessions: StoredSession[] = savedSessionsStr ? JSON.parse(savedSessionsStr) : [];
          const rejoinedSession = savedSessions.find(s => s.roomId === currentRoomId);
          if (rejoinedSession) {
            sessionSubject = rejoinedSession.subject;
            sessionTutorName = rejoinedSession.tutorName;
            effectiveParticipantName = rejoinedSession.participantName;
            console.log('RoomPage: Rejoined session found in localStorage.', rejoinedSession);
          } else {
            setError('Session not found in your saved sessions. Please go back to homepage to start or rejoin.');
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error loading session details for rejoin:", error);
          setError('Error loading previous session details. Please try again or start a new one.');
          setIsLoading(false);
          return;
        }
      }

      // --- Final check for participant name (fallback if somehow still empty) ---
      if (!effectiveParticipantName) {
        console.log('RoomPage: Participant name not found, prompting user.');
        const name = prompt('Please enter your name:');
        if (name) {
          localStorage.setItem('participantName', name);
          effectiveParticipantName = name;
        } else {
          setError('Participant name is required to join a session.');
          setIsLoading(false);
          return;
        }
      }
      console.log('RoomPage: Final effectiveParticipantName:', effectiveParticipantName);

      // Set current room ID for display and LiveKit connection
      setActualRoomId(currentRoomId);
      // Set participant name for display and token generation
      setParticipantName(effectiveParticipantName);

      try {
        // Only create room if it's a new session
        if (isNew) {
          console.log('RoomPage: Creating new LiveKit room on backend...', currentRoomId);
          const createRoomResponse = await fetch('/api/livekit/rooms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              room: currentRoomId,
              max_participants: 2,
              metadata: JSON.stringify({
                subject: sessionSubject,
                tutor: sessionTutorName,
                student: effectiveParticipantName,
                created_at: new Date().toISOString(),
              }),
            }),
          });

          if (!createRoomResponse.ok) {
            const errorData = await createRoomResponse.json();
            console.error('RoomPage: Failed to create room response:', errorData);
            throw new Error(errorData.error || 'Failed to create room');
          }
          console.log('RoomPage: Room created successfully.');

          // Save the new session to localStorage
          saveSessionToLocalStorage({
            roomId: currentRoomId,
            participantName: effectiveParticipantName,
            subject: sessionSubject || 'Unknown Subject',
            tutorName: sessionTutorName || 'Unknown Tutor',
            timestamp: Date.now(),
          });

          // Update URL to reflect the actual unique room ID for new sessions
          router.replace(`/room/${currentRoomId}`);
          console.log('RoomPage: URL replaced to new room ID.');
        }
        
        // Get token for the room (whether new or existing)
        console.log('RoomPage: Fetching LiveKit token...', { roomId: currentRoomId, identity: userId, name: effectiveParticipantName });
        const tokenResponse = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: currentRoomId,
            identity: userId,
            name: effectiveParticipantName, // Use the correctly determined name
          }),
        });
        
        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error('RoomPage: Failed to fetch token response:', errorData);
          throw new Error(errorData.error || 'Failed to fetch token');
        }

        const data = await tokenResponse.json();
        console.log('RoomPage: LiveKit token fetched successfully.', data);
        setToken(data.token);

      } catch (error) {
        console.error('RoomPage: Error during room initialization or token fetch:', error);
        setError(error instanceof Error ? error.message : 'Failed to join room');
      } finally {
        setIsLoading(false);
        console.log('RoomPage: initializeRoom finished. isLoading set to false.');
      }
    };

    initializeRoom();
    
  }, [params.roomId, userId, searchParams]);

  const handleDisconnect = () => {
    console.log('LiveKit: Disconnected from room.');
    router.push('/');
  };

  const handleError = (error: Error) => {
    console.error('LiveKit error callback:', error);
    setError(error.message);
  };

  if (isLoading || !token || !actualRoomId) {
    console.log('RoomPage: Rendering loading/error state. isLoading:', isLoading, 'token present:', !!token, 'actualRoomId present:', !!actualRoomId, 'error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">
          {error ? (
            <span className="text-red-500">Error: {error}</span>
          ) : (
            isNewSession ? "Creating your private session..." : "Joining your session..."
          )}
          {(error && !isLoading) && (
            <button 
              onClick={() => router.push('/')}
              className="block mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Return to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  console.log('RoomPage: Rendering LiveKitRoom. Token present:', !!token, 'Actual Room ID:', actualRoomId, 'Participant Name:', participantName);
  return (
    <div className="min-h-screen">
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880'}
        onDisconnected={handleDisconnect}
        onError={handleError}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            simulcast: true,
          },
        }}
        key={actualRoomId}
      >
        <MediaEnabler />
        <div className="h-screen">
          <div className="p-4 bg-gray-800 text-white">
            <h1 className="text-xl font-bold">Private Tutoring Session</h1>
            <p className="text-sm">Subject: {params.roomId.split('-')[0]}</p>
            <p className="text-sm">Participant: {participantName}</p>
            <p className="text-xs text-gray-400">Room ID: {actualRoomId}</p>
          </div>
          <VideoConference
            className="h-[calc(100vh-4rem)]"
          />
          <RoomAudioRenderer />
        </div>
      </LiveKitRoom>
    </div>
  );
};

// New component for debugging participant names - commented out or removed if causing issues
/*
const ParticipantListDebug = () => {
  const tracks = useTracks(
    [
      Track.Source.Camera,
      Track.Source.Microphone,
      Track.Source.ScreenShare,
    ],
    {
      onlySubscribed: false,
    },
  );

  // Extract unique participants
  const uniqueParticipants = Array.from(new Set(tracks.map(t => t.participant)))
                               .map(p => ({ identity: p.identity, name: p.name }));

  return (
    <ul className="list-disc pl-5">
      {uniqueParticipants.map((participant) => (
        <li key={participant.identity}>
          <strong>Identity:</strong> {participant.identity} | <strong>Name:</strong> {participant.name}
        </li>
      ))}
    </ul>
  );
};
*/

export default RoomPage; 