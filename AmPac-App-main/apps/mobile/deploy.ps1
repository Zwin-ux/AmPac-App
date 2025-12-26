# AmPac Capital Mobile App Deployment Script (PowerShell)
# Usage: .\deploy.ps1 [ios|android|all] [production|preview]

param(
    [string]$Platform = "all",
    [string]$Profile = "production"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting AmPac Capital deployment..." -ForegroundColor Blue
Write-Host "Platform: $Platform" -ForegroundColor Cyan
Write-Host "Profile: $Profile" -ForegroundColor Cyan

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if we're in the right directory
if (-not (Test-Path "app.json")) {
    Write-Error "app.json not found. Please run this script from the mobile app directory."
    exit 1
}

# Check if EAS CLI is installed
try {
    $null = Get-Command eas -ErrorAction Stop
    Write-Success "EAS CLI found"
} catch {
    Write-Error "EAS CLI not found. Please install it with: npm install -g @expo/eas-cli"
    exit 1
}

# Check if user is logged in to Expo
Write-Status "Checking Expo authentication..."
try {
    $whoami = eas whoami 2>$null
    Write-Success "Expo authentication verified: $whoami"
} catch {
    Write-Error "Not logged in to Expo. Please run: eas login"
    exit 1
}

# Run TypeScript check
Write-Status "Running TypeScript validation..."
try {
    npm run typecheck
    Write-Success "TypeScript validation passed"
} catch {
    Write-Error "TypeScript validation failed. Please fix errors before deploying."
    exit 1
}

# Check if dependencies are up to date
Write-Status "Checking dependencies..."
npm install
Write-Success "Dependencies updated"

# Build the app
Write-Status "Building app for $Platform with $Profile profile..."

try {
    if ($Platform -eq "all") {
        eas build --platform all --profile $Profile --non-interactive
    } elseif ($Platform -eq "ios") {
        eas build --platform ios --profile $Profile --non-interactive
    } elseif ($Platform -eq "android") {
        if ($Profile -eq "production") {
            # Use AAB for production Android builds
            eas build --platform android --profile production-aab --non-interactive
        } else {
            eas build --platform android --profile $Profile --non-interactive
        }
    } else {
        Write-Error "Invalid platform. Use: ios, android, or all"
        exit 1
    }
    
    Write-Success "Build completed successfully!"
} catch {
    Write-Error "Build failed: $_"
    exit 1
}

# Ask if user wants to submit to stores
Write-Host ""
$submit = Read-Host "Do you want to submit to app stores? (y/N)"

if ($submit -match "^[Yy]$") {
    Write-Status "Submitting to app stores..."
    
    try {
        if ($Platform -eq "all") {
            eas submit --platform all --profile $Profile --non-interactive
        } elseif ($Platform -eq "ios") {
            eas submit --platform ios --profile $Profile --non-interactive
        } elseif ($Platform -eq "android") {
            eas submit --platform android --profile $Profile --non-interactive
        }
        
        Write-Success "Submission completed!"
        Write-Status "Check your app store dashboards for submission status."
    } catch {
        Write-Error "Submission failed: $_"
        exit 1
    }
} else {
    Write-Warning "Skipping app store submission."
    Write-Status "You can submit later with: eas submit --platform $Platform --profile $Profile"
}

Write-Host ""
Write-Success "🎉 Deployment process completed!"
Write-Status "Monitor your builds at: https://expo.dev/accounts/ampac/projects/ampac-business-capital/builds"

# Show useful commands
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Cyan
Write-Host "  Check build status:     eas build:list"
Write-Host "  Check submission:       eas submit:list"
Write-Host "  Download build:         eas build:download [BUILD_ID]"
Write-Host "  View project:           https://expo.dev/accounts/ampac/projects/ampac-business-capital"