use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub executable: String,
    pub aliases: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchResult {
    pub success: bool,
    pub message: String,
    pub app_name: String,
}

// Common Windows applications with their executable names
fn get_app_registry() -> HashMap<String, AppInfo> {
    let mut apps = HashMap::new();
    
    // Browsers
    apps.insert("chrome".to_string(), AppInfo {
        name: "Google Chrome".to_string(),
        executable: "chrome".to_string(),
        aliases: vec!["chrome".to_string(), "google chrome".to_string(), "browser".to_string()],
    });
    
    apps.insert("firefox".to_string(), AppInfo {
        name: "Firefox".to_string(),
        executable: "firefox".to_string(),
        aliases: vec!["firefox".to_string(), "mozilla".to_string()],
    });
    
    apps.insert("edge".to_string(), AppInfo {
        name: "Microsoft Edge".to_string(),
        executable: "msedge".to_string(),
        aliases: vec!["edge".to_string(), "microsoft edge".to_string()],
    });
    
    // Media
    apps.insert("spotify".to_string(), AppInfo {
        name: "Spotify".to_string(),
        executable: "spotify.exe".to_string(),
        aliases: vec!["spotify".to_string(), "music".to_string()],
    });
    
    apps.insert("vlc".to_string(), AppInfo {
        name: "VLC Media Player".to_string(),
        executable: "vlc".to_string(),
        aliases: vec!["vlc".to_string(), "video player".to_string()],
    });
    
    // Communication
    apps.insert("discord".to_string(), AppInfo {
        name: "Discord".to_string(),
        executable: "Discord.exe".to_string(),
        aliases: vec!["discord".to_string()],
    });
    
    apps.insert("slack".to_string(), AppInfo {
        name: "Slack".to_string(),
        executable: "slack".to_string(),
        aliases: vec!["slack".to_string()],
    });
    
    apps.insert("teams".to_string(), AppInfo {
        name: "Microsoft Teams".to_string(),
        executable: "ms-teams".to_string(),
        aliases: vec!["teams".to_string(), "microsoft teams".to_string()],
    });
    
    // Development
    apps.insert("vscode".to_string(), AppInfo {
        name: "Visual Studio Code".to_string(),
        executable: "code".to_string(),
        aliases: vec!["vscode".to_string(), "vs code".to_string(), "code".to_string(), "visual studio code".to_string()],
    });
    
    apps.insert("notepad".to_string(), AppInfo {
        name: "Notepad".to_string(),
        executable: "notepad".to_string(),
        aliases: vec!["notepad".to_string(), "text editor".to_string()],
    });
    
    // System
    apps.insert("explorer".to_string(), AppInfo {
        name: "File Explorer".to_string(),
        executable: "explorer".to_string(),
        aliases: vec!["explorer".to_string(), "file explorer".to_string(), "files".to_string(), "folder".to_string()],
    });
    
    apps.insert("calculator".to_string(), AppInfo {
        name: "Calculator".to_string(),
        executable: "calc".to_string(),
        aliases: vec!["calculator".to_string(), "calc".to_string()],
    });
    
    apps.insert("terminal".to_string(), AppInfo {
        name: "Windows Terminal".to_string(),
        executable: "wt".to_string(),
        aliases: vec!["terminal".to_string(), "windows terminal".to_string(), "command prompt".to_string(), "cmd".to_string()],
    });
    
    apps.insert("powershell".to_string(), AppInfo {
        name: "PowerShell".to_string(),
        executable: "powershell".to_string(),
        aliases: vec!["powershell".to_string(), "pwsh".to_string()],
    });
    
    apps
}

pub fn find_app(query: &str) -> Option<AppInfo> {
    let query_lower = query.to_lowercase();
    let apps = get_app_registry();
    
    // First try exact match
    if let Some(app) = apps.get(&query_lower) {
        return Some(app.clone());
    }
    
    // Try matching aliases
    for app in apps.values() {
        for alias in &app.aliases {
            if alias.to_lowercase() == query_lower || query_lower.contains(&alias.to_lowercase()) {
                return Some(app.clone());
            }
        }
    }
    
    None
}

#[cfg(target_os = "windows")]
pub fn launch_app(app_name: &str) -> Result<LaunchResult, String> {
    let app_info = find_app(app_name).ok_or_else(|| format!("Application '{}' not found", app_name))?;
    
    println!("[APP_LAUNCHER] Attempting to launch: {} (executable: {})", app_info.name, app_info.executable);
    
    // Method 1: Try shell:AppsFolder protocol (most reliable for modern apps)
    let shell_result = Command::new("explorer")
        .arg(format!("shell:AppsFolder\\{}", app_info.name))
        .spawn();
    
    if shell_result.is_ok() {
        println!("[APP_LAUNCHER] Method 1 (shell:AppsFolder) succeeded");
        return Ok(LaunchResult {
            success: true,
            message: format!("Launched {}", app_info.name),
            app_name: app_info.name.clone(),
        });
    }
    println!("[APP_LAUNCHER] Method 1 failed: {:?}", shell_result.err());
    
    // Method 2: Try using Windows Shell via PowerShell (searches Start Menu)
    let ps_result = Command::new("powershell")
        .args(&[
            "-WindowStyle", "Hidden",
            "-Command",
            &format!("Start-Process '{}'", app_info.executable)
        ])
        .spawn();
    
    if ps_result.is_ok() {
        println!("[APP_LAUNCHER] Method 2 (PowerShell) succeeded");
        return Ok(LaunchResult {
            success: true,
            message: format!("Launched {}", app_info.name),
            app_name: app_info.name.clone(),
        });
    }
    println!("[APP_LAUNCHER] Method 2 failed: {:?}", ps_result.err());
    
    // Method 3: Try cmd /c start with executable (most compatible)
    let cmd_result = Command::new("cmd")
        .args(&["/C", "start", "", &app_info.executable])
        .spawn();
    
    match cmd_result {
        Ok(_) => {
            println!("[APP_LAUNCHER] Method 3 (cmd start) succeeded");
            Ok(LaunchResult {
                success: true,
                message: format!("Launched {}", app_info.name),
                app_name: app_info.name.clone(),
            })
        },
        Err(e) => {
            println!("[APP_LAUNCHER] All methods failed");
            Err(format!("Failed to launch {}: {}. The app might not be installed or accessible.", app_info.name, e))
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn launch_app(app_name: &str) -> Result<LaunchResult, String> {
    Err("App launching is only supported on Windows".to_string())
}

#[tauri::command]
pub async fn launch_application(app_name: String) -> Result<LaunchResult, String> {
    launch_app(&app_name)
}

#[tauri::command]
pub async fn get_available_apps() -> Result<Vec<AppInfo>, String> {
    let apps = get_app_registry();
    Ok(apps.values().cloned().collect())
}

#[tauri::command]
pub async fn find_app_command(query: String) -> Result<Option<AppInfo>, String> {
    Ok(find_app(&query))
}
