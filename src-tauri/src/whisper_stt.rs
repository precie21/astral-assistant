use anyhow::{anyhow, Result};
use log::{debug, error, info};
use reqwest;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WhisperConfig {
    pub enabled: bool,
    pub server_url: String,
    pub model: String,
}

impl Default for WhisperConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            server_url: "http://localhost:9881".to_string(),
            model: "base.en".to_string(),
        }
    }
}

pub struct WhisperEngine {
    config: WhisperConfig,
    client: reqwest::Client,
}

impl WhisperEngine {
    pub fn new(config: WhisperConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    /// Check if Whisper server is running and healthy
    pub async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/health", self.config.server_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    info!("Whisper server health check passed");
                    Ok(true)
                } else {
                    error!("Whisper server returned non-success status");
                    Ok(false)
                }
            }
            Err(e) => {
                error!("Whisper server health check failed: {}", e);
                Ok(false)
            }
        }
    }

    /// Transcribe audio file to text
    pub async fn transcribe_file(&self, audio_path: PathBuf) -> Result<String> {
        if !self.config.enabled {
            return Err(anyhow!("Whisper is not enabled"));
        }

        // Read audio file
        let audio_bytes = fs::read(&audio_path)
            .map_err(|e| anyhow!("Failed to read audio file: {}", e))?;

        debug!("Sending {} bytes to Whisper server", audio_bytes.len());

        // Create multipart form
        let form = reqwest::multipart::Form::new()
            .part(
                "file",
                reqwest::multipart::Part::bytes(audio_bytes)
                    .file_name("audio.wav")
                    .mime_str("audio/wav")?,
            );

        // Send to Whisper server
        let url = format!("{}/transcribe", self.config.server_url);
        let response = self.client
            .post(&url)
            .multipart(form)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to send request to Whisper: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Whisper server error: {}", error_text));
        }

        // Parse response
        #[derive(Deserialize)]
        struct TranscribeResponse {
            text: String,
        }

        let result: TranscribeResponse = response.json().await
            .map_err(|e| anyhow!("Failed to parse Whisper response: {}", e))?;

        info!("Transcription: {}", result.text);
        Ok(result.text.trim().to_string())
    }

    /// Transcribe raw audio bytes (WAV format)
    pub async fn transcribe_bytes(&self, audio_bytes: Vec<u8>) -> Result<String> {
        if !self.config.enabled {
            return Err(anyhow!("Whisper is not enabled"));
        }

        debug!("Transcribing {} bytes", audio_bytes.len());

        // Create multipart form
        let form = reqwest::multipart::Form::new()
            .part(
                "file",
                reqwest::multipart::Part::bytes(audio_bytes)
                    .file_name("audio.wav")
                    .mime_str("audio/wav")?,
            );

        // Send to Whisper server
        let url = format!("{}/transcribe", self.config.server_url);
        let response = self.client
            .post(&url)
            .multipart(form)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to send request to Whisper: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Whisper server error: {}", error_text));
        }

        // Parse response
        #[derive(Deserialize)]
        struct TranscribeResponse {
            text: String,
        }

        let result: TranscribeResponse = response.json().await
            .map_err(|e| anyhow!("Failed to parse Whisper response: {}", e))?;

        info!("Transcription: {}", result.text);
        Ok(result.text.trim().to_string())
    }
}

// ========== Tauri Commands ==========

#[tauri::command]
pub async fn whisper_get_config(app: AppHandle) -> Result<WhisperConfig, String> {
    let config_path = app.path().app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?
        .join("whisper_config.json");

    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        let config: WhisperConfig = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config: {}", e))?;
        Ok(config)
    } else {
        Ok(WhisperConfig::default())
    }
}

#[tauri::command]
pub async fn whisper_update_config(app: AppHandle, config: WhisperConfig) -> Result<(), String> {
    let config_dir = app.path().app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;
    
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config dir: {}", e))?;

    let config_path = config_dir.join("whisper_config.json");
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    info!("Whisper config updated: enabled={}, url={}", config.enabled, config.server_url);
    Ok(())
}

#[tauri::command]
pub async fn whisper_health_check(app: AppHandle) -> Result<bool, String> {
    let config = whisper_get_config(app).await?;
    let engine = WhisperEngine::new(config);
    
    engine.health_check().await
        .map_err(|e| format!("Health check failed: {}", e))
}

#[tauri::command]
pub async fn whisper_transcribe(app: AppHandle, audio_path: String) -> Result<String, String> {
    let config = whisper_get_config(app).await?;
    let engine = WhisperEngine::new(config);
    
    engine.transcribe_file(PathBuf::from(audio_path)).await
        .map_err(|e| format!("Transcription failed: {}", e))
}

#[tauri::command]
pub async fn whisper_transcribe_bytes(app: AppHandle, audio_bytes: Vec<u8>) -> Result<String, String> {
    let config = whisper_get_config(app).await?;
    let engine = WhisperEngine::new(config);
    
    engine.transcribe_bytes(audio_bytes).await
        .map_err(|e| format!("Transcription failed: {}", e))
}
