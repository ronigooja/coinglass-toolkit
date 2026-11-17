/**
 * KuCoin USDT perpetual futures (BTC is XBT).
 * GET https://api-futures.kucoin.com/api/v1/contracts/<COIN>USDTM
 *   Response data.multiplier = base coin per contract. Cached per symbol.
 * GET https://api-futures.kucoin.com/api/v1/level2/depth100?symbol=<COIN>USDTM
 *   Up to 100 levels per side; [price, size] has size in contracts.
 * Unknown contract: { code: "404000" }.
 */
import { fetchJson as defaultFetch } from './http.js'

const multCache = new Map()

async function multiplier(symbol, fetchJson) {
  if (multCache.has(symbol)) return multCache.get(symbol)
  const d = await fetchJson(`https://api-futures.kucoin.com/api/v1/contracts/${symbol}`)
  if (d?.code === '404000') return null
  const contract = d?.data
  const mult = Number(contract?.multiplier)
  if (d?.code !== '200000' || contract?.symbol !== symbol || contract.quoteCurrency !== 'USDT' ||
      contract.settleCurrency !== 'USDT' || contract.expireDate !== null ||
      !Number.isFinite(mult) || mult <= 0) throw new Error('kucoin: invalid contract')
  multCache.set(symbol, mult)
  return mult
}

export const kucoin = {
  name: 'kucoin',
  async fetchBook(coin, fetchJson = defaultFetch) {
    const symbol = `${coin === 'BTC' ? 'XBT' : coin}USDTM`
    const mult = await multiplier(symbol, fetchJson)
    if (mult === null) return null
    const d = await fetchJson(`https://api-futures.kucoin.com/api/v1/level2/depth100?symbol=${symbol}`)
    if (d?.code === '404000') return null
    if (d?.code !== '200000' || d.data?.symbol !== symbol || !Array.isArray(d.data.bids) || !Array.isArray(d.data.asks)) {
      throw new Error('kucoin: invalid orderbook')
    }
    const conv = (levels, direction) => levels.map((level) => {
      if (!Array.isArray(level) || level.length < 2 || level[0] === null || level[1] === null ||
          level[0] === '' || level[1] === '') throw new Error('kucoin: invalid level')
      const price = Number(level[0])
      const quantity = Number(level[1]) * mult
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('kucoin: invalid level')
      }
      return [price, quantity]
    }).sort((a, b) => direction * (a[0] - b[0]))
    return { venue: 'kucoin', bids: conv(d.data.bids, -1), asks: conv(d.data.asks, 1), ts: Date.now() }
  },
}

export function clearKucoinCache() {
  multCache.clear()
}
