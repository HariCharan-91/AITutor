import os
import asyncio
from dotenv import load_dotenv
from app.livekit.server_sdk import generate_token, get_room_service, create_room, create_room_async

def test_sdk():
    """Test the LiveKit SDK functionality"""
    print("\n=== Testing LiveKit SDK ===")
    
    # Test 1: Token Generation
    try:
        token = generate_token("test_user", "test_room")
        print("✅ Token Generation: Success")
        print("Token (first 20 chars):", token[:20] + "...")
    except Exception as e:
        print("❌ Token Generation Failed:", str(e))
        return False

    # Test 2: Room Service (Sync)
    try:
        room_service = get_room_service()
        rooms = room_service.list_rooms()
        print("✅ Room Service (Sync): Success")
        print("Current rooms:", rooms)
    except Exception as e:
        print("❌ Room Service (Sync) Failed:", str(e))
        return False

    # Test 3: Room Creation (Sync)
    try:
        room_name = "test_room_sync"
        result = create_room(room_name, max_participants=10, empty_timeout=300)
        print("✅ Room Creation (Sync): Success")
        print("Room creation result:", result)
    except Exception as e:
        print("❌ Room Creation (Sync) Failed:", str(e))
        return False

    return True

async def test_sdk_async():
    """Test the LiveKit SDK functionality with async operations"""
    print("\n=== Testing LiveKit SDK (Async) ===")
    
    # Test 1: Token Generation
    try:
        token = generate_token("test_user_async", "test_room_async")
        print("✅ Token Generation: Success")
        print("Token (first 20 chars):", token[:20] + "...")
    except Exception as e:
        print("❌ Token Generation Failed:", str(e))
        return False

    # Test 2: Room Service (Async)
    try:
        room_service = get_room_service()
        if hasattr(room_service, 'list_rooms_async'):
            rooms = await room_service.list_rooms_async()
            print("✅ Room Service (Async): Success")
            print("Current rooms:", rooms)
        else:
            print("ℹ️  Room Service: Async method not available (using dummy service)")
    except Exception as e:
        print("❌ Room Service (Async) Failed:", str(e))
        return False

    # Test 3: Room Creation (Async)
    try:
        room_name = "test_room_async"
        result = await create_room_async(
            room_name, 
            max_participants=20, 
            empty_timeout=600,
            metadata="Test room created via async API"
        )
        print("✅ Room Creation (Async): Success")
        print("Room creation result:", result)
    except Exception as e:
        print("❌ Room Creation (Async) Failed:", str(e))
        return False

    return True

if __name__ == "__main__":
    # Load environment variables from .env file
    load_dotenv()
    
    print("Using LiveKit credentials from .env:")
    print(f"Host: {os.getenv('LIVEKIT_HOST')}")
    print(f"API Key: {os.getenv('LIVEKIT_API_KEY')}")
    print(f"API Secret: {os.getenv('LIVEKIT_API_SECRET')}")
    
    # Test sync functionality
    success_sync = test_sdk()
    print("\nSync Test Result:", "✅ Success" if success_sync else "❌ Failed")
    
    # Test async functionality
    print("\n" + "="*50)
    success_async = asyncio.run(test_sdk_async())
    print("\nAsync Test Result:", "✅ Success" if success_async else "❌ Failed")
    
    print("\n" + "="*50)
    print("Overall Result:", "✅ Success" if (success_sync and success_async) else "❌ Failed")