from flask import Flask
from app.routes.livekit import livekit_bp

app = Flask(__name__)
app.register_blueprint(livekit_bp)

@app.route("/")
def root():
    return {"message": "LiveKit Flask Server is running"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True) 