import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kucoin, clearKucoinCache } from './kucoin.js'

const fx = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))
beforeEach(clearKucoinCache)

test('kucoin converts contract sizes and sorts levels', async () => {
  const urls = []
  const book = await kucoin.fetchBook('JCT', async (url) => {
    urls.push(url)
    return fx(url.includes('/contracts/') ? 'kucoin_contract' : 'kucoin_book')
  })
  assert.deepEqual(urls, [
    'https://api-futures.kucoin.com/api/v1/contracts/JCTUSDTM',
    'https://api-futures.kucoin.com/api/v1/level2/depth100?symbol=JCTUSDTM',
  ])
  assert.equal(book.venue, 'kucoin')
  assert.equal(book.bids[0][1], fx('kucoin_book').data.bids[0][1] * 1000)
  assert.ok(book.bids.every((level, i) => !i || level[0] <= book.bids[i - 1][0]))
  assert.ok(book.asks.every((level, i) => !i || level[0] >= book.asks[i - 1][0]))
  assert.ok(Number.isFinite(book.ts))
})

test('kucoin maps BTC to XBT and caches its multiplier', async () => {
  let contracts = 0
  const fetch = async (url) => {
    assert.match(url, /XBTUSDTM/)
    if (url.includes('/contracts/')) { contracts++; return fx('kucoin_btc_contract') }
    return { code: '200000', data: { symbol: 'XBTUSDTM', bids: [[10, 2]], asks: [[11, 3]] } }
  }
  assert.deepEqual((await kucoin.fetchBook('BTC', fetch)).bids, [[10, 0.002]])
  await kucoin.fetchBook('BTC', fetch)
  assert.equal(contracts, 1)
})

test('kucoin returns null for unknown contracts', async () => {
  assert.equal(await kucoin.fetchBook('NOPE', async () => ({ code: '404000' })), null)
})

test('kucoin rejects malformed contracts and books', async () => {
  await assert.rejects(kucoin.fetchBook('JCT', async () => ({ code: '200000', data: {} })))
  await assert.rejects(kucoin.fetchBook('JCT', async (url) => url.includes('/contracts/')
    ? fx('kucoin_contract') : { code: '200000', data: { symbol: 'JCTUSDTM', bids: [['bad', 1]], asks: [] } }))
})
