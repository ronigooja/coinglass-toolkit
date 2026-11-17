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

// Plot area as a 10 x 5 grid, origin bottom-left. The notice box is centred on (2, 4.4).
const NOTICE_GRID = { cols: 10, rows: 5, x: 2, y: 4.4 }

function drawNotice(ctx, rect, text) {
  ctx.font = '12px -apple-system, "PingFang SC", sans-serif'
  const w = ctx.measureText(text).width + 16, h = 22
  const cx = rect.left + (rect.right - rect.left) * NOTICE_GRID.x / NOTICE_GRID.cols
  const cy = rect.bottom - (rect.bottom - rect.top) * NOTICE_GRID.y / NOTICE_GRID.rows
  const x = cx - w / 2, y = cy - h / 2
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.stroke()
  ctx.fillStyle = 'rgba(148, 163, 184, 0.8)'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + 8, y + h / 2)
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
}

export const name = 'impact-cost'
export const matches = ['https://www.coinglass.com/*/pro/futures/LiquidationMap']
export function init(ctx) {
  // The chart finder keys: 'binance' = the single-exchange chart (liqMap), 'exchange' = the aggregate chart.
  const states = { binance: { kind: 'binance', books: [], generation: 0 }, exchange: { kind: 'exchange', books: [], generation: 0 } }
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== source || event.data.type !== 'request') return
    const request = parseRequest(event.data.url)
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
      if (!state.books.length) state.notice = `${request.kind === 'single' ? request.venue : '各交易所'}无 ${request.coin} 的 USDT 永续订单簿`
      await draw(state, generation)
    } catch (error) {
      if (generation === state.generation) console.warn('impact-cost: orderbooks unavailable', error)
    }
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
  script.onload = () => script.remove()
  ;(document.head || document.documentElement).appendChild(script)
}
export default { name, matches, init }
