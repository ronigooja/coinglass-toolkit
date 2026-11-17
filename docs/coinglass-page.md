# CoinGlass page facts

Page: `https://www.coinglass.com/zh/pro/futures/LiquidationMap`

Status values: `Verified (date)` was confirmed on a live page. `Unverified` is inferred or seen only in a headless, logged-out browser.

## Charts

| Fact | Status |
|---|---|
| The page has three chart sections titled "Binance BTC/USDT 清算地图", "比特币交易所清算地图", "Hyperliquid清算地图". | Verified (2026-11-17), logged out |
| Each chart container carries a `_echarts_instance_` DOM attribute. | Verified (2026-11-17), logged out |
| No global `echarts` object exists on `window`. | Verified (2026-11-17), logged out |
| The ECharts instance can be reached from the extension, and its axis range can be read. | Unverified |

## Data requests

Host `capi.coinglass.com`. Both requests are GET.

| Chart | Path | Parameters | Status |
|---|---|---|---|
| Binance | `/api/index/5/liqMap` | `merge=true`, `symbol=Binance_BTCUSDT`, `interval=1`, `limit=1500`, `data=<opaque>` | Verified (2026-11-17) |
| Exchange | `/api/index/2/exLiqMap` | `merge=true`, `symbol=BTC`, `interval=1`, `limit=1500` | Verified (2026-11-17), logged out |

| Fact | Status |
|---|---|
| `liqMap` `symbol` has the form `<Exchange>_<native symbol>`, and the native format differs per exchange: Binance `JCTUSDT`, Bybit `JCTUSDT`, OKX `JCT-USDT-SWAP`, Bitget `JCTUSDT_UMCBL`, Gate `JCT_USDT`, MEXC `JCT_USDT`, KuCoin `JCTUSDTM`. | Verified (2026-11-17) |
| `exLiqMap` `symbol` is the coin only; it carries no exchange. | Verified (2026-11-17), logged out |
| The period selector ("1天", "7天", "30天", "90天", "180天", "1年") sets the `interval` of both requests: `1`, `5`, `30`, `90d`, `180d`, `365d` in that order. | Verified (2026-11-17) |
| Request headers include `encryption: true`, `cache-ts-v2`, `language`; cookies include `obe` and `api_grade`. | Verified (2026-11-17) |
| The response has headers `encryption: true` and `ev: 2`; the body is not plain JSON. | Verified (2026-11-17), from the response headers |
| In a headless logged-out browser, the page's own requests to both endpoints returned `{"code":"40000"}`. Cause unknown. | Verified (2026-11-17) |

## Controls

| Fact | Status |
|---|---|
| Each of the first two charts has a title bar with a text input (`MuiAutocomplete`), a period select (shows "1天"), and a last button with no text and no `aria-label`. | Verified (2026-11-17), logged out |
| The last button is the refresh button. It contains an SVG with `polyline points="1 4 1 10 7 10"`. | Unverified |
| What the text input selects (coin, exchange, or pair). | Unverified |
| Logged-out visitors get a login modal over the charts. | Verified (2026-11-17) |
