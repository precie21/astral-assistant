# Advanced Features Implementation

## Overview
This document describes the advanced features implemented in ASTRAL, including wake word detection, LLM integration, automation routines, and audio processing.

## Features Implemented

### 1. Wake Word Detection System
**Location:** `src-tauri/src/audio_engine.rs`

**Capabilities:**
- Always-listening mode for "Hey ASTRAL" wake word activation
- Audio state management (Idle, Listening, Recording, Processing)
- Background thread for continuous audio processing
- Manual trigger support for testing

**Architecture:**
```rust
pub struct AudioEngine {
    state: Arc<Mutex<AudioState>>,
    wake_word_tx: Option<mpsc::Sender<WakeWordDetection>>,
    is_running: Arc<Mutex<bool>>,
}
```

**Usage:**
```rust
let mut engine = AudioEngine::new();
let rx = engine.start_wake_word_detection().await?;
// Receive wake word detections via rx channel
```

**Production Integration:**
- Requires `porcupine-rs` for actual wake word detection
- Uses `cpal` for audio capture from microphone
- Processes audio frames in real-time at 16kHz mono

### 2. Multi-Provider LLM Integration
**Location:** `src-tauri/src/llm_provider.rs`

**Supported Providers:**
- **OpenAI GPT-4** - Cloud-based, requires API key
- **Anthropic Claude** - Cloud-based, requires API key  
- **Ollama** - Local, privacy-first, no API key needed

**Configuration:**
```rust
let config = LLMConfig {
    provider: LLMProvider::Ollama,
    model: "llama2".to_string(),
    temperature: 0.7,
    max_tokens: 500,
    ollama_url: Some("http://localhost:11434".to_string()),
    ..Default::default()
};
```

**Usage:**
```rust
let mut manager = LLMManager::new(config);
let response = manager.send_message("What is quantum computing?").await?;
println!("AI Response: {}", response.content);
```

**Features:**
- Conversation history management (last 10 messages)
- Automatic provider fallback
- Connection testing
- System prompt with British personality

### 3. Automation Routines Engine
**Location:** `src-tauri/src/automation.rs`

**Pre-built Routines:**
1. **Morning Routine** - News, calendar, greetings
2. **Work Mode** - Launch productivity apps, focus settings
3. **Gaming Mode** - Optimize system, adjust volume
4. **Evening Wind Down** - Relaxation apps, dim lighting

**Action Types:**
- `LaunchApp` - Open applications
- `OpenWebsite` - Launch URLs
- `SendNotification` - System notifications
- `SetVolume` - Adjust system volume
- `MediaControl` - Play/pause/skip
- `SystemCommand` - Execute shell commands
- `Wait` - Delay between actions
- `Speak` - TTS announcements

**Triggers:**
- Manual execution
- Voice commands ("start work mode")
- Scheduled times ("08:00")
- System events

**Usage:**
```rust
let mut manager = AutomationManager::new();
let result = manager.execute_routine("work-mode").await?;
println!("Executed {} actions in {}ms", result.actions_executed, result.duration_ms);
```

### 4. Tauri Commands (IPC Bridge)

**System Commands:**
```typescript
await invoke('initialize_assistant'); // Initialize all systems
await invoke('get_system_info');      // Real-time CPU/Memory/GPU stats
await invoke('execute_command', { command: 'open notepad' });
```

**LLM Commands:**
```typescript
await invoke('send_llm_message', { message: 'Explain quantum computing' });
await invoke('get_llm_config');
await invoke('update_llm_config', { config: {...} });
await invoke('test_llm_connection', { config: {...} });
```

**Automation Commands:**
```typescript
await invoke('get_automation_routines');
await invoke('execute_automation', { routineId: 'work-mode' });
await invoke('toggle_automation', { routineId: 'morning-routine' });
```

**Audio Commands:**
```typescript
await invoke('trigger_wake_word'); // Manually trigger wake word detection
```

## Frontend Integration

### App.tsx Enhancements
**Voice Command Processing:**
- Automation triggers: "start work mode", "gaming mode"
- LLM routing for complex queries
- System integration for basic commands

**Example:**
```typescript
const processCommand = async (command: string) => {
    if (command.includes('work mode')) {
        await invoke('execute_automation', { routineId: 'work-mode' });
    } else if (command.length > 20) {
        // Complex query -> route to LLM
        const response = await invoke('send_llm_message', { message: command });
        speak(response.content);
    }
};
```

### Dashboard Component
**Automation Tab:**
- Lists all available routines
- Toggle enable/disable state
- Execute routines on demand
- Shows routine descriptions

**Settings Tab:**
- LLM provider selection (Ollama/OpenAI/Claude)
- API key configuration
- Connection testing
- Voice settings
- Privacy toggles

## Setup Instructions

### 1. Install Ollama (Local LLM)
```bash
# Download from https://ollama.ai
curl https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2

# Start server
ollama serve
```

### 2. Configure API Keys (Optional)
For OpenAI or Claude integration:

1. Open Dashboard → Settings tab
2. Select provider (OpenAI/Claude)
3. Enter API key
4. Click "Test Connection"

### 3. Enable Automation Routines
1. Open Dashboard → Automation tab
2. Toggle routines on/off
3. Click "Run Now" to test
4. Say "start work mode" for voice activation

### 4. Wake Word Detection (Future)
When Porcupine is integrated:
```bash
# Install Porcupine SDK
cargo add porcupine-rs

# Initialize with access key
let porcupine = Porcupine::new(access_key, keyword_paths, sensitivities)?;
```

## Architecture

### Data Flow

