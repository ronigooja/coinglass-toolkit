/**
 * Bitget USDT-M futures.
 * GET https://api.bitget.com/api/v2/mix/market/merge-depth?productType=usdt-futures&symbol=<COIN>USDT&limit=max
 * Response: { code, data: { bids: [[price, qty]], asks: [[price, qty]] } }, qty in base coin.
 * Unknown symbol: code "40034".
 */
import { fetchJson as defaultFetch, toLevels } from './http.js'

export const bitget = {
  name: 'bitget',
  async fetchBook(coin, fetchJson = defaultFetch) {
    const d = await fetchJson(`https://api.bitget.com/api/v2/mix/market/merge-depth?productType=usdt-futures&symbol=${coin}USDT&limit=max`)
    if (d.code === '40034') return null
    if (d.code !== '00000') throw new Error(`bitget: ${d.code}`)
    return { venue: 'bitget', bids: toLevels(d.data.bids), asks: toLevels(d.data.asks), ts: Date.now() }
  },
}
