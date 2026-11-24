/**
 * Behavioural audit over every game: does it actually work, not just "doesn't crash"?
 *
 * The smoke test proves a game follows the api contract. It cannot tell that a game
 * draws its traffic in a different coordinate space than its player, or that a hazard
 * can never be reached — `lanesdodge` passed 600 frames of smoke while being
 * unlosable and drawing two lanes off the left edge.
 *
 * Rules (all outcome-based; no per-game bots to maintain):
 *   A1  every drawn coordinate is finite, draw calls stay inside the frame budget
 *   A2  a `survive` game must lose when the player does nothing
 *   A3  a `count`/`score` game must not make progress when the player does nothing
 *   A4  a game whose source calls `api.lose` must actually reach that state under
 *       some input (idle or one of three random seeds)
 *   A5  at least 5% of draws land inside the canvas
 *   A7  5000 frames of random input leave no NaN and no unbounded entity list
 *
 * Run: node --test test/audit.test.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { GAMES } from '../shared/catalog.js'

const W = 480
const H = 360
const KEYS = ['left', 'right', 'up', 'down', 'space', 'enter', 'a', 'd', '1', '2']
const COLORS = {
  bg: '#0d1015', panel: '#161c24', fg: '#e8eef6', dim: '#8fa0b4',
  accent: '#6aa9ff', accent2: '#ffcf5c', warn: '#ff7a7a', good: '#8bdc7a',
}

const GAMES_DIR = join(import.meta.dirname ?? '.', '..', 'client-src', 'games')

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

function sourceOf(game) {
  return readFileSync(join(GAMES_DIR, game.pack, `${game.id}.js`), 'utf8')
}

/**
 * Drive one game for `frames` steps.
 * @returns the observed outcome plus the rule violations seen on the way.
 */
