// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, Manager};
use log::{info, error};

mod commands;
mod audio_engine;
mod system_integration;
mod config;

use commands::*;

fn main() {
    // Initialize logger
    env_logger::init();
    
    info!("Starting ASTRAL...");

    // Create system tray
    let quit = CustomMenuItem::new("quit".to_string(), "Quit ASTRAL");
    let show = CustomMenuItem::new("show".to_string(), "Show Dashboard");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(quit);
    
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "show" => {
                        let window = app.get_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            initialize_assistant,
            get_system_info,
            execute_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ASTRAL application");
}
