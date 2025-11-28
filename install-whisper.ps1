# Whisper STT Setup Script for Windows
# Downloads and configures Whisper.cpp for ASTRAL

Write-Host "[INFO] Setting up Whisper.cpp for ASTRAL..." -ForegroundColor Cyan

# Create whisper directory
$whisperDir = "whisper-cpp"
Write-Host "[INFO] Creating directory: $whisperDir" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $whisperDir | Out-Null

# Check if Git is installed
try {
    $gitVersion = git --version 2>&1
    Write-Host "[OK] Found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Git not found. Please install Git first." -ForegroundColor Red
    exit 1
}

# Clone whisper.cpp repository
Write-Host "[INFO] Cloning whisper.cpp repository..." -ForegroundColor Cyan
if (Test-Path "$whisperDir\.git") {
    Write-Host "[INFO] Repository already exists, pulling latest..." -ForegroundColor Cyan
    Set-Location $whisperDir
    git pull
    Set-Location ..
} else {
    git clone https://github.com/ggerganov/whisper.cpp.git $whisperDir
}

Set-Location $whisperDir

# Download pre-built Windows binary
Write-Host "[INFO] Downloading pre-built Whisper binary for Windows..." -ForegroundColor Cyan
$binaryUrl = "https://github.com/ggerganov/whisper.cpp/releases/latest/download/whisper-bin-x64.zip"
$binaryZip = "whisper-bin-x64.zip"

try {
    Invoke-WebRequest -Uri $binaryUrl -OutFile $binaryZip
    Expand-Archive -Path $binaryZip -DestinationPath "." -Force
    Remove-Item $binaryZip
    Write-Host "[OK] Binary downloaded" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Could not download pre-built binary. Will need to build from source." -ForegroundColor Yellow
}

# Download Whisper model (base.en is good balance of speed/accuracy)
Write-Host "[INFO] Downloading Whisper model..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "models" | Out-Null

$modelUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"
$modelPath = "models\ggml-base.en.bin"

if (!(Test-Path $modelPath)) {
    Write-Host "[INFO] Downloading base.en model (~140MB)..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $modelUrl -OutFile $modelPath
    Write-Host "[OK] Model downloaded" -ForegroundColor Green
} else {
    Write-Host "[INFO] Model already exists" -ForegroundColor Cyan
}

# Create API server script for Whisper
Write-Host "[INFO] Creating Whisper API server..." -ForegroundColor Cyan

$serverScript = @'
import os
import sys
import wave
import subprocess
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI()

WHISPER_EXECUTABLE = "./main.exe" if os.name == "nt" else "./main"
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
'@

$serverScript | Out-File -FilePath "whisper_api.py" -Encoding UTF8

# Install Python dependencies
Write-Host "[INFO] Installing Python dependencies..." -ForegroundColor Cyan
python -m pip install fastapi uvicorn python-multipart --quiet

# Create startup script
$startScript = @'
@echo off
echo Starting Whisper STT API Server...
python whisper_api.py
pause
'@

$startScript | Out-File -FilePath "start_whisper.bat" -Encoding ASCII

Set-Location ..

Write-Host ""
Write-Host "[OK] Whisper.cpp installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the server:" -ForegroundColor Cyan
Write-Host "  cd whisper-cpp" -ForegroundColor Yellow
Write-Host "  .\start_whisper.bat" -ForegroundColor Yellow
Write-Host ""
Write-Host "The server will run on: http://localhost:9881" -ForegroundColor Cyan
Write-Host "Model downloaded: base.en (~140MB)" -ForegroundColor Cyan
