#!/bin/bash
# Build the Safari extension from extension/ and install it to /Applications for local testing.
#
#   SIGN_IDENTITY=<codesign identity hash or name> scripts/safari/install.sh
#
# Environment:
#   SIGN_IDENTITY  required; list yours with: security find-identity -v -p codesigning
#   CTK_WORK       build directory, default $HOME/Agents/coinglass-toolkit
#   CTK_BUNDLE_ID  bundle identifier, default io.github.ronigooja.coinglass-toolkit
#
# Safari lists an extension only when its app and extension are sandboxed and signed, so both are
# re-signed with the entitlements below. Quits Safari and the app, then reopens them.
set -euo pipefail

: "${SIGN_IDENTITY:?set SIGN_IDENTITY, see: security find-identity -v -p codesigning}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${CTK_WORK:-$HOME/Agents/coinglass-toolkit}"
BUNDLE_ID="${CTK_BUNDLE_ID:-io.github.ronigooja.coinglass-toolkit}"
APP="coinglass-toolkit"
LOG="$WORK/install.log"

mkdir -p "$WORK"
ENT="$WORK/sandbox.entitlements"
cat > "$ENT" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>com.apple.security.app-sandbox</key><true/>
<key>com.apple.security.files.user-selected.read-only</key><true/>
</dict></plist>
EOF

osascript -e 'tell application "Safari" to quit' 2>/dev/null || true
osascript -e "tell application \"$APP\" to quit" 2>/dev/null || true
# Unregister the old copy first, otherwise Safari lists the extension twice.
pluginkit -r "/Applications/$APP.app/Contents/PlugIns/$APP Extension.appex" 2>/dev/null || true
rm -rf "/Applications/$APP.app" "$WORK/safari"

fail() { echo "failed, last lines of $LOG:" >&2; tail -n 40 "$LOG" >&2; exit 1; }

xcrun safari-web-extension-converter "$ROOT/extension" --project-location "$WORK/safari" \
  --no-open --no-prompt --macos-only --app-name "$APP" --bundle-identifier "$BUNDLE_ID" > "$LOG" 2>&1 || fail
xcodebuild -project "$WORK/safari/$APP/$APP.xcodeproj" -scheme "$APP" -configuration Debug \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES build >> "$LOG" 2>&1 || fail

OUT="$WORK/safari/$APP/Build/Products/Debug/$APP.app"
codesign --force --sign "$SIGN_IDENTITY" --timestamp=none --entitlements "$ENT" "$OUT/Contents/PlugIns/$APP Extension.appex" >> "$LOG" 2>&1 || fail
codesign --force --sign "$SIGN_IDENTITY" --timestamp=none --entitlements "$ENT" "$OUT" >> "$LOG" 2>&1 || fail
cp -R "$OUT" /Applications/
rm -rf "$WORK/safari/$APP/Build"

# Launching the container app is what registers the extension; -g -j keeps it in the background and hidden.
# Registering with pluginkit -a alone did not work.
open -g -j "/Applications/$APP.app"
sleep 3
open -a Safari
echo "installed /Applications/$APP.app ($(pluginkit -mAvvv -i "$BUNDLE_ID.Extension" 2>&1 | grep -c Path) registered)"
echo "Enable it in Safari > Settings > Extensions on first install."
