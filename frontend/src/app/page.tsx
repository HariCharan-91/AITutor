'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TutorCard } from '@/components/TutorCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface StoredSession {
  roomId: string;
  participantName: string;
  subject: string;
  tutorName: string;
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
  const [storedSessions, setStoredSessions] = useState<StoredSession[]>([]);
  const router = useRouter();

  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('tutoringSessions');
      if (savedSessions) {
        setStoredSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error("Failed to load sessions from localStorage:", error);
      setStoredSessions([]);
    }
  }, []);

  const saveSessions = (sessions: StoredSession[]) => {
    try {
      localStorage.setItem('tutoringSessions', JSON.stringify(sessions));
      setStoredSessions(sessions);
    } catch (error) {
      console.error("Failed to save sessions to localStorage:", error);
    }
  };

  const handleRejoinSession = (session: StoredSession) => {
    if (session.participantName) {
      setParticipantName(session.participantName);
    }
    // Remove temp session data, as we are rejoining a specific room
    sessionStorage.removeItem('temp-session-data'); 
    router.push(`/room/${session.roomId}`);
  };

  const handleBookSession = async (tutorName: string, subject: string) => {
    if (!participantName) {
      alert("Please enter your name before booking a session.");
      return;
    }

    const existingSession = storedSessions.find(
      (s) => s.tutorName === tutorName && s.subject === subject && s.participantName === participantName
    );

    if (existingSession) {
      const confirmRejoin = confirm(
        `You have an existing session with ${tutorName} for ${subject} as ${participantName}. Do you want to rejoin this session?`
      );
      if (confirmRejoin) {
        handleRejoinSession(existingSession);
        return;
      }
    }

    setIsLoading(true);

    // Pass subject, tutorName, and participantName as query parameters
    const queryParams = new URLSearchParams({
      tutorName: tutorName,
      subject: subject,
      participantName: participantName,
      isNew: 'true' // Indicate this is a new session flow
    }).toString();
    
    // Navigate to a temporary roomId (subject) which the room page will use to generate a unique one
    const subjectIdentifier = subject.replace(/\s+/g, '-').toLowerCase();
    router.push(`/room/${subjectIdentifier}?${queryParams}`);

    setIsLoading(false);
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
              label="Your Name (for session)"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {storedSessions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              Your Previous Sessions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {storedSessions.map((session) => (
                <div key={session.roomId} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-2">{session.subject} with {session.tutorName}</h3>
                  <p className="text-gray-600 mb-4">As: {session.participantName}</p>
                  <Button
                    onClick={() => handleRejoinSession(session)}
                    disabled={isLoading}
                  >
                    Rejoin Session
                  </Button>
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
