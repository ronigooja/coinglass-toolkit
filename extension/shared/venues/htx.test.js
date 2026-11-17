import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { htx, clearHtxCache } from './htx.js'

const fx = (name) => JSON.parse(readFileSync(new URL(`./fixtures/htx_${name}.json`, import.meta.url)))

beforeEach(clearHtxCache)

test('htx converts contracts and requests the maximum depth', async () => {
  const urls = []
  const book = await htx.fetchBook('JCT', async (url) => {
    urls.push(url)
    return fx(url.includes('swap_contract_info') ? 'contract' : 'depth')
  })
  assert.equal(book.venue, 'htx')
  assert.match(urls[0], /contract_code=JCT-USDT$/)
  assert.match(urls[1], /contract_code=JCT-USDT&type=step0&depth=150$/)
  assert.ok(book.bids.length && book.asks.length)
  assert.equal(book.bids[0][1], fx('depth').tick.bids[0][1] * 100)
  assert.ok(book.bids.every((l, i, a) => i === 0 || a[i - 1][0] >= l[0]))
  assert.ok(book.asks.every((l, i, a) => i === 0 || a[i - 1][0] <= l[0]))
  assert.ok(Number.isFinite(book.ts))
})

test('htx returns null for unknown coin', async () => {
  assert.equal(await htx.fetchBook('ZZZNONEXISTENT', async () => fx('unknown')), null)
})

test('htx caches contract size', async () => {
  let count = 0
  const fetch = async (url) => {
    if (url.includes('swap_contract_info')) { count++; return fx('contract') }
    return fx('depth')
  }
  await htx.fetchBook('JCT', fetch)
  await htx.fetchBook('JCT', fetch)
  assert.equal(count, 1)
})

test('htx rejects malformed responses and propagates network errors', async () => {
  await assert.rejects(htx.fetchBook('JCT', async () => ({ status: 'ok', data: [{ contract_code: 'JCT-USDT', contract_size: 'bad' }] })))
  await assert.rejects(htx.fetchBook('JCT', async (url) => url.includes('swap_contract_info') ? fx('contract') : { status: 'ok', tick: { bids: [[1, 'bad']], asks: [] } }))
  await assert.rejects(htx.fetchBook('JCT', async () => { throw new Error('network') }), /network/)
})
