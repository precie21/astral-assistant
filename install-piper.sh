#!/bin/bash
# Automated Piper TTS installation script for ASTRAL

echo "🎙️ ASTRAL Piper TTS Installation Script"
echo "========================================"
echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p src-tauri/resources/models

# Download Piper for Windows
echo "⬇️ Downloading Piper for Windows..."
PIPER_VERSION="2023.11.14-2"
PIPER_URL="https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_windows_amd64.zip"

if command -v curl &> /dev/null; then
    curl -L "$PIPER_URL" -o piper_windows.zip
elif command -v wget &> /dev/null; then
    wget "$PIPER_URL" -O piper_windows.zip
else
    echo "❌ Error: Neither curl nor wget found. Please install one of them."
    exit 1
fi

# Extract Piper
echo "📦 Extracting Piper..."
if command -v unzip &> /dev/null; then
    unzip -q piper_windows.zip -d piper_temp
    cp piper_temp/piper/piper.exe src-tauri/resources/
    rm -rf piper_temp piper_windows.zip
else
    echo "❌ Error: unzip not found. Please install unzip."
    exit 1
fi

# Download Jenny voice model (British Female)
echo "⬇️ Downloading British Female voice (Jenny - Recommended)..."
VOICE_BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium"

if command -v curl &> /dev/null; then
    curl -L "${VOICE_BASE_URL}/en_GB-jenny_dioco-medium.onnx" -o src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx
    curl -L "${VOICE_BASE_URL}/en_GB-jenny_dioco-medium.onnx.json" -o src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx.json
else
    wget "${VOICE_BASE_URL}/en_GB-jenny_dioco-medium.onnx" -O src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx
    wget "${VOICE_BASE_URL}/en_GB-jenny_dioco-medium.onnx.json" -O src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx.json
fi

# Verify files
echo ""
echo "✅ Verifying installation..."
if [ -f "src-tauri/resources/piper.exe" ]; then
    echo "   ✓ piper.exe installed"
else
    echo "   ✗ piper.exe NOT found"
fi

if [ -f "src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx" ]; then
    echo "   ✓ Voice model installed ($(du -h src-tauri/resources/models/en_GB-jenny_dioco-medium.onnx | cut -f1))"
else
    echo "   ✗ Voice model NOT found"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Rebuild ASTRAL: npm run tauri build"
echo "   2. Open Dashboard → Settings → Voice"
echo "   3. Enable 'Use Piper TTS'"
echo "   4. Click 'Test Voice'"
echo ""
echo "📖 For more voice models, see: PIPER_TTS_SETUP.md"
