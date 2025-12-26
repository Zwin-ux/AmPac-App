#!/bin/bash

# AmPac Capital Mobile App Deployment Script
# Usage: ./deploy.sh [ios|android|all] [production|preview]

set -e

PLATFORM=${1:-all}
PROFILE=${2:-production}

echo "🚀 Starting AmPac Capital deployment..."
echo "Platform: $PLATFORM"
echo "Profile: $PROFILE"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    print_error "app.json not found. Please run this script from the mobile app directory."
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    print_error "EAS CLI not found. Please install it with: npm install -g @expo/eas-cli"
    exit 1
fi

# Check if user is logged in to Expo
print_status "Checking Expo authentication..."
if ! eas whoami &> /dev/null; then
    print_error "Not logged in to Expo. Please run: eas login"
    exit 1
fi

print_success "Expo authentication verified"

# Run TypeScript check
print_status "Running TypeScript validation..."
if npm run typecheck; then
    print_success "TypeScript validation passed"
else
    print_error "TypeScript validation failed. Please fix errors before deploying."
    exit 1
fi

# Check if dependencies are up to date
print_status "Checking dependencies..."
npm install
print_success "Dependencies updated"

# Build the app
print_status "Building app for $PLATFORM with $PROFILE profile..."

if [ "$PLATFORM" = "all" ]; then
    eas build --platform all --profile $PROFILE --non-interactive
elif [ "$PLATFORM" = "ios" ]; then
    eas build --platform ios --profile $PROFILE --non-interactive
elif [ "$PLATFORM" = "android" ]; then
    if [ "$PROFILE" = "production" ]; then
        # Use AAB for production Android builds
        eas build --platform android --profile production-aab --non-interactive
    else
        eas build --platform android --profile $PROFILE --non-interactive
    fi
else
    print_error "Invalid platform. Use: ios, android, or all"
    exit 1
fi

print_success "Build completed successfully!"

# Ask if user wants to submit to stores
echo ""
read -p "Do you want to submit to app stores? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Submitting to app stores..."
    
    if [ "$PLATFORM" = "all" ]; then
        eas submit --platform all --profile $PROFILE --non-interactive
    elif [ "$PLATFORM" = "ios" ]; then
        eas submit --platform ios --profile $PROFILE --non-interactive
    elif [ "$PLATFORM" = "android" ]; then
        eas submit --platform android --profile $PROFILE --non-interactive
    fi
    
    print_success "Submission completed!"
    print_status "Check your app store dashboards for submission status."
else
    print_warning "Skipping app store submission."
    print_status "You can submit later with: eas submit --platform $PLATFORM --profile $PROFILE"
fi

echo ""
print_success "🎉 Deployment process completed!"
print_status "Monitor your builds at: https://expo.dev/accounts/ampac/projects/ampac-business-capital/builds"

# Show useful commands
echo ""
echo "📋 Useful commands:"
echo "  Check build status:     eas build:list"
echo "  Check submission:       eas submit:list"
echo "  Download build:         eas build:download [BUILD_ID]"
echo "  View project:           https://expo.dev/accounts/ampac/projects/ampac-business-capital"