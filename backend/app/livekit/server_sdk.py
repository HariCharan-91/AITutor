"""
LiveKit server SDK integration with optimized lazy initialization and dummy fallback.
"""
import os
import logging
from functools import lru_cache
from livekit import api
from dotenv import load_dotenv

# Configure logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Load environment variables from .env
load_dotenv()

# Environment variable keys
_ENV_KEYS = ('LIVEKIT_HOST', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET')

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

def generate_token(identity: str, room: str) -> str:
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
            .with_grants(grants)
            .to_jwt()
        )
        logger.debug(f"Generated token for identity={identity}, room={room}")
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
        return await service.create_room_async(name, max_participants=max_participants,
                                             empty_timeout=empty_timeout, metadata=metadata)
    else:
        # Fallback for dummy service
        return service.create_room(name, max_participants=max_participants,
                                 empty_timeout=empty_timeout, metadata=metadata)