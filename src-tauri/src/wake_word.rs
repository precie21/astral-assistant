use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, AppHandle};
use tokio::time::{Duration, sleep};
use std::sync::atomic::{AtomicBool, Ordering};

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
}

static WAKE_WORD_ACTIVE: AtomicBool = AtomicBool::new(false);

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
pub async fn start_wake_word_detection(app: AppHandle) -> Result<(), String> {
    if WAKE_WORD_ACTIVE.load(Ordering::Relaxed) {
        return Err("Wake word detection already running".to_string());
    }
    
    WAKE_WORD_ACTIVE.store(true, Ordering::Relaxed);
    
    // Spawn background task for continuous listening
    tokio::spawn(async move {
        println!("[WAKE_WORD] Starting continuous listening for 'hey aki'...");
        
        while WAKE_WORD_ACTIVE.load(Ordering::Relaxed) {
            // Check Whisper config
            let whisper_config = match crate::whisper_stt::whisper_get_config(app.clone()).await {
                Ok(cfg) => cfg,
                Err(_) => {
                    sleep(Duration::from_secs(5)).await;
                    continue;
                }
            };
            
            if !whisper_config.enabled {
                println!("[WAKE_WORD] Whisper not enabled, sleeping...");
                sleep(Duration::from_secs(5)).await;
                continue;
            }
            
            // NOTE: This is a simplified implementation
            // In production, you would:
            // 1. Continuously capture audio in 2-second chunks
            // 2. Send each chunk to Whisper for transcription
            // 3. Check if transcription contains "hey aki"
            // 4. Emit event when detected
            
            // For now, just check every 3 seconds if wake word would be detected
            // You'll need to integrate actual audio capture here
            
            println!("[WAKE_WORD] Monitoring... (waiting for frontend audio integration)");
            sleep(Duration::from_secs(3)).await;
        }
        
        println!("[WAKE_WORD] Stopped continuous listening");
    });
    
    Ok(())
}

#[tauri::command]
pub async fn stop_wake_word_detection() -> Result<(), String> {
    WAKE_WORD_ACTIVE.store(false, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub async fn is_wake_word_active() -> Result<bool, String> {
    Ok(WAKE_WORD_ACTIVE.load(Ordering::Relaxed))
}

// Check if text contains wake word phrase
pub fn contains_wake_word(text: &str, wake_phrase: &str) -> bool {
    let text_lower = text.to_lowercase();
    let phrase_lower = wake_phrase.to_lowercase();
    
    // Check for exact match or phrase within text
    text_lower.contains(&phrase_lower) || 
    // Also check without spaces (e.g., "heyaki")
    text_lower.replace(" ", "").contains(&phrase_lower.replace(" ", ""))
}

// Simulated wake word detection function
// In a real implementation, this would:
// 1. Continuously capture audio from microphone
// 2. Process in small chunks (sliding window)
// 3. Run inference on each chunk
// 4. Trigger callback when wake word detected
pub fn detect_wake_word_in_audio(_audio_data: &[f32], _phrase: &str, _sensitivity: f32) -> bool {
    // Placeholder implementation
    // Real implementation would use:
    // - Porcupine SDK for commercial use
    // - TensorFlow Lite for custom models
    // - Whisper.cpp for transcription-based detection
    // - Simple keyword spotting algorithms
    
    false
}

#[tauri::command]
pub async fn check_for_wake_word(text: String, app: AppHandle) -> Result<bool, String> {
    let config = WAKE_WORD_CONFIG.lock().map_err(|e| e.to_string())?;
    
    if !config.enabled {
        return Ok(false);
    }
    
    let detected = contains_wake_word(&text, &config.phrase);
    
    if detected {
        println!("[WAKE_WORD] Detected: '{}' in text: '{}'", config.phrase, text);
        app.emit("wake-word-detected", ()).map_err(|e| e.to_string())?;
    }
    
    Ok(detected)
}

// Helper function to emit wake word detected event
pub async fn emit_wake_word_detected(app_handle: tauri::AppHandle) -> Result<(), String> {
    app_handle
        .emit("wake-word-detected", ())
        .map_err(|e| e.to_string())?;
    Ok(())
}
