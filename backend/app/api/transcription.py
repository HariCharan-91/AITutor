from fastapi import APIRouter, HTTPException
from ..services.transcription_service import TranscriptionService
from typing import Dict

router = APIRouter()
transcription_service = TranscriptionService()

@router.post("/transcription/start")
async def start_transcription(room_name: str):
    try:
        transcription_text = []
        
        def on_transcript(text: str):
            transcription_text.append(text)
        
        success = await transcription_service.start_transcription(room_name, on_transcript)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to start transcription")
        
        return {"status": "success", "message": "Transcription started"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcription/stop")
async def stop_transcription():
    try:
        await transcription_service.stop_transcription()
        return {"status": "success", "message": "Transcription stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 