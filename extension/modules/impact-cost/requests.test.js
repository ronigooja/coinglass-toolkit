import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { parseRequest } from './requests.js'

const base = 'https://capi.coinglass.com/api/index/'

test('liqMap resolves the selected exchange and coin', () => {
  assert.deepEqual(parseRequest(base + '5/liqMap?symbol=Binance_BTCUSDT'), { kind: 'single', venue: 'binance', coin: 'BTC' })
  assert.deepEqual(parseRequest(base + '5/liqMap?symbol=OKX_AAVEUSDT'), { kind: 'single', venue: 'okx', coin: 'AAVE' })
  assert.deepEqual(parseRequest(base + '5/liqMap?symbol=Gate_ETHUSDT'), { kind: 'single', venue: 'gate', coin: 'ETH' })
})

test('liqMap on an exchange without an adapter is unsupported', () => {
  assert.deepEqual(parseRequest(base + '5/liqMap?symbol=Kraken_BTCUSDT'), { kind: 'unsupported', venue: 'kraken' })
})

test('exLiqMap carries the coin only', () => {
  assert.deepEqual(parseRequest(base + '2/exLiqMap?symbol=eth'), { kind: 'exchange', coin: 'ETH' })
})

test('non-USDT pairs, wrong hosts and malformed input are ignored', () => {
  for (const url of [base + '5/liqMap?symbol=Binance_BTCUSD', base + '5/liqMap?symbol=Binance_BTCUSDC', base + '5/liqMap?symbol=BTCUSDT', base + '2/exLiqMap?symbol=BTC_USDT', 'https://evil.example/api/index/2/exLiqMap?symbol=BTC', 'bad']) assert.equal(parseRequest(url), null)
})
