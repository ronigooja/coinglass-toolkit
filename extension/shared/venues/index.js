import { binance } from './binance.js'
import { okx } from './okx.js'
import { bybit } from './bybit.js'
import { bitget } from './bitget.js'
import { gate } from './gate.js'

export const venues = [binance, okx, bybit, bitget, gate]

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