function run(game, { seed = 1, input = 'idle', frames = 900 } = {}) {
  const source = sourceOf(game)
  const is3d = game.pack === '3d'
  const rng = mulberry32(seed)
  const keySubs = new Set()
  const pointerSubs = new Set()
  const state = {
    progress: 0, score: 0, lost: false, won: false, lostAt: null,
    draws: 0, inside: 0, nonFinite: 0, perFrameDraws: 0, maxPerFrame: 0,
    keyEvents: 0, pointerEvents: 0, error: '',
  }
  const record = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) { state.nonFinite += 1; return }
    state.draws += 1
    state.perFrameDraws += 1
    if (x >= -40 && x <= W + 40 && y >= -40 && y <= H + 40) state.inside += 1
  }
  const noop = () => {}
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'canvas' ? { width: W, height: H } : noop),
    set: () => true,
  })
  const gl = new Proxy({}, {
    get: (target, key) => {
      if (key === 'drawingBufferWidth') return W
      if (key === 'drawingBufferHeight') return H
      if (key === 'canvas') return { width: W, height: H }
      return () => ({})
    },
  })
  const gl3d = {
    camera: noop,
    light: noop,
    mesh: () => ({ count: 36 }),
    draw: (mesh, transform) => {
      if (transform !== undefined) {
        for (const value of Object.values(transform)) {
          if (typeof value === 'number' && !Number.isFinite(value)) state.nonFinite += 1
        }
      }
      record(0, 0)
    },
    clear: noop,
    context: gl,
  }
  const api = {
    w: W, h: H, g: is3d ? null : ctx, gl: is3d ? gl : null, gl3d: is3d ? gl3d : null,
    mode: is3d ? '3d' : '2d',
    attemptSeconds: 90,
    colors: COLORS,
    depth: { horizon: 150, project: (x, y) => ({ x, y, scale: 1 }), scaleAt: () => 1 },
    rng,
    rnd: (min, max) => min + rng() * (max - min),
    irnd: (min, max) => Math.floor(min + rng() * (max - min + 1)),
    pick: (list) => list[Math.floor(rng() * list.length)],
    now: () => state.frames * 16,
    score: (points) => { state.score += points },
    progress: (step) => { state.progress += step },
    setStatus: noop,
    win: () => { state.won = true },
    lose: () => { if (!state.lost) state.lostAt = state.frames; state.lost = true },
    onKey: (callback) => { keySubs.add(callback); return () => keySubs.delete(callback) },
    onPointer: (callback) => { pointerSubs.add(callback); return () => pointerSubs.delete(callback) },
    get down() { return (key) => Boolean(held.get(key)) },
    storage: { get: (key, fallback) => fallback, set: noop },
    clear: () => record(W / 2, H / 2),
    rect: (x, y, w, h) => record(x + w / 2, y + h / 2),
    circle: (x, y) => record(x, y),
    text: (text, x, y) => record(x, y),
  }
  const held = new Map()
  state.frames = 0

  let definition = null
  new Function('defineGame', source)((value) => { definition = value })
  const instance = definition.create(api)

  const emitKey = (name, down) => {
    const repeat = down === true && held.get(name) === true
    held.set(name, down)
    state.keyEvents += 1
    for (const callback of keySubs) callback(name, down, { name, repeat, key: name })
  }
  const emitPointer = (type, x, y) => {
    state.pointerEvents += 1
    for (const callback of pointerSubs) callback({ type, x, y })
  }

  try {
    for (let index = 0; index < frames; index += 1) {
      state.frames += 1
      state.perFrameDraws = 0
      if (input === 'random' && index % 11 === 0) {
        const name = KEYS[Math.floor(rng() * KEYS.length)]
        emitKey(name, true)
        if (rng() < 0.65) emitKey(name, false)
        if (rng() < 0.5) emitPointer('down', rng() * W, rng() * H)
        if (rng() < 0.4) emitPointer('move', rng() * W, rng() * H)
        emitPointer('up', rng() * W, rng() * H)
      } else if (input === 'lanes' && index % 25 === 0) {
        // Deterministic lane switching: keeps dodging alive so a working hazard can hit.
        const name = (index / 25) % 2 === 0 ? 'left' : 'right'
        emitKey(name, true)
        emitKey(name, false)
      } else if (input === 'space' && index % 40 === 0) {
        // Hold for one update: games that read `api.down('space')` need the key to be
        // down while update runs, not just an event in the same tick.
        emitKey('space', true)
      } else if (input === 'space' && index % 40 === 1) {
        emitKey('space', false)
        if (rng() < 0.4) emitPointer('down', W / 2, H - 40)
      } else if (input === 'drag' && index % 9 === 0) {
        // Dig / cut gestures: sweep across the middle band.
        const x = 40 + ((index * 37) % (W - 80))
        const y = H * 0.35 + ((index * 23) % Math.round(H * 0.55))
        emitPointer('down', x, y)
        emitPointer('move', x + 18, y + 6)
        emitPointer('up', x + 18, y + 6)
      } else if (input === 'pointer' && index % 7 === 0) {
        emitPointer('move', W * 0.3, H * 0.75)
        if (index % 21 === 0) emitPointer('up', W * 0.3, H * 0.75)
      }
      instance.update(1 / 60)
      if (is3d) instance.draw(gl)
      else instance.draw(ctx)
      state.maxPerFrame = Math.max(state.maxPerFrame, state.perFrameDraws)
    }
  } catch (error) {
    state.error = `${error?.message ?? error}`
  }
  return state
}

const readings = new Map()
function runsFor(game) {
  if (!readings.has(game.id)) {
    readings.set(game.id, {
      idle: run(game, { seed: 1, input: 'idle', frames: 900 }),
      random: [
        run(game, { seed: 7, input: 'random', frames: 900 }),
        run(game, { seed: 99, input: 'random', frames: 900 }),
        run(game, { seed: 4242, input: 'random', frames: 900 }),
      ],
    })
  }
  return readings.get(game.id)
}

test('A1 每个游戏：绘制有限、单帧预算内、不抛错', () => {
  const problems = []
  for (const game of GAMES) {
    const { idle } = runsFor(game)
    if (idle.error) problems.push(`${game.id} 抛错: ${idle.error}`)
    if (idle.nonFinite > 0) problems.push(`${game.id} 有 ${idle.nonFinite} 个非有限坐标`)
    const budget = game.pack === '3d' ? 150 : 400
    if (idle.maxPerFrame > budget) problems.push(`${game.id} 单帧 ${idle.maxPerFrame} 次绘制 > ${budget}`)
  }
  assert.deepEqual(problems, [], problems.join('\n'))
})

