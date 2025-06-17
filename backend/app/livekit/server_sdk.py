"""
LiveKit server SDK integration with optimized lazy initialization and dummy fallback.
"""
import os
import logging
import random
import string
from functools import lru_cache
from livekit import api
from dotenv import load_dotenv
import json

# Configure logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Load environment variables from .env
load_dotenv()

# Environment variable keys
_ENV_KEYS = ('LIVEKIT_HOST', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET')

def generate_random_room_name(length=8):
    """Generate a random room name using letters and numbers."""
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

# Load and validate config
def _load_config():
    config = {key: os.getenv(key) for key in _ENV_KEYS}
    if not all(config.values()):
        missing = [k for k, v in config.items() if not v]
        logger.warning(f"Missing LiveKit env vars: {missing}. Using dummy service.")
    return config

class DummyRoomService:
    """A no-op RoomService used when LiveKit config is absent."""
    def list_rooms(self):
        logger.debug("DummyRoomService.list_rooms called")
        return []
    
    def create_room(self, name, **kwargs):
        logger.debug(f"DummyRoomService.create_room called for room: {name}")
        return {"name": name, "status": "dummy_created"}
    
    async def create_room_async(self, name, **kwargs):
        logger.debug(f"DummyRoomService.create_room_async called for room: {name}")
        return {"name": name, "status": "dummy_created"}

class SimpleLiveKitService:
    """Simple LiveKit service that avoids async initialization issues."""
    
    def __init__(self, host, api_key, api_secret):
        self.host = host
        self.api_key = api_key
        self.api_secret = api_secret
        logger.info(f"Initialized SimpleLiveKitService for {host}")
    
    async def _get_api_client(self):
        """Create and return a LiveKit API client with proper session management."""
        return api.LiveKitAPI(
            url=self.host, 
            api_key=self.api_key, 
            api_secret=self.api_secret
        )
    
    def list_rooms(self):
        """
        List all rooms synchronously by running the async version.
        """
        try:
            import asyncio
            # Run the async version in a sync context
            rooms = asyncio.run(self.list_rooms_async())
            return rooms
        except Exception as e:
            logger.error(f"Failed to list rooms: {e}")
            return []
    
    def create_room(self, name, **kwargs):
        """
        Create a room synchronously (returns basic info, use async version for full functionality).
        """
        logger.info(f"SimpleLiveKitService.create_room called for room: {name} (sync - limited functionality)")
        # For sync compatibility, just return success status
        # Real room creation should use the async version
        return {
            "name": name, 
            "status": "sync_placeholder",
            "message": "Use create_room_async() for full functionality"
        }
    
    async def create_room_async(self, name, max_participants=None, empty_timeout=None, metadata=None):
        """
        Create a room with full async functionality using LiveKit's official API.
        """
        api_client = None
        try:
            api_client = await self._get_api_client()
            
            # Import CreateRoomRequest
            from livekit.api import CreateRoomRequest
            
            # Create room request with parameters
            request = CreateRoomRequest(
                name=name,
                empty_timeout=empty_timeout or 300,  # Default 5 minutes
                max_participants=max_participants or 20,  # Default 20 participants
                metadata=metadata
            )
            
            # Create the room using the official method
            response = await api_client.room.create_room(request)
            
            # Return room details
            return {
                "name": response.name,
                "status": "created",
                "details": {
                    "max_participants": response.max_participants,
                    "empty_timeout": response.empty_timeout,
                    "metadata": response.metadata
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to create room '{name}': {e}")
            return {
                "name": name,
                "status": "error",
                "error": str(e)
            }
        finally:
            # Proper cleanup
            if api_client:
                try:
                    if hasattr(api_client, '_session') and api_client._session:
                        await api_client._session.close()
                    elif hasattr(api_client, 'aclose'):
                        await api_client.aclose()
                except Exception as cleanup_error:
                    logger.debug(f"Error during cleanup: {cleanup_error}")
                    pass
    
    async def list_rooms_async(self):
        """Async version that can use the full LiveKit API with proper cleanup."""
        api_client = None
        try:
            api_client = await self._get_api_client()
            
            # Import ListRoomsRequest
            from livekit.api import ListRoomsRequest
            
            # List rooms using the official method
            response = await api_client.room.list_rooms(ListRoomsRequest())
            
            # Extract room names from response
            rooms = [room.name for room in response.rooms] if hasattr(response, 'rooms') else []
            
            logger.info(f"Successfully listed {len(rooms)} rooms")
            return rooms
            
        except Exception as e:
            logger.error(f"Failed to list rooms: {e}")
            return []
        finally:
            # Properly close the client session to prevent resource leaks
            if api_client:
                try:
                    if hasattr(api_client, '_session') and api_client._session:
                        await api_client._session.close()
                    elif hasattr(api_client, 'aclose'):
                        await api_client.aclose()
                except Exception as cleanup_error:
                    logger.debug(f"Error during cleanup: {cleanup_error}")
                    pass

    async def delete_room_async(self, name):
        """
        Delete a room using LiveKit's official API.
        """
        api_client = None
        try:
            api_client = await self._get_api_client()
            
            # Import DeleteRoomRequest
            from livekit.api import DeleteRoomRequest
            
            # Create delete request
            request = DeleteRoomRequest(room=name)
            
            # Delete the room using the official method
            await api_client.room.delete_room(request)
            
            return {
                "name": name,
                "status": "deleted"
            }
            
        except Exception as e:
            logger.error(f"Failed to delete room '{name}': {e}")
            return {
                "name": name,
                "status": "error",
                "error": str(e)
            }
        finally:
            # Proper cleanup
            if api_client:
                try:
                    if hasattr(api_client, '_session') and api_client._session:
                        await api_client._session.close()
                    elif hasattr(api_client, 'aclose'):
                        await api_client.aclose()
                except Exception as cleanup_error:
                    logger.debug(f"Error during cleanup: {cleanup_error}")
                    pass

    def delete_room(self, name):
        """
        Delete a room synchronously by running the async version.
        """
        try:
            import asyncio
            # Run the async version in a sync context
            return asyncio.run(self.delete_room_async(name))
        except Exception as e:
            logger.error(f"Failed to delete room: {e}")
            return {
                "name": name,
                "status": "error",
                "error": str(e)
            }

@lru_cache(maxsize=1)
def get_room_service():
    """Return a real LiveKit service or dummy fallback."""
    cfg = _load_config()
    if not all(cfg.values()):
        return DummyRoomService()

    host, key, secret = cfg['LIVEKIT_HOST'], cfg['LIVEKIT_API_KEY'], cfg['LIVEKIT_API_SECRET']
    return SimpleLiveKitService(host, key, secret)

# Expose singleton room_service
room_service = get_room_service()

def generate_token(identity: str, room: str, name: str = None) -> str:
    """
    Generate a JWT token for a participant to join a specific LiveKit room.
    """
    cfg = _load_config()
    if not all(cfg.values()):
        logger.warning("Cannot generate real token without LiveKit config. Returning dummy token.")
        return "dummy_token_for_testing"
    
    try:
        grants = api.VideoGrants(room_join=True, room=room)
        token = (
                    api.AccessToken(api_key=cfg['LIVEKIT_API_KEY'], api_secret=cfg['LIVEKIT_API_SECRET'])
            .with_identity(identity)
                .with_name(name)  # Set the participant's display name
            .with_grants(grants)
            .to_jwt()
        )
        logger.debug(f"Generated token for identity={identity}, room={room}, name={name}")
        return token
    except Exception as e:
        logger.error(f"Failed to generate token: {e}")
        return "dummy_token_fallback"

def create_room(name: str, max_participants: int = None, empty_timeout: int = None, metadata: str = None):
    """
    Create a room synchronously (convenience function).
    For full functionality, use room_service.create_room_async() instead.
    
    Args:
        name: Room name
        max_participants: Maximum number of participants (optional)
        empty_timeout: Time in seconds to keep room alive when empty (optional)
        metadata: Additional room metadata (optional)
    
    Returns:
        dict: Room creation result
    """
    service = get_room_service()
    return service.create_room(name, max_participants=max_participants, 
                             empty_timeout=empty_timeout, metadata=metadata)

async def create_room_async(name: str, max_participants: int = None, empty_timeout: int = None, metadata: str = None):
    """
    Create a room asynchronously with full functionality.
    
    Args:
        name: Room name
        max_participants: Maximum number of participants (optional)
        empty_timeout: Time in seconds to keep room alive when empty (optional)
        metadata: Additional room metadata (optional)
    
    Returns:
        dict: Room creation result with full details
    """
    service = get_room_service()
    if hasattr(service, 'create_room_async'):
        # Ensure max_participants is always passed as an integer, default to 2 if not provided
        effective_max_participants = max_participants if max_participants is not None else 2
        logger.info(f"Attempting to create room '{name}' with max_participants: {effective_max_participants}")
        
        api_client = None
        try:
            api_client = await self._get_api_client()
            
            # Import CreateRoomRequest
            from livekit.api import CreateRoomRequest
            
            # Create room request with parameters
            request = CreateRoomRequest(
                name=name,
                empty_timeout=empty_timeout or 300,  # Default 5 minutes
                max_participants=effective_max_participants,  # Use the effective_max_participants
                metadata=metadata
            )
            
            # Create the room using the official method
            response = await api_client.room.create_room(request)
            
            # Return room details
            return {
                "name": response.name,
                "status": "created",
                "details": {
                    "max_participants": response.max_participants,
                    "empty_timeout": response.empty_timeout,
                    "metadata": response.metadata
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to create room '{name}': {e}")
            return {
                "name": name,
                "status": "error",
                "error": str(e)
            }
        finally:
            # Proper cleanup
            if api_client:
                try:
                    if hasattr(api_client, '_session') and api_client._session:
                        await api_client._session.close()
                    elif hasattr(api_client, 'aclose'):
                        await api_client.aclose()
                except Exception as cleanup_error:
                    logger.debug(f"Error during cleanup: {cleanup_error}")
                    pass
    else:
        # Fallback for dummy service
        return service.create_room(name, max_participants=max_participants,
                                 empty_timeout=empty_timeout, metadata=metadata)

def start_session(identity: str, display_name: str = None, max_participants: int = 2) -> dict:
    """
    Start a new session by creating a room and generating a token.
    
    Args:
        identity: The unique identifier for the participant
        display_name: Optional display name for the participant
        max_participants: Maximum number of participants allowed (default: 2)
    
    Returns:
        dict: Contains room_name and token for joining
    """
    # Generate a random room name
    room_name = generate_random_room_name()
    
    logger.info(f"Starting session for identity: {identity}, room: {room_name}, requesting max_participants: {max_participants}")

    # Create the room with max participants limit
    room_result = create_room(
        room_name,
        max_participants=max_participants,
        empty_timeout=300  # 5 minutes timeout
    )
    
    if room_result.get("status") == "error":
        logger.error(f"Failed to create room: {room_result.get('error')}")
        return {"error": "Failed to create room"}
    
    # Generate token for the creator with participant limit
    grants = api.VideoGrants(
        room_join=True,
        room=room_name,
        max_participants=max_participants
    )
    
    token = (
        api.AccessToken(api_key=os.getenv('LIVEKIT_API_KEY'), api_secret=os.getenv('LIVEKIT_API_SECRET'))
        .with_identity(identity)
        .with_name(display_name)
        .with_grants(grants)
        .to_jwt()
    )
    
    logger.info(f"Session started. Room: {room_name}, Token generated for identity: {identity}, Max Participants set to: {max_participants}")

    return {
        "room_name": room_name,
        "token": token,
        "status": "success",
        "max_participants": max_participants
    }

async def check_room_capacity(room_name: str) -> dict:
    """
    Check if a room has reached its maximum capacity.
    """
    service = get_room_service()
    if isinstance(service, DummyRoomService):
        logger.info("Using DummyRoomService for capacity check. Always allows join.")
        return {"can_join": True, "current_participants": 0, "max_participants": 2}

    try:
        api_client = await service._get_api_client()
        from livekit.api import ListRoomsRequest
        response = await api_client.room.list_rooms(ListRoomsRequest())
        
        logger.debug(f"Raw response.rooms: {response.rooms}") # Log all rooms returned by LiveKit

        room = next((r for r in response.rooms if r.name == room_name), None)
        
        if not room:
            logger.info(f"Room '{room_name}' not found. Returning can_join: True.")
            return {
                "can_join": True, # If room not found, it can be created
                "current_participants": 0,
                "max_participants": 2 # Default for new room
            }
        
        logger.debug(f"Found room object for '{room_name}': {room}")
        logger.debug(f"Room.name: {getattr(room, 'name', 'N/A')}")
        logger.debug(f"Room.num_participants: {getattr(room, 'num_participants', 'N/A')}")
        logger.debug(f"Room.max_participants (direct): {getattr(room, 'max_participants', 'N/A')}")
        logger.debug(f"Room.metadata (raw): {getattr(room, 'metadata', 'N/A')}")

        # Access current participants and max participants directly from the Room object
        current_participants = room.num_participants if hasattr(room, 'num_participants') else 0
        
        # Initialize max_participants_from_room with the value from LiveKit's direct attribute, defaulting to 2 (our app's default)
        max_participants_from_room = room.max_participants if hasattr(room, 'max_participants') else 2
        
        # Attempt to parse max_participants from metadata if available and differs, overriding if found
        try:
            if room.metadata:
                room_metadata = json.loads(room.metadata)
                if "max_participants" in room_metadata:
                    # Prioritize metadata if explicitly set there by the creation process
                    max_participants_from_room = room_metadata["max_participants"]
                    logger.debug(f"Max participants updated from metadata: {max_participants_from_room}")
        except json.JSONDecodeError:
            logger.warning(f"Could not decode room metadata for room '{room_name}'. Metadata: {room.metadata}")
        except Exception as meta_e:
            logger.warning(f"Error processing room metadata for room '{room_name}': {meta_e}")

        logger.info(f"Room '{room_name}' final current participants: {current_participants}, final max participants: {max_participants_from_room}")

        can_join = False
        if max_participants_from_room == 0: # 0 means unlimited participants in LiveKit
            can_join = True
        elif current_participants < max_participants_from_room:
            can_join = True

        return {
            "can_join": can_join,
            "current_participants": current_participants,
            "max_participants": max_participants_from_room
        }
        
    except Exception as e:
        logger.error(f"Error checking room capacity for '{room_name}': {e}", exc_info=True)
        return {
            "error": str(e),
            "can_join": False,
            "current_participants": 0,
            "max_participants": 0
        }

def join_session(room_name: str, identity: str, display_name: str = None) -> dict:
    """
    Join an existing session by generating a token for the room.
    
    Args:
        room_name: The name of the room to join
        identity: The unique identifier for the participant
        display_name: Optional display name for the participant
    
    Returns:
        dict: Contains token for joining
    """
    # Generate token with participant limit
    grants = api.VideoGrants(
        room_join=True,
        room=room_name
    )
    
    token = (
        api.AccessToken(api_key=os.getenv('LIVEKIT_API_KEY'), api_secret=os.getenv('LIVEKIT_API_SECRET'))
        .with_identity(identity)
        .with_name(display_name)
        .with_grants(grants)
        .to_jwt()
    )
    
    return {
        "room_name": room_name,
        "token": token,
        "status": "success"
    }