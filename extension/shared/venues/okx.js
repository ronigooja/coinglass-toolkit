/**
 * OKX USDT linear swaps.
 * GET https://www.okx.com/api/v5/market/books?instId=<COIN>-USDT-SWAP&sz=400
 *   Response: { code, data: [{ bids: [[price, contracts, ...]], asks: [...] }] }
 * GET https://www.okx.com/api/v5/public/instruments?instType=SWAP&instId=<COIN>-USDT-SWAP
 *   Response data[0].ctVal = base coin per contract (BTC: 0.01). Cached per coin.
 * Unknown instrument: code "51001".
 */
import { fetchJson as defaultFetch, toLevels } from './http.js'

const ctValCache = new Map()

async function ctVal(instId, fetchJson) {
  if (ctValCache.has(instId)) return ctValCache.get(instId)
  const d = await fetchJson(`https://www.okx.com/api/v5/public/instruments?instType=SWAP&instId=${instId}`)
  if (d.code === '51001' || !d.data?.length) return null
  if (d.code !== '0') throw new Error(`okx instruments: ${d.code}`)
  const v = Number(d.data[0].ctVal)
  ctValCache.set(instId, v)
  return v
}

export const okx = {
  name: 'okx',
  async fetchBook(coin, fetchJson = defaultFetch) {
    const instId = `${coin}-USDT-SWAP`
    const mult = await ctVal(instId, fetchJson)
    if (mult === null) return null
    const d = await fetchJson(`https://www.okx.com/api/v5/market/books?instId=${instId}&sz=400`)
    if (d.code === '51001') return null
    if (d.code !== '0') throw new Error(`okx books: ${d.code}`)
    const b = d.data[0]
    return { venue: 'okx', bids: toLevels(b.bids.map((l) => [l[0], l[1]]), mult), asks: toLevels(b.asks.map((l) => [l[0], l[1]]), mult), ts: Date.now() }
  },
}

export function clearOkxCache() {
  ctValCache.clear()
}
