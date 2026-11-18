import { impactCurves } from '../../shared/impact.js'
import { parseRequest, emptyBooksNotice } from './requests.js'
import { priceToX, xToPrice, costToY, splitCurve } from './mapping.js'

const source = 'impact-cost-page-hook'
let axisSequence = 0
let warned = false
const hovers = new WeakMap()

// Plot area as a 10 x 5 grid, origin bottom-left. Notice box centre (2, 4.4); hover readout centred on x = 8, top edge on the plot top.
const NOTICE_GRID = { cols: 10, rows: 5, x: 2, y: 4.4 }
const HOVER_GRID = { cols: 10, rows: 5, x: 8, y: 5 } // y = 5 is the top edge; only x is used

function gridPoint(rect, grid) {
  return {
    x: rect.left + (rect.right - rect.left) * grid.x / grid.cols,
    y: rect.bottom - (rect.bottom - rect.top) * grid.y / grid.rows,
  }
}
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 })
const priceFormat = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 8 })

function hover(container) {
  if (hovers.has(container)) return hovers.get(container)
  const tooltip = document.createElement('div')
  Object.assign(tooltip.style, { position: 'absolute', display: 'none', pointerEvents: 'none', zIndex: '11', boxSizing: 'border-box', height: '22px', alignItems: 'center', padding: '0 8px', border: '1px solid rgba(148, 163, 184, 0.35)', borderRadius: '6px', background: 'none', color: 'rgba(148, 163, 184, 0.8)', font: '12px -apple-system, "PingFang SC", sans-serif', whiteSpace: 'nowrap' })
  container.appendChild(tooltip)
  const data = { tooltip, axis: null, curves: null }
  hovers.set(container, data)
  container.addEventListener('mouseleave', () => { tooltip.style.display = 'none' }, { passive: true })
  container.addEventListener('mousemove', (event) => {
    const { axis, curves } = data
    const bounds = container.getBoundingClientRect()
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top
    if (!axis || !curves || x < axis.plotLeft || x > axis.plotRight || y < axis.plotTop || y > axis.plotBottom) {
      tooltip.style.display = 'none'
      return
    }
    const price = xToPrice(x, axis)
    if (price === null) { tooltip.style.display = 'none'; return }
    const points = price >= curves.mid ? curves.up : curves.down
    let previous = [curves.mid, 0], cost = price === curves.mid ? 0 : null
    for (const point of points) {
      if (price >= curves.mid ? price <= point[0] : price >= point[0]) {
        const a = priceToX(previous[0], axis), b = priceToX(point[0], axis)
        if (a !== null && b !== null && a !== b) cost = previous[1] + (x - a) / (b - a) * (point[1] - previous[1])
        break
      }
      previous = point
    }
    if (cost === null) { tooltip.style.display = 'none'; return }
    const distance = (price / curves.mid - 1) * 100
    tooltip.textContent = `价格 ${priceFormat.format(price)} · ${distance >= 0 ? '+' : ''}${distance.toFixed(2)}% · ${compact.format(cost)} USDT`
    tooltip.style.display = 'flex'
    const centre = gridPoint({ left: axis.plotLeft, right: axis.plotRight, top: axis.plotTop, bottom: axis.plotBottom }, HOVER_GRID)
    tooltip.style.left = `${centre.x - tooltip.offsetWidth / 2}px`
    tooltip.style.top = `${axis.plotTop}px`
  }, { passive: true })
  return data
}

// The page-world hook reads only documented ECharts options when available.
export function getPriceAxis(container) {
  const attribute = container.getAttribute('_echarts_instance_')
  if (!attribute) return Promise.resolve(null)
  return new Promise((resolve) => {
    const id = ++axisSequence
    const timer = setTimeout(() => finish(null), 300)
    function finish(axis) {
      clearTimeout(timer)
      window.removeEventListener('message', receive)
      resolve(axis)
    }
    function receive(event) {
      if (event.source === window && event.origin === location.origin && event.data?.source === source && event.data.type === 'axis' && event.data.id === id) {
        if (!event.data.axis) console.warn('impact-cost: axis read failed:', event.data.reason, event.data.info ?? '')
        finish(event.data.axis)
      }
    }
    window.addEventListener('message', receive)
    window.postMessage({ source: 'impact-cost-content', type: 'axis', id, attribute }, location.origin)
  })
}

