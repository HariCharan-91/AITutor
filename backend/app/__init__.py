import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from .config import Config

# Import blueprints
from .routes.livekit import livekit_bp
from .routes.transcription import transcription_bp, socketio
# (You will add other blueprints here, e.g., auth_bp, tutor_bp)

def create_app():
    """Application factory for Flask app."""
    app = Flask(__name__)
    
    # Enable CORS with more specific configuration
    CORS(app, 
         resources={r"/api/*": {
             "origins": ["http://localhost:3000"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True
         }},
         expose_headers=["Content-Type", "Authorization"],
         allow_credentials=True
    )
    
    # Load config
    app.config.from_object(Config)

    # Initialize SocketIO
    socketio.init_app(app, cors_allowed_origins=["http://localhost:3000"])

    # Register blueprints
    app.register_blueprint(livekit_bp)
    app.register_blueprint(transcription_bp)
    # app.register_blueprint(auth_bp)
    # app.register_blueprint(tutor_bp)

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'ok'}, 200

    return app

# Export socketio instance
__all__ = ['create_app', 'socketio']