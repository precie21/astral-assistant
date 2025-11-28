// TTS Engine using Piper for natural-sounding voices
// Piper: https://github.com/rhasspy/piper

use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::AppHandle;
use once_cell::sync::Lazy;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TTSConfig {
    pub voice_model: String,
    pub voice_model_path: String,
    pub piper_executable: String,
    pub speaking_rate: f32,
    pub use_piper: bool, // Toggle between Piper and browser TTS
}

impl Default for TTSConfig {
    fn default() -> Self {
        Self {
            voice_model: "en_GB-jenny_dioco-medium".to_string(),
            voice_model_path: "models/en_GB-jenny_dioco-medium.onnx".to_string(),
            piper_executable: "piper.exe".to_string(), // Will be in resources or PATH
            speaking_rate: 1.0,
            use_piper: false, // Start with browser TTS, enable after setup
        }
    }
}

static TTS_CONFIG: Lazy<Mutex<TTSConfig>> = Lazy::new(|| {
    Mutex::new(TTSConfig::default())
});

pub struct TTSEngine {
    config: TTSConfig,
    app_handle: Option<AppHandle>,
}

impl TTSEngine {
    pub fn new(app_handle: Option<AppHandle>) -> Self {
        Self {
            config: TTSConfig::default(),
            app_handle,
        }
    }

    /// Synthesize text to speech using Piper
    pub async fn speak(&self, text: &str) -> Result<Vec<u8>, String> {
        if !self.config.use_piper {
            return Err("Piper TTS is disabled, use browser TTS".to_string());
        }

        let piper_path = self.get_piper_path()?;
        let model_path = self.get_model_path()?;

        // Validate paths exist
        if !std::path::Path::new(&piper_path).exists() {
            return Err(format!("Piper executable not found at: {}", piper_path));
        }
        if !std::path::Path::new(&model_path).exists() {
            return Err(format!("Voice model not found at: {}", model_path));
        }

        // Run Piper: echo "text" | piper --model model.onnx --output_raw
        let mut child = Command::new(&piper_path)
            .arg("--model")
            .arg(&model_path)
            .arg("--output_raw") // Output raw PCM for playback
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn Piper: {}", e))?;

        // Write text to stdin
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to Piper stdin: {}", e))?;
        }