function findChart(kind) {
  const headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"],p,span')
  for (const heading of headings) {
    const text = heading.textContent.trim()
    if (heading.children.length || !(kind === 'binance' ? /^\S+\s+\S+\/USDT\s*清算地图$/i.test(text) : /^\S+交易所清算地图$/.test(text))) continue
    for (let parent = heading.parentElement; parent; parent = parent.parentElement) {
      const charts = parent.querySelectorAll('[_echarts_instance_]')
      if (charts.length === 1) return charts[0]
      if (charts.length > 1) break
    }
  }
  return null
}

function overlay(container) {
  let canvas = container.querySelector(':scope > canvas[data-impact-cost]')
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.dataset.impactCost = ''
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '10' })
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative'
    container.appendChild(canvas)
  }
  return canvas
}

function drawNotice(ctx, rect, text) {
  ctx.font = '12px -apple-system, "PingFang SC", sans-serif'
  const w = ctx.measureText(text).width + 16, h = 22
  const c = gridPoint(rect, NOTICE_GRID)
  const x = c.x - w / 2, y = c.y - h / 2
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.stroke()
  ctx.fillStyle = 'rgba(148, 163, 184, 0.8)'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + 8, y + h / 2)
}

// One-line legend on the top edge of the plot, centred on x = 5 of the grid, in the notice style.
// The dashed sample appears only on the aggregate chart: a single venue never has a dashed part.
function drawLegend(ctx, axis, sides, aggregate) {
  const entries = [
    { text: '上方卖盘累计', color: sides[0].color, dash: [] },
    { text: '下方买盘累计', color: sides[1].color, dash: [] },
  ]
  if (aggregate) entries.push({ text: '部分交易所深度不足', color: 'rgba(148, 163, 184, 0.8)', dash: [4, 3] })
  const swatch = 18, gap = 6, spacing = 14, pad = 8, h = 22
  ctx.save()
  ctx.font = '12px -apple-system, "PingFang SC", sans-serif'
  const widths = entries.map((e) => swatch + gap + ctx.measureText(e.text).width)
  const w = widths.reduce((a, b) => a + b, 0) + spacing * (entries.length - 1) + pad * 2
  const rect = { left: axis.plotLeft, right: axis.plotRight, top: axis.plotTop, bottom: axis.plotBottom }
  const x0 = gridPoint(rect, { cols: 10, rows: 5, x: 5, y: 5 }).x - w / 2, y0 = axis.plotTop
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 6); ctx.stroke()
  ctx.textBaseline = 'middle'
  let x = x0 + pad
  entries.forEach((e, i) => {
    ctx.strokeStyle = e.color
    ctx.lineWidth = 2
    ctx.setLineDash(e.dash)
    ctx.beginPath(); ctx.moveTo(x, y0 + h / 2); ctx.lineTo(x + swatch, y0 + h / 2); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)'
    ctx.fillText(e.text, x + swatch + gap, y0 + h / 2)
    x += widths[i] + spacing
  })
  ctx.restore()
}