```
User Voice Input
    ↓
Web Speech API (Browser)
    ↓
App.tsx processCommand()
    ↓
    ├─→ Basic Commands → Local Processing
    ├─→ Automation Triggers → automation.rs
    └─→ Complex Queries → llm_provider.rs
        ↓
        ├─→ Ollama (Local)
        ├─→ OpenAI GPT-4 (Cloud)
        └─→ Anthropic Claude (Cloud)
    ↓
Speech Synthesis → User
```

### State Management

**Rust Backend (Global State):**
```rust
static LLM_MANAGER: Lazy<Mutex<Option<LLMManager>>>;
static AUTOMATION_MANAGER: Lazy<Mutex<AutomationManager>>;
static AUDIO_ENGINE: Lazy<Mutex<Option<AudioEngine>>>;
```

**React Frontend (React State):**
```typescript
const [assistantState, setAssistantState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
const [commandHistory, setCommandHistory] = useState<string[]>([]);
const [transcript, setTranscript] = useState("");
```

## Dependencies Added

**Cargo.toml:**
```toml
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }  # HTTP for LLM APIs
cpal = "0.15"                                                       # Audio capture
once_cell = "1.19"                                                  # Global state
chrono = { version = "0.4", features = ["serde"] }                 # Timestamps
tauri-plugin-store = "2"                                            # Settings persistence
```

## Future Enhancements

### Planned Features:
1. **Whisper.cpp Integration** - Replace Web Speech API with local Whisper STT
2. **Porcupine Wake Word** - True always-listening mode with "Hey ASTRAL"
3. **Multi-Provider TTS** - Azure/Google/Piper for British accent
4. **Audio Visualization** - Real-time waveform on holographic orb
5. **Scheduled Automation** - Time-based routine triggers
6. **System Event Hooks** - React to Windows events
7. **Encrypted Settings Storage** - Secure API key storage with tauri-plugin-store
8. **GPU Monitoring** - NVML integration for GPU stats
9. **Media Session Control** - Windows Media Session API integration
10. **File Search** - Local file indexing and search

## Testing

### Test LLM Integration:
```bash
# Make sure Ollama is running
ollama serve

# In ASTRAL, say:
"Explain quantum computing"
"What is the meaning of life?"
"Tell me a joke"
```

### Test Automation:
```bash
# Voice commands:
"Start work mode"
"Gaming mode"
"Morning routine"

# Or use Dashboard → Automation → Run Now button
```

### Test Wake Word (Manual):
```typescript
// Frontend can trigger manually for testing
await invoke('trigger_wake_word');
```

## Performance Considerations

**Audio Processing:**
- 16kHz mono audio for speech recognition
- 512 sample buffer size for low latency
- Background thread prevents UI blocking

**LLM Requests:**
- 30 second timeout for cloud APIs
- Local Ollama has no timeout
- Conversation history limited to 10 messages
- Max 500 tokens per response

**Automation:**
- Actions execute sequentially
- Wait actions don't block UI
- Error handling per-action (continues on failure)

## Security

**API Keys:**
- Stored in memory during session
- Plan: Encrypt with tauri-plugin-store
- Never logged or transmitted except to official APIs

**Local Processing:**
- Ollama runs entirely on local machine
- No data sent to cloud when using local mode
- Privacy toggles in settings

**System Commands:**
- Validated before execution
- Limited to predefined actions
- User confirmation for sensitive operations

## Troubleshooting

**LLM Connection Failed:**
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
pkill ollama
ollama serve
```

**Automation Not Working:**
- Check routine is enabled (toggle in Dashboard)
- Verify app names are correct
- Check logs in console (Ctrl+Shift+I)

**Audio Issues:**
- Check microphone permissions
- Verify Web Speech API support (Chrome/Edge)
- Test with "What time is it?" first

## Code Examples

### Custom Automation Routine:
```rust
let custom_routine = AutomationRoutine {
    id: "my-routine".to_string(),
    name: "My Custom Routine".to_string(),
    description: "Does awesome things".to_string(),
    enabled: true,
    trigger: AutomationTrigger::VoiceCommand {
        phrase: "start my routine".to_string(),
    },
    actions: vec![
        AutomationAction::Speak {
            text: "Starting your custom routine!".to_string(),
        },
        AutomationAction::LaunchApp {
            app_name: "vscode".to_string(),
        },
        AutomationAction::Wait { seconds: 2 },
        AutomationAction::SendNotification {
            title: "Routine Complete".to_string(),
            message: "All set!".to_string(),
        },
    ],
    created_at: chrono::Utc::now().to_rfc3339(),
    last_run: None,
};

automation_manager.add_routine(custom_routine);
```

### Custom LLM Provider:
```rust
impl LLMManager {
    async fn call_custom_provider(&self) -> Result<LLMResponse> {
        // Implement your custom LLM API here
        let response = self.client
            .post("https://your-llm-api.com/v1/chat")
            .json(&request)
            .send()
            .await?;
        
        // Parse and return response
        Ok(LLMResponse { ... })
    }
}
```

## Contributing

To add new features:

1. **New Automation Actions:**
   - Add variant to `AutomationAction` enum
   - Implement in `execute_action()` method

2. **New LLM Providers:**
   - Add to `LLMProvider` enum
   - Implement `call_*` method
   - Add to router in `send_message()`

3. **New Audio Features:**
   - Extend `AudioEngine` struct
   - Add new methods for processing
   - Expose via Tauri commands

## License

MIT License - See LICENSE file for details

---

**ASTRAL** - Advanced System for Task Recognition and Adaptive Learning  
Version 0.1.0-alpha  
Built with Rust + Tauri + React + TypeScript
