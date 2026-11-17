import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { priceToIndex, priceToX, costToY, splitCurve } from './mapping.js'

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

test('costToY maps cost to plot height', () => {
  assert.equal(costToY(25, 100, axis), 95)
})

test('split curves at interpolated completeness boundary in both directions', () => {
  assert.deepEqual(splitCurve([[100, 0], [110, 20], [120, 40]], 115, 'up'), { solid: [[100, 0], [110, 20], [115, 30]], dashed: [[115, 30], [120, 40]] })
  assert.deepEqual(splitCurve([[100, 0], [90, 20], [80, 40]], 85, 'down'), { solid: [[100, 0], [90, 20], [85, 30]], dashed: [[85, 30], [80, 40]] })
  assert.deepEqual(splitCurve([[100, 0], [110, 20]], 110, 'up'), { solid: [[100, 0], [110, 20]], dashed: [] })
})
