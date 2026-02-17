#!/bin/sh
# DFtpS Installation Script
# Installs DFtpS using Deno's built-in installer

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${GREEN}DFtpS Installer${NC}"
echo "================"
echo ""

# Check if Deno is installed
if ! command -v deno >/dev/null 2>&1; then
    echo "${RED}Error: Deno is required to install DFtpS.${NC}" 1>&2
    echo ""
    echo "Install Deno first:"
    echo "  curl -fsSL https://deno.land/install.sh | sh"
    echo "  # or"
    echo "  irm https://deno.land/install.ps1 | iex  # Windows PowerShell"
    echo ""
    exit 1
fi

# Check Deno version (need 2.x)
DENO_VERSION=$(deno --version | head -n1 | cut -d' ' -f2 | cut -d'.' -f1)
if [ "$DENO_VERSION" -lt 2 ]; then
    echo "${YELLOW}Warning: DFtpS requires Deno 2.x. You have Deno $DENO_VERSION.x${NC}" 1>&2
    echo "Please upgrade Deno: deno upgrade"
    exit 1
fi

echo "✓ Deno $(deno --version | head -n1) detected"
echo ""

# Determine install source
if [ $# -eq 0 ]; then
    # Install from JSR (when published) or GitHub
    INSTALL_URL="https://raw.githubusercontent.com/DevArtSite/DFtpS/main/mod.ts"
else
    # Install specific version
    INSTALL_URL="https://raw.githubusercontent.com/DevArtSite/DFtpS/$1/mod.ts"
fi

echo "Installing DFtpS..."
echo ""

# Install using deno install
deno install \
    --global \
    --allow-net \
    --allow-read \
    --allow-write \
    --allow-env \
    --name dftps \
    --force \
    "$INSTALL_URL"

echo ""
echo "${GREEN}✓ DFtpS installed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Create a config file: dftps init"
echo "  2. Add users: dftps users add <username>"
echo "  3. Start the server: dftps serve"
echo ""
echo "Run 'dftps --help' for more options."