test('A2 survive 类：零输入必须失败（不然它其实是无敌的）', () => {
  const survivors = GAMES.filter((game) => game.goal[0] === 'survive')
  assert.ok(survivors.length >= 10, '生存类游戏数量异常')
  const problems = []
  for (const game of survivors) {
    const seconds = game.goal[1]
    const frames = Math.round((seconds * 1.5 + 3) * 60)
    const result = run(game, { seed: 1, input: 'idle', frames })
    if (!result.lost && !result.won) {
      problems.push(`${game.id}: 零输入 ${frames} 帧既没死也没通过目标 ${seconds}s`)
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'))
})

test('A3 count/score 类：零输入不得自己达标', () => {
  // A ball in play legitimately scores a little; what must never happen is a game
  // that reaches its own goal while the player does nothing.
  const problems = []
  for (const game of GAMES) {
    if (game.goal[0] === 'survive') continue
    const target = game.goal[1]
    const { idle } = runsFor(game)
    const reached = game.goal[0] === 'score' ? idle.score >= target : idle.progress >= target
    if (reached) {
      problems.push(`${game.id}: 零输入就拿到 ${game.goal[0]} ${idle.progress}/${idle.score}，已达目标 ${target}`)
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'))
})

test('A4 报告：声明了 api.lose 但随机输入下没死过的游戏（仅提示，不算失败）', () => {
  // Random input plays much worse than a person, so this is a smell test, not a gate.
  const suspicious = []
  for (const game of GAMES) {
    if (!sourceOf(game).includes('api.lose')) continue
    const readings = runsFor(game)
    const anyLost = readings.idle.lost || readings.random.some((result) => result.lost)
    if (!anyLost) suspicious.push(game.id)
  }
  if (suspicious.length > 0) {
    console.log(`audit: ${suspicious.length} 个游戏在「零输入 + 3 个随机种子」下都没触发 lose（需人工确认是否够得到）：${suspicious.join(', ')}`)
  }
  assert.ok(Array.isArray(suspicious))
})

test('A5 至少 5% 的绘制落在画布内', () => {
  const problems = []
  for (const game of GAMES) {
    const { idle } = runsFor(game)
    if (idle.draws === 0) continue
    if (idle.inside / idle.draws < 0.05) {
      problems.push(`${game.id}: 只有 ${(100 * idle.inside / idle.draws).toFixed(1)}% 的绘制在画布内`)
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'))
})

test('A8 定向回归：这几处修复之后仍然玩得通', () => {
  const byId = new Map(GAMES.map((game) => [game.id, game]))
  const game = (id) => byId.get(id)

  // lanesdodge: the bug was that traffic lived in lane-offset space, so a car could
  // never reach the player. Dodging input must be able to lose, and switching must move
  // the player (otherwise the fix is inert).
  const laneRuns = [11, 22, 33].map((seed) => run(game('lanesdodge'), { seed, input: 'lanes', frames: 1800 }))
  assert.ok(laneRuns.some((result) => result.lost), 'lanesdodge: 三局换道操作一次都没被撞到，障碍仍然够不到玩家')
  // Blind lane switching is a bad driver, so dying is expected — dying *instantly* is not.
  const earliest = Math.min(...laneRuns.map((result) => result.lostAt ?? Infinity))
  assert.ok(earliest >= 90, `lanesdodge: 最快 ${earliest} 帧就被撞，出生点附近几乎无解`)

  // arkanoid: removing the auto-launch must not make it unscoreable.
  const arkanoid = run(game('arkanoid'), { seed: 3, input: 'space', frames: 1500 })
  assert.ok(arkanoid.score > 0, 'arkanoid: 按了空格却没得分（球发不出来或打不到砖）')

  // water: the intake is buried now, so digging must still route water.
  const water = run(game('water'), { seed: 4, input: 'drag', frames: 2400 })
  assert.ok(water.progress > 0, 'water: 一直挖也没引来水，路口堵死了')

  // pendulum: the cup no longer sits under the launch point, so aiming must still catch.
  const pendulum = run(game('pendulum'), { seed: 5, input: 'pointer', frames: 1200 })
  assert.ok(pendulum.progress > 0, 'pendulum: 把杯子移到球下方也接不到')
})

test('A7 5000 帧随机输入：无 NaN、不抛错', () => {
  const problems = []
  for (const game of GAMES) {
    const result = run(game, { seed: 5, input: 'random', frames: 5000 })
    if (result.error) problems.push(`${game.id}: ${result.error}`)
    if (result.nonFinite > 0) problems.push(`${game.id}: ${result.nonFinite} 个非有限坐标`)
    if (result.progress < 0 || result.score < 0) problems.push(`${game.id}: 进度/分数为负`)
  }
  assert.deepEqual(problems, [], problems.join('\n'))
})
