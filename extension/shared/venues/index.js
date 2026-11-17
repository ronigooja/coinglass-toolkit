import { binance } from './binance.js'
import { okx } from './okx.js'
import { bybit } from './bybit.js'
import { bitget } from './bitget.js'
import { gate } from './gate.js'
import { mexc } from './mexc.js'
import { kucoin } from './kucoin.js'
import { bingx } from './bingx.js'
import { htx } from './htx.js'

export const venues = [binance, okx, bybit, bitget, gate, mexc, kucoin, bingx, htx]

/** Select venues by name; no name selects all. An unknown name selects none. */
export function selectVenues(name, list = venues) {
  return name ? list.filter((v) => v.name === name) : list
}

/**
 * Fetch books from all venues in parallel. A venue that fails or lacks the coin is skipped.
 * @param {string} coin
 * @param {typeof venues} [list]
 * @returns {Promise<{ books: import('./README.md').Book[], errors: { venue: string, error: string }[] }>}
 */
export async function fetchAllBooks(coin, list = venues) {
  const results = await Promise.allSettled(list.map((v) => v.fetchBook(coin)))
  const books = []
  const errors = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      if (r.value) books.push(r.value)
    } else {
      errors.push({ venue: list[i].name, error: String(r.reason?.message ?? r.reason) })
    }
  })
  return { books, errors }
}
