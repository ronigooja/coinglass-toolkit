/**
 * @typedef {[number, number]} Level
 * @typedef {{ venue: string, bids: Level[], asks: Level[], ts: number }} Book
 */

/** Sum quantities at equal prices and sort: descending for bids, ascending for asks. */
function mergeSide(books, side, descending) {
  const m = new Map()
  for (const b of books) for (const [p, q] of b[side]) m.set(p, (m.get(p) ?? 0) + q)
  const out = [...m.entries()]
  out.sort((a, b) => (descending ? b[0] - a[0] : a[0] - b[0]))
  return out
}

/**
 * Merge books and compute cumulative notional per level on each side.
 * Curves use every level of every venue. Beyond `completeUp` / `completeDown` at least one
 * venue has no more levels, so the cost there is understated.
 * @param {Book[]} books
 * @returns {{ mid: number, up: Level[], down: Level[], completeUp: number, completeDown: number } | null}
 *   up/down: [price, cumulative USDT notional to move the price from mid to that price]
 */
export function impactCurves(books) {
  const live = books.filter((b) => b.bids.length && b.asks.length)
  if (!live.length) return null
  const bids = mergeSide(live, 'bids', true)
  const asks = mergeSide(live, 'asks', false)
  return {
    mid: (bids[0][0] + asks[0][0]) / 2,
    up: accumulate(asks),
    down: accumulate(bids),
    completeUp: Math.min(...live.map((b) => b.asks[b.asks.length - 1][0])),
    completeDown: Math.max(...live.map((b) => b.bids[b.bids.length - 1][0])),
  }
}

function accumulate(levels) {
  let cum = 0
  return levels.map(([p, q]) => [p, (cum += p * q)])
}

/**
 * Cost at an arbitrary price: all levels up to and including `price` are consumed.
 * Returns 0 inside the spread and null beyond the deepest level.
 * @param {Level[]} curve one side from impactCurves
 * @param {number} price
 * @param {'up' | 'down'} side
 */
export function costAt(curve, price, side) {
  if (!curve.length) return null
  const first = curve[0][0]
  const last = curve[curve.length - 1][0]
  const up = side === 'up'
  if (up ? price < first : price > first) return 0
  if (up ? price > last : price < last) return null
  let c = 0
  for (const [p, cum] of curve) {
    if (up ? p > price : p < price) break
    c = cum
  }
  return c
}
