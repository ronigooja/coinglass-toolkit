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

  // The chart instance is reachable through the React fiber of the container (react-echarts wrapper).
  function findChart(container) {
    if (window.echarts?.getInstanceByDom) {
      const c = window.echarts.getInstanceByDom(container)
      if (c) return c
    }
    const key = Object.keys(container).find((k) => k.startsWith('__reactFiber'))
    for (let f = key && container[key], i = 0; f && i < 40; f = f.return, i++) {
      const s = f.stateNode
      if (s && typeof s.getEchartsInstance === 'function') return s.getEchartsInstance()
    }
    return null
  }

  // Price axis from the chart's own coordinate conversion; no dependence on option values.
  function readAxis(container) {
    const chart = findChart(container)
    if (!chart || typeof chart.convertToPixel !== 'function') return { axis: null, reason: 'no-instance' }
    const opt = chart.getOption()
    const xa = opt?.xAxis?.[0]
    const ext = chart.getModel?.().getComponent('xAxis', 0)?.axis?.scale?.getExtent?.()
    if (!ext || !(ext[1] > ext[0])) return { axis: null, reason: 'no-x-extent', xType: xa?.type }
    const isCategory = xa?.type === 'category'
    const toPx = (v) => chart.convertToPixel({ xAxisIndex: 0 }, v)
    const left = toPx(ext[0]), right = toPx(ext[1])
    if (!Number.isFinite(left) || !Number.isFinite(right)) return { axis: null, reason: 'no-pixel' }
    const grid = chart.getModel().getComponent('grid', 0)?.coordinateSystem?.getRect?.()
    if (!grid) return { axis: null, reason: 'no-grid' }
    let minPrice = ext[0], maxPrice = ext[1]
    if (isCategory) {
      const data = xa.data
      const num = (i) => Number(typeof data[i] === 'object' ? data[i].value : data[i])
      minPrice = num(Math.max(0, Math.ceil(ext[0])))
      maxPrice = num(Math.min(data.length - 1, Math.floor(ext[1])))
      if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) return { axis: null, reason: 'category-not-numeric' }
    }
    return {
      axis: { minPrice, maxPrice, plotLeft: grid.x, plotRight: grid.x + grid.width, plotTop: grid.y, plotBottom: grid.y + grid.height },
      info: { xType: xa?.type, extent: ext },
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'impact-cost-content' || event.data.type !== 'axis') return
    const { id, attribute } = event.data
    let result = { axis: null, reason: 'error' }
    try {
      const container = [...document.querySelectorAll('[_echarts_instance_]')].find((el) => el.getAttribute('_echarts_instance_') === attribute)
      if (container) result = readAxis(container)
    } catch (e) { result = { axis: null, reason: 'exception: ' + String(e?.message ?? e) } }
    window.postMessage({ source, type: 'axis', id, axis: result.axis, reason: result.reason, info: result.info }, location.origin)
  })
})()
