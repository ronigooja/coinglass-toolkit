# CoinGlass page facts

Page: `https://www.coinglass.com/zh/pro/futures/LiquidationMap`

Status values: `Verified (date)` was confirmed on a live page, logged in unless noted. `Unverified` is inferred or seen only in a headless, logged-out browser.

## Charts

| Fact | Status |
|---|---|
| The page has three chart sections: single exchange (title `<Exchange> <COIN>/USDT 清算地图`), aggregate (`<COIN>交易所清算地图`), and Hyperliquid. Titles change with the selected exchange and coin. | Verified (2026-11-17) |
| Each chart container carries a `_echarts_instance_` DOM attribute. | Verified (2026-11-17) |
| No global `echarts` object exists on `window`. | Verified (2026-11-17) |
| The ECharts instance is reachable from the page world through the React fiber of the container: a fiber ancestor whose `stateNode.getEchartsInstance()` returns it. Its `convertToPixel`, `getOption` and `getModel` work. | Verified (2026-11-17) |
| X axis is a category axis of numeric price labels in ascending order with uneven spacing. A label can repeat (the current-price category). | Verified (2026-11-17) |
| Y axis 0 (left) is a value axis for the per-price bars. Y axis 1 (right) is a value axis for cumulative liquidation intensity in USDT; the page sets its range from its own data. | Verified (2026-11-17) |
| The current price is the `markLine` of series 0; its `xAxis` holds the price. | Verified (2026-11-17) |
| The chart redraws on zoom (`dataZoom` action) and on data change; chart instances can be rebuilt by the page, so event bindings on them are not reliable. | Verified (2026-11-17) |
| The native tooltip is `trigger: axis` with a page `formatter`; it renders `.cg-toolti-box` with `.cg-toolti-title` (the X label, a price) and one `.cg-tooltip-item` per series (`.cg-tooltip-item-title`, then `.pl20` for the value, in 万/亿 units). | Verified (2026-11-17) |\n| Wheel zoom works on the page's own canvas; the overlay with `pointer-events: none` does not block it. | Verified (2026-11-17) |

## Data requests

Host `capi.coinglass.com`. Both requests are GET.

| Chart | Path | Parameters | Status |
|---|---|---|---|
| Single exchange | `/api/index/5/liqMap` | `merge=true`, `symbol=<Exchange>_<native symbol>`, `interval`, `limit`, `data=<opaque>` | Verified (2026-11-17) |
| Aggregate | `/api/index/2/exLiqMap` | `merge=true`, `symbol=<COIN>`, `interval`, `limit` | Verified (2026-11-17) |

| Fact | Status |
|---|---|
| The native symbol format differs per exchange: Binance `JCTUSDT`, Bybit `JCTUSDT`, OKX `JCT-USDT-SWAP`, Bitget `JCTUSDT_UMCBL`, Gate `JCT_USDT`, MEXC `JCT_USDT`, KuCoin `JCTUSDTM`, BingX `SOL-USDT`, HTX `SOL-USDT`. | Verified (2026-11-17) |
| KuCoin names BTC `XBT`: the page sends `KuCoin_XBTUSDTM`. | Verified (2026-11-17) |
| `exLiqMap` `symbol` is the coin only; it carries no exchange. | Verified (2026-11-17) |
| The period selector ("1天", "7天", "30天", "90天", "180天", "1年") sets the `interval` of both requests: `1`, `5`, `30`, `90d`, `180d`, `365d` in that order. `limit` varies with it. | Verified (2026-11-17) |
| Request headers include `encryption: true`, `cache-ts-v2`, `language`; cookies include `obe` and `api_grade`. | Verified (2026-11-17) |
| The response has headers `encryption: true` and `ev: 2`; the body is not plain JSON. | Verified (2026-11-17), from the response headers |
| In a headless logged-out browser, the page's own requests to both endpoints returned `{"code":"40000"}`. Cause unknown. | Verified (2026-11-17) |

## Controls

| Fact | Status |
|---|---|
| The single-exchange chart's text input lists `<Exchange> <COIN>/USDT 永续` options; choosing one switches both exchange and coin. The aggregate chart's input lists coin names only. | Verified (2026-11-17) |
| Each chart has a period select (`button[role=combobox]`); its options are in the listbox named by the button's `aria-controls`. | Verified (2026-11-17) |
| The refresh button is the last button of the chart's title bar and contains an SVG with `polyline points="1 4 1 10 7 10"`. | Verified (2026-11-17) |
| Logged-out visitors get a login modal over the charts. | Verified (2026-11-17) |
