(() => {
  if (window.__impactCostHook) return
  window.__impactCostHook = true
  const source = 'impact-cost-page-hook'
  const seen = new Map()
  function notify(input) {
    try {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href)
      if (url.protocol === 'https:' && url.hostname === 'capi.coinglass.com' && ['/api/index/5/liqMap', '/api/index/2/exLiqMap'].includes(url.pathname)) {
        seen.set(url.pathname, url.href)
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

  // Rows for the page's native tooltip, per chart, sent by the content script. The page's tooltip `formatter`
  // returns an HTML string that ECharts measures to place the box, so the row is added inside that string
  // (adding it to the DOM afterwards left the box mispositioned).
  const rows = new Map()
  const wrapFormatter = (original, attribute) => {
    const wrapped = function (params, ...rest) {
      let html = original.call(this, params, ...rest)
      try {
        const first = Array.isArray(params) ? params[0] : params
        const row = rows.get(attribute)?.[String(Number(first?.axisValue ?? first?.name))]
        if (row && typeof html === 'string' && html.endsWith('</div></div>')) {
          const marker = `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${row[1]};"></span>`
          html = `${html.slice(0, -12)}<div class='cg-tooltip-item'><div class='cg-tooltip-item-title'>${marker}订单簿累计深度</div><div class='pl20'>${row[0]}</div></div></div></div>`
        }
      } catch { /* Leave the native tooltip unchanged. */ }
      return html
    }
    wrapped.__impactCost = true
    return wrapped
  }
  // The page can replace the chart option, so the wrapper is re-applied by the poll below.
  function ensureFormatter(container, attribute) {
    const chart = findChart(container)
    const formatter = chart?.getOption?.()?.tooltip?.[0]?.formatter
    if (typeof formatter === 'function' && !formatter.__impactCost) chart.setOption({ tooltip: { formatter: wrapFormatter(formatter, attribute) } })
  }

  // The X axis is a category axis whose labels are prices with uneven spacing. A price is mapped
  // to a fractional category index by interpolating between neighbouring labels, then to pixels
  // with the chart's own conversion.
  function readAxis(container) {
    const chart = findChart(container)
    if (!chart || typeof chart.convertToPixel !== 'function') return { axis: null, reason: 'no-instance' }
    const xa = chart.getOption()?.xAxis?.[0]
    if (xa?.type !== 'category' || !xa.data?.length) return { axis: null, reason: 'x-not-category' }
    const prices = xa.data.map((d) => Number(typeof d === 'object' ? d.value : d))
    // Equal neighbours occur (the current-price category can repeat); only a decrease is invalid.
    if (prices.some((p, i) => !Number.isFinite(p) || (i && p < prices[i - 1]))) return { axis: null, reason: 'labels-not-ascending-numbers' }
    const rect = chart.getModel().getComponent('grid', 0)?.coordinateSystem?.getRect?.()
    const ext = chart.getModel().getComponent('xAxis', 0)?.axis?.scale?.getExtent?.()
    if (!rect || !ext) return { axis: null, reason: 'no-grid' }
    const lo = Math.max(0, Math.ceil(ext[0])), hi = Math.min(prices.length - 1, Math.floor(ext[1]))
    if (hi <= lo) return { axis: null, reason: 'empty-visible-range' }
    const px = (i) => chart.convertToPixel({ xAxisIndex: 0 }, i)
    // The right Y axis (index 1) is the page's cumulative liquidation axis in USDT. Cost is drawn on it.
    const ya = chart.getModel().getComponent('yAxis', 1)?.axis
    const yExt = ya?.scale?.getExtent?.()
    if (!yExt || !(yExt[1] > yExt[0]) || chart.getOption()?.yAxis?.[1]?.type !== 'value') return { axis: null, reason: 'no-right-y-axis' }
    const yPx = (v) => chart.convertToPixel({ yAxisIndex: 1 }, v)
    return {
      axis: {
        yMin: yExt[0], yMax: yExt[1], yPxMin: yPx(yExt[0]), yPxMax: yPx(yExt[1]),
        prices, firstIndex: lo, lastIndex: hi, minPrice: prices[lo], maxPrice: prices[hi],
        indexPx: Array.from({ length: hi - lo + 1 }, (_, k) => px(lo + k)),
        plotLeft: rect.x, plotRight: rect.x + rect.width, plotTop: rect.y, plotBottom: rect.y + rect.height,
      },
    }
  }

  // Watch axes by polling instead of chart events. Why: chart instances are rebuilt by the page and
  // event bindings were lost, leaving the overlay stale after zoom.
  const watched = new Set()
  const signatures = new Map()
  const byAttribute = (attribute) => [...document.querySelectorAll('[_echarts_instance_]')].find((el) => el.getAttribute('_echarts_instance_') === attribute)
  setInterval(() => {
    for (const attribute of watched) {
      const container = byAttribute(attribute)
      let sig = 'missing'
      if (container) {
        try {
          ensureFormatter(container, attribute)
        } catch { /* Tooltip row is optional. */ }
        try {
          const a = readAxis(container).axis
          sig = a ? JSON.stringify([a.firstIndex, a.lastIndex, a.indexPx[0], a.indexPx.at(-1), a.yMin, a.yMax, a.yPxMin, a.yPxMax, a.plotLeft, a.plotRight, a.plotTop, a.plotBottom]) : 'none'
        } catch { sig = 'error' }
      } else watched.delete(attribute)
      if (signatures.get(attribute) !== sig) {
        signatures.set(attribute, sig)
        window.postMessage({ source, type: 'zoom', attribute }, location.origin)
      }
    }
  }, 300)

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'impact-cost-content') return
    const { type, id, attribute } = event.data
    if (type === 'ready') {
      for (const url of seen.values()) window.postMessage({ source, type: 'request', url }, location.origin)
      return
    }
    const container = byAttribute(attribute)
    if (!container) return
    if (type === 'rows') {
      rows.set(attribute, event.data.rows ?? {})
      return
    }
    if (type === 'watch') {
      watched.add(attribute)
      return
    }
    if (type !== 'axis') return
    let result = { axis: null, reason: 'error' }
    try { result = readAxis(container) } catch (e) { result = { axis: null, reason: 'exception: ' + String(e?.message ?? e) } }
    window.postMessage({ source, type: 'axis', id, axis: result.axis, reason: result.reason }, location.origin)
  })
})()
