import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mexc, clearMexcCache } from './mexc.js'

const fx = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url)))
beforeEach(clearMexcCache)

test('mexc converts contracts, sorts levels, and caches contract size', async () => {
  const urls = []
  const fetch = async (url) => {
    urls.push(url)
    if (url.includes('/detail?')) return fx('mexc_contract')
    const d = fx('mexc')
    d.data.bids.reverse()
    d.data.asks.reverse()
    return d
  }
  const book = await mexc.fetchBook('JCT', fetch)
  assert.equal(book.venue, 'mexc')
  assert.equal(book.bids[0][1], fx('mexc').data.bids[0][1] * fx('mexc_contract').data.contractSize)
  assert.ok(book.bids.every((v, i, a) => i === 0 || a[i - 1][0] >= v[0]))
  assert.ok(book.asks.every((v, i, a) => i === 0 || a[i - 1][0] <= v[0]))
  assert.ok(Number.isFinite(book.ts))
  await mexc.fetchBook('JCT', fetch)
  assert.deepEqual(urls, [
    'https://contract.mexc.com/api/v1/contract/detail?symbol=JCT_USDT',
    'https://contract.mexc.com/api/v1/contract/depth/JCT_USDT?limit=1500',
    'https://contract.mexc.com/api/v1/contract/depth/JCT_USDT?limit=1500',
  ])
})

test('mexc returns null for unknown contracts', async () => {
  assert.equal(await mexc.fetchBook('NOPE', async () => ({ success: false, code: 1001 })), null)
  assert.equal(await mexc.fetchBook('JCT', async (url) => url.includes('/detail?') ? fx('mexc_contract') : { success: false, code: 1001 }), null)
})

test('mexc rejects malformed responses and propagates network errors', async () => {
  await assert.rejects(mexc.fetchBook('JCT', async () => ({ success: true, code: 0, data: { symbol: 'JCT_USDT', contractSize: 'bad' } })))
  await assert.rejects(mexc.fetchBook('JCT', async (url) => url.includes('/detail?') ? fx('mexc_contract') : { success: true, code: 0, data: { bids: [[1, 'bad']], asks: [] } }))
  await assert.rejects(mexc.fetchBook('JCT', async () => { throw new Error('network') }), /network/)
})
