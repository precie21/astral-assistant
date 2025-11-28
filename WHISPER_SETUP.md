# Whisper STT Integration for ASTRAL

ASTRAL now supports local speech-to-text using Whisper.cpp for better accuracy, offline capability, and multilingual support compared to browser speech recognition.

## Features

- 🎯 **Better Accuracy**: More accurate transcription than browser Web Speech API
- 🌐 **Multilingual**: Supports 99+ languages (English optimized with base.en model)
- 🔒 **Privacy**: Runs completely offline on your machine
- ⚡ **Fast**: C++ implementation is highly optimized
- 🆓 **Free**: No API keys or usage limits

## Quick Setup

### Windows

1. Run the installation script:
```powershell
.\install-whisper.ps1
```

2. Start the Whisper server:
```powershell
cd whisper-cpp
.\start_whisper.bat
```

### Linux/Mac

1. Run the installation script:
```bash
chmod +x install-whisper.sh
./install-whisper.sh
```

2. Start the Whisper server:
```bash
cd whisper-cpp
./start_whisper.sh
```

## Configuration

1. Open ASTRAL Dashboard → Settings
2. Find "Speech-to-Text (Whisper)" section
3. Toggle "Use Whisper (Better Accuracy)"
4. Click "Test Connection" to verify server is running
5. Server should show ✓ green status

## Models

The installer downloads `base.en` model by default (~140MB):
- Good balance of speed and accuracy
- Optimized for English
- Fast enough for real-time transcription

### Other Models Available

You can manually download other models from [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp/tree/main):

| Model | Size | English-only | Multilingual | Speed | Accuracy |
|-------|------|--------------|--------------|-------|----------|
| tiny | 75 MB | tiny.en | tiny | Fastest | Lower |
| base | 142 MB | base.en | base | Fast | Good |
| small | 466 MB | small.en | small | Medium | Better |
| medium | 1.5 GB | medium.en | medium | Slow | Great |
| large | 2.9 GB | - | large-v3 | Slowest | Best |

To change models:
1. Download model to `whisper-cpp/models/`
2. Update `MODEL_PATH` in `whisper_api.py`
3. Restart the server

## Architecture

```
ASTRAL Frontend (React)
    ↓
Browser MediaRecorder (captures audio)
    ↓
Convert to WAV format
    ↓
Tauri Backend (Rust)
    ↓
HTTP POST to Whisper Server
    ↓
Whisper.cpp (C++) - Local STT
    ↓
Transcription returned
```

## API Endpoints

The Whisper server runs on `http://localhost:9881` with these endpoints:

- `GET /health` - Health check
- `POST /transcribe` - Upload audio file (WAV) for transcription
- `GET /` - API information

## Troubleshooting

### Server won't start

**Windows**: Make sure Python is installed and in PATH
```powershell
python --version
pip install fastapi uvicorn python-multipart
```

**Linux**: Install build tools
```bash
sudo apt-get update
sudo apt-get install build-essential python3-pip
pip3 install fastapi uvicorn python-multipart
```

### Compilation errors (Linux)

Install required dependencies:
```bash
sudo apt-get install build-essential git curl
```

### Server running but not responding

Check if port 9881 is available:
```bash
# Linux/Mac
lsof -i :9881

# Windows
netstat -ano | findstr :9881
```

If port is in use, change the port in:
1. `whisper_api.py` (line: `uvicorn.run(..., port=9881)`)
2. ASTRAL settings (Server URL)

### Audio quality issues

- Make sure microphone permissions are granted
- Check browser console for MediaRecorder errors
- Try using Chrome/Edge (best WebM support)

## Performance

Typical transcription times on modern hardware:
- **Tiny**: ~0.5x realtime (2s audio = 1s processing)
- **Base**: ~1x realtime (2s audio = 2s processing)
- **Small**: ~2-3x realtime
- **Medium**: ~5-8x realtime

## Fallback Behavior

If Whisper is disabled or server is down, ASTRAL automatically falls back to:
- Browser Web Speech API (Chrome/Edge)
- No STT (manual text input only)

## Development

To modify the Whisper integration:

**Backend**: `src-tauri/src/whisper_stt.rs`
- Rust module handling HTTP communication
- Tauri commands for frontend integration

**Frontend**: `src/App.tsx`
- MediaRecorder for audio capture
- WAV conversion logic
- Automatic fallback handling

**Server**: `whisper-cpp/whisper_api.py`
- FastAPI server
- Subprocess wrapper for whisper.cpp
- Audio format handling

## Resources

- [Whisper.cpp GitHub](https://github.com/ggerganov/whisper.cpp)
- [OpenAI Whisper Paper](https://arxiv.org/abs/2212.04356)
- [Model Downloads](https://huggingface.co/ggerganov/whisper.cpp/tree/main)

## Future Enhancements

- [ ] GPU acceleration (CUDA/Metal)
- [ ] Real-time streaming transcription
- [ ] Custom model training
- [ ] Multiple language detection
- [ ] Voice activity detection (VAD)
