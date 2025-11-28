use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WakeWordConfig {
    pub enabled: bool,
    pub phrase: String,
    pub sensitivity: f32, // 0.0 to 1.0
}

impl Default for WakeWordConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            phrase: "hey aki".to_string(),
            sensitivity: 0.7,
        }
    }
}

lazy_static::lazy_static! {
    static ref WAKE_WORD_CONFIG: Arc<Mutex<WakeWordConfig>> = Arc::new(Mutex::new(WakeWordConfig::default()));
    static ref WAKE_WORD_ACTIVE: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

#[tauri::command]
pub async fn get_wake_word_config() -> Result<WakeWordConfig, String> {
    let config = WAKE_WORD_CONFIG.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

#[tauri::command]
pub async fn update_wake_word_config(config: WakeWordConfig) -> Result<(), String> {
    let mut current_config = WAKE_WORD_CONFIG.lock().map_err(|e| e.to_string())?;
    *current_config = config;
    Ok(())
}

#[tauri::command]
pub async fn start_wake_word_detection() -> Result<(), String> {
    let mut active = WAKE_WORD_ACTIVE.lock().map_err(|e| e.to_string())?;
    
    if *active {
        return Err("Wake word detection already running".to_string());
    }
    
    *active = true;
    
    // In a real implementation, you would:
    // 1. Start audio capture in a background thread
    // 2. Buffer small chunks of audio (e.g., 1-2 seconds)
    // 3. Use a lightweight model or simple pattern matching to detect the wake word
    // 4. When detected, emit a Tauri event to trigger the main listening UI
    
    // For now, this is a placeholder that would integrate with:
    // - Porcupine wake word detection (commercial but good)
    // - Snowboy (deprecated but still works)
    // - Custom Whisper-based detection (heavier but flexible)
    // - Simple pattern matching on Whisper transcriptions
    
    Ok(())
}

#[tauri::command]
pub async fn stop_wake_word_detection() -> Result<(), String> {
    let mut active = WAKE_WORD_ACTIVE.lock().map_err(|e| e.to_string())?;
    *active = false;
    Ok(())
}

#[tauri::command]
pub async fn is_wake_word_active() -> Result<bool, String> {
    let active = WAKE_WORD_ACTIVE.lock().map_err(|e| e.to_string())?;
    Ok(*active)
}

// Simulated wake word detection function
// In a real implementation, this would:
// 1. Continuously capture audio from microphone
// 2. Process in small chunks (sliding window)
// 3. Run inference on each chunk
// 4. Trigger callback when wake word detected
pub fn detect_wake_word_in_audio(audio_data: &[f32], phrase: &str, sensitivity: f32) -> bool {
    // Placeholder implementation
    // Real implementation would use:
    // - Porcupine SDK for commercial use
    // - TensorFlow Lite for custom models
    // - Whisper.cpp for transcription-based detection
    // - Simple keyword spotting algorithms
    
    false
}

// Helper function to emit wake word detected event
pub async fn emit_wake_word_detected(app_handle: tauri::AppHandle) -> Result<(), String> {
    app_handle
        .emit("wake-word-detected", ())
        .map_err(|e| e.to_string())?;
    Ok(())
}
