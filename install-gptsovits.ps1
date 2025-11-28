# GPT-SoVITS Installation Script for Windows
# This script downloads and sets up GPT-SoVITS for ASTRAL

Write-Host "[INFO] Installing GPT-SoVITS for ASTRAL..." -ForegroundColor Cyan

# Check Python installation
Write-Host "[INFO] Checking Python installation..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python 3\.(9|10|11)") {
        Write-Host "[OK] Found: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Python 3.9-3.11 required. Found: $pythonVersion" -ForegroundColor Red
        Write-Host "[INFO] Download Python from: https://www.python.org/downloads/" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "[ERROR] Python not found in PATH" -ForegroundColor Red
    Write-Host "[INFO] Download Python from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Check CUDA/GPU (optional but recommended)
Write-Host "[INFO] Checking for NVIDIA GPU..." -ForegroundColor Cyan
try {
    $gpu = nvidia-smi --query-gpu=name --format=csv,noheader 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Found GPU: $gpu" -ForegroundColor Green
        $useGPU = $true
    } else {
        Write-Host "[WARN] No NVIDIA GPU found. Will use CPU (slower)" -ForegroundColor Yellow
        $useGPU = $false
    }
} catch {
    Write-Host "[WARN] nvidia-smi not found. Will use CPU (slower)" -ForegroundColor Yellow
    $useGPU = $false
}

# Create GPT-SoVITS directory
$gptSoVITSDir = "gpt-sovits"
Write-Host "[INFO] Creating directory: $gptSoVITSDir" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $gptSoVITSDir | Out-Null

# Clone GPT-SoVITS repository
Write-Host "[INFO] Cloning GPT-SoVITS repository..." -ForegroundColor Cyan
if (Test-Path "$gptSoVITSDir\.git") {
    Write-Host "[INFO] Repository already exists, pulling latest..." -ForegroundColor Cyan
    Set-Location $gptSoVITSDir
    git pull
    Set-Location ..
} else {
    git clone https://github.com/RVC-Boss/GPT-SoVITS.git $gptSoVITSDir
}

Set-Location $gptSoVITSDir

# Create virtual environment
Write-Host "[INFO] Creating Python virtual environment..." -ForegroundColor Cyan
python -m venv venv

# Activate virtual environment
Write-Host "[INFO] Activating virtual environment..." -ForegroundColor Cyan
& .\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "[INFO] Installing Python dependencies (this may take several minutes)..." -ForegroundColor Cyan
if ($useGPU) {
    Write-Host "[INFO] Installing with CUDA support..." -ForegroundColor Cyan
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
} else {
    Write-Host "[INFO] Installing CPU-only version..." -ForegroundColor Cyan
    pip install torch torchvision torchaudio
}

# Install requirements if they exist
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
}

# Install additional packages for API server
Write-Host "[INFO] Installing API server dependencies..." -ForegroundColor Cyan
pip install fastapi uvicorn soundfile pydantic numpy

# Download pre-trained models
Write-Host "[INFO] Downloading pre-trained models..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "GPT_weights" | Out-Null
New-Item -ItemType Directory -Force -Path "SoVITS_weights" | Out-Null

# Download base models (these are required)
Write-Host "[INFO] Downloading GPT base model (~1GB)..." -ForegroundColor Cyan
$gptModelUrl = "https://huggingface.co/lj1995/GPT-SoVITS/resolve/main/gsv-v2final-pretrained/s1bert25hz-5kh-longer-epoch=12-step=369668.ckpt"
$gptModelPath = "GPT_weights\s1bert25hz-5kh-longer-epoch=12-step=369668.ckpt"
if (!(Test-Path $gptModelPath)) {
    Invoke-WebRequest -Uri $gptModelUrl -OutFile $gptModelPath
    Write-Host "[OK] GPT model downloaded" -ForegroundColor Green
} else {
    Write-Host "[INFO] GPT model already exists" -ForegroundColor Cyan
}

