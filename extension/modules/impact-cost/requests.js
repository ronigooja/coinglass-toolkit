export function parseRequest(value) {
  let url
  try { url = new URL(value) } catch { return null }
  if (url.hostname !== 'capi.coinglass.com' || url.protocol !== 'https:') return null
  const symbol = url.searchParams.get('symbol') || ''
  if (url.pathname === '/api/index/5/liqMap') {
    const match = /^Binance_([A-Za-z0-9]+)USDT$/i.exec(symbol)
    return match ? { kind: 'binance', coin: match[1].toUpperCase() } : null
  }
  if (url.pathname === '/api/index/2/exLiqMap' && /^[A-Za-z0-9]+$/.test(symbol)) {
    return { kind: 'exchange', coin: symbol.toUpperCase() }
  }
  return null
}
