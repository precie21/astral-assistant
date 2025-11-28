import os
import sys
import wave
import subprocess
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI()

WHISPER_EXECUTABLE = "./main.exe" if os.name == "nt" else "./main"
MODEL_PATH = "models/ggml-small.en.bin"  # Changed from base.en

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Save uploaded file
        audio_path = "temp_audio.wav"
        content = await file.read()
        with open(audio_path, "wb") as f:
            f.write(content)
        
        print(f"[DEBUG] Received {len(content)} bytes")
        
        # Run Whisper
        result = subprocess.run(
            [WHISPER_EXECUTABLE, "-m", MODEL_PATH, "-f", audio_path, "-nt"],
            capture_output=True,
            text=True
        )
        
        print(f"[DEBUG] Return code: {result.returncode}")
        print(f"[DEBUG] Stdout: {result.stdout[:500] if result.stdout else 'EMPTY'}")
        print(f"[DEBUG] Stderr: {result.stderr[:500] if result.stderr else 'EMPTY'}")
        
        if result.returncode != 0:
            raise Exception(f"Whisper failed: {result.stderr}")
        
        # Parse output
        transcription = result.stdout.strip()
        print(f"[DEBUG] Transcription: '{transcription}'")
        
        # Clean up
        os.remove(audio_path)
        
        return JSONResponse(content={"text": transcription})
    
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok", "model": "whisper.cpp base.en"}

@app.get("/")
async def root():
    return {
        "name": "Whisper STT API for ASTRAL",
        "version": "1.0",
        "endpoints": ["/health", "/transcribe"]
    }

if __name__ == "__main__":
    print("=" * 60)
    print("Starting Whisper STT API Server for ASTRAL (DEBUG MODE)")
    print("=" * 60)
    print(f"Server URL: http://localhost:9881")
    print(f"Health check: http://localhost:9881/health")
    print(f"Transcribe endpoint: POST http://localhost:9881/transcribe")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=9881, log_level="info")
