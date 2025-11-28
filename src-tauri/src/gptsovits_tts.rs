// GPT-SoVITS TTS Engine for ASTRAL
// Communicates with local GPT-SoVITS server for high-quality neural TTS

use serde::{Deserialize, Serialize};
use reqwest;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GPTSoVITSConfig {
    pub server_url: String,
    pub reference_audio: String,
    pub reference_text: String,
    pub language: String,
    pub enabled: bool,
}

impl Default for GPTSoVITSConfig {
    fn default() -> Self {
        Self {
            server_url: "http://localhost:9880".to_string(),
            reference_audio: "reference_audio/default.wav".to_string(),
            reference_text: "Hello, this is a reference audio sample.".to_string(),
            language: "en".to_string(),
            enabled: false,
        }
    }
}

#[derive(Debug, Serialize)]
struct TTSRequest {
    text: String,
    reference_audio: String,
    reference_text: String,
    language: String,
}

pub struct GPTSoVITSEngine {
    config: GPTSoVITSConfig,
    client: reqwest::Client,
}

impl GPTSoVITSEngine {
    pub fn new(config: GPTSoVITSConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    /// Check if GPT-SoVITS server is running
    pub async fn health_check(&self) -> Result<bool, String> {
        let url = format!("{}/health", self.config.server_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(e) => Err(format!("Server not reachable: {}", e)),
        }
    }

    /// Generate speech from text
    pub async fn generate_speech(&self, text: &str) -> Result<Vec<u8>, String> {
        if !self.config.enabled {
            return Err("GPT-SoVITS is disabled".to_string());
        }

        // Check if server is running
        if !self.health_check().await.unwrap_or(false) {
            return Err("GPT-SoVITS server is not running. Start it with: cd gpt-sovits && .\\start_server.bat".to_string());
        }

        let url = format!("{}/tts", self.config.server_url);
        
        let request = TTSRequest {
            text: text.to_string(),
            reference_audio: self.config.reference_audio.clone(),
            reference_text: self.config.reference_text.clone(),
            language: self.config.language.clone(),
        };

        match self.client.post(&url)
            .json(&request)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    match response.bytes().await {
                        Ok(bytes) => Ok(bytes.to_vec()),
                        Err(e) => Err(format!("Failed to read audio data: {}", e)),
                    }
                } else {
                    Err(format!("Server returned error: {}", response.status()))
                }
            }
            Err(e) => Err(format!("Request failed: {}", e)),
        }
    }

    /// Save speech to file
    pub async fn generate_speech_to_file(&self, text: &str, output_path: &str) -> Result<(), String> {
        let audio_data = self.generate_speech(text).await?;
        
        std::fs::write(output_path, audio_data)
            .map_err(|e| format!("Failed to write audio file: {}", e))?;
        
        Ok(())
    }

    /// Update configuration
    pub fn update_config(&mut self, config: GPTSoVITSConfig) {
        self.config = config;
    }

    /// Get current configuration
    pub fn get_config(&self) -> GPTSoVITSConfig {
        self.config.clone()
    }
}

// Global instance management
use once_cell::sync::Lazy;
use tokio::sync::Mutex;

static TTS_ENGINE: Lazy<Mutex<GPTSoVITSEngine>> = Lazy::new(|| {
    Mutex::new(GPTSoVITSEngine::new(GPTSoVITSConfig::default()))
});

// Tauri commands

#[tauri::command]
pub async fn gptsovits_health_check() -> Result<bool, String> {
    let engine = TTS_ENGINE.lock().await;
    engine.health_check().await
}

#[tauri::command]
pub async fn gptsovits_speak(text: String) -> Result<String, String> {
    let engine = TTS_ENGINE.lock().await;
    
    // Generate to temp file
    let temp_path = std::env::temp_dir().join("astral_gptsovits_speech.wav");
    let temp_path_str = temp_path.to_string_lossy().to_string();
    
    engine.generate_speech_to_file(&text, &temp_path_str).await?;
    
    Ok(temp_path_str)
}

#[tauri::command]
pub async fn gptsovits_get_config() -> Result<GPTSoVITSConfig, String> {
    let engine = TTS_ENGINE.lock().await;
    Ok(engine.get_config())
}

#[tauri::command]
pub async fn gptsovits_update_config(config: GPTSoVITSConfig) -> Result<(), String> {
    let mut engine = TTS_ENGINE.lock().await;
    engine.update_config(config);
    Ok(())
}

#[tauri::command]
pub async fn gptsovits_test() -> Result<String, String> {
    let engine = TTS_ENGINE.lock().await;
    
    // Check server first
    match engine.health_check().await {
        Ok(true) => {
            // Try to generate test audio
            let test_text = "Hello! This is ASTRAL testing GPT SoVITS text to speech.";
            let temp_path = std::env::temp_dir().join("astral_gptsovits_test.wav");
            let temp_path_str = temp_path.to_string_lossy().to_string();
            
            match engine.generate_speech_to_file(test_text, &temp_path_str).await {
                Ok(_) => Ok(format!("GPT-SoVITS test successful! Audio saved to: {}", temp_path_str)),
                Err(e) => Err(format!("Test failed: {}", e)),
            }
        }
        Ok(false) => Err("GPT-SoVITS server is not responding".to_string()),
        Err(e) => Err(format!("Server check failed: {}", e)),
    }
}
