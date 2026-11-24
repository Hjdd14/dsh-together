/**
 * Headless smoke harness for the mini-game catalog.
 *
 * Every game module is a plain script that calls `defineGame({ id, create })`.
 * This test loads each file the same way the browser bundle does, then drives it
 * for 600 frames with deterministic randomness, random keyboard/pointer input and
 * a stub 2D context. It also enforces the authoring rules in games/API.md.
 *
 * Run one pack only:  TG_PACK=arcade node --test test/games.smoke.test.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { GAMES, PACK_BY_ID, GOAL_TYPES, HOW_TO } from '../shared/catalog.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GAMES_DIR = join(ROOT, 'client-src', 'games')
const PACK_FILTER = process.env.TG_PACK?.trim() || ''
const FRAMES = 600

const FORBIDDEN = [
  [/\bimport\s+[^\n]*\bfrom\b/, 'ES 模块 import'],
  [/\bexport\s+(default|const|function|class)\b/, 'ES 模块 export'],
  [/\brequire\s*\(/, 'CJS require'],
  [/\bmodule\.exports\b/, 'CJS module.exports'],
  [/\bsetTimeout\s*\(/, 'setTimeout'],
  [/\bsetInterval\s*\(/, 'setInterval'],
  [/\brequestAnimationFrame\s*\(/, 'requestAnimationFrame'],
  [/\bfetch\s*\(/, 'fetch'],
  [/\bMath\.random\s*\(/, 'Math.random（请用 api.rng()）'],
  [/\blocalStorage\b/, 'localStorage'],
  [/\bdocument\./, 'document'],
  [/\bwindow\./, 'window'],
]

/** Deterministic PRNG so a failure reproduces exactly. */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COLORS = {
  bg: '#101418', panel: '#182028', fg: '#e8eef6', dim: '#8fa0b4',
  accent: '#6aa9ff', accent2: '#ffcf5c', warn: '#ff7a7a', good: '#8bdc7a',
}

