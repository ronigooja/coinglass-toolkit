#!/bin/bash
# CoinGlass page driver on top of safari-cli (https://github.com/ronigooja/safari-cli).
#
#   page.sh open                      open the LiquidationMap page and wait for the charts
#   page.sh eval '<js expression>'    run an expression; helpers are available as window.__ctk
#   page.sh file <path.js>            run a file containing one expression
#
# Needs safari-cli on PATH and Safari > Settings > Developer > "Allow JavaScript from Apple Events" on.
# Helpers: lib/chart.js. Selectors and facts: docs/coinglass-page.md.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
URL="${CTK_URL:-https://www.coinglass.com/zh/pro/futures/LiquidationMap}"
TAB="coinglass.com/zh/pro/futures/LiquidationMap"
command -v safari-cli >/dev/null || { echo "page.sh: safari-cli not found on PATH" >&2; exit 1; }

inject() {
  safari-cli file --tab "$TAB" "$HERE/lib/chart.js" >/dev/null
}

case "${1:-}" in
  open)
    safari-cli open "$URL" >/dev/null
    safari-cli wait --tab "$TAB" --timeout "${CTK_WAIT:-30}" "document.querySelectorAll('[_echarts_instance_]').length >= 2"
    ;;
  eval)
    inject
    safari-cli eval --tab "$TAB" "$2"
    ;;
  file)
    inject
    safari-cli file --tab "$TAB" "$2"
    ;;
  *)
    sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
