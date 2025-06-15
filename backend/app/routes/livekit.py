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
    max_participants = data.get('max_participants')
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

@livekit_bp.route('/rooms/<room_name>', methods=['DELETE'])
def delete_room_endpoint(room_name):
    """
    Delete a LiveKit room.
    """
    try:
        result = room_service.delete_room(room_name)
        
        if result.get('status') == 'error':
            return jsonify({
                'error': result.get('error', 'Failed to delete room'),
                'status': 'error'
            }), 500
            
        return jsonify({
            'message': f'Room {room_name} deleted successfully',
            'status': 'success'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@livekit_bp.route('/token', methods=['POST'])
def get_token():
    """
    Generate an access token for joining a LiveKit room.
    Expects JSON: { 'identity': str, 'room': str }
    """
    data = request.get_json() or {}
    identity = data.get('identity')
    room = data.get('room')

    if not identity or not room:
        return jsonify({
            'error': 'identity and room are required', 
            'status': 'error'
        }), 400

    try:
        token = generate_token(identity, room)
        return jsonify({
            'token': token, 
            'identity': identity,
            'room': room,
            'status': 'success'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

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