/** A 2D context stand-in: unknown member reads return a no-op function. */
function createStubContext() {
  const store = { canvas: { width: 480, height: 360 }, globalAlpha: 1 }
  const gradient = { addColorStop() {} }
  const special = {
    measureText: (text) => ({ width: String(text ?? '').length * 6.2 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => ({}),
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: () => {},
    getLineDash: () => [],
    setLineDash: () => {},
    isPointInPath: () => false,
  }
  return new Proxy(store, {
    get(target, prop) {
      if (prop in special) return special[prop]
      if (prop in target) return target[prop]
      if (typeof prop === 'symbol') return undefined
      // Any drawing call the game makes: record it and do nothing.
      return () => {}
    },
    set(target, prop, value) {
      target[prop] = value
      return true
    },
  })
}

const KNOWN_API = new Set([
  'w', 'h', 'g', 'gl', 'gl3d', 'depth', 'mode', 'attemptSeconds', 'rng', 'rnd', 'irnd', 'pick', 'now', 'dt',
  'colors', 'score', 'progress', 'setStatus', 'win', 'lose', 'onKey', 'onPointer',
  'down', 'storage', 'clear', 'rect', 'circle', 'text',
])

const KEYS = ['left', 'right', 'up', 'down', 'space', 'enter', 'a', 'd', 'w', 's', '1', '2', 'escape', 'shift']

/** A WebGL stand-in: every call is a no-op, shader/link checks report success. */
function createStubWebGL() {
  const gradient = {}
  const special = {
    createShader: () => ({}),
    createProgram: () => ({}),
    createBuffer: () => ({}),
    createTexture: () => ({}),
    createFramebuffer: () => ({}),
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getShaderInfoLog: () => '',
    getProgramInfoLog: () => '',
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    drawingBufferWidth: 480,
    drawingBufferHeight: 360,
    canvas: { width: 480, height: 360 },
  }
  // Numeric enums used by the drawing calls.
  const enums = {
    VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, ARRAY_BUFFER: 34962, ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044, FLOAT: 5126, TRIANGLES: 4, UNSIGNED_SHORT: 5123,
    COLOR_BUFFER_BIT: 16384, DEPTH_BUFFER_BIT: 256, DEPTH_TEST: 2929, LEQUAL: 515,
  }
  return new Proxy(Object.assign({}, enums, special), {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (typeof prop === 'symbol') return undefined
      return () => {}
    },
    set(target, prop, value) {
      target[prop] = value
      return true
    },
  })
}

/** The 3D helper surface the engine provides, with parameter checks. */
function createStubGl3d(onNonFinite) {
  const assertFinite = (value, where) => {
    const queue = [value]
    while (queue.length > 0) {
      const item = queue.pop()
      if (typeof item === 'number') {
        if (!Number.isFinite(item)) onNonFinite(where)
      } else if (item && typeof item === 'object') {
        for (const key of Object.keys(item)) queue.push(item[key])
      }
    }
  }
  const mesh = (kind, size = 12) => ({ kind, size, count: 36 })
  return {
    camera: (options) => assertFinite(options ?? {}, 'camera'),
    light: (direction) => assertFinite(direction, 'light'),
    mesh,
    draw: (target, transform, color) => {
      assertFinite(transform ?? {}, 'draw')
      if (typeof color !== 'string') onNonFinite('draw.color')
    },
    clear: () => {},
    context: createStubWebGL(),
  }
}

/** Build the runtime `api` the browser framework would provide. */
function createApi({ seed, attemptSeconds, mode3d = false }) {
  const rng = mulberry32(seed)
  const ctx = createStubContext()
  const startedAt = 0
  const keySubs = new Set()
  const pointerSubs = new Set()
  const heldKeys = new Set()
  const storage = new Map()
  const state = {
    score: 0, progress: 0, status: '', won: false, lost: false, reason: '',
    frames: 0, keyEvents: 0, pointerEvents: 0, drawCalls: 0, twoDCalls: 0, nonFinite: [],
  }
  const gl = mode3d ? createStubWebGL() : null
  const gl3d = mode3d ? createStubGl3d((where) => state.nonFinite.push(where)) : null
  let now = startedAt
  let dt = 0
  const api = {
    w: 480,
    h: 360,
    g: mode3d ? null : ctx,
    gl,
    gl3d,
    depth: {
      horizon: 150,
      project: (x, y, z) => ({ x: 240 + x, y: 150 + y, scale: 1 / (1 + Math.max(0.05, z)) }),
      scaleAt: (z) => 1 / (1 + Math.max(0.05, z)),
    },
    mode: mode3d ? '3d' : '2d',
    attemptSeconds,
    dt: 0,
    colors: COLORS,
    rng: () => rng(),
    rnd: (min = 0, max = 1) => min + rng() * (max - min),
    irnd: (min, max) => min + Math.floor(rng() * (Math.floor(max) - Math.ceil(min) + 1)),
    pick: (arr) => arr[Math.floor(rng() * arr.length)],
    now: () => now,
    score: (n) => { state.score += Math.max(0, Number(n) || 0) },
    progress: (n = 1) => { state.progress += Math.max(0, Number(n) || 0) },
    setStatus: (text) => { state.status = String(text ?? '') },
    win: () => { state.won = true },
    lose: (reason) => { if (!state.lost) { state.lost = true; state.reason = String(reason ?? '') } },
    onKey: (fn) => { keySubs.add(fn); return () => keySubs.delete(fn) },
    onPointer: (fn) => { pointerSubs.add(fn); return () => pointerSubs.delete(fn) },
    down: (key) => heldKeys.has(key),
    storage: {
      get: (key, fallback) => (storage.has(key) ? storage.get(key) : fallback),
      set: (key, value) => { storage.set(key, value) },
    },
    clear: (color) => {
      state.drawCalls++
      if (mode3d) { state.twoDCalls++; return }
      ctx.fillStyle = color ?? COLORS.bg
      ctx.fillRect(0, 0, 480, 360)
    },
    rect: () => { state.drawCalls++; if (mode3d) state.twoDCalls++ },
    circle: () => { state.drawCalls++; if (mode3d) state.twoDCalls++ },
    text: () => { state.drawCalls++; if (mode3d) state.twoDCalls++ },
  }
  const guarded = new Proxy(api, {
    get(target, prop) {
      if (typeof prop === 'symbol') return undefined
      if (!KNOWN_API.has(prop)) throw new Error(`读取了 api 中不存在的成员: api.${String(prop)}`)
      const value = target[prop]
      if (prop === 'dt') return dt
      return value
    },
  })
  return {
    api: guarded,
    state,
    keySubs,
    pointerSubs,
    storage,
    setNow: (ms) => { now = ms },
    emitKey(key, isDown) {
      if (isDown) heldKeys.add(key); else heldKeys.delete(key)
      for (const fn of keySubs) fn(key, isDown, { key, repeat: false })
      state.keyEvents++
    },
    emitPointer(x, y, type, dragging) {
      for (const fn of pointerSubs) fn({ x, y, type, dragging })
      state.pointerEvents++
    },
    tick(ms, frameDt) { now += ms; dt = frameDt },
  }
}

function collectGames() {
  const found = []
  for (const pack of readdirSync(GAMES_DIR, { withFileTypes: true })) {
    if (!pack.isDirectory()) continue
    const dir = join(GAMES_DIR, pack.name)
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith('.js')) continue
      const file = join(dir, entry)
      const source = readFileSync(file, 'utf8')
      found.push({ pack: pack.name, file, id: entry.slice(0, -3), source })
    }
  }
  return found
}

