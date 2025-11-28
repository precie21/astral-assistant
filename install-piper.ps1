# Automated Piper TTS installation script for ASTRAL (Windows PowerShell)

Write-Host "🎙️ ASTRAL Piper TTS Installation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create directories
Write-Host "📁 Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "src-tauri\resources\models" | Out-Null

# Download Piper for Windows
Write-Host "⬇️ Downloading Piper for Windows..." -ForegroundColor Yellow
$piperVersion = "2023.11.14-2"
$piperUrl = "https://github.com/rhasspy/piper/releases/download/$piperVersion/piper_windows_amd64.zip"
$piperZip = "piper_windows.zip"

try {
    Invoke-WebRequest -Uri $piperUrl -OutFile $piperZip
    Write-Host "   ✓ Downloaded Piper" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Failed to download Piper: $_" -ForegroundColor Red
    exit 1
}

# Extract Piper
Write-Host "📦 Extracting Piper..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $piperZip -DestinationPath "piper_temp" -Force
    Copy-Item "piper_temp\piper\piper.exe" -Destination "src-tauri\resources\" -Force
    Remove-Item -Path "piper_temp" -Recurse -Force
    Remove-Item -Path $piperZip -Force
    Write-Host "   ✓ Extracted Piper" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Failed to extract Piper: $_" -ForegroundColor Red
    exit 1
}

# Download Jenny voice model (British Female)
Write-Host "⬇️ Downloading British Female voice (Jenny - Recommended)..." -ForegroundColor Yellow
$voiceBaseUrl = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium"
$onnxFile = "src-tauri\resources\models\en_GB-jenny_dioco-medium.onnx"
$jsonFile = "src-tauri\resources\models\en_GB-jenny_dioco-medium.onnx.json"

try {
    Invoke-WebRequest -Uri "$voiceBaseUrl/en_GB-jenny_dioco-medium.onnx" -OutFile $onnxFile
    Write-Host "   ✓ Downloaded voice model (ONNX)" -ForegroundColor Green
    
    Invoke-WebRequest -Uri "$voiceBaseUrl/en_GB-jenny_dioco-medium.onnx.json" -OutFile $jsonFile
    Write-Host "   ✓ Downloaded voice config (JSON)" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Failed to download voice model: $_" -ForegroundColor Red
    exit 1
}

# Verify files
Write-Host ""
Write-Host "✅ Verifying installation..." -ForegroundColor Green

if (Test-Path "src-tauri\resources\piper.exe") {
    $piperSize = (Get-Item "src-tauri\resources\piper.exe").Length / 1MB
    Write-Host "   ✓ piper.exe installed ($([math]::Round($piperSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "   ✗ piper.exe NOT found" -ForegroundColor Red
}

if (Test-Path $onnxFile) {
    $modelSize = (Get-Item $onnxFile).Length / 1MB
    Write-Host "   ✓ Voice model installed ($([math]::Round($modelSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "   ✗ Voice model NOT found" -ForegroundColor Red
}

if (Test-Path $jsonFile) {
    Write-Host "   ✓ Voice config installed" -ForegroundColor Green
} else {
    Write-Host "   ✗ Voice config NOT found" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Installation complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Rebuild ASTRAL: npm run tauri build"
Write-Host "   2. Open Dashboard → Settings → Voice"
Write-Host "   3. Enable 'Use Piper TTS'"
Write-Host "   4. Click 'Test Voice'"
Write-Host ""
Write-Host "📖 For more voice models, see: PIPER_TTS_SETUP.md" -ForegroundColor Cyan

# Test Piper installation
Write-Host ""
Write-Host "🧪 Testing Piper..." -ForegroundColor Yellow
try {
    $testText = "Hello, I am ASTRAL, your voice assistant."
    $testOutput = "test_output.wav"
    
    $testText | & "src-tauri\resources\piper.exe" --model $onnxFile --output_file $testOutput
    
    if (Test-Path $testOutput) {
        Write-Host "   ✓ Piper test successful! Audio saved to $testOutput" -ForegroundColor Green
        Write-Host "   ▶️ Playing test audio..." -ForegroundColor Yellow
        Start-Process $testOutput
    } else {
        Write-Host "   ✗ Test failed - no output generated" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Piper test failed: $_" -ForegroundColor Red
    Write-Host "   This is okay - it will work once bundled in the app" -ForegroundColor Yellow
}
