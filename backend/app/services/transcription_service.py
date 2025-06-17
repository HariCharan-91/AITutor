from livekit.agents import AgentSession
from livekit.plugins import assemblyai
import os
import asyncio
from typing import Callable, Optional
import nest_asyncio

# Enable nested event loops for Flask
nest_asyncio.apply()

class TranscriptionService:
    def __init__(self):
        self.api_key = os.getenv('ASSEMBLYAI_API_KEY')
        if not self.api_key:
            raise ValueError("ASSEMBLYAI_API_KEY environment variable is not set")
        
        self.livekit_host = os.getenv('LIVEKIT_HOST')
        self.livekit_api_key = os.getenv('LIVEKIT_API_KEY')
        self.livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')
        
        if not all([self.livekit_host, self.livekit_api_key, self.livekit_api_secret]):
            raise ValueError("LiveKit configuration is missing. Please set LIVEKIT_HOST, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET")
        
        self.session = None
        self.on_transcript: Optional[Callable[[str], None]] = None
        self._loop = None

    def start_transcription(self, room_name: str, on_transcript: Callable[[str], None]) -> bool:
        """Start transcription using LiveKit Agents with AssemblyAI"""
        try:
            # Create event loop if it doesn't exist
            try:
                self._loop = asyncio.get_event_loop()
            except RuntimeError:
                self._loop = asyncio.new_event_loop()
                asyncio.set_event_loop(self._loop)

            # Create an AgentSession with AssemblyAI STT
            self.session = AgentSession(
                url=self.livekit_host,
                api_key=self.livekit_api_key,
                api_secret=self.livekit_api_secret,
                stt=assemblyai.STT(
                    api_key=self.api_key,
                    end_of_turn_confidence_threshold=0.7,
                    min_end_of_turn_silence_when_confident=160,
                    max_turn_silence=2400,
                ),
                turn_detection="stt"
            )

            self.on_transcript = on_transcript

            # Connect to the room
            self._loop.run_until_complete(self.session.join(room_name))

            # Start listening for transcription events
            self.session.on("transcript", self._handle_transcript)

            return True
        except Exception as e:
            print(f"Error starting transcription: {e}")
            if self.session:
                try:
                    self._loop.run_until_complete(self.session.leave())
                except:
                    pass
                self.session = None
            return False

    def _handle_transcript(self, transcript: str):
        """Handle incoming transcription events"""
        if self.on_transcript:
            self.on_transcript(transcript)

    def stop_transcription(self):
        """Stop the transcription service"""
        if self.session:
            try:
                self._loop.run_until_complete(self.session.leave())
            except Exception as e:
                print(f"Error stopping transcription: {e}")
            finally:
                self.session = None 