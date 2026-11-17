(() => {
  if (window.__impactCostHook) return
  window.__impactCostHook = true
  const source = 'impact-cost-page-hook'
  function notify(input) {
    try {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href)
      if (url.protocol === 'https:' && url.hostname === 'capi.coinglass.com' && ['/api/index/5/liqMap', '/api/index/2/exLiqMap'].includes(url.pathname)) {
        window.postMessage({ source, type: 'request', url: url.href }, location.origin)
      }
    } catch { /* Ignore invalid requests. */ }
  }
  const fetch = window.fetch
  window.fetch = function (...args) { notify(args[0]); return fetch.apply(this, args) }
  const open = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (...args) { this.__impactCostUrl = args[1]; return open.apply(this, args) }
  const send = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.send = function (...args) { notify(this.__impactCostUrl); return send.apply(this, args) }
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'impact-cost-content' || event.data.type !== 'axis') return
    const { id, attribute } = event.data
    let axis = null
    try {
      const container = [...document.querySelectorAll('[_echarts_instance_]')].find((el) => el.getAttribute('_echarts_instance_') === attribute)
      const chart = container && window.echarts?.getInstanceByDom(container)
      const option = chart?.getOption()
      const grid = option?.grid?.[0]
      const x = option?.xAxis?.[0]
      // Only use explicit numeric public options; automatic layout is not exposed here.
      if (grid && x && [grid.left, grid.right, grid.top, grid.bottom, x.min, x.max].every(Number.isFinite)) {
        const candidate = { minPrice: x.min, maxPrice: x.max, plotLeft: grid.left, plotRight: container.clientWidth - grid.right, plotTop: grid.top, plotBottom: container.clientHeight - grid.bottom }
        if (candidate.maxPrice > candidate.minPrice && candidate.plotRight > candidate.plotLeft && candidate.plotBottom > candidate.plotTop) axis = candidate
      }
    } catch { /* Axis access is optional. */ }
    window.postMessage({ source, type: 'axis', id, axis }, location.origin)
  })
})()
