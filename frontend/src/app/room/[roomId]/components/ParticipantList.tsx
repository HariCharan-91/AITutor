import { RemoteParticipant } from 'livekit-client';

interface ParticipantListProps {
  participantName: string;
  tutorName: string;
  remoteParticipants: RemoteParticipant[];
}

export function ParticipantList({ participantName, tutorName, remoteParticipants }: ParticipantListProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600">👤</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{participantName}</p>
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
                {tutorName === participant.identity ? 'Tutor' : 'Participant'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 