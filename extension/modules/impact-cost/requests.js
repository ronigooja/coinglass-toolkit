const SUPPORTED = ['binance', 'okx', 'bybit', 'bitget', 'gate']

// liqMap carries one exchange in `symbol` (<Exchange>_<Pair>); exLiqMap carries only the coin.
// Returns { kind: 'single', venue, coin } | { kind: 'exchange', coin } | { kind: 'unsupported', venue } | null.
export function parseRequest(value) {
  let url
  try { url = new URL(value) } catch { return null }
  if (url.hostname !== 'capi.coinglass.com' || url.protocol !== 'https:') return null
  const symbol = url.searchParams.get('symbol') || ''
  if (url.pathname === '/api/index/5/liqMap') {
    const match = /^([A-Za-z0-9]+)_([A-Za-z0-9]+)USDT$/.exec(symbol)
    if (!match) return null
    const venue = match[1].toLowerCase()
    return SUPPORTED.includes(venue) ? { kind: 'single', venue, coin: match[2].toUpperCase() } : { kind: 'unsupported', venue }
  }
  if (url.pathname === '/api/index/2/exLiqMap' && /^[A-Za-z0-9]+$/.test(symbol)) {
    return { kind: 'exchange', coin: symbol.toUpperCase() }
  }
  return null
}
