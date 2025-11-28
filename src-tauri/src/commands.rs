use serde::{Deserialize, Serialize};
use log::info;
use tokio::sync::Mutex;
use once_cell::sync::Lazy;

use crate::llm_provider::{LLMManager, LLMConfig, LLMResponse};
use crate::automation::{AutomationManager, AutomationRoutine, AutomationResult};
use crate::audio_engine::AudioEngine;

// Global state managers
static LLM_MANAGER: Lazy<Mutex<Option<LLMManager>>> = Lazy::new(|| Mutex::new(None));
static AUTOMATION_MANAGER: Lazy<Mutex<AutomationManager>> = Lazy::new(|| Mutex::new(AutomationManager::new()));
static AUDIO_ENGINE: Lazy<Mutex<Option<AudioEngine>>> = Lazy::new(|| Mutex::new(None));

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub gpu_usage: Option<f32>,
}

/// Initialize the ASTRAL assistant
#[tauri::command]
pub async fn initialize_assistant() -> Result<String, String> {
    info!("Initializing ASTRAL assistant...");
    
    // Initialize audio engine
    let mut audio_engine = AudioEngine::new();
    
    // Start wake word detection
    match audio_engine.start_wake_word_detection().await {
        Ok(_) => info!("Wake word detection started"),
        Err(e) => info!("Wake word detection not started: {}", e),
    }
    
    *AUDIO_ENGINE.lock().await = Some(audio_engine);
    
    // Initialize LLM with default config (Ollama local)
    let llm_config = LLMConfig::default();
    let llm_manager = LLMManager::new(llm_config);
    *LLM_MANAGER.lock().await = Some(llm_manager);
    
    // Automation manager is already initialized via Lazy
    info!("ASTRAL initialization complete");
    
    Ok("AKI initialized successfully - Wake word: 'Hey AKI', LLM: Local Ollama, Automation: Active".to_string())
}

/// Get current system information
#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    info!("Fetching system information...");
    
    #[cfg(target_os = "windows")]
    {
        use crate::system_integration::get_windows_system_info;
        get_windows_system_info().map_err(|e| e.to_string())
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // Placeholder for other platforms
        Ok(SystemInfo {
            cpu_usage: 0.0,
            memory_used: 0,
            memory_total: 0,
            gpu_usage: None,
        })
    }
}

/// Execute a voice command
#[tauri::command]
pub async fn execute_command(command: String) -> Result<String, String> {
    info!("Executing command: {}", command);
    
    // Check if this should go to LLM or handle locally
    let lower = command.to_lowercase();
    
    // Handle automation trigger phrases
    if lower.contains("work mode") || lower.contains("start work") {
        let mut automation = AUTOMATION_MANAGER.lock().await;
        match automation.execute_routine("work-mode").await {
            Ok(_) => return Ok("Work mode activated!".to_string()),
            Err(e) => return Ok(format!("Failed to start work mode: {}", e)),
        }
    }
    
    if lower.contains("gaming mode") || lower.contains("start gaming") {
        let mut automation = AUTOMATION_MANAGER.lock().await;
        match automation.execute_routine("gaming-mode").await {
            Ok(_) => return Ok("Gaming mode activated!".to_string()),
            Err(e) => return Ok(format!("Failed to start gaming mode: {}", e)),
        }
    }
    
    // For complex queries, route to LLM
    let mut manager_guard = LLM_MANAGER.lock().await;
    if let Some(llm_manager) = manager_guard.as_mut() {
        match llm_manager.send_message(&command).await {
            Ok(response) => Ok(response.content),
            Err(e) => {
                info!("LLM error: {}, falling back to basic response", e);
                Ok(format!("I heard: {}. LLM is not available right now.", command))
            }
        }
    } else {
        Ok(format!("Command received: {}", command))
    }
}

// ===== LLM Commands =====

#[tauri::command]
pub async fn send_llm_message(message: String) -> Result<LLMResponse, String> {
    info!("Sending message to LLM: {}", message);
    
    let mut manager_guard = LLM_MANAGER.lock().await;
    
    if manager_guard.is_none() {
        *manager_guard = Some(LLMManager::new(LLMConfig::default()));
    }
    
    let manager = manager_guard.as_mut().unwrap();
    
    manager.send_message(&message)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_llm_config() -> Result<LLMConfig, String> {
    // Return current config or default
    Ok(LLMConfig::default())
}

#[tauri::command]
pub async fn update_llm_config(config: LLMConfig) -> Result<String, String> {
    info!("Updating LLM config: {:?}", config.provider);
    
    let mut manager_guard = LLM_MANAGER.lock().await;
    
    if let Some(manager) = manager_guard.as_mut() {
        manager.update_config(config.clone());
    } else {
        *manager_guard = Some(LLMManager::new(config));
    }
    
    Ok("LLM configuration updated".to_string())
}

#[tauri::command]
pub async fn test_llm_connection(config: LLMConfig) -> Result<bool, String> {
    crate::llm_provider::test_connection(&config)
        .await
        .map_err(|e| e.to_string())
}

// ===== Automation Commands =====

#[tauri::command]
pub async fn get_automation_routines() -> Result<Vec<AutomationRoutine>, String> {
    let manager = AUTOMATION_MANAGER.lock().await;
    Ok(manager.get_all_routines())
}

#[tauri::command]
pub async fn execute_automation(routine_id: String) -> Result<AutomationResult, String> {
    info!("Executing automation: {}", routine_id);
    
    let mut manager = AUTOMATION_MANAGER.lock().await;
    manager.execute_routine(&routine_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_automation(routine_id: String) -> Result<bool, String> {
    info!("Toggling automation: {}", routine_id);
    
    let mut manager = AUTOMATION_MANAGER.lock().await;
    manager.toggle_routine(&routine_id)
        .map_err(|e| e.to_string())
}

// ===== Audio Commands =====

#[tauri::command]
pub async fn trigger_wake_word() -> Result<String, String> {
    info!("Manually triggering wake word");
    
    let engine_guard = AUDIO_ENGINE.lock().await;
    
    if let Some(engine) = engine_guard.as_ref() {
        engine.trigger_wake_word()
            .await
            .map_err(|e| e.to_string())?;
        Ok("Wake word triggered".to_string())
    } else {
        Ok("Audio engine not initialized".to_string())
    }
}
