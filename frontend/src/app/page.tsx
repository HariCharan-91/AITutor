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

  const generateUniqueRoomId = (tutorName: string, subject: string) => {
    const baseName = `${tutorName}-${subject}`.toLowerCase().replace(/\s+/g, '-');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${baseName}-${timestamp}-${random}`;
  };

  const handleBookSession = async (tutorName: string, subject: string) => {
    const displayName = participantName.trim() || 'Anonymous';
    
    setIsLoading(true);
    console.log('Creating new session for:', { tutorName, subject, participantName: displayName });

    const roomId = generateUniqueRoomId(tutorName, subject);

    // Save the new session
    const newSession: StoredSession = {
      roomId,
      tutorName,
      subject,
      participantName: displayName,
      timestamp: Date.now()
    };
    saveSessions([...pastSessions, newSession]);

    const queryParams = new URLSearchParams({
      tutorName: tutorName,
      subject: subject,
      participantName: displayName,
      roomId: roomId,
      isNew: 'true'
    }).toString();
    
    router.push(`/room/${roomId}?${queryParams}`);
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
        // Delete from backend first
        const response = await fetch(`/api/livekit/rooms/${sessionToDelete.roomId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete room from backend');
        }

        // If backend deletion successful, remove from frontend
        const updatedSessions = pastSessions.filter(s => s.roomId !== sessionToDelete.roomId);
        saveSessions(updatedSessions);
        
        // Show success message
        alert('Session deleted successfully');
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Failed to delete session. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Find Your Perfect Tutor
          </h1>
          <p className="text-lg text-gray-600">
            Connect with expert tutors for personalized learning sessions
          </p>
          <div className="mt-6 w-full max-w-md mx-auto">
            <Input
              label="Your Name (optional)"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name or leave blank for anonymous"
              disabled={isLoading}
            />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutors.map((tutor) => (
            <TutorCard
              key={tutor.name}
              name={tutor.name}
              subjects={tutor.subjects}
              rating={tutor.rating}
              reviews={tutor.reviews}
              sessions={tutor.sessions}
              imageUrl={tutor.imageUrl}
              onBookSession={handleBookSession}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
