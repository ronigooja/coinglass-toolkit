import { fetchAllBooks } from './shared/venues/index.js'

const api = globalThis.browser ?? globalThis.chrome

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'books') return

  fetchAllBooks(message.coin).then(sendResponse, (error) => {
    sendResponse({ books: [], errors: [{ venue: 'background', error: String(error?.message ?? error) }] })
  })
  return true
})
