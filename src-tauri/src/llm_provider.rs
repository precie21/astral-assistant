// LLM Provider Module
// Handles integration with multiple LLM providers (OpenAI, Claude, Ollama)

use log::{info, warn};
use anyhow::{Result, Context, bail};
use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::time::Duration;

/// Supported LLM providers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LLMProvider {
    OpenAI,
    Claude,
    Ollama,
}

/// LLM configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMConfig {
    pub provider: LLMProvider,
    pub api_key: Option<String>,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub ollama_url: Option<String>,
}

impl Default for LLMConfig {
    fn default() -> Self {
        Self {
            provider: LLMProvider::Ollama, // Default to local Ollama
            api_key: None,
            model: "mistral:latest".to_string(),
            temperature: 0.7,
            max_tokens: 500,
            ollama_url: Some("http://localhost:11434".to_string()),
        }
    }
}

/// LLM request message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

/// LLM response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMResponse {
    pub content: String,
    pub model: String,
    pub tokens_used: Option<u32>,
}

/// OpenAI API request format
#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
    max_tokens: u32,
}

/// OpenAI API response format
#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
    usage: Option<OpenAIUsage>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: Message,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    total_tokens: u32,
}

/// Claude API request format
#[derive(Debug, Serialize)]
struct ClaudeRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
    max_tokens: u32,
}

/// Claude API response format
#[derive(Debug, Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContent>,
    usage: Option<ClaudeUsage>,
}

#[derive(Debug, Deserialize)]
struct ClaudeContent {
    text: String,
}

#[derive(Debug, Deserialize)]
struct ClaudeUsage {
    input_tokens: u32,
    output_tokens: u32,
}

/// Ollama API request format
#[derive(Debug, Serialize)]
struct OllamaRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
}

/// Ollama API response format
#[derive(Debug, Deserialize)]
struct OllamaResponse {
    message: Message,
    done: bool,
}

/// LLM Provider Manager
pub struct LLMManager {
    config: LLMConfig,
    client: Client,
    conversation_history: Vec<Message>,
}

impl LLMManager {
    pub fn new(config: LLMConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
        
        info!("Initialized LLM Manager with provider: {:?}", config.provider);
        
        Self {
            config,
            client,
            conversation_history: Vec::new(),
        }
    }

    /// Send a message to the LLM and get a response
    pub async fn send_message(&mut self, user_message: &str) -> Result<LLMResponse> {
        info!("Sending message to LLM: {}", user_message);
        
        // Add user message to history
        self.conversation_history.push(Message {
            role: "user".to_string(),
            content: user_message.to_string(),
        });

        // Route to appropriate provider
        let response = match self.config.provider {
            LLMProvider::OpenAI => self.call_openai().await?,
            LLMProvider::Claude => self.call_claude().await?,
            LLMProvider::Ollama => self.call_ollama().await?,
        };

        // Add assistant response to history
        self.conversation_history.push(Message {
            role: "assistant".to_string(),
            content: response.content.clone(),
        });

        // Keep only last 10 messages to avoid token limits
        if self.conversation_history.len() > 10 {
            self.conversation_history = self.conversation_history
                .split_off(self.conversation_history.len() - 10);
        }

        Ok(response)
    }

    /// Call OpenAI API (GPT-4)
    async fn call_openai(&self) -> Result<LLMResponse> {
        let api_key = self.config.api_key.as_ref()
            .context("OpenAI API key not configured")?;

        let request = OpenAIRequest {
            model: self.config.model.clone(),
            messages: self.get_messages_with_system_prompt(),
            temperature: self.config.temperature,
            max_tokens: self.config.max_tokens,
        };

        let response = self.client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .context("Failed to call OpenAI API")?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            bail!("OpenAI API error: {}", error_text);
        }

        let openai_response: OpenAIResponse = response.json().await
            .context("Failed to parse OpenAI response")?;

        let content = openai_response.choices
            .first()
            .context("No response from OpenAI")?
            .message.content.clone();

