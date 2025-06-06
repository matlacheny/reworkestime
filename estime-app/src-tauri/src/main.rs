// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::path::PathBuf;
use tauri::{Builder, generate_context, Context};

fn main() {
    // Generate the context once
    let context = generate_context!();
    
    // Start the network API executable
    launch_network_api(&context);

    // Start the Tauri app
    Builder::default()
        .run(context)
        .expect("❌ Failed to run Tauri application");
}

fn launch_network_api(context: &Context<impl tauri::Runtime>) {
    // Possible locations for the network-api.exe
    let api_paths = [
        // First check resource directory
        tauri::utils::platform::resource_dir(
            &context.package_info().clone(),
            &tauri::Env::default(),
        )
        .map(|dir| dir.join("network-api.exe"))
        .unwrap_or_else(|_| PathBuf::from("not-found")),
        
        // Then check other common locations
        PathBuf::from("resources/network-api.exe"),
        PathBuf::from("src-tauri/target/network-api.exe"),
        PathBuf::from("target/network-api.exe"),
        PathBuf::from("../network-api.exe"),
    ];
    
    // Find the first existing executable
    for api_path in api_paths {
        if api_path.exists() {
            println!("🟢 Starting Network API: {}", api_path.display());
            
            match Command::new(&api_path).spawn() {
                Ok(_) => {
                    println!("✅ Network API started successfully");
                    return;
                }
                Err(e) => {
                    eprintln!("❌ Failed to start Network API: {}", e);
                }
            }
        }
    }
    
    eprintln!("❌ Network API executable not found in any expected location");
}