        // Wait for output
        let output = child.wait_with_output()
            .map_err(|e| format!("Failed to read Piper output: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Piper failed: {}", stderr));
        }

        Ok(output.stdout)
    }

    /// Speak text to a WAV file (alternative method)
    pub async fn speak_to_file(&self, text: &str, output_path: &str) -> Result<(), String> {
        if !self.config.use_piper {
            return Err("Piper TTS is disabled".to_string());
        }

        let piper_path = self.get_piper_path()?;
        let model_path = self.get_model_path()?;

        // Run: echo "text" | piper --model model.onnx --output_file output.wav
        let mut child = Command::new(&piper_path)
            .arg("--model")
            .arg(&model_path)
            .arg("--output_file")
            .arg(output_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn Piper: {}", e))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to Piper stdin: {}", e))?;
        }

        let output = child.wait_with_output()
            .map_err(|e| format!("Failed to wait for Piper: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Piper failed: {}", stderr));
        }

        Ok(())
    }

    /// Get full path to Piper executable
    fn get_piper_path(&self) -> Result<String, String> {
        // Check if it's a full path
        if std::path::Path::new(&self.config.piper_executable).is_absolute() {
            return Ok(self.config.piper_executable.clone());
        }

        // Try resource directory if app_handle available
        if let Some(app) = &self.app_handle {
            if let Ok(resource_dir) = app.path().resource_dir() {
                let piper_path = resource_dir.join(&self.config.piper_executable);
                if piper_path.exists() {
                    return Ok(piper_path.to_string_lossy().to_string());
                }
            }
        }

        // Check in PATH
        if let Ok(which_output) = Command::new("where")
            .arg(&self.config.piper_executable)
            .output()
        {
            if which_output.status.success() {
                let path = String::from_utf8_lossy(&which_output.stdout);
                let path = path.lines().next().unwrap_or("").trim();
                if !path.is_empty() {
                    return Ok(path.to_string());
                }
            }
        }

        Err(format!("Piper executable '{}' not found in PATH or resources", self.config.piper_executable))
    }

    /// Get full path to voice model
    fn get_model_path(&self) -> Result<String, String> {
        // Check if it's a full path
        if std::path::Path::new(&self.config.voice_model_path).is_absolute() {
            return Ok(self.config.voice_model_path.clone());
        }

        // Try resource directory
        if let Some(app) = &self.app_handle {
            if let Ok(resource_dir) = app.path().resource_dir() {
                let model_path = resource_dir.join(&self.config.voice_model_path);
                if model_path.exists() {
                    return Ok(model_path.to_string_lossy().to_string());
                }
            }
        }

        Err(format!("Voice model '{}' not found in resources", self.config.voice_model_path))
    }

    /// Update configuration
    pub async fn update_config(&mut self, config: TTSConfig) {
        self.config = config.clone();
        let mut global_config = TTS_CONFIG.lock().await;
        *global_config = config;
    }

    /// Get current configuration
    pub fn get_config(&self) -> TTSConfig {
        self.config.clone()
    }

    /// List available voice models (scan resources directory)
    pub async fn list_available_voices(&self) -> Vec<String> {
        let mut voices = Vec::new();

        if let Some(app) = &self.app_handle {
            if let Ok(resource_dir) = app.path().resource_dir() {
                let models_dir = resource_dir.join("models");
                if let Ok(entries) = std::fs::read_dir(models_dir) {
                    for entry in entries.flatten() {
                        if let Some(filename) = entry.file_name().to_str() {
                            if filename.ends_with(".onnx") {
                                voices.push(filename.to_string());
                            }
                        }
                    }
                }
            }
        }

        voices
    }

    /// Test if Piper is working
    pub async fn test_piper(&self) -> Result<String, String> {
        let result = self.speak_to_file("Testing Piper TTS. This is ASTRAL speaking.", "test_output.wav").await;
        
        match result {
            Ok(_) => Ok("Piper TTS test successful! Audio saved to test_output.wav".to_string()),
            Err(e) => Err(format!("Piper test failed: {}", e)),
        }
    }
}

/// Global TTS engine instance
static TTS_ENGINE: Lazy<Mutex<Option<TTSEngine>>> = Lazy::new(|| {
    Mutex::new(None)
});

/// Initialize global TTS engine
pub async fn init_tts_engine(app_handle: AppHandle) {
    let mut engine = TTS_ENGINE.lock().await;
    *engine = Some(TTSEngine::new(Some(app_handle)));
}

/// Get global TTS engine
pub async fn get_tts_engine() -> Result<TTSEngine, String> {
    let engine = TTS_ENGINE.lock().await;
    match &*engine {
        Some(e) => Ok(TTSEngine {
            config: e.config.clone(),
            app_handle: None, // Don't clone app_handle
        }),
        None => Err("TTS engine not initialized".to_string()),
    }
}

// Tauri commands for TTS control

#[tauri::command]
pub async fn speak_with_piper(text: String) -> Result<String, String> {
    let engine = get_tts_engine().await?;
    
    // For now, save to temp file and return path
    let temp_path = std::env::temp_dir().join("astral_speech.wav");
    let temp_path_str = temp_path.to_string_lossy().to_string();
    
    engine.speak_to_file(&text, &temp_path_str).await?;
    
    Ok(temp_path_str)
}

#[tauri::command]
pub async fn get_tts_config() -> Result<TTSConfig, String> {
    let config = TTS_CONFIG.lock().await;
    Ok(config.clone())
}

#[tauri::command]
pub async fn update_tts_config(config: TTSConfig) -> Result<(), String> {
    let mut global_config = TTS_CONFIG.lock().await;
    *global_config = config;
    Ok(())
}

#[tauri::command]
pub async fn list_voices() -> Result<Vec<String>, String> {
    let engine = get_tts_engine().await?;
    Ok(engine.list_available_voices().await)
}

#[tauri::command]
pub async fn test_piper_tts() -> Result<String, String> {
    let engine = get_tts_engine().await?;
    engine.test_piper().await
}
