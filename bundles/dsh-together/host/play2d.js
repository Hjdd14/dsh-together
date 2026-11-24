/**
 * A standalone page for one 2D game, so any game can be looked at without the DSH shell.
 *
 * Same idea as `play3d.js`: the game source and an `api` shim on a blank page. The shell
 * overlay is where the games normally run, but another plugin's modal can cover it, and
 * an author with no browser open cannot inspect a game at all — this route fixes both.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { GAMES } from '../shared/catalog.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

const GAME_FILE = /^[a-z0-9]{2,32}$/

/** Whether the catalog knows this id, and in which pack (3D games live elsewhere). */
export function packOf(gameId) {
  if (typeof gameId !== 'string' || !GAME_FILE.test(gameId)) return undefined
  return GAMES.find((game) => game.id === gameId)?.pack
}

function readGame(gameId) {
  const pack = packOf(gameId)
  if (pack === undefined) return undefined
  try {
    return { pack, source: readFileSync(join(ROOT, 'client-src', 'games', pack, `${gameId}.js`), 'utf8') }
  } catch {
    return undefined
  }
}

const PAGE = (gameId, goal, source) => `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>play · ${gameId}</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#0b1016;color:#e8eef6;font:13px/1.5 ui-sans-serif,system-ui,sans-serif;
    display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px}
  h1{font-size:14px;font-weight:600;margin:0}
  #hud{display:flex;gap:14px;font-size:12px;color:#9aa3ad}
  #hud b{color:#e8eef6;font-weight:600}
  canvas{width:min(92vw,720px);aspect-ratio:4/3;border-radius:12px;border:1px solid rgba(255,255,255,.12);
    background:#0d1015;touch-action:none;display:block}
  #note{font-size:11px;color:#7f8b99;max-width:720px;text-align:center}
  kbd{background:#1a222c;border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:1px 5px;font-size:11px}
</style>
</head>
<body>
<h1>${gameId}</h1>
<div id="hud"><span>目标 <b id="goal">${goal.target}</b></span><span>进度 <b id="value">0</b></span><span>分数 <b id="score">0</b></span><span id="status"></span></div>
<canvas id="stage" width="720" height="540"></canvas>
<div id="note">同一份游戏代码 + 同一份 api 契约，放在空页面里。<kbd>←→↑↓</kbd> / <kbd>Space</kbd> / 鼠标拖动</div>
<script>
const COLORS = { bg: '#0d1015', panel: '#161c24', fg: '#e8eef6', dim: '#8fa0b4',
  accent: '#6aa9ff', accent2: '#ffcf5c', warn: '#ff7a7a', good: '#8bdc7a' }
const canvas = document.getElementById('stage')
const g = canvas.getContext('2d')
let definition = null
let instance = null
let score = 0
let progress = 0
let clock = 0
const keySubs = new Set()
const pointerSubs = new Set()
const held = new Map()
const store = new Map()

function defineGame(value) { definition = value }

const api = {
  w: 720, h: 540, g, gl: null, gl3d: null, mode: '2d',
  attemptSeconds: 90,
  colors: COLORS,
  rng: () => Math.random(),
  rnd: (min, max) => min + Math.random() * (max - min),
  irnd: (min, max) => Math.floor(min + Math.random() * (max - min + 1)),
  pick: (list) => list[Math.floor(Math.random() * list.length)],
  now: () => clock * 1000,
  score(points) {
    score += points
    document.getElementById('score').textContent = score
  },
  progress(step) {
    progress += step
    document.getElementById('value').textContent = progress
  },
  setStatus(text) { document.getElementById('status').textContent = String(text) },
  win() { document.getElementById('status').textContent = 'PASS' },
  lose() { document.getElementById('status').textContent = 'FAIL' },
  onKey(callback) { keySubs.add(callback); return () => keySubs.delete(callback) },
  onPointer(callback) { pointerSubs.add(callback); return () => pointerSubs.delete(callback) },
  get down() { return (key) => Boolean(held.get(key)) },
  storage: {
    get: (key, fallback) => (store.has(key) ? store.get(key) : fallback),
    set: (key, value) => { store.set(key, value) },
  },
  clear(color) {
    g.fillStyle = color ?? COLORS.bg
    g.fillRect(0, 0, 720, 540)
  },
  rect(x, y, w, h, color) {
    g.fillStyle = color ?? COLORS.fg
    g.fillRect(x, y, w, h)
  },
  circle(x, y, r, color) {
    g.fillStyle = color ?? COLORS.fg
    g.beginPath()
    g.arc(x, y, Math.max(0, r), 0, Math.PI * 2)
    g.fill()
  },
  text(text, x, y, options = {}) {
    g.fillStyle = options.color ?? COLORS.fg
    g.font = (options.weight ?? 'normal') + ' ' + (options.size ?? 16) + 'px ui-sans-serif, system-ui, sans-serif'
    g.textAlign = options.align ?? 'left'
    g.textBaseline = options.baseline ?? 'middle'
    g.fillText(String(text), x, y)
  },
}

${source}

const NAMES = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  ' ': 'space', Enter: 'enter', Escape: 'escape', Shift: 'shift' }
function normalise(event) {
  const named = NAMES[event.key]
  if (named !== undefined) return named
  return event.key.length === 1 ? event.key.toLowerCase() : String(event.key).toLowerCase()
}
window.addEventListener('keydown', (event) => {
  const name = normalise(event)
  const repeat = event.repeat === true || held.get(name) === true
  held.set(name, true)
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault()
  for (const sub of keySubs) sub(name, true, { name, repeat, key: event.key })
})
window.addEventListener('keyup', (event) => {
  const name = normalise(event)
  held.set(name, false)
  for (const sub of keySubs) sub(name, false, { name, repeat: false, key: event.key })
})
function pointer(type) {
  return (event) => {
    const box = canvas.getBoundingClientRect()
    const x = ((event.clientX - box.left) / box.width) * 720
    const y = ((event.clientY - box.top) / box.height) * 540
    for (const sub of pointerSubs) sub({ type, x, y })
  }
}
canvas.addEventListener('pointerdown', pointer('down'))
canvas.addEventListener('pointermove', pointer('move'))
window.addEventListener('pointerup', pointer('up'))
canvas.addEventListener('mousedown', pointer('down'))
canvas.addEventListener('mousemove', pointer('move'))
window.addEventListener('mouseup', pointer('up'))
canvas.addEventListener('contextmenu', (event) => event.preventDefault())

if (definition === null) {
  document.getElementById('status').textContent = 'game source did not define a game'
} else {
  instance = definition.create(api)
  let last = performance.now()
  let frames = 0
  const frame = (now) => {
    const step = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
    last = now
    clock += step
    frames += 1
    try {
      instance.update(step)
      g.save()
      instance.draw(g)
      g.restore()
    } catch (error) {
      document.getElementById('status').textContent = 'crash: ' + error.message
      return
    }
    if (frames % 20 === 0) document.getElementById('value').textContent = String(progress)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
</script>
</body>
</html>`

/** Build the standalone page for any 2D game; undefined for unknown ids or 3D games. */
export function renderPlay(gameId) {
  const game = readGame(gameId)
  if (game === undefined || game.pack === '3d') return undefined
  const goal = GAMES.find((entry) => entry.id === gameId).goal
  return PAGE(gameId, { type: goal[0], target: goal[1] }, game.source)
}