async function draw(state, generation) {
  const container = findChart(state.kind)
  if (!container) return
  const canvas = overlay(container)
  const hoverData = hover(container)
  hoverData.axis = null
  hoverData.curves = null
  hoverData.tooltip.style.display = 'none'
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(container.clientWidth * ratio)
  canvas.height = Math.round(container.clientHeight * ratio)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, container.clientWidth, container.clientHeight)
  window.postMessage({ source: 'impact-cost-content', type: 'watch', attribute: container.getAttribute('_echarts_instance_') }, location.origin)
  // A notice replaces the curves; a long period only adds a note and the curves are still drawn.
  const text = state.notice ?? (state.longPeriod ? `当前订单簿，非${state.longPeriod}累计` : null)
  const curves = state.notice ? null : impactCurves(state.books)
  if (!text && !curves) return
  const axis = await getPriceAxis(container)
  if (generation !== state.generation) return
  if (text) {
    const rect = axis ? { left: axis.plotLeft, right: axis.plotRight, top: axis.plotTop, bottom: axis.plotBottom } : { left: 0, right: container.clientWidth, top: 0, bottom: container.clientHeight }
    drawNotice(ctx, rect, text)
  }
  if (state.notice || !curves) return
  if (!axis) {
    if (!warned) { console.warn('impact-cost: price axis unavailable'); warned = true }
    return
  }
  const sides = [
    { points: [[curves.mid, 0], ...curves.up], bound: curves.completeUp, side: 'up', color: '#f59e0b' },
    { points: [[curves.mid, 0], ...curves.down], bound: curves.completeDown, side: 'down', color: '#22d3ee' },
  ]
  ctx.save()
  ctx.beginPath(); ctx.rect(axis.plotLeft, axis.plotTop, axis.plotRight - axis.plotLeft, axis.plotBottom - axis.plotTop); ctx.clip()
  ctx.lineWidth = 2
  for (const { points, bound, side, color } of sides) {
    const paths = splitCurve(points, bound, side)
    ctx.strokeStyle = color
    for (const style of ['solid', 'dashed']) {
      ctx.setLineDash(style === 'solid' ? [] : [6, 4])
      ctx.beginPath()
      let started = false
      for (const [price, cost] of paths[style]) {
        const x = priceToX(price, axis)
        if (x === null) continue
        const y = costToY(cost, axis)
        if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true }
      }
      ctx.stroke()
    }
  }
  ctx.restore()
  drawLegend(ctx, axis, sides, state.kind === 'exchange')
  hoverData.axis = axis
  hoverData.curves = curves
}

// On first load the chart can render after the order books arrive; wait for it, at most 20 s.
async function untilChart(state, generation) {
  for (let i = 0; i < 67 && generation === state.generation && !findChart(state.kind); i++) {
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

export const name = 'impact-cost'
export const matches = ['https://www.coinglass.com/*/pro/futures/LiquidationMap']
export function init(ctx) {
  // The chart finder keys: 'binance' = the single-exchange chart (liqMap), 'exchange' = the aggregate chart.
  const states = { binance: { kind: 'binance', books: [], generation: 0 }, exchange: { kind: 'exchange', books: [], generation: 0 } }
  const handle = async (url) => {
    const request = parseRequest(url)
    if (!request) return
    const state = states[request.kind === 'exchange' ? 'exchange' : 'binance']
    const generation = ++state.generation
    state.books = []
    state.notice = request.kind === 'unsupported' ? `暂不支持 ${request.name}` : null
    state.longPeriod = request.period && request.period !== '1天' ? request.period : null
    void draw(state, generation)
    if (request.kind === 'unsupported') return
    try {
      const result = await ctx.requestBooks(request.coin, request.kind === 'single' ? request.venue : undefined)
      if (generation !== state.generation) return
      state.books = result.books || []
      if (result.errors?.length) console.warn('impact-cost: venue errors', result.errors)
      state.notice = emptyBooksNotice(request, result)
      await untilChart(state, generation)
      if (generation !== state.generation) return
      await draw(state, generation)
    } catch (error) {
      if (generation === state.generation) console.warn('impact-cost: orderbooks unavailable', error)
    }
  }
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== source || event.data.type !== 'request') return
    void handle(event.data.url)
  })
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== source || event.data.type !== 'zoom') return
    for (const state of Object.values(states)) void draw(state, state.generation)
  })
  window.addEventListener('resize', () => {
    for (const state of Object.values(states)) void draw(state, state.generation)
  })
  const script = document.createElement('script')
  script.src = (globalThis.browser || globalThis.chrome).runtime.getURL('modules/impact-cost/page-hook.js')
  ;(document.head || document.documentElement).appendChild(script)
  // The page requests its data on load, before this script runs. Ask the hook to replay the requests it saw.
  const ready = () => window.postMessage({ source: 'impact-cost-content', type: 'ready' }, location.origin)
  script.onload = () => { script.remove(); ready() }
  ready()
}
export default { name, matches, init }
