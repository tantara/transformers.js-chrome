#!/usr/bin/env bash
# Convert Chrome MV3 build to a Safari Web Extension Xcode project.
#
# Prerequisites:
#   - macOS with Xcode 14+ installed
#   - Safari 16+ with "Allow unsigned extensions" enabled in Develop menu
#
# Usage:
#   pnpm build:safari          # builds Chrome MV3 then converts
#   bash scripts/convert-safari.sh  # convert only (assumes build exists)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLASMO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PLASMO_DIR/build/chrome-mv3-prod"
SAFARI_OUT="$PLASMO_DIR/build/safari"

if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Chrome MV3 production build not found at $BUILD_DIR"
  echo "   Run 'pnpm build' first."
  exit 1
fi

# Check for Xcode command line tools
if ! command -v xcrun &> /dev/null; then
  echo "❌ xcrun not found. Install Xcode and Xcode Command Line Tools."
  exit 1
fi

# Check for the safari-web-extension-converter
if ! xcrun --find safari-web-extension-converter &> /dev/null; then
  echo "❌ safari-web-extension-converter not found."
  echo "   Ensure Xcode 14+ is installed with the Safari extension tools."
  exit 1
fi

# Clean previous Safari output
rm -rf "$SAFARI_OUT"
mkdir -p "$SAFARI_OUT"

# Patch manifest for Safari compatibility before conversion
MANIFEST="$BUILD_DIR/manifest.json"
MANIFEST_BAK="$BUILD_DIR/manifest.json.bak"

# Back up original manifest
cp "$MANIFEST" "$MANIFEST_BAK"

# Remove Chrome-only entries that Safari doesn't support
node -e "
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('$MANIFEST', 'utf8'));

// Remove sidePanel permission (Safari doesn't support it)
if (m.permissions) {
  m.permissions = m.permissions.filter(p => p !== 'sidePanel');
}

// Safari doesn't support side_panel key
delete m.side_panel;

fs.writeFileSync('$MANIFEST', JSON.stringify(m, null, 2));
"

echo "🔄 Converting Chrome extension to Safari Web Extension..."

xcrun safari-web-extension-converter "$BUILD_DIR" \
  --project-location "$SAFARI_OUT" \
  --app-name "Private AI Assistant" \
  --bundle-identifier "com.tinywhale.private-ai-assistant" \
  --no-prompt \
  --no-open \
  --macos-only \
  2>&1 || true

# Restore original manifest
mv "$MANIFEST_BAK" "$MANIFEST"

if [ -d "$SAFARI_OUT" ] && [ "$(ls -A "$SAFARI_OUT")" ]; then
  echo ""
  echo "✅ Safari Web Extension project created at:"
  echo "   $SAFARI_OUT"
  echo ""
  echo "Next steps:"
  echo "  1. Open the Xcode project in $SAFARI_OUT"
  echo "  2. Sign with your Apple Developer certificate"
  echo "  3. Build and run in Xcode"
  echo "  4. Enable the extension in Safari → Preferences → Extensions"
else
  echo ""
  echo "⚠️  Conversion completed but output may be empty."
  echo "   Check Xcode and Safari versions."
fi
