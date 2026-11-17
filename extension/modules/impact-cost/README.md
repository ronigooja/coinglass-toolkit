# impact-cost

Draws a price-impact cost curve over the CoinGlass "Binance liquidation map" and "exchange liquidation map" charts each time the chart refreshes.

## Definition

For a target price P, `cost(P)` is the cumulative notional in USDT a market order must consume to move the price from mid to P.

- P above mid consumes asks. P below mid consumes bids.
- Notional of a level is `price × quantity`; quantity is in base-coin units, see [the adapter contract](../../shared/venues/README.md).

## Inputs

- Coin: read from the `symbol` parameter of the page's own request. Source and status: [coinglass-page.md](../../../docs/coinglass-page.md).
- Orderbooks: all registered venues, USDT perpetual markets only. A venue that lacks the coin is skipped.
- Price axis of the chart: required for drawing. Access method is `Unverified`.

## Algorithm

1. Merge all venue books: bids sorted descending, asks ascending, quantities at equal prices summed.
2. Mid = (best merged bid + best merged ask) / 2.
3. Walk each side and accumulate notional per price level to produce `(price, cost)` points.
4. Limit each side to the price range that every participating venue covers. Why: beyond a venue's deepest level the merged book is incomplete and cost would be understated.

## Output

Two series, up side and down side, drawn on a secondary Y axis sharing the chart's price X axis.

## Trigger

Recompute and redraw when the page issues a `liqMap` or `exLiqMap` request, which includes clicks on the chart's refresh button.

## Acceptance

- Both charts show the curve after a refresh.
- Changing coin or exchange on the page and refreshing updates the curve.
- With one venue available the curve still renders; with none, nothing is drawn.
- A venue request failure does not block the other venues.
