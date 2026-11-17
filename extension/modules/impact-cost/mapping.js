export function priceToX(price, axis) {
  return axis.plotLeft + (price - axis.minPrice) / (axis.maxPrice - axis.minPrice) * (axis.plotRight - axis.plotLeft)
}
export function costToY(cost, maxCost, axis) {
  return axis.plotBottom - cost / maxCost * (axis.plotBottom - axis.plotTop)
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
