// Automation Module
// Handles multi-step automation routines and scheduled tasks

use log::{info, warn};
use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::time::{sleep, Duration};

/// Automation action types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AutomationAction {
    LaunchApp { app_name: String },
    OpenWebsite { url: String },
    SendNotification { title: String, message: String },
    SetVolume { level: u8 },
    MediaControl { action: String },
    SystemCommand { command: String },
    Wait { seconds: u64 },
    Speak { text: String },
}

/// Automation trigger types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AutomationTrigger {
    Manual,
    Schedule { time: String }, // "08:00" format
    VoiceCommand { phrase: String },
    SystemEvent { event_type: String },
}

/// Automation routine definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationRoutine {
    pub id: String,
    pub name: String,
    pub description: String,
    pub enabled: bool,
    pub trigger: AutomationTrigger,
    pub actions: Vec<AutomationAction>,
    pub created_at: String,
    pub last_run: Option<String>,
}

/// Automation execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationResult {
    pub routine_id: String,
    pub success: bool,
    pub actions_executed: usize,
    pub errors: Vec<String>,
    pub duration_ms: u64,
}

/// Automation Manager
pub struct AutomationManager {
    routines: HashMap<String, AutomationRoutine>,
    is_running: bool,
}

impl AutomationManager {
    pub fn new() -> Self {
        info!("Initializing Automation Manager...");
        
        let mut manager = Self {
            routines: HashMap::new(),
            is_running: false,
        };
        
        // Load default routines
        manager.load_default_routines();
        
        manager
    }

    /// Load default automation routines
    fn load_default_routines(&mut self) {
        // Morning Routine
        self.add_routine(AutomationRoutine {
            id: "morning-routine".to_string(),
            name: "Morning Routine".to_string(),
            description: "Start your day with news, calendar, and music".to_string(),
            enabled: true,
            trigger: AutomationTrigger::Schedule {
                time: "08:00".to_string(),
            },
            actions: vec![
                AutomationAction::Speak {
                    text: "Good morning! Starting your morning routine.".to_string(),
                },
                AutomationAction::SetVolume { level: 50 },
                AutomationAction::LaunchApp {
                    app_name: "Calendar".to_string(),
                },
                AutomationAction::Wait { seconds: 2 },
                AutomationAction::OpenWebsite {
                    url: "https://news.google.com".to_string(),
                },
                AutomationAction::SendNotification {
                    title: "Morning Routine".to_string(),
                    message: "Your morning routine is complete!".to_string(),
                },
            ],
            created_at: chrono::Utc::now().to_rfc3339(),
            last_run: None,
        });

        // Work Mode
        self.add_routine(AutomationRoutine {
            id: "work-mode".to_string(),
            name: "Work Mode".to_string(),
            description: "Focus mode with productivity apps".to_string(),
            enabled: true,
            trigger: AutomationTrigger::VoiceCommand {
                phrase: "start work mode".to_string(),
            },
            actions: vec![
                AutomationAction::Speak {
                    text: "Activating work mode. Let's be productive!".to_string(),
                },
                AutomationAction::LaunchApp {
                    app_name: "Code".to_string(),
                },
                AutomationAction::Wait { seconds: 1 },
                AutomationAction::LaunchApp {
                    app_name: "Teams".to_string(),
                },
                AutomationAction::SetVolume { level: 30 },
                AutomationAction::SendNotification {
                    title: "Work Mode".to_string(),
                    message: "Work mode activated. Focus time!".to_string(),
                },
            ],
            created_at: chrono::Utc::now().to_rfc3339(),
            last_run: None,
        });

        // Evening Wind Down
        self.add_routine(AutomationRoutine {
            id: "evening-winddown".to_string(),
            name: "Evening Wind Down".to_string(),
            description: "Relax and prepare for tomorrow".to_string(),
            enabled: true,
            trigger: AutomationTrigger::Schedule {
                time: "20:00".to_string(),
            },
            actions: vec![
                AutomationAction::Speak {
                    text: "Good evening! Time to wind down.".to_string(),
                },
                AutomationAction::SetVolume { level: 40 },
                AutomationAction::OpenWebsite {
                    url: "https://open.spotify.com".to_string(),
                },
                AutomationAction::SendNotification {
                    title: "Evening Routine".to_string(),
                    message: "Time to relax and recharge!".to_string(),
                },
            ],
            created_at: chrono::Utc::now().to_rfc3339(),
            last_run: None,
        });

        // Gaming Mode
        self.add_routine(AutomationRoutine {
            id: "gaming-mode".to_string(),
            name: "Gaming Mode".to_string(),
            description: "Optimize system for gaming".to_string(),
            enabled: true,
            trigger: AutomationTrigger::VoiceCommand {
                phrase: "start gaming mode".to_string(),
            },
            actions: vec![
                AutomationAction::Speak {
                    text: "Activating gaming mode. Good luck and have fun!".to_string(),
                },
                AutomationAction::SetVolume { level: 80 },
                AutomationAction::SendNotification {
                    title: "Gaming Mode".to_string(),
                    message: "System optimized for gaming!".to_string(),
                },
            ],
            created_at: chrono::Utc::now().to_rfc3339(),
            last_run: None,
        });

        info!("Loaded {} default routines", self.routines.len());
    }

