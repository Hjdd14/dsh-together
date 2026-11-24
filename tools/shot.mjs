#!/usr/bin/env node
/**
 * Record one frame of a game as a draw-op list, so it can be rasterised to a PNG.
 *
 * The README needs screenshots, and this machine's browser cannot reach the Host — so
 * instead of photographing the overlay we replay the game's own draw calls through a
 * tiny canvas recorder and render that. The result is the real frame the game draws,
 * not a mock-up.
 *
 * Usage: node tools/shot.mjs <gameId> <policy> <frames> <out.json>
 */
import { readFileSync } from 'node:fs'
import { GAMES } from '../bundles/dsh-together/shared/catalog.js'

const [gameId, policy = 'random', framesArg = '180', outPath = 'shot.json'] = process.argv.slice(2)
const game = GAMES.find((entry) => entry.id === gameId)
if (game === undefined) {
  console.error(`shot: unknown game ${gameId}`)
  process.exit(1)
}

const W = 480
const H = 360

/* ── colour parsing ───────────────────────────────────────────────────────── */
function parseColor(value, fallback = [255, 255, 255, 1]) {
  if (typeof value !== 'string') return fallback
  const text = value.trim()
  if (text.startsWith('#')) {
    let hex = text.slice(1)
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
    const r = Number.parseInt(hex.slice(0, 2), 16)
    const g = Number.parseInt(hex.slice(2, 4), 16)
    const b = Number.parseInt(hex.slice(4, 6), 16)
    const a = hex.length >= 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1
    if ([r, g, b].some((v) => Number.isNaN(v))) return fallback
    return [r, g, b, a]
  }
  const numbers = text.match(/[\d.]+/g)?.map(Number) ?? []
  if (numbers.length >= 3) {
    const alpha = numbers.length >= 4 ? numbers[3] : 1
    return [numbers[0], numbers[1], numbers[2], alpha]
  }
  return fallback
}

