# Architecture

Manifest V3 WebExtension, packaged for Safari. Source lives in `extension/`.

## Layers

| Layer | Path | Role |
|---|---|---|
| Modules | `extension/modules/<name>/` | One feature each. Depend only on `shared/`. |
| Shared | `extension/shared/` | Venue adapters, orderbook merge, impact math, overlay helpers. |
| Background | `extension/background.js` | Fetches venue orderbooks. Why: page-context requests to venues are blocked by CORS. |
| Content | `extension/content.js` | Runs on CoinGlass pages, loads registered modules, relays messages to background. |

## Data flow

1. A module detects a chart refresh on the page.
2. The module asks background for orderbooks of the current coin from all venues.
3. Background calls each venue adapter and returns normalized books.
4. The module computes its result with `shared/` and draws it over the chart.

## Module contract

`extension/modules/<name>/index.js` exports `{ name, matches, init(ctx) }`.

- `matches`: URL pattern list the module applies to.
- `init(ctx)`: called once per matching page. `ctx` provides page hooks, an orderbook request function, and an overlay helper from `shared/`.

Modules are listed in `extension/modules/index.js`.

## Constraints

- Detecting a refresh uses the page's own requests for timing and does not read their bodies. Why: the bodies are not needed for any current module; see [coinglass-page.md](coinglass-page.md).
- Whether a content script can run in the page's own JavaScript world on Safari is `Unverified`.
