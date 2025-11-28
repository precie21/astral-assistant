# 🚀 Quick Start - Install Piper TTS

## Option 1: Automated Installation (Recommended)

### Windows PowerShell:
```powershell
cd astral-assistant
.\install-piper.ps1
```

### Linux/Mac (if using dev container):
```bash
cd astral-assistant
chmod +x install-piper.sh
./install-piper.sh
```

**This script will:**
- Download Piper executable (~3MB)
- Download Jenny British Female voice (~63MB)
- Place files in correct directories
- Test the installation

---

## Option 2: Manual Installation

### Step 1: Download Piper
```bash
# Via terminal
cd astral-assistant
mkdir -p src-tauri/resources/models

# Download Piper release
curl -L https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip -o piper.zip

# Extract
unzip piper.zip
cp piper/piper.exe src-tauri/resources/
rm -rf piper piper.zip
```

### Step 2: Download Voice Model
```bash
# British Female (Jenny) - Recommended
curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx" -o src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx

curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx.json" -o src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx.json
```

### Step 3: Verify
```bash
ls -lh src-tauri/resources/piper.exe
ls -lh src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx
```

Should show:
- `piper.exe` (~3MB)
- `en_GB-jenny_dioco-medium.onnx` (~63MB)
- `en_GB-jenny_dioco-medium.onnx.json` (~few KB)

---

## Option 3: Direct Download (Browser)

1. **Download Piper:**
   - Go to: https://github.com/rhasspy/piper/releases
   - Download: `piper_windows_amd64.zip`
   - Extract `piper.exe` to `astral-assistant/src-tauri/resources/`

2. **Download Voice Model:**
   - Go to: https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB/jenny_dioco/medium
   - Download both files:
     - `en_GB-jenny_dioco-medium.onnx` (63.2 MB)
     - `en_GB-jenny_dioco-medium.onnx.json` (few KB)
   - Place in `astral-assistant/src-tauri/resources/models/`

---

## After Installation

### 1. Build ASTRAL
```bash
npm run tauri build
```

### 2. Deploy to Windows PC
```bash
# Installer location:
src-tauri/target/release/bundle/nsis/ASTRAL_0.1.0_x64-setup.exe

# Copy to Windows PC and run
```

### 3. Enable Piper in ASTRAL
1. Launch ASTRAL
2. Click Dashboard icon (top-right)
3. Go to Settings tab
4. Find "Voice Settings" section
5. Toggle "Use Piper TTS (Natural Voice)" ON
6. Click "Test Voice"
7. Listen to natural British voice!

---

## Test Piper Before Building

```bash
# Linux/Mac
echo "Hello, I am ASTRAL" | src-tauri/resources/piper.exe --model src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx --output_file test.wav

# Windows PowerShell
"Hello, I am ASTRAL" | & src-tauri/resources/piper.exe --model src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx --output_file test.wav

# Play the audio
# Linux: aplay test.wav
# Mac: afplay test.wav
# Windows: start test.wav
```

---

## Troubleshooting

### "piper.exe not found"
- Check path: `ls src-tauri/resources/piper.exe`
- If missing, download from GitHub releases

### "Voice model not found"
- Check path: `ls src-tauri/resources/models/*.onnx`
- Ensure both .onnx and .onnx.json files exist

### "Permission denied"
- Linux/Mac: `chmod +x src-tauri/resources/piper.exe`

### Large download failing
- Voice model is 63MB - ensure stable internet
- Try alternative mirror or manual download
- Use `curl -C -` to resume interrupted downloads

---

## Alternative Voice Models

Want a different voice? Download from HuggingFace:

### British Male (Northern)
```bash
curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/northern_english_male/medium/en_GB-northern_english_male-medium.onnx" -o src-tauri/resources/models/en_GB-northern_english_male-medium.onnx

curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/northern_english_male/medium/en_GB-northern_english_male-medium.onnx.json" -o src-tauri/resources/models/en_GB-northern_english_male-medium.onnx.json
```

### American Female (Amy)
```bash
curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx" -o src-tauri/resources/models/en_US-amy-medium.onnx

curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json" -o src-tauri/resources/models/en_US-amy-medium.onnx.json
```

Browse all voices: https://huggingface.co/rhasspy/piper-voices/tree/main

---

## File Structure Check

Your project should look like:
```
astral-assistant/
├── src-tauri/
│   └── resources/
│       ├── piper.exe                           ✓ 3MB
│       └── models/
│           ├── en_GB-jenny_dioco-medium.onnx   ✓ 63MB
│           └── en_GB-jenny_dioco-medium.onnx.json  ✓ few KB
└── ...
```

---

## Need Help?

- Full setup guide: `PIPER_TTS_SETUP.md`
- Project status: `IMPLEMENTATION_STATUS.md`
- Voice commands: `VOICE_COMMANDS.md`
- Recent changes: `UPDATE_NOTES.md`

---

**Enjoy your natural-sounding AI assistant!** 🎙️