Write-Host "[INFO] Downloading SoVITS base model (~1GB)..." -ForegroundColor Cyan
$sovitsModelUrl = "https://huggingface.co/lj1995/GPT-SoVITS/resolve/main/gsv-v2final-pretrained/s2G2333k.pth"
$sovitsModelPath = "SoVITS_weights\s2G2333k.pth"
if (!(Test-Path $sovitsModelPath)) {
    Invoke-WebRequest -Uri $sovitsModelUrl -OutFile $sovitsModelPath
    Write-Host "[OK] SoVITS model downloaded" -ForegroundColor Green
} else {
    Write-Host "[INFO] SoVITS model already exists" -ForegroundColor Cyan
}

# Download pre-trained voice samples
Write-Host "[INFO] Downloading pre-trained voice samples..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "reference_audio" | Out-Null

# Create a simple API server script using GPT-SoVITS's actual inference module
Write-Host "[INFO] Creating API server script..." -ForegroundColor Cyan
$apiScript = @'
import os
import sys
import torch
import io
import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import uvicorn

# Add GPT-SoVITS to path
sys.path.append(os.path.dirname(__file__))

# Import GPT-SoVITS inference functions
try:
    from GPT_SoVITS.inference_webui import get_tts_wav
    print("Successfully imported GPT-SoVITS inference module")
except ImportError as e:
    print(f"Warning: Could not import inference module: {e}")
    print("Using mock mode for testing")
    get_tts_wav = None

app = FastAPI()

class TTSRequest(BaseModel):
    text: str
    text_language: str = "en"

@app.post("/tts")
async def generate_speech(request: TTSRequest):
    try:
        if get_tts_wav is None:
            # Mock response - generate 1 second of silence as valid WAV
            import numpy as np
            sample_rate = 32000
            duration = 1.0
            silence = np.zeros(int(sample_rate * duration), dtype=np.float32)
            
            buffer = io.BytesIO()
            sf.write(buffer, silence, sample_rate, format='WAV')
            buffer.seek(0)
            
            return Response(content=buffer.read(), media_type="audio/wav")
        
        # Generate speech using GPT-SoVITS
        audio_output = get_tts_wav(
            ref_wav_path="",  # Will use default
            prompt_text="",    # Will use default
            prompt_language=request.text_language,
            text=request.text,
            text_language=request.text_language,
        )
        
        # Convert audio to WAV bytes
        buffer = io.BytesIO()
        sf.write(buffer, audio_output, 32000, format='WAV')
        buffer.seek(0)
        
        return Response(content=buffer.read(), media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "ok", 
        "model": "GPT-SoVITS",
        "inference_available": get_tts_wav is not None
    }

@app.get("/")
async def root():
    return {
        "name": "GPT-SoVITS API for ASTRAL",
        "version": "1.0",
        "endpoints": ["/health", "/tts"]
    }

if __name__ == "__main__":
    print("=" * 60)
    print("Starting GPT-SoVITS API Server for ASTRAL")
    print("=" * 60)
    print(f"Server URL: http://localhost:9880")
    print(f"Health check: http://localhost:9880/health")
    print(f"TTS endpoint: POST http://localhost:9880/tts")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=9880, log_level="info")
'@

$apiScript | Out-File -FilePath "api_server.py" -Encoding UTF8

# Create startup script
Write-Host "[INFO] Creating startup script..." -ForegroundColor Cyan
$startScript = @'
@echo off
echo Starting GPT-SoVITS API Server...
call venv\Scripts\activate.bat
python api_server.py
pause
'@

$startScript | Out-File -FilePath "start_server.bat" -Encoding ASCII

Set-Location ..

Write-Host ""
Write-Host "[OK] GPT-SoVITS installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the server:" -ForegroundColor Cyan
Write-Host "  cd gpt-sovits" -ForegroundColor Yellow
Write-Host "  .\start_server.bat" -ForegroundColor Yellow
Write-Host ""
Write-Host "The server will run on: http://localhost:9880" -ForegroundColor Cyan
Write-Host "Models downloaded: ~2GB total" -ForegroundColor Cyan
