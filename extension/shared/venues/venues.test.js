import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { binance } from './binance.js'
import { okx, clearOkxCache } from './okx.js'
import { bybit } from './bybit.js'
import { bitget } from './bitget.js'
import { gate, clearGateCache } from './gate.js'
import { fetchAllBooks } from './index.js'

const fx = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url)))

beforeEach(() => {
  clearOkxCache()
  clearGateCache()
})

function check(book, venue) {
  assert.equal(book.venue, venue)
  assert.ok(book.bids.length > 0 && book.asks.length > 0)
  for (let i = 1; i < book.bids.length; i++) assert.ok(book.bids[i][0] < book.bids[i - 1][0])
  for (let i = 1; i < book.asks.length; i++) assert.ok(book.asks[i][0] > book.asks[i - 1][0])
  assert.ok(book.bids[0][0] < book.asks[0][0])
  assert.ok(book.bids.every(([p, q]) => Number.isFinite(p) && Number.isFinite(q) && q > 0))
}

test('binance', async () => {
  const b = await binance.fetchBook('BTC', async () => fx('binance'))
  check(b, 'binance')
  assert.equal(b.bids[0][1], Number(fx('binance').bids[0][1]))
})

test('binance unknown symbol', async () => {
  assert.equal(await binance.fetchBook('NOPE', async () => ({ code: -1121 })), null)
})

test('okx converts contracts to base coin', async () => {
  const f = async (u) => (u.includes('instruments') ? fx('okx_inst') : fx('okx'))
  const b = await okx.fetchBook('BTC', f)
  check(b, 'okx')
  const raw = Number(fx('okx').data[0].bids[0][1])
  assert.ok(Math.abs(b.bids[0][1] - raw * 0.01) < 1e-9)
})

test('okx unknown instrument', async () => {
  assert.equal(await okx.fetchBook('NOPE', async () => ({ code: '51001', msg: '' })), null)
})

test('bybit', async () => {
  const b = await bybit.fetchBook('BTC', async () => fx('bybit'))
  check(b, 'bybit')
})

test('bybit unknown symbol', async () => {
  assert.equal(await bybit.fetchBook('NOPE', async () => ({ retCode: 10001 })), null)
})

test('bitget', async () => {
  const b = await bitget.fetchBook('BTC', async () => fx('bitget'))
  check(b, 'bitget')
})

test('bitget unknown symbol', async () => {
  assert.equal(await bitget.fetchBook('NOPE', async () => ({ code: '40034' })), null)
})

test('gate converts contracts to base coin', async () => {
  const f = async (u) => (u.includes('/contracts/') ? fx('gate_contract') : fx('gate'))
  const b = await gate.fetchBook('BTC', f)
  check(b, 'gate')
  assert.ok(Math.abs(b.bids[0][1] - fx('gate').bids[0].s * 0.0001) < 1e-9)
})

test('gate unknown contract', async () => {
  assert.equal(await gate.fetchBook('NOPE', async () => ({ label: 'CONTRACT_NOT_FOUND' })), null)
})

test('fetchAllBooks isolates failures and skips unsupported venues', async () => {
  const ok = { name: 'ok', fetchBook: async () => ({ venue: 'ok', bids: [[1, 1]], asks: [[2, 1]], ts: 0 }) }
  const none = { name: 'none', fetchBook: async () => null }
  const bad = { name: 'bad', fetchBook: async () => { throw new Error('boom') } }
  const r = await fetchAllBooks('BTC', [ok, none, bad])
  assert.equal(r.books.length, 1)
  assert.deepEqual(r.errors, [{ venue: 'bad', error: 'boom' }])
})

test('selectVenues picks one venue, all, or none', async () => {
  const { selectVenues, venues } = await import('./index.js')
  assert.deepEqual(selectVenues('okx').map((v) => v.name), ['okx'])
  assert.equal(selectVenues(undefined).length, venues.length)
  assert.equal(selectVenues('kraken').length, 0)
})
