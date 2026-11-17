// Helpers injected into the CoinGlass page by scripts/safari/page.sh. Page facts: docs/coinglass-page.md.
// Chart index 0 is the single-exchange chart, 1 is the aggregate chart.
window.__ctk = (() => {
  const containers = () => [...document.querySelectorAll('[_echarts_instance_]')]

  const instance = (el) => {
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber'))
    for (let f = key && el[key], i = 0; f && i < 40; f = f.return, i++) {
      if (f.stateNode && typeof f.stateNode.getEchartsInstance === 'function') return f.stateNode.getEchartsInstance()
    }
    return null
  }

  const section = (el) => {
    let p = el
    for (let i = 0; i < 8 && p; i++) {
      p = p.parentElement
      if (p && p.querySelector('h1,h2,h3,h4,h5')) return p
    }
    return null
  }

  const chart = (index) => {
    const el = containers()[index]
    if (!el) throw new Error(`no chart ${index}`)
    return { el, c: instance(el), sec: section(el) }
  }

  const setInput = (input, text) => {
    input.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const overlayStats = (index) => {
    const { el } = chart(index)
    const ov = el.querySelector('canvas[data-impact-cost]')
    if (!ov) return { overlay: false }
    const r = ov.width / el.clientWidth
    const d = ov.getContext('2d').getImageData(0, 0, ov.width, ov.height).data
    const curve = { px: 0 }
    const gray = { px: 0, box: [1e9, 1e9, -1, -1] }
    for (let y = 0; y < ov.height; y++) {
      for (let x = 0; x < ov.width; x++) {
        const i = (y * ov.width + x) * 4
        if (d[i + 3] < 40) continue
        const orange = d[i] > 200 && d[i + 1] > 110 && d[i + 2] < 90
        const cyan = d[i] < 90 && d[i + 1] > 180 && d[i + 2] > 200
        if (orange || cyan) curve.px++
        else {
          gray.px++
          gray.box = [Math.min(gray.box[0], x), Math.min(gray.box[1], y), Math.max(gray.box[2], x), Math.max(gray.box[3], y)]
        }
      }
    }
    return { overlay: true, curvePx: curve.px, noticePx: gray.px, noticeBox: gray.px ? gray.box.map((v) => Math.round(v / r)) : null }
  }

  const axes = (index) => {
    const { c } = chart(index)
    const o = c.getOption()
    const m = c.getModel()
    const x = o.xAxis[0].data.map(Number)
    const ext = m.getComponent('xAxis', 0).axis.scale.getExtent()
    const g = m.getComponent('grid', 0).coordinateSystem.getRect()
    return {
      labels: x.length,
      visible: ext.map(Math.round),
      visiblePrices: [x[Math.ceil(ext[0])], x[Math.floor(ext[1])]],
      rightAxis: m.getComponent('yAxis', 1).axis.scale.getExtent().map(Math.round),
      currentPrice: o.series[0].markLine?.data?.[0]?.xAxis,
      plot: [g.x, g.y, g.x + g.width, g.y + g.height].map(Math.round),
    }
  }

  // Zoom to `half` labels each side of the current price.
  const zoomToCurrent = (index, half = 10) => {
    const { c } = chart(index)
    const x = c.getOption().xAxis[0].data.map(Number)
    const cur = Number(c.getOption().series[0].markLine.data[0].xAxis)
    let ci = 0
    while (ci < x.length - 2 && x[ci + 1] <= cur) ci++
    c.dispatchAction({ type: 'dataZoom', startValue: Math.max(0, ci - half), endValue: Math.min(x.length - 1, ci + half) })
    return { ci }
  }

  const clickRefresh = (index) => {
    const { sec } = chart(index)
    const b = [...sec.querySelectorAll('button')].find((x) => x.querySelector('polyline[points="1 4 1 10 7 10"]'))
    if (!b) throw new Error('no refresh button')
    b.click()
  }

  // The listbox options are rendered in a portal, so they are searched document-wide.
  const typeInInput = (index, text) => {
    const { sec } = chart(index)
    const input = sec.querySelector('input')
    setInput(input, text)
    return input.value
  }

  const pickOption = (text, startsWith = false) => {
    const o = [...document.querySelectorAll('[role=listbox] [role=option]')].find((x) => {
      const t = x.textContent.trim()
      return startsWith ? t.startsWith(text) : t === text
    })
    if (!o) throw new Error(`no option ${text}`)
    o.click()
  }

  const pickPeriod = (index, label) => {
    const { sec } = chart(index)
    const btn = sec.querySelector('button[role=combobox]')
    btn.click()
    const o = [...document.getElementById(btn.getAttribute('aria-controls')).querySelectorAll('[role=option]')].find((x) => x.textContent.trim() === label)
    if (!o) throw new Error(`no period ${label}`)
    o.click()
  }

  // Chart section titles, in page order. Escapes instead of literals: page.sh passes code through osascript, which can garble non-ASCII text.
  const headings = () => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => h.textContent.trim()).filter((t) => /\u6e05\u7b97\u5730\u56fe$/.test(t))

  return { chart, axes, overlayStats, zoomToCurrent, clickRefresh, typeInInput, pickOption, pickPeriod, headings }
})()
