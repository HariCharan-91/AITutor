import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """
    Flask configuration loaded from environment variables.
    """
    SECRET_KEY = os.getenv('SECRET_KEY', 'you-will-never-guess')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL',
                                         f'sqlite:///{os.path.join(basedir, "app.db")}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # LiveKit config passthrough (optional, loaded in server_sdk)
    LIVEKIT_HOST = os.getenv('LIVEKIT_HOST')
    LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY')
    LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET')
    # Other service configs (e.g., Redis URL)
    REDIS_URL = os.getenv('REDIS_URL', 'redis://')