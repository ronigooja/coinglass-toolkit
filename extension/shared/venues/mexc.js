/**
 * MEXC USDT perpetuals.
 * GET https://contract.mexc.com/api/v1/contract/detail?symbol=<COIN>_USDT
 *   Response data.contractSize = base coin per contract; cached per coin.
 * GET https://contract.mexc.com/api/v1/contract/depth/<COIN>_USDT?limit=1500
 *   Response data.{bids,asks}: [price, contracts, order count]; cap 1500 levels.
 * Unknown contract: { success: false, code: 1001 }.
 */
import { fetchJson as defaultFetch } from './http.js'

const sizeCache = new Map()

const unknown = (d) => d?.success === false && d.code === 1001
const invalid = (d) => new Error(`mexc: ${JSON.stringify(d)?.slice(0, 120)}`)

async function contractSize(symbol, fetchJson) {
  if (sizeCache.has(symbol)) return sizeCache.get(symbol)
  const d = await fetchJson(`https://contract.mexc.com/api/v1/contract/detail?symbol=${symbol}`)
  if (unknown(d)) return null
  const size = Number(d?.data?.contractSize)
  if (d?.success !== true || d.code !== 0 || d.data?.symbol !== symbol || !Number.isFinite(size) || size <= 0) throw invalid(d)
  sizeCache.set(symbol, size)
  return size
}

export const mexc = {
  name: 'mexc',
  async fetchBook(coin, fetchJson = defaultFetch) {
    const symbol = `${coin}_USDT`
    const size = await contractSize(symbol, fetchJson)
    if (size === null) return null
    const d = await fetchJson(`https://contract.mexc.com/api/v1/contract/depth/${symbol}?limit=1500`)
    if (unknown(d)) return null
    if (d?.success !== true || d.code !== 0 || !Array.isArray(d.data?.bids) || !Array.isArray(d.data?.asks)) throw invalid(d)
    const convert = (levels, order) => levels.map((level) => {
      if (!Array.isArray(level) || level.length < 2 || level[0] === null || level[1] === null || level[0] === '' || level[1] === '') throw invalid(d)
      const price = Number(level[0])
      const quantity = Number(level[1]) * size
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) throw invalid(d)
      return [price, quantity]
    }).sort((a, b) => order * (a[0] - b[0]))
    return { venue: 'mexc', bids: convert(d.data.bids, -1), asks: convert(d.data.asks, 1), ts: Date.now() }
  },
}

export function clearMexcCache() {
  sizeCache.clear()
}