/* ── a tiny 2D canvas that records instead of painting ────────────────────── */
function createRecorder() {
  const ops = []
  const stack = [{ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }]
  const style = {
    fill: '#ffffff', stroke: null, lw: 1, alpha: 1,
    font: 16, align: 'left', baseline: 'middle', dash: false,
  }
  let path = []
  let current = null
  const scale2 = 2

  const apply = (x, y) => {
    const m = stack[stack.length - 1]
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]
  }
  const round = (value) => Math.round(value * 10) / 10

  const push = (op) => {
    if (ops.length < 40000) ops.push(op)
  }

  const paint = (kind) => {
    if (kind === 'fill') {
      const [r, g, b, a] = parseColor(style.fill)
      return { fill: [r, g, b, a * style.alpha] }
    }
    if (style.stroke === null) return {}
    const [r, g, b, a] = parseColor(style.stroke)
    return { stroke: [r, g, b, a * style.alpha], lw: style.lw }
  }

  const emitPath = (mode) => {
    if (path.length === 0) return
    const points = path.map((point) => (point.arc
      ? { arc: true, cx: point.cx, cy: point.cy, r: point.r, a0: point.a0, a1: point.a1, color: point.color }
      : point))
    // Walk the path, splitting it into straight runs and arcs.
    let run = []
    const flush = () => {
      if (run.length >= 2) {
        const flat = run.flatMap((point) => (point.arc ? [] : [round(point.x), round(point.y)]))
        if (flat.length >= 4) push({ k: 'poly', closed: mode === 'fill', pts: flat, ...paint(mode) })
      }
      run = []
    }
    for (const point of points) {
      if (point.arc) {
        flush()
        const [r, g, b, a] = parseColor(point.color ?? style.fill)
        push({ k: 'arc', cx: point.cx, cy: point.cy, r: point.r, a0: point.a0, a1: point.a1, fill: [r, g, b, a * style.alpha], ...paint('stroke') })
      } else {
        run.push(point)
      }
    }
    flush()
    path = []
    current = null
    void scale2
  }

  const ctx = {
    canvas: { width: W, height: H },
    save() { stack.push({ ...stack[stack.length - 1] }) },
    restore() { if (stack.length > 1) stack.pop() },
    translate(x, y) {
      const m = stack[stack.length - 1]
      m.e += m.a * x + m.c * y
      m.f += m.b * x + m.d * y
    },
    rotate(angle) {
      const m = stack[stack.length - 1]
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const { a, b, c, d } = m
      m.a = a * cos + c * sin
      m.b = b * cos + d * sin
      m.c = -a * sin + c * cos
      m.d = -b * sin + d * cos
    },
    scale(x, y) {
      const m = stack[stack.length - 1]
      m.a *= x
      m.b *= x
      m.c *= y
      m.d *= y
    },
    setTransform(a, b, c, d, e, f) {
      stack[stack.length - 1] = { a, b, c, d, e, f }
    },
    set fillStyle(value) { style.fill = value },
    get fillStyle() { return style.fill },
    set strokeStyle(value) { style.stroke = value },
    get strokeStyle() { return style.stroke },
    set lineWidth(value) { style.lw = value },
    get lineWidth() { return style.lw },
    set globalAlpha(value) { style.alpha = value },
    get globalAlpha() { return style.alpha },
    set font(value) {
      const size = Number.parseFloat(String(value).match(/(\d+(?:\.\d+)?)px/)?.[1] ?? '16')
      style.font = size
    },
    get font() { return `${style.font}px sans-serif` },
    set textAlign(value) { style.align = value },
    set textBaseline(value) { style.baseline = value },
    set lineCap(value) { void value },
    set lineJoin(value) { void value },
    set shadowBlur(value) { void value },
    set shadowColor(value) { void value },
    setLineDash(dash) { style.dash = Array.isArray(dash) && dash.length > 0 },
    measureText(text) { return { width: String(text).length * style.font * 0.55 } },
    beginPath() { path = [] },
    closePath() { void 0 },
    moveTo(x, y) { const [px, py] = apply(x, y); current = { x: px, y: py }; path.push(current) },
    lineTo(x, y) { const [px, py] = apply(x, y); current = { x: px, y: py }; path.push(current) },
    arc(cx, cy, r, a0, a1, ccw) {
      const [px, py] = apply(cx, cy)
      const scale = Math.abs(stack[stack.length - 1].a)
      path.push({ arc: true, cx: px, cy: py, r: r * scale, a0, a1: ccw === true && a1 < a0 ? a1 + Math.PI * 2 : a1, color: style.fill })
    },
    ellipse(cx, cy, rx, ry) {
      const [px, py] = apply(cx, cy)
      path.push({ arc: true, cx: px, cy: py, r: (rx + ry) / 2, a0: 0, a1: Math.PI * 2, color: style.fill })
    },
    fill() { emitPath('fill') },
    stroke() { emitPath('stroke') },
    fillRect(x, y, w, h) {
      const [px, py] = apply(x, y)
      const sx = Math.abs(stack[stack.length - 1].a)
      const sy = Math.abs(stack[stack.length - 1].d)
      push({ k: 'rect', x: px, y: py, w: w * sx, h: h * sy, ...paint('fill'), radius: 0 })
    },
    strokeRect(x, y, w, h) {
      const [px, py] = apply(x, y)
      push({ k: 'rect', x: px, y: py, w, h, ...paint('stroke') })
    },
    clearRect() { void 0 },
    fillText(text, x, y) {
      const [px, py] = apply(x, y)
      push({
        k: 'text', s: String(text), x: px, y: py, size: style.font * Math.abs(stack[stack.length - 1].a),
        ...paint('fill'), align: style.align, baseline: style.baseline, bold: false,
      })
    },
    strokeText() { void 0 },
    drawImage() { void 0 },
    createLinearGradient() {
      const stops = []
      return { __gradient: stops, addColorStop: (offset, color) => stops.push({ offset, color }) }
    },
    createRadialGradient() {
      const stops = []
      return { __gradient: stops, addColorStop: (offset, color) => stops.push({ offset, color }) }
    },
    createPattern() { return null },
    clip() { void 0 },
    rect(x, y, w, h) {
      const [px, py] = apply(x, y)
      path.push({ x: px, y: py })
      path.push({ x: px + w, y: py })
      path.push({ x: px + w, y: py + h })
      path.push({ x: px, y: py + h })
      path.push({ x: px, y: py })
    },
  }
  return { ctx, ops }
}

/* ── game runtime ─────────────────────────────────────────────────────────── */
function mulberry32(seed) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const { ctx, ops } = createRecorder()
const rng = mulberry32(0x51ed270)
const keySubs = new Set()
const pointerSubs = new Set()
const held = new Map()
const store = new Map()
let clock = 0
let progress = 0
let score = 0
let dead = false

