import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { matchesUrl } from './match.js'

test('matches WebExtension URL patterns', () => {
  assert.equal(matchesUrl('https://www.coinglass.com/*', 'https://www.coinglass.com/liquidation?symbol=BTC'), true)
  assert.equal(matchesUrl('https://www.coinglass.com/*', 'http://www.coinglass.com/'), false)
  assert.equal(matchesUrl('*://*.coinglass.com/foo*', 'https://coinglass.com/foobar'), true)
  assert.equal(matchesUrl('*://*.coinglass.com/foo*', 'https://evilcoinglass.com/foobar'), false)
  assert.equal(matchesUrl('https://www.coinglass.com/foo.bar', 'https://www.coinglass.com/fooXbar'), false)
  assert.equal(matchesUrl('invalid', 'https://www.coinglass.com/'), false)
  assert.equal(matchesUrl('<all_urls>', 'not a URL'), false)
})
