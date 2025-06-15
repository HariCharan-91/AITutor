'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TutorCard } from '@/components/TutorCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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
  const router = useRouter();

  const handleBookSession = async (tutorName: string, subject: string) => {
    if (!participantName) {
      alert("Please enter your name before booking a session.");
      return;
    }

    setIsLoading(true);
    const roomName = subject.replace(/\s+/g, '-').toLowerCase(); // Subject as room name
    const metadata = tutorName; // Tutor name as metadata

    try {
      // 1. Create the LiveKit Room
      const createRoomResponse = await fetch('/api/livekit/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: roomName,
          max_participants: 2,
          metadata: metadata,
        }),
      });

      if (!createRoomResponse.ok) {
        const errorData = await createRoomResponse.json();
        throw new Error(errorData.error || 'Failed to create room');
      }
      console.log('Room created successfully!', await createRoomResponse.json());

      // 2. Get LiveKit Token for the participant
      const getTokenResponse = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: participantName, // Use participant's name as identity
          room: roomName,
        }),
      });

      if (!getTokenResponse.ok) {
        const errorData = await getTokenResponse.json();
        throw new Error(errorData.error || 'Failed to get token');
      }
      const { token } = await getTokenResponse.json();

      // 3. Store necessary info and navigate to the room
      sessionStorage.setItem('livekit-token', token);
      sessionStorage.setItem('livekit-room', roomName);
      sessionStorage.setItem('livekit-participant', participantName);
      sessionStorage.setItem('livekit-wsurl', process.env.NEXT_PUBLIC_LIVEKIT_WS_URL || 'ws://localhost:7880'); // Make sure to set this env var!

      router.push(`/room/${roomName}`);

    } catch (error) {
      console.error('Error booking session:', error);
      alert(`Failed to book session: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
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
              label="Your Name (for session)"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              required
              disabled={isLoading}
            />
          </div>
        </div>

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
