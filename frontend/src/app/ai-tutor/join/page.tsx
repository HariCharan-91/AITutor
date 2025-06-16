'use client';

import { useRouter } from 'next/navigation';
import { AITutorJoin } from '@/app/room/[roomId]/components/AITutorJoin';

export default function AITutorJoinPage() {
  const router = useRouter();

  const handleJoin = (sessionId: string) => {
    // Navigate to the room with AI tutor parameters
    const queryParams = new URLSearchParams({
      tutorName: 'AI Tutor',
      subject: 'AI Tutoring',
      participantName: 'AI Tutor',
      isAITutor: 'true'
    }).toString();
    
    router.push(`/room/${sessionId}?${queryParams}`);
  };

  return <AITutorJoin onJoin={handleJoin} />;
} 