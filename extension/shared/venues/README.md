# Venue adapter contract

An adapter turns one venue's public orderbook into the normalized form. Venue-specific endpoint, parameters, and contract-size conversion live in the header comment of each `<venue>.js`.

## Interface

```js
/**
 * @typedef {[price: number, quantity: number]} Level
 * @typedef {{ venue: string, bids: Level[], asks: Level[], ts: number }} Book
 *
 * @typedef {Object} VenueAdapter
 * @property {string} name
 * @property {(coin: string) => Promise<Book | null>} fetchBook
 */
```

## Rules

- Market: USDT-margined perpetual only.
- `quantity` is in base-coin units. Convert contract sizes inside the adapter.
- `bids` are sorted descending by price, `asks` ascending.
- `ts` is the fetch time in milliseconds.
- Return `null` when the venue has no market for the coin.
- Throw on network or parse errors. The caller isolates failures per venue.
- Use public endpoints that need no API key.

Venues are registered in `index.js` in this folder.
