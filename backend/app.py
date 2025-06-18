from app import create_app, socketio

app = create_app()

@app.route("/")
def root():
    return {"message": "LiveKit Flask Server is running"}

if __name__ == "__main__":
    # Use socketio.run for proper websocket and CORS support
    socketio.run(app, host="0.0.0.0", port=5000, debug=True) 