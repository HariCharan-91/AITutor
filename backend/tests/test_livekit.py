import os
import requests
from app.livekit.server_sdk import generate_token, get_room_service

def test_livekit_server():
    """Test the LiveKit server endpoints"""
    base_url = "http://localhost:5000"
    
    # Test root endpoint
    response = requests.get(f"{base_url}/")
    print("✅ Server is running:", response.json())
    
    # Test token generation
    token_response = requests.post(
        f"{base_url}/token",
        json={"identity": "test_user", "room": "test_room"}
    )
    token = token_response.json().get("token")
    print("✅ Token generated:", token[:20] + "..." if token else "Failed")
    
    # Test room listing
    rooms_response = requests.get(f"{base_url}/rooms")
    print("✅ Rooms listed:", rooms_response.json())

def test_livekit_sdk():
    """Test the LiveKit SDK functionality"""
    try:
        # Test token generation
        token = generate_token("test_user", "test_room")
        print("✅ SDK Token generated:", token[:20] + "...")
        
        # Test room service
        room_service = get_room_service()
        rooms = room_service.list_rooms()
        print("✅ Room service connected")
        print("Current rooms:", rooms)
        
        return True
    except Exception as e:
        print("❌ SDK Error:", str(e))
        return False

def test_frontend_integration():
    """Test the frontend integration points"""
    # These are the endpoints the frontend will use
    base_url = "http://localhost:5000"
    
    # Test token endpoint (used by LiveKitProvider)
    token_response = requests.post(
        f"{base_url}/token",
        json={"identity": "frontend_user", "room": "test_room"}
    )
    token = token_response.json().get("token")
    print("✅ Frontend token generated:", token[:20] + "..." if token else "Failed")
    
    # Test rooms endpoint (used by useLiveKit)
    rooms_response = requests.get(f"{base_url}/rooms")
    print("✅ Frontend rooms listed:", rooms_response.json())

if __name__ == "__main__":
    # Set test environment variables
    os.environ['LIVEKIT_HOST'] = 'ws://localhost:7880'
    os.environ['LIVEKIT_API_KEY'] = 'devkey'
    os.environ['LIVEKIT_API_SECRET'] = 'secret'
    
    print("\n=== Testing LiveKit Server ===")
    test_livekit_server()
    
    print("\n=== Testing LiveKit SDK ===")
    test_livekit_sdk()
    
    print("\n=== Testing Frontend Integration ===")
    test_frontend_integration()
    
    print("\nAll tests completed!") 