const COLORS = {
  bg: '#0d1015', panel: '#161c24', fg: '#e8eef6', dim: '#8fa0b4',
  accent: '#6aa9ff', accent2: '#ffcf5c', warn: '#ff7a7a', good: '#8bdc7a',
}
const api = {
  w: W, h: H, g: ctx, gl: null, gl3d: null, mode: '2d',
  attemptSeconds: 90,
  colors: COLORS,
  rng,
  rnd: (min, max) => min + rng() * (max - min),
  irnd: (min, max) => Math.floor(min + rng() * (max - min + 1)),
  pick: (list) => list[Math.floor(rng() * list.length)],
  now: () => clock * 1000,
  score: (points) => { score += points },
  progress: (step) => { progress += step },
  setStatus: () => {},
  win: () => {},
  lose: () => { dead = true },
  onKey: (callback) => { keySubs.add(callback); return () => keySubs.delete(callback) },
  onPointer: (callback) => { pointerSubs.add(callback); return () => pointerSubs.delete(callback) },
  get down() { return (key) => Boolean(held.get(key)) },
  storage: { get: (key, fallback) => (store.has(key) ? store.get(key) : fallback), set: (key, value) => store.set(key, value) },
  clear: (color) => {
    const [r, g, b] = parseColor(color ?? COLORS.bg)
    ops.length = 0
    ops.push({ k: 'bg', fill: [r, g, b, 1] })
  },
  rect: (x, y, w, h, color) => {
    const [r, g, b, a] = parseColor(color ?? COLORS.fg)
    ops.push({ k: 'rect', x, y, w, h, fill: [r, g, b, a], radius: 0 })
  },
  circle: (x, y, radius, color) => {
    const [r, g, b, a] = parseColor(color ?? COLORS.fg)
    ops.push({ k: 'arc', cx: x, cy: y, r: Math.max(0, radius), a0: 0, a1: Math.PI * 2, fill: [r, g, b, a] })
  },
  text: (text, x, y, options = {}) => {
    const [r, g, b, a] = parseColor(options.color ?? COLORS.fg)
    ops.push({
      k: 'text', s: String(text), x, y, size: options.size ?? 16,
      fill: [r, g, b, a], align: options.align ?? 'left', baseline: options.baseline ?? 'middle',
      bold: options.weight === 'bold',
    })
  },
}

const source = readFileSync(new URL(`../bundles/dsh-together/client-src/games/${game.pack}/${gameId}.js`, import.meta.url), 'utf8')
let definition = null
new Function('defineGame', source)((value) => { definition = value })
const instance = definition.create(api)

const KEYS = ['left', 'right', 'up', 'down', 'space']
const press = (name) => {
  held.set(name, true)
  for (const callback of keySubs) callback(name, true, { name, repeat: false, key: name })
  held.set(name, false)
  for (const callback of keySubs) callback(name, false, { name, repeat: false, key: name })
}
let pointerX = W / 2
let pointerY = H / 2
const point = (type, x, y) => {
  for (const callback of pointerSubs) callback({ type, x, y })
}

const frames = Number.parseInt(framesArg, 10) || 180
// Keep the busiest frame the game drew while it was still alive: a death screen makes a
// poor screenshot, and a quiet first frame makes a boring one.
let best = { ops: null, index: 0, progress: 0, score: 0 }
for (let index = 0; index < frames; index += 1) {
  clock += 1 / 60
  if (policy === 'random' && index % 9 === 0) press(KEYS[Math.floor(rng() * KEYS.length)])
  if (policy === 'tap' && index % 7 === 0) {
    const x = 40 + rng() * (W - 80)
    const y = 40 + rng() * (H - 80)
    point('down', x, y)
    point('up', x, y)
  }
  if (policy === 'drag') {
    pointerX = W / 2 + Math.sin(index / 9) * (W * 0.35)
    pointerY = H * 0.6 + Math.cos(index / 7) * (H * 0.25)
    if (index % 3 === 0) point('down', pointerX, pointerY)
    if (index % 3 === 1) point('move', pointerX, pointerY)
    if (index % 3 === 2) point('up', pointerX, pointerY)
  }
  if (policy === 'space' && index % 26 === 0) held.set('space', true)
  if (policy === 'space' && index % 26 === 1) { held.set('space', false); press('space') }
  instance.update(1 / 60)
  ctx.save()
  ops.length = 0
  instance.draw(ctx)
  ctx.restore()
  if (!dead && (best.ops === null || ops.length >= best.ops.length)) {
    best = { ops: ops.slice(), index, progress, score }
  }
  if (dead && index > 24) break
}
if (best.ops !== null) {
  ops.length = 0
  ops.push(...best.ops)
  progress = best.progress
  score = best.score
}

const payload = { id: gameId, w: W, h: H, progress, score, frames, ops: ops.slice(0, 40000) }
const { writeFileSync } = await import('node:fs')
writeFileSync(outPath, JSON.stringify(payload))
console.log(`shot: ${gameId} → ${outPath} (${payload.ops.length} ops, progress ${progress}, score ${score})`)
