# impact-cost

Draws an order book cumulative depth curve (shown in the UI as "订单簿累计深度") over the CoinGlass "Binance liquidation map" and "exchange liquidation map" charts each time the chart refreshes.

## Definition

For a target price P, `cost(P)` is the cumulative notional in USDT a market order must consume to move the price from mid to P.

- P above mid consumes asks. P below mid consumes bids.
- Notional of a level is `price × quantity`; quantity is in base-coin units, see [the adapter contract](../../shared/venues/README.md).

## Inputs

- Coin: read from the `symbol` parameter of the page's own request. Source and status: [coinglass-page.md](../../../docs/coinglass-page.md).
- Orderbooks, USDT perpetual markets only. A venue that lacks the coin is skipped.
  - Single-exchange chart (`liqMap`): only the exchange named in `symbol`. If that exchange has no adapter, nothing is drawn.
  - Aggregate chart (`exLiqMap`): all registered venues, merged.
- Price axis of the chart: required for drawing. Access method is `Unverified`.

## Algorithm

1. Merge all venue books: bids sorted descending, asks ascending, quantities at equal prices summed.
2. Mid = (best merged bid + best merged ask) / 2.
3. Walk each side and accumulate notional per price level to produce `(price, cost)` points.
4. Compute a complete bound per side: the price where the shallowest participating venue runs out of levels. Why: venue depths differ widely (about ±20 USD to ±135 USD for BTC), so truncating at the shallowest venue would leave a curve too short to be useful. Beyond the bound the cost is understated.

## Output

Two series, up side and down side, drawn on the chart's own axes: the price X axis and the right Y axis (cumulative liquidation intensity, USDT). Why the right axis: cost is cumulative like that axis; the left axis shows per-price-level amounts and is far smaller. The right axis range is set by the page, so a curve above it is clipped. Colors differ from the page's red and green lines. Each series is solid up to its complete bound and dashed beyond it.

Hovering the plot shows the cursor price, percentage distance from the order-book mid, and interpolated cumulative USDT on the corresponding drawn curve. The readout is a fixed one-line box in the notice style (muted gray, no fill), centred on x = 8 of the same 10 x 5 grid with its top edge on the top of the plot area, text vertically centred in the box, so it does not overlap the page's own tooltip that follows the cursor. It hides outside the curve range or when curves are unavailable; it does not block chart interactions.

## Notices

Notices carry no title prefix; the chart shows only the message. The UI name is "订单簿累计深度". Why not "推价费用": cost reads as fees or slippage, while the value is the cumulative resting notional that must be consumed.

When nothing can be drawn, the overlay shows a small one-line notice instead of staying blank: the selected exchange has no adapter, or no venue returned an order book for the coin. The notice is muted gray with no fill, and its centre sits at (2, 4.4) when the plot area is a 10 x 5 grid with the origin at the bottom-left.

Period: the order book is always the live book, while the 7-day to 1-year liquidation maps accumulate over their window. For any period other than 1天 the curves are still drawn and the notice reads "当前订单簿，非<period>累计". The period is taken from the `interval` the page sends, see [coinglass-page.md](../../../docs/coinglass-page.md).

## Trigger

A page-world script observes matching fetch and XHR request URLs without reading responses; newer requests supersede older orderbook results. Redraw on resize using the latest books. Only Binance USDT pairs are accepted for the Binance chart. See [page facts](../../../docs/coinglass-page.md) for request and refresh details.

Axis access: the page-world script gets the ECharts instance from the React fiber of the chart container. The X axis is a category axis of ascending, unevenly spaced price labels, so a price is mapped to a fractional label index and then to pixels with the chart's own `convertToPixel`. The page-world script polls each watched chart's axis geometry every 300 ms and the overlay redraws when it changes (zoom, resize, chart rebuilt). Why not chart events: the page rebuilds chart instances, which dropped the bindings and left the overlay stale; `finished` also loops because the overlay triggers redraws. If the axis cannot be read, the overlay stays empty and logs the reason.

Visible range: the order books cover roughly ±0.3% of price (see Algorithm), while the chart's default range is far wider. The curve fills the plot only after the user zooms the X axis to that range.

## Acceptance

- Both charts show the curve after a refresh.
- Changing coin or exchange on the page and refreshing updates the curve.
- With one venue available the curve still renders; with none, nothing is drawn.
- A venue request failure does not block the other venues.
