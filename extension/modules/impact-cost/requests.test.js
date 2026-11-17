import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { parseRequest } from './requests.js'

test('parse only supported USDT Binance and exchange requests', () => {
  const base = 'https://capi.coinglass.com/api/index/'
  assert.deepEqual(parseRequest(base + '5/liqMap?symbol=Binance_BTCUSDT'), { kind: 'binance', coin: 'BTC' })
  assert.deepEqual(parseRequest(base + '2/exLiqMap?symbol=eth'), { kind: 'exchange', coin: 'ETH' })
  for (const url of [base + '5/liqMap?symbol=Binance_BTCUSD', base + '5/liqMap?symbol=Binance_BTCUSDC', base + '5/liqMap?symbol=OKX_BTCUSDT', base + '2/exLiqMap?symbol=BTC_USDT', 'https://evil.example/api/index/2/exLiqMap?symbol=BTC', 'bad']) assert.equal(parseRequest(url), null)
})