const expected = GAMES.filter((game) => !PACK_FILTER || game.pack === PACK_FILTER)
const collected = collectGames().filter((row) => !PACK_FILTER || row.pack === PACK_FILTER)

test('每个 catalog 游戏都有一个同 id 的游戏文件', () => {
  const files = new Set(collected.map((row) => `${row.pack}/${row.id}`))
  const missing = expected.filter((game) => !files.has(`${game.pack}/${game.id}`)).map((game) => `${game.pack}/${game.id}`)
  assert.deepEqual(missing, [], `缺少游戏文件: ${missing.join(', ')}`)
})

test('没有 catalog 之外的游戏文件', () => {
  const catalogue = new Set(expected.map((game) => `${game.pack}/${game.id}`))
  const extra = collected.filter((row) => !catalogue.has(`${row.pack}/${row.id}`)).map((row) => `${row.pack}/${row.id}.js`)
  assert.deepEqual(extra, [], `文件不在 shared/catalog.js 里: ${extra.join(', ')}`)
})

test('catalog 自身合法', () => {
  const ids = new Set()
  for (const game of GAMES) {
    assert.match(game.id, /^[a-z0-9]+$/, `id 非法: ${game.id}`)
    assert.ok(!ids.has(game.id), `id 重复: ${game.id}`)
    ids.add(game.id)
    assert.ok(PACK_BY_ID.has(game.pack), `未知 pack: ${game.pack}`)
    const [type, target] = game.goal
    assert.ok(GOAL_TYPES.includes(type), `未知 goal 类型: ${game.id}`)
    // Points-style games legitimately scale into the hundreds; objective counts and
    // seconds must stay small enough to clear in one sitting.
    const upperBound = type === 'score' ? 2000 : 120
    assert.ok(Number.isFinite(target) && target >= 1 && target <= upperBound, `目标越界: ${game.id}=${target}`)
    if (type === 'survive') assert.ok(target <= 60, `survive 目标过长: ${game.id}`)
    for (const key of ['zh', 'en', 'bz', 'be', 'c']) assert.ok(game[key]?.length, `${game.id} 缺字段 ${key}`)
    // Every game explains itself in one short line, in both shipped languages.
    const how = HOW_TO[game.id]
    assert.ok(Array.isArray(how) && how.length === 2, `${game.id} 缺少玩法说明`)
    assert.ok(how[0]?.length >= 8 && how[0].length <= 60, `${game.id} 中文说明长度不合适: ${how[0]?.length}`)
    assert.ok(how[1]?.length >= 12 && how[1].length <= 110, `${game.id} 英文说明长度不合适: ${how[1]?.length}`)
  }
})

test('玩法说明没有多余或缺失的条目', () => {
  const ids = new Set(GAMES.map((game) => game.id))
  const stray = Object.keys(HOW_TO).filter((id) => !ids.has(id))
  assert.deepEqual(stray, [], `HOW_TO 里有 catalog 之外的游戏: ${stray.join(', ')}`)
})

