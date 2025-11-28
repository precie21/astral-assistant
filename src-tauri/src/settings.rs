use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub whisper_enabled: bool,
    pub whisper_server_url: String,
    pub whisper_model: String,
    pub elevenlabs_enabled: bool,
    pub elevenlabs_api_key: String,
    pub elevenlabs_voice_id: String,
    pub elevenlabs_model_id: String,
    pub llm_provider: String,
    pub llm_model: String,
    pub llm_api_key: Option<String>,
    pub ollama_url: String,
    pub wake_word_enabled: bool,
    pub theme: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            whisper_enabled: false,
            whisper_server_url: "http://localhost:9881".to_string(),
            whisper_model: "base.en".to_string(),
            elevenlabs_enabled: false,
            elevenlabs_api_key: String::new(),
            elevenlabs_voice_id: "21m00Tcm4TlvDq8ikWAM".to_string(),
            elevenlabs_model_id: "eleven_turbo_v2_5".to_string(),
            llm_provider: "Ollama".to_string(),
            llm_model: "mistral:latest".to_string(),
            llm_api_key: None,
            ollama_url: "http://localhost:11434".to_string(),
            wake_word_enabled: false,
            theme: "dark".to_string(),
        }
    }
}

#[tauri::command]
pub async fn load_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let store = app.store("settings.json")
        .map_err(|e| format!("Failed to access store: {}", e))?;
    
    // Try to get saved settings
    let settings = match store.get("app_settings") {
        Some(value) => {
            serde_json::from_value(value.clone())
                .unwrap_or_else(|_| AppSettings::default())
        },
        None => AppSettings::default(),
    };
    
    Ok(settings)
}

#[tauri::command]
pub async fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let store = app.store("settings.json")
        .map_err(|e| format!("Failed to access store: {}", e))?;
    
    let value = serde_json::to_value(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    store.set("app_settings", value);
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn update_setting(
    app: tauri::AppHandle, 
    key: String, 
    value: serde_json::Value
) -> Result<(), String> {
    let store = app.store("settings.json")
        .map_err(|e| format!("Failed to access store: {}", e))?;
    
    // Load current settings
    let mut settings: AppSettings = match store.get("app_settings") {
        Some(v) => serde_json::from_value(v.clone()).unwrap_or_default(),
        None => AppSettings::default(),
    };
    
    // Update specific field
    match key.as_str() {
        "whisper_enabled" => settings.whisper_enabled = value.as_bool().unwrap_or(false),
        "whisper_server_url" => settings.whisper_server_url = value.as_str().unwrap_or("").to_string(),
        "whisper_model" => settings.whisper_model = value.as_str().unwrap_or("").to_string(),
        "elevenlabs_enabled" => settings.elevenlabs_enabled = value.as_bool().unwrap_or(false),
        "elevenlabs_api_key" => settings.elevenlabs_api_key = value.as_str().unwrap_or("").to_string(),
        "elevenlabs_voice_id" => settings.elevenlabs_voice_id = value.as_str().unwrap_or("").to_string(),
        "elevenlabs_model_id" => settings.elevenlabs_model_id = value.as_str().unwrap_or("").to_string(),
        "llm_provider" => settings.llm_provider = value.as_str().unwrap_or("").to_string(),
        "llm_model" => settings.llm_model = value.as_str().unwrap_or("").to_string(),
        "llm_api_key" => settings.llm_api_key = value.as_str().map(|s| s.to_string()),
        "ollama_url" => settings.ollama_url = value.as_str().unwrap_or("").to_string(),
        "wake_word_enabled" => settings.wake_word_enabled = value.as_bool().unwrap_or(false),
        "theme" => settings.theme = value.as_str().unwrap_or("dark").to_string(),
        _ => return Err(format!("Unknown setting key: {}", key)),
    }
    
    // Save updated settings
    let settings_value = serde_json::to_value(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    store.set("app_settings", settings_value);
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn reset_settings(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("settings.json")
        .map_err(|e| format!("Failed to access store: {}", e))?;
    
    let default_settings = AppSettings::default();
    let value = serde_json::to_value(&default_settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    store.set("app_settings", value);
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;
    
    Ok(())
}
