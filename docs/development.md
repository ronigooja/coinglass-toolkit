# Development

## Test

Unit tests sit next to the code as `*.test.js` and run with the Node built-in runner: `node --test`. Tests use recorded public venue orderbook responses as fixtures.

Run `npm run check:docs` to validate documentation paths. CI runs both checks in its test job.

## Package for Safari

`xcrun safari-web-extension-converter extension/` generates the Xcode project from the WebExtension source. Build it on a GitHub-hosted macOS runner.

CI also runs a Safari packaging job after the test job.

## Manual check in Safari

Page behavior cannot be tested offline. Record confirmed page facts in [coinglass-page.md](coinglass-page.md).

1. Install the built extension: `SIGN_IDENTITY=<identity> scripts/safari/install.sh`. List identities with `security find-identity -v -p codesigning`. Settings and what it does: header of [install.sh](../scripts/safari/install.sh). Enable the extension in Safari > Settings > Extensions on first install.
2. Log in to CoinGlass in Safari, then drive and inspect the page with [page.sh](../scripts/safari/page.sh). It needs Safari > Settings > Developer > "Allow JavaScript from Apple Events"; turn it off afterwards. Chart helpers (`axes`, `overlayStats`, `zoomToCurrent`, `pickPeriod`, ...) are in [chart.js](../scripts/safari/lib/chart.js).

Example: `scripts/safari/page.sh open`, then `scripts/safari/page.sh eval '__ctk.overlayStats(0)'`.

Non-ASCII text in injected code is garbled by osascript. Write Chinese strings as `\uXXXX` escapes in JavaScript passed to `page.sh`.

## Add a module

1. Create `extension/modules/<name>/` with `index.js` and `README.md` (spec).
2. Export the module contract defined in [architecture.md](architecture.md).
3. Register it in `extension/modules/index.js`.
4. List every file the module loads in `web_accessible_resources` of `extension/manifest.json`. Why: the content script imports modules by extension URL.
5. Add a row to the document map in [README.md](../README.md).

## Add a venue

1. Create `extension/shared/venues/<venue>.js` implementing [the adapter contract](../extension/shared/venues/README.md).
2. Put the endpoint URL, parameters, and contract-size conversion in the file header comment, taken from the venue's official documentation.
3. Register it in `extension/shared/venues/index.js`.
4. Add its API host to `host_permissions` in `extension/manifest.json`, and its `liqMap` symbol pattern to `NATIVE` in `extension/modules/impact-cost/requests.js`.
5. Add a test using a recorded response fixture.

Safari grants website access per host. After installing a build with a new host, allow it in Safari > Settings > Extensions, otherwise that venue's requests fail and the chart shows `订单簿请求失败：<venue>`.
