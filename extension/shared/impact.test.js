import { test } from 'node:test'
import assert from 'node:assert/strict'
import { impactCurves, costAt } from './impact.js'

const book = (venue, bids, asks) => ({ venue, bids, asks, ts: 0 })

test('single book: mid and cumulative notional', () => {
  const r = impactCurves([book('a', [[99, 1], [98, 2]], [[101, 1], [102, 2]])])
  assert.equal(r.mid, 100)
  assert.deepEqual(r.up, [[101, 101], [102, 101 + 204]])
  assert.deepEqual(r.down, [[99, 99], [98, 99 + 196]])
})

test('merge sums equal prices across venues', () => {
  const r = impactCurves([
    book('a', [[99, 1]], [[101, 1], [103, 1]]),
    book('b', [[99, 2]], [[101, 2], [103, 1]]),
  ])
  assert.deepEqual(r.up, [[101, 303], [103, 303 + 206]])
  assert.deepEqual(r.down, [[99, 297]])
})

test('curves use all levels; complete bounds mark the shallowest venue', () => {
  const r = impactCurves([
    book('deep', [[99, 1], [90, 1]], [[101, 1], [120, 1]]),
    book('shallow', [[99, 1], [95, 1]], [[101, 1], [110, 1]]),
  ])
  assert.deepEqual(r.up.map((l) => l[0]), [101, 110, 120])
  assert.deepEqual(r.down.map((l) => l[0]), [99, 95, 90])
  assert.equal(r.completeUp, 110)
  assert.equal(r.completeDown, 95)
})

test('empty or one-sided books are ignored; none gives null', () => {
  assert.equal(impactCurves([]), null)
  assert.equal(impactCurves([book('a', [], [[101, 1]])]), null)
  const r = impactCurves([book('a', [], [[101, 1]]), book('b', [[99, 1]], [[101, 1]])])
  assert.equal(r.mid, 100)
})

test('costAt', () => {
  const r = impactCurves([book('a', [[99, 1], [98, 2]], [[101, 1], [102, 2]])])
  assert.equal(costAt(r.up, 100.5, 'up'), 0)
  assert.equal(costAt(r.up, 101, 'up'), 101)
  assert.equal(costAt(r.up, 101.9, 'up'), 101)
  assert.equal(costAt(r.up, 102, 'up'), 305)
  assert.equal(costAt(r.up, 103, 'up'), null)
  assert.equal(costAt(r.down, 99.5, 'down'), 0)
  assert.equal(costAt(r.down, 98, 'down'), 295)
  assert.equal(costAt(r.down, 97, 'down'), null)
})
