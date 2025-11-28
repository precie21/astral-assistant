# ASTRAL Dependency Installer for Windows
# Run this script in PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ASTRAL Dependency Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] Please run this script as Administrator!" -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit
}

# Function to check if a command exists
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# 1. Install Chocolatey (Package Manager)
Write-Host "[1/4] Installing Chocolatey..." -ForegroundColor Green
if (Test-Command choco) {
    Write-Host "[OK] Chocolatey already installed" -ForegroundColor Gray
} else {
    Write-Host "Installing Chocolatey package manager..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "[OK] Chocolatey installed successfully" -ForegroundColor Green
}

Write-Host ""

# 2. Install Rust
Write-Host "[2/4] Installing Rust..." -ForegroundColor Green
if (Test-Command rustc) {
    $rustVersion = rustc --version
    Write-Host "[OK] Rust already installed: $rustVersion" -ForegroundColor Gray
} else {
    Write-Host "Downloading and installing Rust..." -ForegroundColor Yellow
    
    # Download rustup-init.exe
    $rustupUrl = "https://win.rustup.rs/x86_64"
    $rustupPath = "$env:TEMP\rustup-init.exe"
    
    Write-Host "Downloading rustup-init.exe..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $rustupUrl -OutFile $rustupPath
    
    Write-Host "Running Rust installer (this may take a few minutes)..." -ForegroundColor Yellow
    Start-Process -FilePath $rustupPath -ArgumentList "-y" -Wait -NoNewWindow
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "[OK] Rust installed successfully" -ForegroundColor Green
}

Write-Host ""

# 3. Install Visual Studio Build Tools
Write-Host "[3/4] Installing Visual Studio Build Tools..." -ForegroundColor Green
Write-Host "Checking for Visual Studio Build Tools..." -ForegroundColor Yellow

# Check if VS Build Tools are installed
$vsBuildTools = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\VisualStudio\*\Setup\*" -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like "*Build Tools*" }

if ($vsBuildTools) {
    Write-Host "[OK] Visual Studio Build Tools already installed" -ForegroundColor Gray
} else {
    Write-Host "Installing Visual Studio Build Tools (this will take 5-10 minutes)..." -ForegroundColor Yellow
    choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive" -y
    Write-Host "[OK] Visual Studio Build Tools installed successfully" -ForegroundColor Green
}

Write-Host ""

# 4. Install WebView2 Runtime
Write-Host "[4/4] Installing WebView2 Runtime..." -ForegroundColor Green

# Check if WebView2 is installed
$webview2RegPath = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
if (Test-Path $webview2RegPath) {
    Write-Host "[OK] WebView2 Runtime already installed" -ForegroundColor Gray
} else {
    Write-Host "Downloading and installing WebView2 Runtime..." -ForegroundColor Yellow
    
    $webview2Url = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
    $webview2File = "$env:TEMP\MicrosoftEdgeWebview2Setup.exe"
    
    Invoke-WebRequest -Uri $webview2Url -OutFile $webview2File
    Start-Process -FilePath $webview2File -ArgumentList "/silent /install" -Wait -NoNewWindow
    
    Write-Host "[OK] WebView2 Runtime installed successfully" -ForegroundColor Green
}

Write-Host ""

# 5. Verify installations
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Refresh PATH one more time
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "Checking installed versions..." -ForegroundColor Yellow
Write-Host ""

if (Test-Command rustc) {
    $rustVersion = rustc --version
    $cargoVersion = cargo --version
    Write-Host "[OK] Rust: $rustVersion" -ForegroundColor Green
    Write-Host "[OK] Cargo: $cargoVersion" -ForegroundColor Green
} else {
    Write-Host "[X] Rust not found - please restart PowerShell and try again" -ForegroundColor Red
}

if (Test-Command node) {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "[OK] npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "[!] Node.js not found - already installed? Check with: node --version" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. Close this PowerShell window" -ForegroundColor White
Write-Host "2. Open a NEW PowerShell window (to refresh environment variables)" -ForegroundColor White
Write-Host "3. Navigate to your project:" -ForegroundColor White
Write-Host "   cd 'c:\Users\preci\OneDrive - The Isle of Wight College\Year 2 File Folder\aSTRAL'" -ForegroundColor Cyan
Write-Host "4. Install Node dependencies:" -ForegroundColor White
Write-Host "   npm install" -ForegroundColor Cyan
Write-Host "5. Run the app:" -ForegroundColor White
Write-Host "   npm run tauri dev" -ForegroundColor Cyan
Write-Host ""

pause
