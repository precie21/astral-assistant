# Piper TTS Setup Guide for ASTRAL

Piper is a fast, local text-to-speech system with natural-sounding voices. This guide will help you set up Piper for ASTRAL's voice output.

## Why Piper?

- **Free & Open Source**: No API costs, no cloud dependencies
- **Natural Voices**: High-quality neural TTS models
- **Fast**: Runs locally on your PC with minimal latency
- **Privacy**: Your voice data never leaves your computer
- **Multiple Languages & Accents**: British, American, and many more

## Quick Setup (Windows)

### 1. Download Piper

Download the latest Windows release from:
https://github.com/rhasspy/piper/releases

Look for: `piper_windows_amd64.zip` (or your architecture)

Extract to a location like: `C:\Program Files\Piper\`

### 2. Download Voice Models

Piper uses ONNX voice models. For ASTRAL with British accent:

**Recommended: Jenny (British Female)**
- Voice: `en_GB-jenny_dioco-medium`
- Download: https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB/jenny_dioco/medium
- Files needed:
  - `en_GB-jenny_dioco-medium.onnx` (63MB)
  - `en_GB-jenny_dioco-medium.onnx.json` (config)

**Alternative: Alba (British Female)**
- Voice: `en_GB-alba-medium`
- Download: https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB/alba/medium

**Alternative: Northern English (Casual Male)**
- Voice: `en_GB-northern_english_male-medium`
- Great for a more casual, friendly tone

### 3. Install in ASTRAL

Create a `models` folder in your ASTRAL resources:
```
astral-assistant/
├── src-tauri/
│   └── resources/
│       ├── piper.exe
│       └── models/
│           ├── en_GB-jenny_dioco-medium.onnx
│           └── en_GB-jenny_dioco-medium.onnx.json
```

Copy:
1. `piper.exe` → `src-tauri/resources/piper.exe`
2. Voice model files → `src-tauri/resources/models/`

### 4. Update tauri.conf.json

Add resources to be bundled:

```json
{
  "bundle": {
    "resources": [
      "resources/piper.exe",
      "resources/models/*.onnx",
      "resources/models/*.json"
    ]
  }
}
```

### 5. Enable in ASTRAL Settings

In the ASTRAL dashboard:
1. Go to Settings → Voice
2. Enable "Use Piper TTS"
3. Select voice model: `en_GB-jenny_dioco-medium`
4. Click "Test Voice" to verify

## Alternative: Add to System PATH

If you don't want to bundle with the app:

1. Add Piper to your PATH:
   - Windows: Add `C:\Program Files\Piper` to System Environment Variables
   - Create a folder: `C:\Users\YourName\.astral\models`
   - Put voice models there

2. Update ASTRAL config:
   ```rust
   TTSConfig {
       piper_executable: "piper.exe", // Will find in PATH
       voice_model_path: "C:/Users/YourName/.astral/models/en_GB-jenny_dioco-medium.onnx",
       ...
   }
   ```

## Testing Piper

### Command Line Test
```bash
# Windows Command Prompt
echo Hello, I am ASTRAL, your voice assistant. | "C:\Program Files\Piper\piper.exe" --model "en_GB-jenny_dioco-medium.onnx" --output_file test.wav

# PowerShell
"Hello, I am ASTRAL" | & "C:\Program Files\Piper\piper.exe" --model "en_GB-jenny_dioco-medium.onnx" --output_file test.wav
```

### ASTRAL Test
In the app, use the Developer Console:
```javascript
await invoke("test_piper_tts")
```

Or via voice command:
"Test your voice"

## Voice Model Options

### English - British (en_GB)

| Voice | Gender | Quality | Speed | Size |
|-------|--------|---------|-------|------|
| jenny_dioco | Female | High | Fast | 63MB |
| alba | Female | Medium | Fast | 63MB |
| northern_english_male | Male | Medium | Fast | 63MB |
| cori | Female | Medium | Fast | 63MB |

### English - American (en_US)

| Voice | Gender | Quality | Speed | Size |
|-------|--------|---------|-------|------|
| amy | Female | High | Fast | 63MB |
| ryan | Male | High | Fast | 63MB |
| lessac | Female | High | Medium | 63MB |

### Other Languages

Piper supports 40+ languages. See full list:
https://huggingface.co/rhasspy/piper-voices/tree/main

## Configuration Options

### Speaking Rate
Adjust speed (0.5 = slow, 2.0 = fast):
```json
{
  "speaking_rate": 1.0
}
```

### Voice Selection
Switch between voices in settings:
```rust
update_tts_config({
  voice_model: "en_GB-jenny_dioco-medium",
  voice_model_path: "models/en_GB-jenny_dioco-medium.onnx"
})
```

## Troubleshooting

### "Piper executable not found"
- Verify `piper.exe` is in `resources/` folder
- Or add Piper folder to system PATH
- Check config: `piper_executable` path

### "Voice model not found"
- Ensure `.onnx` file is in `resources/models/`
- Check both `.onnx` and `.onnx.json` files exist
- Verify path in config matches actual filename

### "Piper failed" errors
- Run Piper from command line to see detailed errors
- Check if voice model is corrupted (re-download)
- Ensure you have both .onnx and .onnx.json files

### No audio output
- Check Windows audio settings
- Verify Piper generates .wav file
- Test file manually: `start test_output.wav`
- Check ASTRAL audio playback code

### Performance Issues
- Use "medium" quality models (faster than "high")
- Lower speaking rate for better quality
- Ensure GPU isn't maxed out by Ollama

## Advanced: Multiple Voices

You can have different voices for different contexts:

```rust
// Friendly voice for greetings
config.voice_model = "en_GB-jenny_dioco-medium";

// Professional voice for system info
config.voice_model = "en_GB-alba-medium";

// Casual voice for jokes
config.voice_model = "en_GB-northern_english_male-medium";
```

## Comparison: Browser TTS vs Piper

| Feature | Browser TTS | Piper TTS |
|---------|-------------|-----------|
| Setup | None | Download required |
| Quality | Robotic | Natural |
| Privacy | Cloud-based | 100% local |
| Speed | Variable | Fast & consistent |
| Offline | No | Yes |
| Cost | Free | Free |
| Voices | System-dependent | Choose any model |

## Building with Piper

When you build ASTRAL for distribution:

```bash
# Development
npm run tauri dev

# Production build (includes Piper in bundle)
npm run tauri build
```

The bundled app will include Piper and your selected voice models automatically.

## Getting More Voices

Browse all available voices:
https://rhasspy.github.io/piper-samples/

Download from HuggingFace:
https://huggingface.co/rhasspy/piper-voices/tree/main

## Next Steps

Once Piper is working:
1. ✅ Enable in ASTRAL settings
2. ✅ Test with voice commands
3. Consider downloading multiple voices for variety
4. Adjust speaking rate to your preference
5. Train custom voice (advanced - see Piper docs)

---

**Need Help?**
- Piper GitHub: https://github.com/rhasspy/piper
- Voice samples: https://rhasspy.github.io/piper-samples/
- ASTRAL issues: File a bug report with voice test results
