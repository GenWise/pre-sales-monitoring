#!/bin/bash

# Google Forms Script Deployment Automation Runner
# This script sets up and runs the automated deployment of Google Apps Scripts

set -e  # Exit on any error

echo "🚀 Google Forms Script Deployment Automation"
echo "=============================================="

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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 14+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    print_error "Node.js version 14 or higher is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) detected"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not available. Please install npm and try again."
    exit 1
fi

# Navigate to the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_status "Working directory: $SCRIPT_DIR"

# Check if required script files exist
print_status "Checking required files..."

REQUIRED_FILES=(
    "deploy_scripts_automation.js"
    "corrected_scripts/returning_students_bound_script.js"
    "corrected_scripts/ats_qualifiers_bound_script.js"
    "corrected_scripts/website_bound_script.js"
    "corrected_scripts/early_bird_bound_script.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
    print_success "Found: $file"
done

# Create screenshots directory if it doesn't exist
SCREENSHOTS_DIR="screenshots"
if [ ! -d "$SCREENSHOTS_DIR" ]; then
    print_status "Creating screenshots directory..."
    mkdir -p "$SCREENSHOTS_DIR"
    print_success "Screenshots directory created"
fi

# Install dependencies if they don't exist
print_status "Checking dependencies..."

# Check if node_modules exists and has required packages
if [ ! -d "node_modules" ] || [ ! -d "node_modules/puppeteer" ] || [ ! -d "node_modules/readline-sync" ] || [ ! -d "node_modules/chalk" ]; then
    print_status "Installing automation dependencies..."

    if ! npm install puppeteer readline-sync chalk; then
        print_error "Failed to install dependencies"
        exit 1
    fi

    print_success "Dependencies installed successfully"
else
    print_success "Dependencies already installed"
fi

# Test dependencies
print_status "Testing dependencies..."
if node -e "require('puppeteer'); require('readline-sync'); require('chalk'); console.log('✅ All dependencies working');" 2>/dev/null; then
    print_success "All dependencies are working correctly"
else
    print_error "Dependency test failed. Please check your installation."
    exit 1
fi

# Display pre-deployment information
echo ""
print_status "Pre-deployment checklist:"
echo "  ✓ Node.js $(node --version) available"
echo "  ✓ All required script files present"
echo "  ✓ Dependencies installed and tested"
echo "  ✓ Screenshots directory ready"
echo ""

print_warning "Important reminders:"
echo "  • Ensure you have Google account access"
echo "  • Verify edit permissions on all Google Forms"
echo "  • Be ready to complete OAuth authentication"
echo "  • Stable internet connection required"
echo ""

# Ask for confirmation
read -p "Ready to start deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Deployment cancelled by user"
    exit 0
fi

# Run the deployment
print_status "Starting automated deployment..."
echo ""

if node deploy_scripts_automation.js; then
    echo ""
    print_success "🎉 Deployment automation completed!"

    # Check if deployment report exists
    if [ -f "deployment_report.json" ]; then
        print_status "Deployment report generated: deployment_report.json"
    fi

    # Check if screenshots were created
    if [ -d "$SCREENSHOTS_DIR" ] && [ "$(ls -A $SCREENSHOTS_DIR)" ]; then
        SCREENSHOT_COUNT=$(ls -1 "$SCREENSHOTS_DIR"/*.png 2>/dev/null | wc -l)
        print_status "Screenshots captured: $SCREENSHOT_COUNT files in $SCREENSHOTS_DIR/"
    fi

    echo ""
    print_status "Next steps:"
    echo "  1. Review deployment_report.json for detailed results"
    echo "  2. Check screenshots/ directory for visual debugging"
    echo "  3. Test form submissions to verify webhook connectivity"
    echo "  4. Monitor Google Apps Script execution logs"

else
    echo ""
    print_error "💥 Deployment automation failed!"

    # Check for error screenshots
    if [ -d "$SCREENSHOTS_DIR" ] && [ "$(ls -A $SCREENSHOTS_DIR)" ]; then
        print_status "Check screenshots/ directory for error debugging"
    fi

    if [ -f "deployment_report.json" ]; then
        print_status "Check deployment_report.json for error details"
    fi

    echo ""
    print_status "Troubleshooting:"
    echo "  1. Ensure Google authentication was completed"
    echo "  2. Verify form edit permissions"
    echo "  3. Check internet connectivity"
    echo "  4. Review console output for specific errors"

    exit 1
fi

echo ""
print_status "🚀 Google Forms Script Deployment Automation Complete!"