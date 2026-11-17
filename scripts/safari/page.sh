#!/bin/bash
# Run JavaScript in the front Safari tab and print the result.
#
#   page.sh open                      open the LiquidationMap page and wait for it
#   page.sh eval '<js expression>'    run an expression; helpers are available as window.__ctk
#   page.sh file <path.js>            run a file containing one expression
#
# Needs Safari > Settings > Developer > "Allow JavaScript from Apple Events". Turn it off when done.
# Helpers: lib/chart.js. Selectors and facts: docs/coinglass-page.md.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
URL="${CTK_URL:-https://www.coinglass.com/zh/pro/futures/LiquidationMap}"

run_js() {
  # The code goes through a file and a variable, so quotes and backslashes need no shell escaping.
  local code="$1"
  CTK_CODE="$code" osascript -e 'tell application "Safari" to do JavaScript (system attribute "CTK_CODE") in document 1'
}

inject() {
  run_js "$(cat "$HERE/lib/chart.js")" >/dev/null
}

case "${1:-}" in
  open)
    osascript -e "tell application \"Safari\" to activate" \
      -e "tell application \"Safari\" to if (count of windows) = 0 then make new document" \
      -e "tell application \"Safari\" to set URL of document 1 to \"$URL\""
    sleep "${CTK_WAIT:-12}"
    ;;
  eval)
    inject
    run_js "(function(){ try { var r = ($2); return typeof r === 'string' ? r : JSON.stringify(r) } catch (e) { return 'ERR ' + e.message } })()"
    ;;
  file)
    inject
    run_js "(function(){ try { var r = ($(cat "$2")); return typeof r === 'string' ? r : JSON.stringify(r) } catch (e) { return 'ERR ' + e.message } })()"
    ;;
  *)
    sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
