// Coin extraction per exchange from the `symbol` of liqMap, whose format is `<Exchange>_<native symbol>`.
// Native formats observed on the page; see docs/coinglass-page.md.
const NATIVE = {
  binance: /^(.+)USDT$/,
  bybit: /^(.+)USDT$/,
  okx: /^(.+)-USDT-SWAP$/,
  bitget: /^(.+)USDT_UMCBL$/,
  gate: /^(.+)_USDT$/,
  mexc: /^(.+)_USDT$/,
  kucoin: /^(.+)USDTM$/,
  bingx: /^(.+)-USDT$/,
  htx: /^(.+)-USDT$/,
}

// Notice for a books response with no usable book: a failed request is told apart from a coin the venue does not list.
// `errors` is the background's per-venue failure list; returns null when there is nothing to report.
export function emptyBooksNotice(request, result) {
  if (result.books?.length) return null
  const failed = [...new Set((result.errors ?? []).map((e) => e.venue))]
  if (failed.length) return `订单簿请求失败：${failed.join('、')}`
  return `${request.kind === 'single' ? request.venue : '各交易所'}无 ${request.coin} 的 USDT 永续订单簿`
}

// `interval` values the page sends for the period selector. Anything but '1' (1 day) is a longer window.
const PERIOD = { 1: '1天', 5: '7天', 30: '30天', '90d': '90天', '180d': '180天', '365d': '1年' }

// Returns { kind: 'single', venue, coin, period } | { kind: 'exchange', coin, period } | { kind: 'unsupported', venue, name } | null.
// `period` is the selector label, or null when the interval is not a known value.
// A liqMap request that cannot be resolved is 'unsupported' so the caller clears the overlay.
export function parseRequest(value) {
  let url
  try { url = new URL(value) } catch { return null }
  if (url.hostname !== 'capi.coinglass.com' || url.protocol !== 'https:') return null
  const symbol = url.searchParams.get('symbol') || ''
  const period = PERIOD[url.searchParams.get('interval')] ?? null
  if (url.pathname === '/api/index/5/liqMap') {
    const cut = symbol.indexOf('_')
    const name = cut < 0 ? symbol : symbol.slice(0, cut)
    const venue = name.toLowerCase()
    const match = cut < 0 ? null : NATIVE[venue]?.exec(symbol.slice(cut + 1))
    return match ? { kind: 'single', venue, coin: match[1].toUpperCase() === 'XBT' ? 'BTC' : match[1].toUpperCase(), period } : { kind: 'unsupported', venue, name }
  }
  if (url.pathname === '/api/index/2/exLiqMap' && /^[A-Za-z0-9]+$/.test(symbol)) {
    return { kind: 'exchange', coin: symbol.toUpperCase(), period }
  }
  return null
}
