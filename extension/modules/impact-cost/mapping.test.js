import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { priceToX, costToY, splitCurve } from './mapping.js'

test('map price and cost to plot coordinates', () => {
  const axis = { minPrice: 100, maxPrice: 200, plotLeft: 10, plotRight: 210, plotTop: 20, plotBottom: 120 }
  assert.equal(priceToX(150, axis), 110)
  assert.equal(costToY(25, 100, axis), 95)
})
test('split curves at interpolated completeness boundary in both directions', () => {
  assert.deepEqual(splitCurve([[100, 0], [110, 20], [120, 40]], 115, 'up'), { solid: [[100, 0], [110, 20], [115, 30]], dashed: [[115, 30], [120, 40]] })
  assert.deepEqual(splitCurve([[100, 0], [90, 20], [80, 40]], 85, 'down'), { solid: [[100, 0], [90, 20], [85, 30]], dashed: [[85, 30], [80, 40]] })
  assert.deepEqual(splitCurve([[100, 0], [110, 20]], 110, 'up'), { solid: [[100, 0], [110, 20]], dashed: [] })
})
