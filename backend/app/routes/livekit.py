from flask import Blueprint, jsonify, request
import asyncio
from ..livekit.server_sdk import room_service, generate_token, create_room, create_room_async

livekit_bp = Blueprint('livekit', __name__, url_prefix='/api/livekit')

@livekit_bp.route('/rooms', methods=['GET'])
def list_rooms():
    """
    List all live rooms via LiveKit service.
    """
    try:
        rooms = room_service.list_rooms()
        return jsonify({'rooms': rooms, 'status': 'success'}), 200
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@livekit_bp.route('/rooms', methods=['POST'])
def create_room_endpoint():
    """
    Create a new LiveKit room.
    Expects JSON: { 
        'room': str,
        'max_participants': int (optional),
        'empty_timeout': int (optional),
        'metadata': str (optional)
    }
    """
    data = request.get_json() or {}
    room_name = data.get('room')
    max_participants = 2  # Force max participants to 2
    empty_timeout = data.get('empty_timeout')
    metadata = data.get('metadata')

    if not room_name:
        return jsonify({'error': 'room name is required', 'status': 'error'}), 400

    try:
        # Use async room creation
        result = asyncio.run(create_room_async(
            room_name,
            max_participants=max_participants,
            empty_timeout=empty_timeout,
            metadata=metadata
        ))
        
        if result.get('status') == 'error':
            return jsonify({
                'error': result.get('error', 'Unknown error'),
                'status': 'error'
            }), 500
        
        return jsonify({
            'message': f'Room {room_name} created successfully',
            'room': result,
            'status': 'success'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@livekit_bp.route('/rooms/<room_id>', methods=['DELETE'])
def delete_room_endpoint(room_id):
    """
    Delete a LiveKit room.
    """
    try:
        # Use async room deletion
        result = asyncio.run(room_service.delete_room_async(room_id))
        
        # Check for TwirpError with not_found code
        if result.get('status') == 'error':
            error_str = str(result.get('error', '')).lower()
            if 'not_found' in error_str or 'room does not exist' in error_str:
                return jsonify({
                    'message': f'Room {room_id} was already deleted or does not exist',
                    'status': 'success'
                }), 200
            return jsonify({
                'error': result.get('error', 'Unknown error'),
                'status': 'error'
            }), 500
        
        return jsonify({
            'message': f'Room {room_id} deleted successfully',
            'status': 'success'
        }), 200
        
    except Exception as e:
        error_str = str(e).lower()
        # Handle TwirpError with not_found code
        if 'not_found' in error_str or 'room does not exist' in error_str:
            return jsonify({
                'message': f'Room {room_id} was already deleted or does not exist',
                'status': 'success'
            }), 200
        return jsonify({'error': str(e), 'status': 'error'}), 500

@livekit_bp.route('/token', methods=['POST'])
def get_token():
    """
    Generate an access token for joining a LiveKit room.
    Expects JSON: { 'identity': str, 'room': str, 'name': str }
    """
    try:
        data = request.get_json() or {}
        identity = data.get('identity')
        room = data.get('room')
        name = data.get('name')

        print(f"Token request received - identity: {identity}, room: {room}, name: {name}")

        if not identity or not room:
            print("Missing required fields in token request")
            return jsonify({
                'error': 'identity and room are required', 
                'status': 'error'
            }), 400

        try:
            token = generate_token(identity, room, name)
            if not token or token == "dummy_token_for_testing" or token == "dummy_token_fallback":
                print("Failed to generate valid token")
                return jsonify({
                    'error': 'Failed to generate valid token. Please check LiveKit configuration.',
                    'status': 'error'
                }), 500

            print(f"Token generated successfully for room: {room}")
            return jsonify({
                'token': token, 
                'identity': identity,
                'room': room,
                'name': name,
                'status': 'success'
            }), 200
        except Exception as e:
            print(f"Error generating token: {str(e)}")
            return jsonify({
                'error': f'Failed to generate token: {str(e)}',
                'status': 'error'
            }), 500
    except Exception as e:
        print(f"Unexpected error in token endpoint: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

@livekit_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify LiveKit service status.
    """
    try:
        # Test basic functionality
        rooms = room_service.list_rooms()
        
        # Check if we're using dummy or real service
        service_type = "dummy" if hasattr(room_service, '__class__') and "Dummy" in room_service.__class__.__name__ else "live"
        
        return jsonify({
            'status': 'healthy',
            'service_type': service_type,
            'rooms_count': len(rooms) if rooms else 0,
            'timestamp': int(__import__('time').time())
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': int(__import__('time').time())
        }), 500