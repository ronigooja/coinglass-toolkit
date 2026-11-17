/**
 * BingX USDT-M perpetuals.
 * GET https://open-api.bingx.com/openApi/swap/v2/quote/depth?symbol=<COIN>-USDT&limit=1000
 * Response: { code, data: { bids, asks } }; quantities are assumed base coin
 * (the API also returns identical bidsCoin/asksCoin). No size conversion.
 * Unknown symbol: code 109425.
 */
import { fetchJson as defaultFetch } from './http.js'

export const bingx = {
  name: 'bingx',
  async fetchBook(coin, fetchJson = defaultFetch) {
    const d = await fetchJson(`https://open-api.bingx.com/openApi/swap/v2/quote/depth?symbol=${encodeURIComponent(coin)}-USDT&limit=1000`)
    if (d?.code === 109425) return null
    if (d?.code !== 0 || !Array.isArray(d.data?.bids) || !Array.isArray(d.data?.asks)) {
      throw new Error(`bingx: ${JSON.stringify(d)?.slice(0, 120)}`)
    }
    const convert = (levels, direction) => levels.map((level) => {
      if (!Array.isArray(level) || level.length < 2 ||
          !['string', 'number'].includes(typeof level[0]) || !['string', 'number'].includes(typeof level[1]) ||
          String(level[0]).trim() === '' || String(level[1]).trim() === '') throw new Error('bingx: invalid level')
      const price = Number(level[0])
      const quantity = Number(level[1])
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) throw new Error('bingx: invalid level')
      return [price, quantity]
    }).sort((a, b) => direction * (a[0] - b[0]))
    return { venue: 'bingx', bids: convert(d.data.bids, -1), asks: convert(d.data.asks, 1), ts: Date.now() }
  },
}
