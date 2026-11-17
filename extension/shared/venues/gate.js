/**
 * Gate USDT futures.
 * GET https://api.gateio.ws/api/v4/futures/usdt/order_book?contract=<COIN>_USDT&limit=300
 *   Response: { bids: [{ p, s }], asks: [{ p, s }] }, s in contracts.
 * GET https://api.gateio.ws/api/v4/futures/usdt/contracts/<COIN>_USDT
 *   Response quanto_multiplier = base coin per contract (BTC: 0.0001). Cached per coin.
 * Unknown contract: error body { label: "CONTRACT_NOT_FOUND" }.
 */
import { fetchJson as defaultFetch } from './http.js'

const multCache = new Map()

async function multiplier(contract, fetchJson) {
  if (multCache.has(contract)) return multCache.get(contract)
  const d = await fetchJson(`https://api.gateio.ws/api/v4/futures/usdt/contracts/${contract}`)
  if (d.label === 'CONTRACT_NOT_FOUND') return null
  if (!d.quanto_multiplier) throw new Error(`gate contract: ${JSON.stringify(d).slice(0, 120)}`)
  const v = Number(d.quanto_multiplier)
  multCache.set(contract, v)
  return v
}

export const gate = {
  name: 'gate',
  async fetchBook(coin, fetchJson = defaultFetch) {
    const contract = `${coin}_USDT`
    const mult = await multiplier(contract, fetchJson)
    if (mult === null) return null
    const d = await fetchJson(`https://api.gateio.ws/api/v4/futures/usdt/order_book?contract=${contract}&limit=300`)
    if (d.label === 'CONTRACT_NOT_FOUND') return null
    if (!d.bids) throw new Error(`gate: ${JSON.stringify(d).slice(0, 120)}`)
    const conv = (ls) => ls.map((l) => [Number(l.p), Number(l.s) * mult])
    return { venue: 'gate', bids: conv(d.bids), asks: conv(d.asks), ts: Date.now() }
  },
}

export function clearGateCache() {
  multCache.clear()
}
