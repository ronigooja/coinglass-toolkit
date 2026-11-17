;(async () => {
  const api = globalThis.browser ?? globalThis.chrome
  const { modules } = await import(api.runtime.getURL('modules/index.js'))
  const { matchesUrl } = await import(api.runtime.getURL('shared/match.js'))
  const ctx = {
    requestBooks: (coin) => globalThis.browser
      ? api.runtime.sendMessage({ type: 'books', coin })
      : new Promise((resolve, reject) => {
      api.runtime.sendMessage({ type: 'books', coin }, (response) => {
        const error = api.runtime.lastError
        if (error) reject(new Error(error.message))
        else resolve(response)
      })
    }),
    onChartRefresh: null
  }

  for (const path of modules) {
    try {
      const module = await import(api.runtime.getURL(path))
      if (module.matches.some((pattern) => matchesUrl(pattern, location.href))) {
        await module.init(ctx)
      }
    } catch (error) {
      console.error(`Failed to load or initialize module ${path}`, error)
    }
  }
})().catch((error) => console.error('Failed to initialize CoinGlass Toolkit', error))
