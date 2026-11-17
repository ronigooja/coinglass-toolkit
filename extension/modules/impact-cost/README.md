# impact-cost

Draws a price-impact cost curve over the CoinGlass "Binance liquidation map" and "exchange liquidation map" charts each time the chart refreshes.

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

Two series, up side and down side, drawn on a secondary Y axis sharing the chart's price X axis. Each series is solid up to its complete bound and dashed beyond it.

## Trigger

A page-world script observes matching fetch and XHR request URLs without reading responses; newer requests supersede older orderbook results. Redraw on resize using the latest books. Only Binance USDT pairs are accepted for the Binance chart. See [page facts](../../../docs/coinglass-page.md) for request and refresh details.

Axis access: the page-world script gets the ECharts instance from the React fiber of the chart container. The X axis is a category axis of ascending, unevenly spaced price labels, so a price is mapped to a fractional label index and then to pixels with the chart's own `convertToPixel`. The overlay redraws on the chart's `datazoom` event. Why not `finished`: the overlay triggers chart redraws, which would loop. If the axis cannot be read, the overlay stays empty and logs the reason.

Visible range: the order books cover roughly ±0.3% of price (see Algorithm), while the chart's default range is far wider. The curve fills the plot only after the user zooms the X axis to that range.

## Acceptance

- Both charts show the curve after a refresh.
- Changing coin or exchange on the page and refreshing updates the curve.
- With one venue available the curve still renders; with none, nothing is drawn.
- A venue request failure does not block the other venues.
