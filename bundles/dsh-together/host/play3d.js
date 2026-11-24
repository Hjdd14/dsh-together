/**
 * A standalone page that plays one 3D game with nothing else on screen.
 *
 * The overlay lives inside the DSH shell, where another plugin's modal dialog can sit on
 * top of it. This route serves the same game in a bare page (same 3D layer, same game
 * source, same api contract), which is how the 3D games can be inspected without any
 * shell chrome in the way.
 */
import { readFileSync } from 'node:fs'

import { GAMES } from '../shared/catalog.js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

const GAME_FILE = /^[a-z0-9]{2,32}$/

function readGame(gameId) {
  if (!GAME_FILE.test(gameId)) return undefined
  try {
    return readFileSync(join(ROOT, 'client-src', 'games', '3d', `${gameId}.js`), 'utf8')
  } catch {
    return undefined
  }
}

function readGl3d() {
  return readFileSync(join(ROOT, 'shared', 'gl3d.js'), 'utf8').replace(/^export\s+/gm, '')
}

const PAGE = (gameId, gameSource, gl3dSource, goalIn) => `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>3D · ${gameId}</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#0b1016;color:#e8eef6;font:13px/1.5 ui-sans-serif,system-ui,sans-serif;
    display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px}
  h1{font-size:14px;font-weight:600;margin:0;letter-spacing:.02em}
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
<div id="hud"><span>目标 <b id="goal">${goalIn[1]}</b></span><span>进度 <b id="value">0</b></span><span id="status"></span></div>
<canvas id="stage"></canvas>
<div id="note">同一份游戏代码 + 同一个 WebGL 层，只是放在空页面里。<kbd>←→↑↓</kbd> / <kbd>Space</kbd> / 鼠标操作</div>
<script>
const GL3D = (function () { ${gl3dSource}; return { tgCreateGl3d, tgDepth } })()
const COLORS = { bg: '#0d1015', panel: '#161c24', fg: '#e8eef6', dim: '#8fa0b4',
  accent: '#6aa9ff', accent2: '#ffcf5c', warn: '#ff7a7a', good: '#8bdc7a' }
const canvas = document.getElementById('stage')
const gl = canvas.getContext('webgl', { alpha: false, antialias: true })
const gl3d = GL3D.tgCreateGl3d(gl)
const keySubs = new Set()
const pointerSubs = new Set()
const held = new Map()
let definition = null
let instance = null
let score = 0
let progress = 0
let statusText = ''
let dt = 0
let clock = 0

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(720 * dpr)
  canvas.height = Math.round(540 * dpr)
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.enable(gl.DEPTH_TEST)
  gl.depthFunc(gl.LEQUAL)
}
resize()

const api = {
  w: 720, h: 540, g: null, gl, gl3d,
  depth: GL3D.tgDepth(720, 540),
  mode: '3d',
  attemptSeconds: 90,
  colors: COLORS,
  rng: () => Math.random(),
  rnd: (min, max) => min + Math.random() * (max - min),
  irnd: (min, max) => Math.floor(min + Math.random() * (max - min + 1)),
  pick: (list) => list[Math.floor(Math.random() * list.length)],
  now: () => clock * 1000,
  score(points) { score += points },
  progress(step) { progress += step; document.getElementById('value').textContent = progress },
  setStatus(text) { statusText = String(text); document.getElementById('status').textContent = statusText },
  win() { statusText = 'PASS'; document.getElementById('status').textContent = statusText },
  lose(reason) { statusText = 'FAIL: ' + (reason ?? ''); document.getElementById('status').textContent = statusText },
  onKey(callback) { keySubs.add(callback); return () => keySubs.delete(callback) },
  onPointer(callback) { pointerSubs.add(callback); return () => pointerSubs.delete(callback) },
  get down() { return (key) => Boolean(held.get(key)) },
  storage: { get: (key, fallback) => (key === undefined ? fallback : fallback), set: () => {} },
  clear(color) { gl3d.clear(color ?? '#0b1016') },
  rect() {}, circle() {}, text() {},
}

function defineGame(definitionValue) { definition = definitionValue }

${gameSource}

const NAMES = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  ' ': 'space', Enter: 'enter', Escape: 'escape', Shift: 'shift',
}
function normalise(event) {
  const named = NAMES[event.key]
  if (named !== undefined) return named
  const key = event.key
  return key.length === 1 ? key.toLowerCase() : String(key).toLowerCase()
}
window.addEventListener('keydown', (event) => {
  const name = normalise(event)
  event.preventDefault()
  held.set(name, true)
  for (const sub of keySubs) sub(name, true, { name, repeat: false, key: event.key })
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
    dt = step
    clock += step
    frames += 1
    try {
      instance.update(step)
      gl.viewport(0, 0, canvas.width, canvas.height)
      instance.draw(gl)
    } catch (error) {
      document.getElementById('status').textContent = 'crash: ' + error.message
      return
    }
    if (frames % 15 === 0) document.getElementById('value').textContent = String(progress)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
</script>
</body>
</html>`

/** Build the standalone page for one 3D game; undefined when the id is not a 3D game. */
export function renderPlay3d(gameId) {
  const source = readGame(gameId)
  if (source === undefined) return undefined
  const goal = GAMES.find((entry) => entry.id === gameId)?.goal ?? ['count', 8]
  return PAGE(gameId, source, readGl3d(), goal)
}
