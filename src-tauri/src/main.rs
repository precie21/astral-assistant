// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::info;

mod commands;
mod audio_engine;
mod system_integration;
mod config;
mod llm_provider;
mod automation;
mod gptsovits_tts;

use commands::*;
use gptsovits_tts::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    // Initialize logger
    env_logger::init();
    
    info!("Starting ASTRAL...");

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            initialize_assistant,
            get_system_info,
            execute_command,
            send_llm_message,
            get_llm_config,
            update_llm_config,
            test_llm_connection,
            get_automation_routines,
            execute_automation,
            toggle_automation,
            trigger_wake_word,
            gptsovits_health_check,
            gptsovits_speak,
            gptsovits_get_config,
            gptsovits_update_config,
            gptsovits_test,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ASTRAL application");
}