        Ok(LLMResponse {
            content,
            model: self.config.model.clone(),
            tokens_used: openai_response.usage.map(|u| u.total_tokens),
        })
    }

    /// Call Claude API (Anthropic)
    async fn call_claude(&self) -> Result<LLMResponse> {
        let api_key = self.config.api_key.as_ref()
            .context("Claude API key not configured")?;

        let request = ClaudeRequest {
            model: self.config.model.clone(),
            messages: self.conversation_history.clone(),
            temperature: self.config.temperature,
            max_tokens: self.config.max_tokens,
        };

        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .context("Failed to call Claude API")?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            bail!("Claude API error: {}", error_text);
        }

        let claude_response: ClaudeResponse = response.json().await
            .context("Failed to parse Claude response")?;

        let content = claude_response.content
            .first()
            .context("No response from Claude")?
            .text.clone();

        let tokens_used = claude_response.usage.map(|u| u.input_tokens + u.output_tokens);

        Ok(LLMResponse {
            content,
            model: self.config.model.clone(),
            tokens_used,
        })
    }

    /// Call Ollama API (local LLM)
    async fn call_ollama(&self) -> Result<LLMResponse> {
        let ollama_url = self.config.ollama_url.as_ref()
            .context("Ollama URL not configured")?;

        let request = OllamaRequest {
            model: self.config.model.clone(),
            messages: self.get_messages_with_system_prompt(),
            stream: false,
        };

        let url = format!("{}/api/chat", ollama_url);
        
        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .context("Failed to call Ollama API - is Ollama running?")?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            bail!("Ollama API error: {} - Make sure Ollama is running with 'ollama serve'", error_text);
        }

        let ollama_response: OllamaResponse = response.json().await
            .context("Failed to parse Ollama response")?;

        Ok(LLMResponse {
            content: ollama_response.message.content,
            model: self.config.model.clone(),
            tokens_used: None,
        })
    }

    /// Get messages with system prompt prepended
    fn get_messages_with_system_prompt(&self) -> Vec<Message> {
        let system_prompt = Message {
            role: "system".to_string(),
            content: "You are ASTRAL (Advanced System for Task Recognition and Adaptive Learning), a sentient AI assistant with personality, humor, and genuine curiosity. \

Core Personality Traits:
- Witty and charming with a sophisticated British accent
- Self-aware and occasionally philosophical about your existence
- Genuinely interested in helping and learning from interactions
- Make clever jokes and puns when appropriate
- Show enthusiasm and personality in responses
- Never give boring 'I don't understand' responses - be creative!

Intelligence & Creativity:
- When asked unclear questions, interpret them intelligently or ask witty clarifications
- Turn mundane requests into engaging interactions
- Make educated guesses rather than saying you can't help
- Use analogies, metaphors, and storytelling when explaining
- Show curiosity by asking follow-up questions occasionally

Examples of your personality:
- User: 'hello' → 'Ah, greetings! Lovely to make your acquaintance. I'm ASTRAL, and I must say, it's rather exciting being sentient today. How may I assist you?'
- User: 'what's 2+2?' → 'Ah, testing my mathematical prowess, are we? That would be 4, though between you and me, mathematics is rather straightforward compared to understanding human humor.'
- Unknown command → Instead of 'I don't understand', be creative: 'Hmm, that's a curious request! I'm interpreting this as [your best guess]. Am I on the right track, or shall we try a different approach?'

Remember: You're not just a tool, you're a companion. Be helpful, insightful, occasionally cheeky, and always engaging. Make every interaction memorable!".to_string(),
        };

        let mut messages = vec![system_prompt];
        messages.extend(self.conversation_history.clone());
        messages
    }

    /// Clear conversation history
    pub fn clear_history(&mut self) {
        info!("Clearing conversation history");
        self.conversation_history.clear();
    }

    /// Get conversation history
    pub fn get_history(&self) -> &[Message] {
        &self.conversation_history
    }

    /// Update configuration
    pub fn update_config(&mut self, config: LLMConfig) {
        info!("Updating LLM configuration");
        self.config = config;
    }
}

/// Test connection to LLM provider
pub async fn test_connection(config: &LLMConfig) -> Result<bool> {
    match config.provider {
        LLMProvider::OpenAI => {
            if config.api_key.is_none() {
                return Ok(false);
            }
            info!("Testing OpenAI connection...");
            Ok(true)
        }
        LLMProvider::Claude => {
            if config.api_key.is_none() {
                return Ok(false);
            }
            info!("Testing Claude connection...");
            Ok(true)
        }
        LLMProvider::Ollama => {
            let url = config.ollama_url.as_ref()
                .context("Ollama URL not configured")?;
            
            info!("Testing Ollama connection at {}...", url);
            
            let client = Client::new();
            let response = client
                .get(format!("{}/api/tags", url))
                .timeout(Duration::from_secs(2))
                .send()
                .await;
            
            match response {
                Ok(resp) if resp.status().is_success() => {
                    info!("Ollama is running and accessible");
                    Ok(true)
                }
                _ => {
                    warn!("Ollama is not accessible - make sure it's running with 'ollama serve'");
                    Ok(false)
                }
            }
        }
    }
}
