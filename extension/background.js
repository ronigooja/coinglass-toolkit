import { fetchAllBooks, selectVenues } from './shared/venues/index.js'

const api = globalThis.browser ?? globalThis.chrome

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'books') return

  fetchAllBooks(message.coin, selectVenues(message.venue)).then(sendResponse, (error) => {
    sendResponse({ books: [], errors: [{ venue: 'background', error: String(error?.message ?? error) }] })
  })
  return true
})
