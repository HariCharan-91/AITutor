'use client';

import Image from 'next/image';
import { StarIcon } from '@heroicons/react/24/solid';

interface TutorCardProps {
  name: string;
  subjects: string[];
  rating: number;
  reviews: number;
  sessions: number;
  imageUrl: string;
  onBookSession: (tutorName: string, subject: string) => void;
}

export function TutorCard({ name, subjects, rating, reviews, sessions, imageUrl, onBookSession }: TutorCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 w-full">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
        />
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        
        <div className="mt-2 flex items-center">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <StarIcon
                key={i}
                className={`h-4 w-4 ${
                  i < rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="ml-2 text-sm text-gray-600">({reviews} reviews)</span>
        </div>
        
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            {sessions} sessions completed
          </p>
        </div>
        
        <div className="mt-3 flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <span
              key={subject}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {subject}
            </span>
          ))}
        </div>
        
        <button 
          onClick={() => onBookSession(name, subjects[0])}
          className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Book Session
        </button>
      </div>
    </div>
  );
} 