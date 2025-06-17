import { RemoteParticipant } from 'livekit-client';

interface ParticipantListProps {
  participantName: string;
  tutorName: string;
  remoteParticipants: RemoteParticipant[];
  isAITutor?: boolean;
}

export function ParticipantList({ participantName, tutorName, remoteParticipants, isAITutor = false }: ParticipantListProps) {
  const getParticipantRole = (identity: string) => {
    if (identity === tutorName) {
      return isAITutor ? 'AI Tutor' : 'Tutor';
    }
    return 'Student';
  };

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
            <p className="text-sm text-gray-500">You (Student)</p>
          </div>
        </div>
        {remoteParticipants.map(participant => {
          const role = getParticipantRole(participant.identity);
          const isTutor = role === 'Tutor' || role === 'AI Tutor';
          
          return (
            <div key={participant.sid} className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${isTutor ? 'bg-green-100' : 'bg-purple-100'} rounded-full flex items-center justify-center`}>
                <span className={isTutor ? 'text-green-600' : 'text-purple-600'}>
                  {isTutor ? '👨‍🏫' : '👨‍🎓'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {participant.name || participant.identity}
                </p>
                <p className="text-sm text-gray-500">{role}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 