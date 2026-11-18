// Fractional category index of a price on an ascending label list; null outside the labels.
export function priceToIndex(price, prices) {
  const n = prices.length
  if (!n || price < prices[0] || price > prices[n - 1]) return null
  let lo = 0, hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (prices[mid] <= price) lo = mid
    else hi = mid
  }
  if (prices[hi] === prices[lo]) return lo
  return lo + (price - prices[lo]) / (prices[hi] - prices[lo])
}

// Pixel x of a price using the pixel positions of the visible category indexes.
// Extrapolates linearly outside the visible indexes so clipped lines keep their slope.
export function priceToX(price, axis) {
  const idx = priceToIndex(price, axis.prices)
  if (idx === null) return null
  const { firstIndex: first, lastIndex: last, indexPx } = axis
  const at = (i) => indexPx[i - first]
  if (idx <= first) return at(first) - (first - idx) * (at(first + 1) - at(first))
  if (idx >= last) return at(last) + (idx - last) * (at(last) - at(last - 1))
  const i = Math.floor(idx)
  return at(i) + (idx - i) * (at(i + 1) - at(i))
}

// Pixel y of a cost on the page's right Y axis (linear value axis, USDT).
export function costToY(cost, axis) {
  return axis.yPxMin + (cost - axis.yMin) / (axis.yMax - axis.yMin) * (axis.yPxMax - axis.yPxMin)
}

// Cumulative USDT depth at a price on one side of the curves; 0 inside the spread, null beyond the deepest level.
export function depthAt(curves, price) {
  const up = price >= curves.mid
  const points = up ? curves.up : curves.down
  if (!points.length) return null
  if (up ? price < points[0][0] : price > points[0][0]) return 0
  if (up ? price > points.at(-1)[0] : price < points.at(-1)[0]) return null
  let cost = 0
  for (const [p, cum] of points) {
    if (up ? p > price : p < price) break
    cost = cum
  }
  return cost
}

// USDT amount in the page's own unit style: whole numbers below 1e4, then 万 and 亿 with two decimals.
export function formatWan(value) {
  if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(2)}亿`
  if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(2)}万`
  return String(Math.round(value))
}

// Tooltip rows keyed by the X label (as String(Number(label))): [formatted depth, curve color of that side].
// Labels beyond the deepest level are left out.
export function depthRows(curves, prices, colors) {
  const rows = {}
  for (const price of prices) {
    const depth = depthAt(curves, price)
    if (depth !== null) rows[String(price)] = [formatWan(depth), price >= curves.mid ? colors.up : colors.down]
  }
  return rows
}

// Include the interpolated boundary in both paths so line styles meet without a gap.
export function splitCurve(points, bound, side) {
  const solid = [], dashed = []
  const complete = (p) => side === 'up' ? p <= bound : p >= bound
  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    if (i && complete(points[i - 1][0]) !== complete(point[0])) {
      const prev = points[i - 1]
      const t = (bound - prev[0]) / (point[0] - prev[0])
      const crossing = [bound, prev[1] + t * (point[1] - prev[1])]
      solid.push(crossing); dashed.push(crossing)
    }
    ;(complete(point[0]) ? solid : dashed).push(point)
  }
  return { solid, dashed }
}
