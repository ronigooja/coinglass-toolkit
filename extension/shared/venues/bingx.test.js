import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { bingx } from './bingx.js'

const fx = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))

test('bingx normalizes recorded depth in base coin', async () => {
  const fixture = fx('bingx')
  const start = Date.now()
  const book = await bingx.fetchBook('BTC', async (url) => {
    assert.equal(url, 'https://open-api.bingx.com/openApi/swap/v2/quote/depth?symbol=BTC-USDT&limit=1000')
    return fixture
  })
  assert.equal(book.venue, 'bingx')
  assert.deepEqual(book.bids[0], fixture.data.bids[0].map(Number))
  assert.deepEqual(book.asks[0], fixture.data.asks[0].map(Number))
  assert.ok(book.ts >= start && book.ts <= Date.now())
  assert.ok(book.bids.every((l, i, a) => !i || a[i - 1][0] >= l[0]))
  assert.ok(book.asks.every((l, i, a) => !i || a[i - 1][0] <= l[0]))
})

test('bingx returns null for unknown symbol', async () => {
  assert.equal(await bingx.fetchBook('NOTAREALCOINXYZ', async () => fx('bingx_unknown')), null)
})

test('bingx sorts levels and rejects malformed responses', async () => {
  const data = { code: 0, data: { bids: [['1', '2'], ['2', '3']], asks: [['4', '5'], ['3', '6']] } }
  const book = await bingx.fetchBook('BTC', async () => data)
  assert.deepEqual(book.bids, [[2, 3], [1, 2]])
  assert.deepEqual(book.asks, [[3, 6], [4, 5]])
  for (const response of [null, {}, { code: 123 }, { code: 0, data: { bids: [], asks: [['bad', '1']] } }, { code: 0, data: { bids: [[1, null]], asks: [] } }]) {
    await assert.rejects(bingx.fetchBook('BTC', async () => response))
  }
  await assert.rejects(bingx.fetchBook('BTC', async () => { throw new Error('network') }), /network/)
})
