import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { priceToIndex, priceToX, xToPrice, costToY, splitCurve } from './mapping.js'

// Uneven labels: indexes 0..4 at pixels 0, 10, 20, 30, 40.
const axis = { prices: [100, 110, 130, 131, 200], firstIndex: 0, lastIndex: 4, indexPx: [0, 10, 20, 30, 40], plotTop: 20, plotBottom: 120 }

test('priceToIndex interpolates between uneven labels and rejects outside', () => {
  assert.equal(priceToIndex(100, axis.prices), 0)
  assert.equal(priceToIndex(105, axis.prices), 0.5)
  assert.equal(priceToIndex(120, axis.prices), 1.5)
  assert.equal(priceToIndex(200, axis.prices), 4)
  assert.equal(priceToIndex(99, axis.prices), null)
  assert.equal(priceToIndex(201, axis.prices), null)
})

test('priceToIndex tolerates repeated labels', () => {
  const prices = [73.6, 73.7, 73.8, 73.8, 73.9]
  assert.ok([2, 3].includes(priceToIndex(73.8, prices)))
  assert.ok(Math.abs(priceToIndex(73.75, prices) - 1.5) < 1e-9)
  assert.ok(Math.abs(priceToIndex(73.85, prices) - 3.5) < 1e-9)
  assert.equal(priceToIndex(73.6, prices), 0)
  assert.equal(priceToIndex(73.9, prices), 4)
})

test('priceToX follows pixel positions of the visible indexes', () => {
  assert.equal(priceToX(120, axis), 15)
  assert.equal(priceToX(130, axis), 20)
  assert.equal(priceToX(50, axis), null)
})

test('priceToX extrapolates outside the zoomed window', () => {
  const zoomed = { prices: [100, 110, 120, 130, 140], firstIndex: 1, lastIndex: 3, indexPx: [0, 100, 200] }
  assert.equal(priceToX(100, zoomed), -100)
  assert.equal(priceToX(140, zoomed), 300)
  assert.equal(priceToX(115, zoomed), 50)
})

test('xToPrice inverts uneven category labels and pixel positions', () => {
  const uneven = { ...axis, indexPx: [0, 10, 30, 40, 60] }
  for (const price of [100, 105, 120, 130.5, 200]) {
    assert.ok(Math.abs(xToPrice(priceToX(price, uneven), uneven) - price) < 1e-9)
  }
  assert.equal(xToPrice(-1, uneven), null)
  assert.equal(xToPrice(61, uneven), null)
  assert.equal(xToPrice(NaN, uneven), null)
})

test('xToPrice handles zoom extrapolation, repeated prices and reversed pixels', () => {
  const zoomed = { prices: [100, 110, 110, 130, 140], firstIndex: 1, lastIndex: 3, indexPx: [200, 100, 0] }
  assert.equal(xToPrice(300, zoomed), 100)
  assert.equal(xToPrice(150, zoomed), 110)
  assert.equal(xToPrice(50, zoomed), 120)
  assert.equal(xToPrice(-100, zoomed), 140)
  assert.equal(xToPrice(-101, zoomed), null)
})

test('costToY follows the page right Y axis', () => {
  const y = { yMin: 1000, yMax: 3000, yPxMin: 340, yPxMax: 40 }
  assert.equal(costToY(1000, y), 340)
  assert.equal(costToY(3000, y), 40)
  assert.equal(costToY(2000, y), 190)
  assert.equal(costToY(0, y), 490)
})

test('split curves at interpolated completeness boundary in both directions', () => {
  assert.deepEqual(splitCurve([[100, 0], [110, 20], [120, 40]], 115, 'up'), { solid: [[100, 0], [110, 20], [115, 30]], dashed: [[115, 30], [120, 40]] })
  assert.deepEqual(splitCurve([[100, 0], [90, 20], [80, 40]], 85, 'down'), { solid: [[100, 0], [90, 20], [85, 30]], dashed: [[85, 30], [80, 40]] })
  assert.deepEqual(splitCurve([[100, 0], [110, 20]], 110, 'up'), { solid: [[100, 0], [110, 20]], dashed: [] })
})
