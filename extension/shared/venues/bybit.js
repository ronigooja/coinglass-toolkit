/**
 * Bybit USDT linear perpetuals.
 * GET https://api.bybit.com/v5/market/orderbook?category=linear&symbol=<COIN>USDT&limit=500
 * Response: { retCode, result: { b: [[price, qty]], a: [[price, qty]] } }, qty in base coin.
 * Unknown symbol: retCode 10001.
 */
import { fetchJson as defaultFetch, toLevels } from './http.js'

export const bybit = {
  name: 'bybit',
  async fetchBook(coin, fetchJson = defaultFetch) {
    const d = await fetchJson(`https://api.bybit.com/v5/market/orderbook?category=linear&symbol=${coin}USDT&limit=500`)
    if (d.retCode === 10001) return null
    if (d.retCode !== 0) throw new Error(`bybit: ${d.retCode}`)
    return { venue: 'bybit', bids: toLevels(d.result.b), asks: toLevels(d.result.a), ts: Date.now() }
  },
}