for (const row of collected) {
  test(`game ${row.pack}/${row.id} 符合契约`, () => {
    for (const [pattern, label] of FORBIDDEN) {
      assert.ok(!pattern.test(row.source), `${row.id}.js 使用了禁止项：${label}`)
    }
    const catalogEntry = GAMES.find((game) => game.id === row.id)
    assert.ok(catalogEntry, `${row.id} 不在 catalog 中`)
    assert.equal(catalogEntry.pack, row.pack, `${row.id} 放错了 pack 目录`)

    const definitions = []
    // eslint-disable-next-line no-new-func
    const run = new Function('defineGame', `${row.source}\n`)
    run((definition) => definitions.push(definition))
    assert.equal(definitions.length, 1, `${row.id}.js 必须只调用一次 defineGame`)
    const definition = definitions[0]
    assert.equal(definition.id, row.id, `${row.id}.js 的 id 与文件名不一致`)
    assert.equal(typeof definition.create, 'function', `${row.id}.js 缺少 create(api)`)

    const seed = 0x51ed270 + row.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
    const mode3d = definition.mode === '3d'
    // Only the 3d pack may declare a WebGL game, and every game in it must.
    assert.equal(mode3d, row.pack === '3d', `${row.id}: mode 与 pack 不一致（pack=${row.pack}, mode=${definition.mode ?? '2d'}）`)
    const runtime = createApi({ seed, attemptSeconds: 90, mode3d })
    const instance = definition.create(runtime.api)
    assert.ok(instance && typeof instance.update === 'function', `${row.id} 的 create 必须返回 { update, draw }`)
    assert.equal(typeof instance.draw, 'function', `${row.id} 缺少 draw(g)`)

    const stubG = createStubContext()
    const rng = mulberry32(seed ^ 0x9e3779b9)
    let ended = false
    for (let frame = 0; frame < FRAMES; frame += 1) {
      if (runtime.state.lost || runtime.state.won) { ended = true; break }
      // ~8% of frames inject a key edge, ~4% a pointer event.
      if (rng() < 0.08) {
        const key = KEYS[Math.floor(rng() * KEYS.length)]
        runtime.emitKey(key, true)
        runtime.emitKey(key, false)
      }
      if (rng() < 0.04) {
        runtime.emitPointer(rng() * 480, rng() * 360, rng() < 0.5 ? 'down' : 'up', rng() < 0.3)
      }
      if (frame === 240) runtime.emitKey('space', true)
      if (frame === 241) runtime.emitKey('space', false)
      const stepSeconds = frame % 97 === 0 ? 0.05 : 1 / 60
      runtime.tick(stepSeconds * 1000, stepSeconds)
      try {
        instance.update(stepSeconds)
        instance.draw(mode3d ? runtime.api.gl : stubG)
      } catch (error) {
        assert.fail(`${row.id}.js 第 ${frame} 帧抛错: ${error?.message}\n${error?.stack ?? ''}`)
      }
      runtime.state.frames++
    }
    assert.ok(runtime.state.frames > 0, `${row.id} 一帧都没跑`)
    assert.ok(Number.isFinite(runtime.state.score), `${row.id} score 变成非有限数`)
    assert.ok(Number.isFinite(runtime.state.progress), `${row.id} progress 变成非有限数`)
    assert.deepEqual(runtime.state.nonFinite, [], `${row.id} 给 3D 变换传了非有限数值`)
    if (mode3d) assert.equal(runtime.state.twoDCalls, 0, `${row.id} 是 3D 游戏，不应调用 2D 绘制`)
    if (typeof instance.dispose === 'function') instance.dispose()
    // A game that ends by itself on the first frames is legal (survive games can die),
    // but it must report the end through win/lose rather than throwing.
    if (ended) assert.ok(runtime.state.lost || runtime.state.won, `${row.id} 结束时未标记状态`)
  })
}

test('games 目录里没有遗漏 .md 之外的文件类型', () => {
  const strays = []
  for (const pack of readdirSync(GAMES_DIR, { withFileTypes: true })) {
    if (!pack.isDirectory()) continue
    for (const entry of readdirSync(join(GAMES_DIR, pack.name))) {
      if (!entry.endsWith('.js') && !entry.endsWith('.md')) strays.push(`${pack.name}/${entry}`)
    }
  }
  assert.deepEqual(strays, [])
})

test('冒烟测试的静态资源齐全', () => {
  assert.ok(existsSync(join(ROOT, 'shared', 'catalog.js')))
})
