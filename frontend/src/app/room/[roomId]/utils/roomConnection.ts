import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
  RemoteTrack,
  Track,
  ConnectionState,
  RoomOptions,
  RoomConnectOptions,
  VideoPreset,
  VideoPresets,
  AudioPresets,
  TrackPublishDefaults,
  LocalTrackPublication,
  RemoteTrackPublication,
  TrackPublication,
  ConnectionError,
  DisconnectReason,
  DataPacket_Kind
} from 'livekit-client';

// Map to store active rooms
const rooms = new Map<string, Room>();

export interface RoomInfo {
  tutorName: string;
  subject: string;
  participantName: string;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

export async function connectToRoom(
  roomId: string,
  onConnectionStateChange: (state: ConnectionState) => void,
  onParticipantConnected: (participant: RemoteParticipant) => void,
  onParticipantDisconnected: (participant: RemoteParticipant) => void,
  onTrackSubscribed: (track: RemoteTrack, publication: any, participant: RemoteParticipant) => void,
  onTrackUnsubscribed: (track: RemoteTrack, publication: any, participant: RemoteParticipant) => void,
  onDataReceived: (payload: Uint8Array, participant?: RemoteParticipant) => void
): Promise<{ room: Room; localParticipant: LocalParticipant }> {
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      // Get participant info from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const participantName = urlParams.get('participantName');
      const tutorName = urlParams.get('tutorName');
      const isAITutor = urlParams.get('isAITutor') === 'true';

      // Create a unique identity that includes the name
      const participantIdentity = `${participantName}-${Date.now()}`;

      // Request token from backend
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: participantIdentity,
          room: roomId,
          name: participantName,
          metadata: JSON.stringify({
            isTutor: participantName === tutorName,
            isAITutor: isAITutor && participantName === tutorName,
            originalName: participantName
          })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get token');
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error('No token received');
      }

      // Create new room instance with proper video configuration
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        stopLocalTrackOnUnpublish: true,
        publishDefaults: {
          simulcast: true,
          videoSimulcastLayers: [
            VideoPresets.h180,
            VideoPresets.h360,
            VideoPresets.h720,
          ],
          videoEncoding: {
            maxBitrate: 1500000,
            maxFramerate: 30,
          },
          audioPreset: AudioPresets.music,
          dtx: true,
          red: true,
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up event listeners
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log('Connection state changed:', state);
        onConnectionStateChange(state);
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        onParticipantConnected(participant);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        onParticipantDisconnected(participant);
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
        console.log('Track subscribed:', track.kind, 'for participant:', participant.identity);
        onTrackSubscribed(track, publication, participant);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
        console.log('Track unsubscribed:', track.kind, 'for participant:', participant.identity);
        onTrackUnsubscribed(track, publication, participant);
      });

      room.on(RoomEvent.DataReceived, onDataReceived);

      // Connect to room with proper options
      const connectOptions: RoomConnectOptions = {
        autoSubscribe: true,
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ],
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
        },
      };

      console.log('Connecting to room...');
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, data.token, connectOptions);
      console.log('Connected to room successfully');

      // Initialize camera and microphone
      try {
        console.log('Enabling camera and microphone...');
        await room.localParticipant.enableCameraAndMicrophone();
        console.log('Camera and microphone enabled successfully');
      } catch (mediaError) {
        console.error('Media access error:', mediaError);
        // Try to enable just the camera if microphone fails
        try {
          console.log('Trying to enable just camera...');
          await room.localParticipant.setCameraEnabled(true);
          console.log('Camera enabled successfully');
        } catch (cameraError) {
          console.error('Camera access error:', cameraError);
        }
      }

      // Set the participant name after connection
      if (room.localParticipant) {
        room.localParticipant.name = participantName;
        console.log('Local participant name set to:', participantName);
      }

      return {
        room,
        localParticipant: room.localParticipant,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`Connection attempt ${retryCount + 1} failed:`, error);
      
      if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        retryCount++;
      } else {
        throw new Error(`Failed to connect after ${MAX_RETRY_ATTEMPTS} attempts. Last error: ${lastError.message}`);
      }
    }
  }

  throw lastError || new Error('Failed to connect to room');
}

export const leaveRoom = async (room: Room | null, roomId: string) => {
  if (!room) return;

  try {
    // First, detach all tracks from the local participant
    const localParticipant = room.localParticipant;
    if (localParticipant) {
      // Stop camera and microphone
      await localParticipant.setCameraEnabled(false);
      await localParticipant.setMicrophoneEnabled(false);

      // Detach all local tracks
      const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);
      const microphoneTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
      
      if (cameraTrack?.track) {
        cameraTrack.track.stop();
        cameraTrack.track.detach().forEach((element: HTMLElement) => element.remove());
      }
      if (microphoneTrack?.track) {
        microphoneTrack.track.stop();
        microphoneTrack.track.detach().forEach((element: HTMLElement) => element.remove());
      }
    }

    // Then disconnect from the room
    await room.disconnect();
    
    // Clean up any remaining tracks
    Array.from(room.remoteParticipants.values()).forEach((participant: RemoteParticipant) => {
      const cameraTrack = participant.getTrackPublication(Track.Source.Camera);
      const microphoneTrack = participant.getTrackPublication(Track.Source.Microphone);
      
      if (cameraTrack?.track) {
        cameraTrack.track.stop();
        cameraTrack.track.detach().forEach((element: HTMLElement) => element.remove());
      }
      if (microphoneTrack?.track) {
        microphoneTrack.track.stop();
        microphoneTrack.track.detach().forEach((element: HTMLElement) => element.remove());
      }
    });

    // Remove the room from the rooms map
    if (rooms.has(roomId)) {
      rooms.delete(roomId);
    }
  } catch (error) {
    console.error('Error during room cleanup:', error);
    // Even if there's an error, try to ensure the room is disconnected
    try {
      await room.disconnect();
    } catch (disconnectError) {
      console.error('Error during forced disconnect:', disconnectError);
    }
    throw error;
  }
}; 