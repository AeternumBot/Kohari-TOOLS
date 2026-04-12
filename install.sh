#!/bin/bash

# Kohari ORC - Photoshop Extension Installer (macOS/Linux)
# Compatible with Photoshop 2022 and later

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "============================================"
echo "   Kohari ORC - Photoshop Extension"
echo "   Scanlation OCR Tool"
echo "============================================"
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Current directory: $SCRIPT_DIR"
echo ""

# Determine OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"

    # Alternative system-wide location
    if [ -d "/Library/Application Support/Adobe/CEP/extensions" ]; then
        CEP_DIR="/Library/Application Support/Adobe/CEP/extensions"
    fi
else
    # Linux
    CEP_DIR="$HOME/.config/Adobe/CEP/extensions"
fi

# Check if directory exists
if [ ! -d "$CEP_DIR" ]; then
    echo -e "${RED}ERROR: CEP extensions directory not found.${NC}"
    echo "Expected location: $CEP_DIR"
    echo ""
    echo "Creating directory..."
    mkdir -p "$CEP_DIR"
fi

echo -e "${GREEN}Found CEP directory: $CEP_DIR${NC}"
echo ""

# Create extension directory
DEST_DIR="$CEP_DIR/com.kohari.orc"

if [ -d "$DEST_DIR" ]; then
    echo "Removing previous installation..."
    rm -rf "$DEST_DIR"
fi

echo "Creating extension directory..."
mkdir -p "$DEST_DIR"

# Copy files
echo ""
echo "Copying extension files..."
echo ""

cp -R CSXS "$DEST_DIR/"
cp -R css "$DEST_DIR/"
cp -R js "$DEST_DIR/"
cp -R host "$DEST_DIR/"
cp -R assets "$DEST_DIR/" 2> /dev/null || true
cp -R tessdata "$DEST_DIR/"

cp index.html "$DEST_DIR/"

echo ""
echo "============================================"
echo -e "${GREEN}   Installation Complete!${NC}"
echo "============================================"
echo ""
echo "Extension installed to:"
echo "$DEST_DIR"
echo ""

# Enable debug mode for CEP (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Enabling CEP debug mode..."
    defaults write com.adobe.CSXS.11 PlayerDebugMode -string "1"
    defaults write com.adobe.CSXS.10 PlayerDebugMode -string "1"
fi

echo ""
echo -e "${YELLOW}IMPORTANT: Please restart Photoshop if it is running.${NC}"
echo ""
echo "After restart, access Kohari ORC from:"
echo "Window > Extensions > Kohari ORC"
echo ""
read -p "Press Enter to exit..."
