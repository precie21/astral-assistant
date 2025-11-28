// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::info;

mod commands;
mod audio_engine;
mod system_integration;
mod config;
mod llm_provider;
mod automation;
mod tts_engine;

use commands::*;
use tts_engine::*;

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
            speak_with_piper,
            get_tts_config,
            update_tts_config,
            list_voices,
            test_piper_tts,
        ])
        .setup(|app| {
            // Initialize TTS engine with app handle
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tts_engine::init_tts_engine(app_handle).await;
                info!("TTS engine initialized");
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ASTRAL application");
}
