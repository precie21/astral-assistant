#!/bin/bash
# Whisper STT Setup Script for Linux
# Downloads and configures Whisper.cpp for ASTRAL

set -e

echo "[INFO] Setting up Whisper.cpp for ASTRAL..."

# Create whisper directory
WHISPER_DIR="whisper-cpp"
echo "[INFO] Creating directory: $WHISPER_DIR"
mkdir -p "$WHISPER_DIR"

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "[ERROR] Git not found. Please install Git first."
    exit 1
fi

echo "[OK] Found: $(git --version)"

# Clone whisper.cpp repository
echo "[INFO] Cloning whisper.cpp repository..."
if [ -d "$WHISPER_DIR/.git" ]; then
    echo "[INFO] Repository already exists, pulling latest..."
    cd "$WHISPER_DIR"
    git pull
    cd ..
else
    git clone https://github.com/ggerganov/whisper.cpp.git "$WHISPER_DIR"
fi

cd "$WHISPER_DIR"

# Build whisper.cpp
echo "[INFO] Building whisper.cpp..."
if command -v make &> /dev/null; then
    make
    echo "[OK] Build complete"
else
    echo "[ERROR] Make not found. Please install build-essential."
    exit 1
fi

# Download Whisper model (base.en is good balance of speed/accuracy)
echo "[INFO] Downloading Whisper model..."
mkdir -p models

MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"
MODEL_PATH="models/ggml-base.en.bin"

if [ ! -f "$MODEL_PATH" ]; then
    echo "[INFO] Downloading base.en model (~140MB)..."
    curl -L "$MODEL_URL" -o "$MODEL_PATH"
    echo "[OK] Model downloaded"
else
    echo "[INFO] Model already exists"
fi

# Create API server script for Whisper
echo "[INFO] Creating Whisper API server..."

cat > whisper_api.py << 'EOF'
import os
import sys
import wave
import subprocess
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI()

WHISPER_EXECUTABLE = "./main"
MODEL_PATH = "models/ggml-base.en.bin"

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Save uploaded file
        audio_path = "temp_audio.wav"
        with open(audio_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Run Whisper
        result = subprocess.run(
            [WHISPER_EXECUTABLE, "-m", MODEL_PATH, "-f", audio_path, "-nt"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise Exception(f"Whisper failed: {result.stderr}")
        
        # Parse output
        transcription = result.stdout.strip()
        
        # Clean up
        os.remove(audio_path)
        
        return JSONResponse(content={"text": transcription})
    
    except Exception as e:
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
    print("Starting Whisper STT API Server for ASTRAL")
    print("=" * 60)
    print(f"Server URL: http://localhost:9881")
    print(f"Health check: http://localhost:9881/health")
    print(f"Transcribe endpoint: POST http://localhost:9881/transcribe")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=9881, log_level="info")
EOF

# Install Python dependencies
echo "[INFO] Installing Python dependencies..."
pip3 install fastapi uvicorn python-multipart --quiet

# Create startup script
cat > start_whisper.sh << 'EOF'
#!/bin/bash
echo "Starting Whisper STT API Server..."
python3 whisper_api.py
EOF

chmod +x start_whisper.sh

cd ..

echo ""
echo "[OK] Whisper.cpp installation complete!"
echo ""
echo "To start the server:"
echo "  cd whisper-cpp"
echo "  ./start_whisper.sh"
echo ""
echo "The server will run on: http://localhost:9881"
echo "Model downloaded: base.en (~140MB)"
