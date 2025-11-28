// ElevenLabs TTS Engine for ASTRAL
// High-quality neural TTS with voice cloning capabilities

use serde::{Deserialize, Serialize};
use reqwest;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElevenLabsConfig {
    pub api_key: String,
    pub voice_id: String, // Default voice ID
    pub model_id: String,
    pub enabled: bool,
}

impl Default for ElevenLabsConfig {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            voice_id: "21m00Tcm4TlvDq8ikWAM".to_string(), // Rachel - default voice
            model_id: "eleven_monolingual_v1".to_string(),
            enabled: false,
        }
    }
}

#[derive(Debug, Serialize)]
struct TTSRequest {
    text: String,
    model_id: String,
    voice_settings: VoiceSettings,
}

#[derive(Debug, Serialize)]
struct VoiceSettings {
    stability: f32,
    similarity_boost: f32,
}

pub struct ElevenLabsEngine {
    config: ElevenLabsConfig,
    client: reqwest::Client,
}

impl ElevenLabsEngine {
    pub fn new(config: ElevenLabsConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    /// Generate speech from text
    pub async fn generate_speech(&self, text: &str) -> Result<Vec<u8>, String> {
        if !self.config.enabled {
            return Err("ElevenLabs is disabled".to_string());
        }

        if self.config.api_key.is_empty() {
            return Err("ElevenLabs API key not set. Get one at: https://elevenlabs.io/".to_string());
        }

        let url = format!(
            "https://api.elevenlabs.io/v1/text-to-speech/{}",
            self.config.voice_id
        );

        let request_body = TTSRequest {
            text: text.to_string(),
            model_id: self.config.model_id.clone(),
            voice_settings: VoiceSettings {
                stability: 0.5,
                similarity_boost: 0.75,
            },
        };

        match self.client
            .post(&url)
            .header("xi-api-key", &self.config.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
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
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    Err(format!("ElevenLabs API error {}: {}", status, error_text))
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
    pub fn update_config(&mut self, config: ElevenLabsConfig) {
        self.config = config;
    }

    /// Get current configuration
    pub fn get_config(&self) -> ElevenLabsConfig {
        self.config.clone()
    }
}

// Global instance management
use once_cell::sync::Lazy;
use tokio::sync::Mutex;

static TTS_ENGINE: Lazy<Mutex<ElevenLabsEngine>> = Lazy::new(|| {
    Mutex::new(ElevenLabsEngine::new(ElevenLabsConfig::default()))
});

// Tauri commands

#[tauri::command]
pub async fn elevenlabs_speak(text: String) -> Result<String, String> {
    let engine = TTS_ENGINE.lock().await;
    
    // Generate to temp file
    let temp_path = std::env::temp_dir().join("astral_elevenlabs_speech.mp3");
    let temp_path_str = temp_path.to_string_lossy().to_string();
    
    engine.generate_speech_to_file(&text, &temp_path_str).await?;
    
    Ok(temp_path_str)
}

#[tauri::command]
pub async fn elevenlabs_get_config() -> Result<ElevenLabsConfig, String> {
    let engine = TTS_ENGINE.lock().await;
    Ok(engine.get_config())
}

#[tauri::command]
pub async fn elevenlabs_update_config(config: ElevenLabsConfig) -> Result<(), String> {
    let mut engine = TTS_ENGINE.lock().await;
    engine.update_config(config);
    Ok(())
}

#[tauri::command]
pub async fn elevenlabs_test() -> Result<String, String> {
    let engine = TTS_ENGINE.lock().await;
    
    let test_text = "Hello! This is ASTRAL testing ElevenLabs text to speech. The voice quality is quite impressive, don't you think?";
    let temp_path = std::env::temp_dir().join("astral_elevenlabs_test.mp3");
    let temp_path_str = temp_path.to_string_lossy().to_string();
    
    match engine.generate_speech_to_file(test_text, &temp_path_str).await {
        Ok(_) => Ok(format!("ElevenLabs test successful! Audio saved to: {}", temp_path_str)),
        Err(e) => Err(format!("Test failed: {}", e)),
    }
}

// Available voices (some popular ones)
#[derive(Debug, Serialize, Deserialize)]
pub struct Voice {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub async fn elevenlabs_get_voices() -> Result<Vec<Voice>, String> {
    // Return a list of popular pre-made voices
    Ok(vec![
        Voice { id: "21m00Tcm4TlvDq8ikWAM".to_string(), name: "Rachel (Female, American)".to_string() },
        Voice { id: "AZnzlk1XvdvUeBnXmlld".to_string(), name: "Domi (Female, American)".to_string() },
        Voice { id: "EXAVITQu4vr4xnSDxMaL".to_string(), name: "Bella (Female, American)".to_string() },
        Voice { id: "ErXwobaYiN019PkySvjV".to_string(), name: "Antoni (Male, American)".to_string() },
        Voice { id: "VR6AewLTigWG4xSOukaG".to_string(), name: "Arnold (Male, American)".to_string() },
        Voice { id: "pNInz6obpgDQGcFmaJgB".to_string(), name: "Adam (Male, American)".to_string() },
        Voice { id: "yoZ06aMxZJJ28mfd3POQ".to_string(), name: "Sam (Male, American)".to_string() },
        Voice { id: "ThT5KcBeYPX3keUQqHPh".to_string(), name: "Sarah (Female, British)".to_string() },
    ])
}
