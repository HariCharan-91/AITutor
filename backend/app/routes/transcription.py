from flask import Blueprint, jsonify, request
from flask_socketio import SocketIO, emit, join_room
from ..services.transcription_service import TranscriptionService
from typing import Dict

transcription_bp = Blueprint('transcription', __name__, url_prefix='/api/transcription')
socketio = SocketIO()

# Store active transcription sessions
active_sessions: Dict[str, TranscriptionService] = {}

@transcription_bp.route('/start', methods=['POST'])
def start_transcription():
    try:
        data = request.get_json()
        room_name = data.get('room_name')
        
        if not room_name:
            return jsonify({'error': 'room_name is required'}), 400

        # Create new transcription service
        service = TranscriptionService()
        
        def on_transcript(text: str):
            # Emit transcription to connected clients
            socketio.emit('transcription', {'text': text}, room=room_name)
        
        # Start transcription
        success = service.start_transcription(room_name, on_transcript)
        
        if not success:
            return jsonify({'error': 'Failed to start transcription'}), 500
        
        # Store the service
        active_sessions[room_name] = service
        
        return jsonify({'status': 'success', 'message': 'Transcription started'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transcription_bp.route('/stop', methods=['POST'])
def stop_transcription():
    try:
        data = request.get_json()
        room_name = data.get('room_name')
        
        if not room_name:
            return jsonify({'error': 'room_name is required'}), 400

        # Get the service
        service = active_sessions.get(room_name)
        if not service:
            return jsonify({'error': 'No active transcription session'}), 404
        
        # Stop transcription
        service.stop_transcription()
        
        # Remove from active sessions
        del active_sessions[room_name]
        
        return jsonify({'status': 'success', 'message': 'Transcription stopped'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('join_room')
def handle_join_room(data):
    room_name = data.get('room_name')
    if room_name:
        join_room(room_name)
        print(f'Client joined room: {room_name}') 