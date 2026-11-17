import { impactCurves } from '../../shared/impact.js'
import { parseRequest } from './requests.js'
import { priceToX, costToY, splitCurve } from './mapping.js'

const source = 'impact-cost-page-hook'
let axisSequence = 0
let warned = false

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
    if (heading.children.length || !(kind === 'binance' ? /^Binance\s+\S+\/USDT\s*清算地图$/i.test(text) : text === '比特币交易所清算地图')) continue
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

async function draw(state, generation) {
  const container = findChart(state.kind)
  if (!container) return
  const canvas = overlay(container)
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(container.clientWidth * ratio)
  canvas.height = Math.round(container.clientHeight * ratio)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, container.clientWidth, container.clientHeight)
  const curves = impactCurves(state.books)
  if (!curves) return
  window.postMessage({ source: 'impact-cost-content', type: 'watch', attribute: container.getAttribute('_echarts_instance_') }, location.origin)
  const axis = await getPriceAxis(container)
  if (generation !== state.generation) return
  if (!axis) {
    if (!warned) { console.warn('impact-cost: price axis unavailable'); warned = true }
    return
  }
  const sides = [
    { points: [[curves.mid, 0], ...curves.up], bound: curves.completeUp, side: 'up', color: '#e94b53' },
    { points: [[curves.mid, 0], ...curves.down], bound: curves.completeDown, side: 'down', color: '#31ae80' },
  ]
  // Include interpolated intersections with the visible range when scaling.
  let maxCost = 0
  for (const { points } of sides) for (let i = 0; i < points.length; i++) {
    const [p, c] = points[i]
    if (p >= axis.minPrice && p <= axis.maxPrice) maxCost = Math.max(maxCost, c)
    if (i) for (const edge of [axis.minPrice, axis.maxPrice]) {
      const [p0, c0] = points[i - 1]
      if ((p0 < edge && p > edge) || (p0 > edge && p < edge)) maxCost = Math.max(maxCost, c0 + (c - c0) * (edge - p0) / (p - p0))
    }
  }
  if (!maxCost) return
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
        const y = costToY(cost, maxCost, axis)
        if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true }
      }
      ctx.stroke()
    }
  }
  ctx.restore()
}

export const name = 'impact-cost'
export const matches = ['https://www.coinglass.com/*/pro/futures/LiquidationMap']
export function init(ctx) {
  const states = { binance: { kind: 'binance', books: [], generation: 0 }, exchange: { kind: 'exchange', books: [], generation: 0 } }
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== source || event.data.type !== 'request') return
    const request = parseRequest(event.data.url)
    if (!request) return
    const state = states[request.kind]
    const generation = ++state.generation
    state.books = []
    void draw(state, generation)
    try {
      const result = await ctx.requestBooks(request.coin)
      if (generation !== state.generation) return
      state.books = result.books || []
      await draw(state, generation)
    } catch (error) {
      if (generation === state.generation) console.warn('impact-cost: orderbooks unavailable', error)
    }
  })
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== source || event.data.type !== 'zoom') return
    for (const state of Object.values(states)) {
      const container = findChart(state.kind)
      if (container?.getAttribute('_echarts_instance_') === event.data.attribute) void draw(state, state.generation)
    }
  })
  window.addEventListener('resize', () => {
    for (const state of Object.values(states)) void draw(state, state.generation)
  })
  const script = document.createElement('script')
  script.src = (globalThis.browser || globalThis.chrome).runtime.getURL('modules/impact-cost/page-hook.js')
  script.onload = () => script.remove()
  ;(document.head || document.documentElement).appendChild(script)
}
export default { name, matches, init }