    /// Add a new routine
    pub fn add_routine(&mut self, routine: AutomationRoutine) {
        info!("Adding routine: {}", routine.name);
        self.routines.insert(routine.id.clone(), routine);
    }

    /// Get routine by ID
    pub fn get_routine(&self, id: &str) -> Option<&AutomationRoutine> {
        self.routines.get(id)
    }

    /// Get all routines
    pub fn get_all_routines(&self) -> Vec<AutomationRoutine> {
        self.routines.values().cloned().collect()
    }

    /// Update routine
    pub fn update_routine(&mut self, routine: AutomationRoutine) -> Result<()> {
        if self.routines.contains_key(&routine.id) {
            self.routines.insert(routine.id.clone(), routine);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Routine not found: {}", routine.id))
        }
    }

    /// Delete routine
    pub fn delete_routine(&mut self, id: &str) -> Result<()> {
        self.routines.remove(id)
            .context(format!("Routine not found: {}", id))?;
        Ok(())
    }

    /// Toggle routine enabled state
    pub fn toggle_routine(&mut self, id: &str) -> Result<bool> {
        let routine = self.routines.get_mut(id)
            .context(format!("Routine not found: {}", id))?;
        
        routine.enabled = !routine.enabled;
        info!("Routine '{}' enabled: {}", routine.name, routine.enabled);
        Ok(routine.enabled)
    }

    /// Execute a routine by ID
    pub async fn execute_routine(&mut self, id: &str) -> Result<AutomationResult> {
        let start_time = std::time::Instant::now();
        
        let routine = self.routines.get(id)
            .context(format!("Routine not found: {}", id))?
            .clone();

        if !routine.enabled {
            warn!("Routine '{}' is disabled", routine.name);
            return Err(anyhow::anyhow!("Routine is disabled"));
        }

        info!("Executing routine: {}", routine.name);
        
        let mut actions_executed = 0;
        let mut errors = Vec::new();

        for (i, action) in routine.actions.iter().enumerate() {
            match self.execute_action(action).await {
                Ok(_) => {
                    actions_executed += 1;
                    info!("Action {}/{} completed", i + 1, routine.actions.len());
                }
                Err(e) => {
                    let error_msg = format!("Action {} failed: {}", i + 1, e);
                    warn!("{}", error_msg);
                    errors.push(error_msg);
                }
            }
        }

        // Update last run time
        if let Some(routine) = self.routines.get_mut(id) {
            routine.last_run = Some(chrono::Utc::now().to_rfc3339());
        }

        let duration_ms = start_time.elapsed().as_millis() as u64;
        let success = errors.is_empty();

        info!(
            "Routine '{}' completed: {} actions, {} errors, {}ms",
            routine.name, actions_executed, errors.len(), duration_ms
        );

        Ok(AutomationResult {
            routine_id: id.to_string(),
            success,
            actions_executed,
            errors,
            duration_ms,
        })
    }

    /// Execute a single automation action
    async fn execute_action(&self, action: &AutomationAction) -> Result<()> {
        match action {
            AutomationAction::LaunchApp { app_name } => {
                info!("Launching app: {}", app_name);
                // In production: Use tauri-plugin-shell or system_integration
                // crate::system_integration::launch_application(app_name).await?;
                Ok(())
            }
            AutomationAction::OpenWebsite { url } => {
                info!("Opening website: {}", url);
                // In production: Use tauri-plugin-shell
                // shell::open(url, None)?;
                Ok(())
            }
            AutomationAction::SendNotification { title, message } => {
                info!("Sending notification: {} - {}", title, message);
                // In production: Use tauri-plugin-notification
                Ok(())
            }
            AutomationAction::SetVolume { level } => {
                info!("Setting volume to {}%", level);
                // In production: Use Windows CoreAudio API
                Ok(())
            }
            AutomationAction::MediaControl { action } => {
                info!("Media control: {}", action);
                // In production: Use crate::system_integration::control_media
                Ok(())
            }
            AutomationAction::SystemCommand { command } => {
                info!("Executing system command: {}", command);
                // In production: Use tauri-plugin-shell with caution
                Ok(())
            }
            AutomationAction::Wait { seconds } => {
                info!("Waiting {} seconds...", seconds);
                sleep(Duration::from_secs(*seconds)).await;
                Ok(())
            }
            AutomationAction::Speak { text } => {
                info!("Speaking: {}", text);
                // In production: Use audio_engine.synthesize_speech
                Ok(())
            }
        }
    }

    /// Start automation scheduler
    pub async fn start_scheduler(&mut self) {
        self.is_running = true;
        info!("Automation scheduler started");
        
        // In production: This would:
        // 1. Monitor time and trigger scheduled routines
        // 2. Listen for voice commands
        // 3. React to system events
        // 4. Execute triggered routines automatically
    }

    /// Stop automation scheduler
    pub fn stop_scheduler(&mut self) {
        self.is_running = false;
        info!("Automation scheduler stopped");
    }
}

impl Default for AutomationManager {
    fn default() -> Self {
        Self::new()
    }
}
