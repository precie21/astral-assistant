// Configuration Module
// Handles user preferences and application settings

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use anyhow::Result;

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    pub wake_word: String,
    pub voice_provider: VoiceProvider,
    pub llm_provider: LLMProvider,
    pub privacy_mode: bool,
    pub auto_start: bool,
    pub theme: Theme,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum VoiceProvider {
    ElevenLabs,
    Azure,
    Piper,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum LLMProvider {
    OpenAI,
    Claude,
    Ollama,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum Theme {
    Dark,
    Light,
    Auto,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            wake_word: "Hey ASTRAL".to_string(),
            voice_provider: VoiceProvider::Azure,
            llm_provider: LLMProvider::OpenAI,
            privacy_mode: false,
            auto_start: false,
            theme: Theme::Dark,
        }
    }
}

#[allow(dead_code)]
impl Config {
    pub fn load() -> Result<Self> {
        let config_path = Self::config_path()?;
        
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)?;
            let config: Config = serde_json::from_str(&content)?;
            Ok(config)
        } else {
            let config = Config::default();
            config.save()?;
            Ok(config)
        }
    }

    pub fn save(&self) -> Result<()> {
        let config_path = Self::config_path()?;
        
        if let Some(parent) = config_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(&config_path, content)?;
        
        Ok(())
    }

    fn config_path() -> Result<PathBuf> {
        let mut path = dirs::config_dir()
            .ok_or_else(|| anyhow::anyhow!("Could not find config directory"))?;
        path.push("ASTRAL");
        path.push("config.json");
        Ok(path)
    }
}
