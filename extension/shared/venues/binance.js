/**
 * Binance USDT-M futures.
 * GET https://fapi.binance.com/fapi/v1/depth?symbol=<COIN>USDT&limit=1000
 * Response: { bids: [[price, qty]], asks: [[price, qty]] }, qty in base coin.
 * Unknown symbol: error body { code: -1121 }.
 */
import { fetchJson as defaultFetch, toLevels } from './http.js'

export const binance = {
  name: 'binance',
  async fetchBook(coin, fetchJson = defaultFetch) {
    const d = await fetchJson(`https://fapi.binance.com/fapi/v1/depth?symbol=${coin}USDT&limit=1000`)
    if (d.code === -1121) return null
    if (!d.bids) throw new Error(`binance: ${JSON.stringify(d).slice(0, 120)}`)
    return { venue: 'binance', bids: toLevels(d.bids), asks: toLevels(d.asks), ts: Date.now() }
  },
}
