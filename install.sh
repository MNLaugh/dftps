#!/bin/sh
# DFtpS Installation Script
# Downloads pre-compiled binary from GitHub Releases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

REPO="MNLaugh/dftps"
INSTALL_DIR="/usr/local/bin"

echo "${GREEN}DFtpS Installer${NC}"
echo "================"
echo ""

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
    linux)
        case "$ARCH" in
            x86_64) ARTIFACT="dftps-linux-x64" ;;
            *) echo "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
        esac
        ;;
    darwin)
        case "$ARCH" in
            x86_64) ARTIFACT="dftps-macos-x64" ;;
            arm64) ARTIFACT="dftps-macos-arm64" ;;
            *) echo "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
        esac
        ;;
    *)
        echo "${RED}Unsupported OS: $OS${NC}"
        echo "For Windows, download manually from GitHub Releases"
        exit 1
        ;;
esac

# Get latest version or use specified version
if [ $# -eq 0 ]; then
    echo "Fetching latest release..."
    VERSION=$(curl -sL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
else
    VERSION="$1"
fi

if [ -z "$VERSION" ]; then
    echo "${RED}Error: Could not determine version${NC}"
    exit 1
fi

echo "Installing DFtpS $VERSION for $OS/$ARCH..."
echo ""

# Download URL
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/${ARTIFACT}.tar.gz"

# Create temp directory
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# Download and extract
echo "Downloading from $DOWNLOAD_URL..."
curl -sL "$DOWNLOAD_URL" -o "$TMP_DIR/dftps.tar.gz"

if [ ! -s "$TMP_DIR/dftps.tar.gz" ]; then
    echo "${RED}Error: Download failed${NC}"
    exit 1
fi

echo "Extracting..."
tar -xzf "$TMP_DIR/dftps.tar.gz" -C "$TMP_DIR"

# Install binary
echo "Installing to $INSTALL_DIR (may require sudo)..."
if [ -w "$INSTALL_DIR" ]; then
    cp "$TMP_DIR/dftps" "$INSTALL_DIR/dftps"
    chmod +x "$INSTALL_DIR/dftps"
else
    sudo cp "$TMP_DIR/dftps" "$INSTALL_DIR/dftps"
    sudo chmod +x "$INSTALL_DIR/dftps"
fi

# Copy config template
CONFIG_DIR="/etc"
if [ -f "$TMP_DIR/dftps.toml" ]; then
    if [ ! -f "$CONFIG_DIR/dftps.toml" ]; then
        echo "Installing default config to $CONFIG_DIR/dftps.toml..."
        if [ -w "$CONFIG_DIR" ]; then
            cp "$TMP_DIR/dftps.toml" "$CONFIG_DIR/dftps.toml"
        else
            sudo cp "$TMP_DIR/dftps.toml" "$CONFIG_DIR/dftps.toml"
        fi
    else
        echo "${YELLOW}Config file already exists at $CONFIG_DIR/dftps.toml${NC}"
    fi
fi

echo ""
echo "${GREEN}✓ DFtpS $VERSION installed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit config: sudo nano /etc/dftps.toml"
echo "  2. Add users: dftps user add <username> -p <password> -r /path/to/root"
echo "  3. Start server: dftps serve"
echo ""
echo "Run 'dftps --help' for more options."

