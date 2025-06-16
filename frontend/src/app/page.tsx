'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TutorCard } from '@/components/TutorCard';
import { Input } from '@/components/ui/Input';

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

  const generateUniqueRoomId = (tutorName: string, subject: string) => {
    // Create a base room name from tutor and subject
    const baseName = `${tutorName}-${subject}`.toLowerCase().replace(/\s+/g, '-');
    // Add timestamp to make it unique
    const timestamp = Date.now();
    // Add random string to ensure uniqueness
    const random = Math.random().toString(36).substring(2, 8);
    return `${baseName}-${timestamp}-${random}`;
  };

  const handleBookSession = async (tutorName: string, subject: string) => {
    // Allow any name, even empty
    const displayName = participantName.trim() || 'Anonymous';
    
    setIsLoading(true);
    console.log('Creating new session for:', { tutorName, subject, participantName: displayName });

    // Generate unique room ID
    const roomId = generateUniqueRoomId(tutorName, subject);

    // Pass subject, tutorName, and participantName as query parameters
    const queryParams = new URLSearchParams({
      tutorName: tutorName,
      subject: subject,
      participantName: displayName,
      roomId: roomId,
      isNew: 'true'
    }).toString();
    
    router.push(`/room/${roomId}?${queryParams}`);
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
