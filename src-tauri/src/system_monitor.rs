use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub memory_total: u64,
    pub memory_used: u64,
    pub gpu_usage: Option<f32>,
    pub timestamp: u64,
}

#[cfg(target_os = "windows")]
mod windows_monitor {
    use super::*;
    use windows::Win32::System::ProcessStatus::{GetPerformanceInfo, PERFORMANCE_INFORMATION};
    use windows::Win32::System::SystemInformation::{GetSystemInfo, GlobalMemoryStatusEx, MEMORYSTATUSEX, SYSTEM_INFO};
    
    pub fn get_cpu_usage() -> Result<f32, String> {
        // Windows CPU usage requires sampling over time
        // For now, return a placeholder that we'll improve with proper monitoring
        Ok(0.0)
    }
    
    pub fn get_memory_usage() -> Result<(f32, u64, u64), String> {
        unsafe {
            let mut mem_status = MEMORYSTATUSEX {
                dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
                ..Default::default()
            };
            
            if GlobalMemoryStatusEx(&mut mem_status).is_ok() {
                let total = mem_status.ullTotalPhys;
                let available = mem_status.ullAvailPhys;
                let used = total - available;
                let usage_percent = (used as f64 / total as f64 * 100.0) as f32;
                
                Ok((usage_percent, total, used))
            } else {
                Err("Failed to get memory status".to_string())
            }
        }
    }
    
    pub fn get_gpu_usage() -> Result<Option<f32>, String> {
        // GPU monitoring requires vendor-specific APIs (NVML for NVIDIA, etc.)
        // Return None for now - can be implemented later with GPU libraries
        Ok(None)
    }
}

#[cfg(not(target_os = "windows"))]
mod windows_monitor {
    use super::*;
    
    pub fn get_cpu_usage() -> Result<f32, String> {
        Err("CPU monitoring only available on Windows".to_string())
    }
    
    pub fn get_memory_usage() -> Result<(f32, u64, u64), String> {
        Err("Memory monitoring only available on Windows".to_string())
    }
    
    pub fn get_gpu_usage() -> Result<Option<f32>, String> {
        Ok(None)
    }
}

// CPU usage tracker with proper sampling
lazy_static::lazy_static! {
    static ref CPU_TRACKER: Arc<Mutex<CpuTracker>> = Arc::new(Mutex::new(CpuTracker::new()));
}

struct CpuTracker {
    last_measurement: Option<SystemTime>,
    last_cpu_usage: f32,
}

impl CpuTracker {
    fn new() -> Self {
        Self {
            last_measurement: None,
            last_cpu_usage: 0.0,
        }
    }
    
    fn get_usage(&mut self) -> f32 {
        let now = SystemTime::now();
        
        // Update measurement if enough time has passed (1 second)
        if let Some(last) = self.last_measurement {
            if now.duration_since(last).unwrap_or(Duration::from_secs(0)) < Duration::from_secs(1) {
                return self.last_cpu_usage;
            }
        }
        
        // Get new measurement
        if let Ok(usage) = sysinfo::get_cpu_usage() {
            self.last_cpu_usage = usage;
            self.last_measurement = Some(now);
        }
        
        self.last_cpu_usage
    }
}

// Sysinfo-based CPU monitoring for cross-platform support
mod sysinfo {
    use super::*;
    
    pub fn get_cpu_usage() -> Result<f32, String> {
        // Use system command to get CPU usage
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            
            // Use WMIC to get CPU load percentage
            let output = Command::new("wmic")
                .args(&["cpu", "get", "loadpercentage"])
                .output();
                
            if let Ok(output) = output {
                let stdout = String::from_utf8_lossy(&output.stdout);
                // Parse the output (second line contains the percentage)
                if let Some(line) = stdout.lines().nth(1) {
                    if let Ok(usage) = line.trim().parse::<f32>() {
                        return Ok(usage);
                    }
                }
            }
        }
        
        Ok(0.0)
    }
}

pub fn get_system_stats() -> Result<SystemStats, String> {
    let cpu_usage = {
        let mut tracker = CPU_TRACKER.lock().map_err(|e| e.to_string())?;
        tracker.get_usage()
    };
    
    let (memory_usage, memory_total, memory_used) = windows_monitor::get_memory_usage()?;
    let gpu_usage = windows_monitor::get_gpu_usage()?;
    
    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    Ok(SystemStats {
        cpu_usage,
        memory_usage,
        memory_total,
        memory_used,
        gpu_usage,
        timestamp,
    })
}

#[tauri::command]
pub async fn get_system_stats_command() -> Result<SystemStats, String> {
    get_system_stats()
}

#[tauri::command]
pub async fn get_cpu_usage_command() -> Result<f32, String> {
    let mut tracker = CPU_TRACKER.lock().map_err(|e| e.to_string())?;
    Ok(tracker.get_usage())
}

#[tauri::command]
pub async fn get_memory_usage_command() -> Result<(f32, u64, u64), String> {
    windows_monitor::get_memory_usage()
}

#[tauri::command]
pub async fn get_gpu_usage_command() -> Result<Option<f32>, String> {
    windows_monitor::get_gpu_usage()
}
