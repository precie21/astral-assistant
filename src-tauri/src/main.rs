// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::info;

mod commands;
mod audio_engine;
mod system_integration;
mod config;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    // Initialize logger
    env_logger::init();
    
    info!("Starting ASTRAL...");

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            initialize_assistant,
            get_system_info,
            execute_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ASTRAL application");
}
