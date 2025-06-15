import os
from flask import Flask
from .config import Config

# Import blueprints
from .routes.livekit import livekit_bp
# (You will add other blueprints here, e.g., auth_bp, tutor_bp)

def create_app():
    """Application factory for Flask app."""
    app = Flask(__name__)
    # Load config
    app.config.from_object(Config)

    # Register blueprints
    app.register_blueprint(livekit_bp)
    # app.register_blueprint(auth_bp)
    # app.register_blueprint(tutor_bp)

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'ok'}, 200

    return app