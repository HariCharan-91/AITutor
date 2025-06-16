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
  DisconnectReason
} from 'livekit-client';

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
      // Generate or retrieve persistent identity
      let participantIdentity = localStorage.getItem('livekit_participant_identity');
      if (!participantIdentity) {
        participantIdentity = 'user-' + Math.random().toString(36).substring(7);
        localStorage.setItem('livekit_participant_identity', participantIdentity);
      }

      // Request token from backend
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: participantIdentity,
          room: roomId,
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

      // Create new room instance with enhanced configuration
      const publishDefaults: TrackPublishDefaults = {
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
      };

      const roomOptions: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        publishDefaults,
        stopLocalTrackOnUnpublish: true,
        // Enable noise suppression and echo cancellation
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const room = new Room(roomOptions);

      // Enhanced connection options with more ICE servers and better configuration
      const connectOptions: RoomConnectOptions = {
        autoSubscribe: true,
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // Add TURN servers for better connectivity
            {
              urls: 'turn:turn.livekit.io:3478',
              username: 'livekit',
              credential: 'livekit',
            },
            {
              urls: 'turns:turn.livekit.io:5349',
              username: 'livekit',
              credential: 'livekit',
            }
          ],
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
          iceCandidatePoolSize: 10
        },
        websocketTimeout: 15000, // Increased timeout
      };

      // Set up event listeners
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log('Connection state changed:', state);
        onConnectionStateChange(state);
      });

      // Add error handling for connection issues
      room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        console.error('Connection error:', reason);
        if (reason) {
          console.log('Disconnected with reason:', reason);
          // You might want to implement custom reconnection logic here
        }
      });

      room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
      room.on(RoomEvent.DataReceived, onDataReceived);

      // Connect to room with retry logic
      try {
        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, data.token, connectOptions);
      } catch (connectError) {
        console.error('Initial connection failed:', connectError);
        if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
          console.log(`Retrying connection (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1))); // Exponential backoff
          retryCount++;
          continue;
        }
        throw connectError;
      }

      // Initialize camera and microphone with error handling
      try {
        await room.localParticipant.enableCameraAndMicrophone();
      } catch (mediaError) {
        console.warn('Media access error:', mediaError);
        // Continue without media if access is denied
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

export async function leaveRoom(room: Room | null, roomId: string) {
  if (room) {
    try {
      // Stop all local tracks
      if (room.localParticipant) {
        // Stop camera and microphone
        await room.localParticipant.setCameraEnabled(false);
        await room.localParticipant.setMicrophoneEnabled(false);

        // Detach all local tracks
        const cameraTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);
        const microphoneTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        
        if (cameraTrack?.track) {
          cameraTrack.track.detach();
        }
        if (microphoneTrack?.track) {
          microphoneTrack.track.detach();
        }
      }

      // Detach all remote tracks
      for (const participant of room.remoteParticipants.values()) {
        const cameraTrack = participant.getTrackPublication(Track.Source.Camera);
        const microphoneTrack = participant.getTrackPublication(Track.Source.Microphone);
        
        if (cameraTrack?.track) {
          cameraTrack.track.detach();
        }
        if (microphoneTrack?.track) {
          microphoneTrack.track.detach();
        }
      }
      
      // Disconnect from the room
      await room.disconnect(true);
      
      // Try to delete the room if it's empty
      try {
        const response = await fetch(`/api/livekit/rooms/${roomId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          console.warn('Failed to delete room:', await response.text());
        }
      } catch (deleteError) {
        console.warn('Error during room deletion:', deleteError);
      }
    } catch (error) {
      console.error('Error leaving session:', error);
      throw error;
    }
  }
} 