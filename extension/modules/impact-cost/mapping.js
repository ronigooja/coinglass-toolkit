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

export function xToPrice(x, axis) {
  const { firstIndex: first, lastIndex: last, indexPx, prices } = axis
  if (!Number.isFinite(x) || last <= first) return null
  const ascending = indexPx.at(-1) > indexPx[0]
  const before = (a, b) => ascending ? a < b : a > b
  let lo = 0, hi = indexPx.length - 1
  if (before(x, indexPx[lo])) hi = 1
  else if (before(indexPx[hi], x)) lo = hi - 1
  else {
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (before(x, indexPx[mid])) hi = mid
      else lo = mid
    }
  }
  const span = indexPx[hi] - indexPx[lo]
  if (!span) return null
  const index = first + lo + (x - indexPx[lo]) / span
  if (index < 0 || index > prices.length - 1) return null
  const i = Math.floor(index)
  if (i === prices.length - 1) return prices[i]
  return prices[i] + (index - i) * (prices[i + 1] - prices[i])
}

// Pixel y of a cost on the page's right Y axis (linear value axis, USDT).
export function costToY(cost, axis) {
  return axis.yPxMin + (cost - axis.yMin) / (axis.yMax - axis.yMin) * (axis.yPxMax - axis.yPxMin)
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
