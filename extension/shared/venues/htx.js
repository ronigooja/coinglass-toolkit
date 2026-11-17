/**
 * HTX USDT-margined linear swaps.
 * GET https://api.hbdm.com/linear-swap-api/v1/swap_contract_info?contract_code=<COIN>-USDT
 *   Response data[0].contract_size is base coin per contract; cached per coin.
 * GET https://api.hbdm.com/linear-swap-ex/market/depth?contract_code=<COIN>-USDT&type=step0&depth=150
 *   Response tick.bids and tick.asks contain [price, contracts]; maximum depth is 150.
 * Unknown contract: contract info error body { status: "error", err_code: 1014 }.
 */
import { fetchJson as defaultFetch } from './http.js'

const sizeCache = new Map()

async function contractSize(contract, fetchJson) {
  if (sizeCache.has(contract)) return sizeCache.get(contract)
  const d = await fetchJson(`https://api.hbdm.com/linear-swap-api/v1/swap_contract_info?contract_code=${contract}`)
  if (d?.status === 'error' && d.err_code === 1014) return null
  if (d?.status !== 'ok' || !Array.isArray(d.data)) throw new Error('htx: invalid contract response')
  if (d.data.length === 0) return null
  const info = d.data.find((item) => item?.contract_code === contract)
  const size = Number(info?.contract_size)
  if (!Number.isFinite(size) || size <= 0) throw new Error('htx: invalid contract size')
  sizeCache.set(contract, size)
  return size
}

export const htx = {
  name: 'htx',
  async fetchBook(coin, fetchJson = defaultFetch) {
    const contract = `${coin}-USDT`
    const size = await contractSize(contract, fetchJson)
    if (size === null) return null
    const d = await fetchJson(`https://api.hbdm.com/linear-swap-ex/market/depth?contract_code=${contract}&type=step0&depth=150`)
    if (d?.status !== 'ok' || !Array.isArray(d.tick?.bids) || !Array.isArray(d.tick?.asks)) throw new Error('htx: invalid depth response')
    const conv = (levels, direction) => levels.map((level) => {
      if (!Array.isArray(level) || level.length < 2 || level[0] === null || level[1] === null || level[0] === '' || level[1] === '') throw new Error('htx: invalid depth level')
      const price = Number(level[0])
      const quantity = Number(level[1]) * size
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) throw new Error('htx: invalid depth level')
      return [price, quantity]
    }).sort((a, b) => direction * (a[0] - b[0]))
    return { venue: 'htx', bids: conv(d.tick.bids, -1), asks: conv(d.tick.asks, 1), ts: Date.now() }
  },
}

export function clearHtxCache() {
  sizeCache.clear()
}
