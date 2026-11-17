import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { parseRequest } from './requests.js'

const base = 'https://capi.coinglass.com/api/index/'
const liq = (symbol) => parseRequest(base + '5/liqMap?symbol=' + symbol)

test('liqMap symbols as sent by the page for each supported exchange', () => {
  assert.deepEqual(liq('Binance_JCTUSDT'), { kind: 'single', venue: 'binance', coin: 'JCT', period: null })
  assert.deepEqual(liq('Bybit_JCTUSDT'), { kind: 'single', venue: 'bybit', coin: 'JCT', period: null })
  assert.deepEqual(liq('OKX_JCT-USDT-SWAP'), { kind: 'single', venue: 'okx', coin: 'JCT', period: null })
  assert.deepEqual(liq('Bitget_JCTUSDT_UMCBL'), { kind: 'single', venue: 'bitget', coin: 'JCT', period: null })
  assert.deepEqual(liq('Gate_JCT_USDT'), { kind: 'single', venue: 'gate', coin: 'JCT', period: null })
})

test('coins with digits and long names', () => {
  assert.deepEqual(liq('Binance_1000PEPEUSDT'), { kind: 'single', venue: 'binance', coin: '1000PEPE', period: null })
  assert.deepEqual(liq('Gate_1000PEPE_USDT'), { kind: 'single', venue: 'gate', coin: '1000PEPE', period: null })
  assert.deepEqual(liq('OKX_AAVE-USDT-SWAP'), { kind: 'single', venue: 'okx', coin: 'AAVE', period: null })
})

test('exchanges without an adapter are unsupported', () => {
  assert.deepEqual(liq('MEXC_JCT_USDT'), { kind: 'unsupported', venue: 'mexc', name: 'MEXC' })
  assert.deepEqual(liq('KuCoin_JCTUSDTM'), { kind: 'unsupported', venue: 'kucoin', name: 'KuCoin' })
  assert.deepEqual(liq('Kraken_PF_XBTUSD'), { kind: 'unsupported', venue: 'kraken', name: 'Kraken' })
})

test('a supported exchange with a non-USDT-perpetual symbol is unsupported', () => {
  assert.deepEqual(liq('Binance_BTCUSD'), { kind: 'unsupported', venue: 'binance', name: 'Binance' })
  assert.deepEqual(liq('OKX_BTC-USD-SWAP'), { kind: 'unsupported', venue: 'okx', name: 'OKX' })
  assert.deepEqual(liq('Bitget_BTCUSD_DMCBL'), { kind: 'unsupported', venue: 'bitget', name: 'Bitget' })
  assert.deepEqual(liq('BTCUSDT'), { kind: 'unsupported', venue: 'btcusdt', name: 'BTCUSDT' })
})

test('exLiqMap carries the coin only', () => {
  assert.deepEqual(parseRequest(base + '2/exLiqMap?symbol=eth'), { kind: 'exchange', coin: 'ETH', period: null })
})

test('other paths, wrong hosts and malformed input are ignored', () => {
  for (const url of [base + '2/exLiqMap?symbol=BTC_USDT', base + '9/other?symbol=BTC', 'https://evil.example/api/index/2/exLiqMap?symbol=BTC', 'bad']) assert.equal(parseRequest(url), null)
})

test('period comes from the interval the page sends', () => {
  const p = (path, interval) => parseRequest(`${base}${path}&interval=${interval}`)
  const expected = { 1: '1天', 5: '7天', 30: '30天', '90d': '90天', '180d': '180天', '365d': '1年' }
  for (const [interval, label] of Object.entries(expected)) {
    assert.equal(p('5/liqMap?symbol=Binance_BTCUSDT', interval).period, label)
    assert.equal(p('2/exLiqMap?symbol=BTC', interval).period, label)
  }
  assert.equal(p('5/liqMap?symbol=Binance_BTCUSDT', 'weird').period, null)
})
