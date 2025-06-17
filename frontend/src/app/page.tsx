'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TutorCard } from '@/components/TutorCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface StoredSession {
  roomId: string;
  tutorName: string;
  subject: string;
  participantName: string;
  timestamp: number;
}

// Tutors array is no longer directly used for booking, but kept for reference if needed elsewhere.
const tutors = [
  {
    name: "Sarah Johnson",
    subjects: ["Mathematics", "Physics"],
    rating: 4.8,
    reviews: 156,
    sessions: 423,
    imageUrl: "/trial.png"
  },
  {
    name: "Michael Chen",
    subjects: ["Computer Science", "Programming"],
    rating: 4.9,
    reviews: 203,
    sessions: 512,
    imageUrl: "/trial.png"
  },
  {
    name: "Emily Rodriguez",
    subjects: ["English", "Literature"],
    rating: 4.7,
    reviews: 189,
    sessions: 387,
    imageUrl: "/trial.png"
  },
  {
    name: "David Kim",
    subjects: ["Chemistry", "Biology"],
    rating: 4.9,
    reviews: 167,
    sessions: 401,
    imageUrl: "/trial.png"
  },
  {
    name: "Lisa Wang",
    subjects: ["History", "Social Studies"],
    rating: 4.8,
    reviews: 145,
    sessions: 356,
    imageUrl: "/trial.png"
  },
  {
    name: "James Wilson",
    subjects: ["Economics", "Business"],
    rating: 4.7,
    reviews: 132,
    sessions: 289,
    imageUrl: "/trial.png"
  }
];

export default function Home() {
  const [participantName, setParticipantName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pastSessions, setPastSessions] = useState<StoredSession[]>([]);
  const router = useRouter();

  // Load past sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('pastSessions');
    if (savedSessions) {
      setPastSessions(JSON.parse(savedSessions));
    }
  }, []);

  // Save sessions to localStorage
  const saveSessions = (sessions: StoredSession[]) => {
    localStorage.setItem('pastSessions', JSON.stringify(sessions));
    setPastSessions(sessions);
  };

  const handleStartOrJoinMeeting = async () => {
    const displayName = participantName.trim() || 'Anonymous';
    let meetingRoomId = roomIdInput.trim();

    setIsLoading(true);

    try {
      // If no room ID is provided, generate one
      if (!meetingRoomId) {
        console.log("No room ID provided, generating one...");
        const generateResponse = await fetch('/api/livekit/generate-room-name');
        if (!generateResponse.ok) {
          const errorData = await generateResponse.json();
          alert(`Failed to generate room name: ${errorData.error || 'Unknown error'}`);
          setIsLoading(false);
          return;
        }
        const generateData = await generateResponse.json();
        meetingRoomId = generateData.room_name; // Use the generated name
        console.log(`Generated room name: ${meetingRoomId}`);
      }

      // Now proceed with capacity check and room creation/joining
      const capacityResponse = await fetch(`/api/livekit/rooms/${meetingRoomId}/capacity`);
      const capacityData = await capacityResponse.json();

      let isNewRoom = false;
      if (capacityResponse.ok && capacityData.can_join) {
        // Room exists and has capacity, so join it
        console.log(`Joining existing room: ${meetingRoomId}`);
      } else if (capacityResponse.ok && !capacityData.can_join) {
        alert('Room is full. Please try a different Meeting Name.');
        setIsLoading(false);
        return;
      } else {
        // Room does not exist or API call failed (e.g., 404), so create a new one
        console.log(`Creating new room: ${meetingRoomId}`);
        const createResponse = await fetch('/api/livekit/start-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: displayName,
            room: meetingRoomId,
            display_name: displayName,
          }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          alert(`Failed to create room: ${errorData.error || 'Unknown error'}`);
          setIsLoading(false);
          return;
        }
        isNewRoom = true;
      }

      const queryParams = new URLSearchParams({
        participantName: displayName,
        roomId: meetingRoomId,
        isNew: isNewRoom ? 'true' : 'false',
        tutorName: 'General Meeting', 
        subject: 'Live Session',
      }).toString();
      
      const newSession: StoredSession = {
        roomId: meetingRoomId,
        tutorName: 'General Meeting', 
        subject: 'Live Session',
        participantName: displayName,
        timestamp: Date.now()
      };

      if (!pastSessions.some(s => s.roomId === meetingRoomId)) {
        saveSessions([...pastSessions, newSession]);
      } else {
        const updatedSessions = pastSessions.map(s => 
          s.roomId === meetingRoomId ? { ...s, timestamp: Date.now() } : s
        );
        saveSessions(updatedSessions);
      }

      router.push(`/room/${meetingRoomId}?${queryParams}`);

    } catch (error) {
      console.error('Error starting or joining meeting:', error);
      alert('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRejoinSession = (session: StoredSession) => {
    const queryParams = new URLSearchParams({
      tutorName: session.tutorName,
      subject: session.subject,
      participantName: session.participantName,
      roomId: session.roomId,
      isNew: 'false'
    }).toString();
    
    router.push(`/room/${session.roomId}?${queryParams}`);
  };

  const handleDeleteSession = async (sessionToDelete: StoredSession) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete your session with ${sessionToDelete.tutorName} for ${sessionToDelete.subject}?`
    );
    
    if (confirmDelete) {
      try {
        try {
          const response = await fetch(`/api/livekit/rooms/${sessionToDelete.roomId}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            console.warn('Failed to delete room from backend:', await response.text());
          }
        } catch (deleteError) {
          console.warn('Error during room deletion:', deleteError);
        }

        const updatedSessions = pastSessions.filter(s => s.roomId !== sessionToDelete.roomId);
        saveSessions(updatedSessions);
        
        alert('Session deleted successfully');
      } catch (error) {
        console.error('Error in session deletion process:', error);
        alert('Failed to delete session. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Start or Join a Live Session
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Enter a meeting name to create a new session or leave blank to auto-generate one.
          </p>
          <div className="w-full max-w-md mx-auto space-y-4">
            <Input
              label="Your Name (optional)"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name or leave blank for anonymous"
              disabled={isLoading}
            />
            <Input
              label="Meeting Name (Room ID) (optional)"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              placeholder="Leave blank for auto-generated, or enter to create/join"
              disabled={isLoading}
            />
            <Button
              onClick={handleStartOrJoinMeeting}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Processing...' : 'Start or Join Meeting'}
            </Button>
          </div>
        </div>

        {pastSessions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              Your Past Sessions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastSessions.map((session) => (
                <div key={session.roomId} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-2">{session.subject}</h3>
                  <p className="text-gray-600 mb-2">with {session.tutorName}</p>
                  <p className="text-gray-500 text-sm mb-4">
                    As: {session.participantName}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRejoinSession(session)}
                      disabled={isLoading}
                    >
                      Rejoin Session
                    </Button>
                    <Button
                      onClick={() => handleDeleteSession(session)}
                      disabled={isLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
