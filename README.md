# ASTRAL - Advanced System for Task Recognition and Adaptive Learning

A next-generation personal assistant for Windows with futuristic holographic UI, voice control, and deep system integration.

## 🚀 Features

- **Always-On Wake Word Detection** - Instant activation with "Hey ASTRAL"
- **Holographic UI** - Stunning 3D visualizations with WebGL shaders
- **Voice Interface** - Natural conversation with British accent TTS
- **System Integration** - Deep Windows control and automation
- **Privacy-First** - Local-first processing with optional cloud features
- **Intelligent** - Hybrid cloud/local LLM for reasoning and commands

## 📋 Prerequisites

Before running ASTRAL, ensure you have:

1. **Rust** (latest stable) - [Install from rustup.rs](https://rustup.rs/)
2. **Node.js** 18+ - [Download](https://nodejs.org/)
3. **Visual Studio Build Tools** - Required for Rust on Windows
4. **WebView2** - Usually pre-installed on Windows 11

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed installation instructions.

## 🛠️ Development Setup

```powershell
# Clone the repository
git clone <repository-url>
cd aSTRAL

# Install dependencies
npm install

# Run development server
npm run tauri dev
```

## 📦 Building

```powershell
# Build for production
npm run tauri build
```

The installer will be created in `src-tauri/target/release/bundle/`.

## 🏗️ Project Structure

```
aSTRAL/
├── src/                      # React frontend
│   ├── components/          # UI components
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri entry point
│   │   ├── commands.rs     # IPC commands
│   │   ├── audio_engine.rs # Voice processing
│   │   ├── system_integration.rs # Windows API
│   │   └── config.rs       # Configuration
│   └── Cargo.toml
├── package.json
└── README.md
```

## 🎨 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **3D Graphics**: Three.js + React Three Fiber
- **Animations**: Framer Motion
- **Backend**: Rust + Tauri
- **Voice**: Porcupine (wake word) + Whisper.cpp (STT) + Multi-provider TTS
- **LLM**: OpenAI GPT-4 / Claude 3 / Ollama (local)

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please read CONTRIBUTING.md for guidelines.

## 🔗 Links

- [Documentation](docs/)
- [Implementation Plan](implementation_plan.md)
- [Setup Guide](SETUP_GUIDE.md)

---

**ASTRAL** - Your intelligent companion from the future 🌟
