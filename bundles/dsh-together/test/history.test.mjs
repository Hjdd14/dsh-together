/**
 * Rotation tests: the same game must never come up twice in a row, and the wider
 * window should keep the recent ones out when the pool allows it.
 *
 * Run: node --test test/history.test.mjs
 */
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { createHistory, HISTORY_LIMIT } from '../host/history.js'
import { createGate } from '../host/gate.js'
import { normalizeSettings } from '../host/settings.js'
import { eligibleGames } from '../host/catalog.js'

function tempFile() {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-together-'))
  return { file: join(dir, 'state.json'), cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

test('the hard guarantee holds with any window, including 0', () => {
  const { file, cleanup } = tempFile()
  try {
    const history = createHistory({ file })
    const pool = ['a', 'b', 'c', 'd']
    const seen = []
    for (let index = 0; index < 200; index += 1) {
      const avoid = history.avoidSet(pool, index % 5 === 0 ? 0 : 1)
      // A deliberately adversarial picker: always the last eligible item.
      const candidates = pool.filter((id) => !avoid.has(id))
      const chosen = (candidates.length > 0 ? candidates : pool)[candidates.length > 0 ? candidates.length - 1 : pool.length - 1]
      history.remember(chosen)
      seen.push(chosen)
    }
    for (let index = 1; index < seen.length; index += 1) {
      assert.notEqual(seen[index], seen[index - 1], `第 ${index} 次与上一次相同: ${seen[index]}`)
    }
  } finally {
    cleanup()
  }
})

test('a wide window keeps every recent game out when the pool allows', () => {
  const { file, cleanup } = tempFile()
  try {
    const history = createHistory({ file })
    const pool = ['a', 'b', 'c', 'd', 'e', 'f']
    const picked = []
    for (let index = 0; index < 40; index += 1) {
      const avoid = history.avoidSet(pool, 4)
      const candidates = pool.filter((id) => !avoid.has(id))
      assert.ok(candidates.length > 0, '池比窗口大时必须还有可选')
      const chosen = candidates[0]
      history.remember(chosen)
      picked.push(chosen)
      assert.ok(!picked.slice(-5, -1).includes(chosen), `最近 4 次内重复了: ${chosen}`)
    }
  } finally {
    cleanup()
  }
})

test('a two-game pool strictly alternates', () => {
  const { file, cleanup } = tempFile()
  try {
    const history = createHistory({ file })
    const pool = ['a', 'b']
    const picked = []
    for (let index = 0; index < 20; index += 1) {
      const avoid = history.avoidSet(pool, 12)
      const candidates = pool.filter((id) => !avoid.has(id))
      const chosen = (candidates.length > 0 ? candidates : pool.filter((id) => id !== history.last))[0] ?? pool[0]
      history.remember(chosen)
      picked.push(chosen)
    }
    for (let index = 1; index < picked.length; index += 1) {
      assert.notEqual(picked[index], picked[index - 1])
    }
  } finally {
    cleanup()
  }
})

test('a single-game pool is allowed to repeat and reports itself as limited', () => {
  const { file, cleanup } = tempFile()
  try {
    const history = createHistory({ file })
    assert.equal(history.avoidSet(['only'], 12).size, 0, '池只有 1 个时不能把自己排除掉')
    assert.equal(history.limited(['only'], 12), true)
    history.remember('only')
    assert.equal(history.limited(['only'], 12), true)
  } finally {
    cleanup()
  }
})

test('recent games survive a restart through the state file', async () => {
  const { file, cleanup } = tempFile()
  try {
    const first = createHistory({ file })
    first.remember('alpha')
    first.remember('beta')
    await first.flush()
    assert.ok(existsSync(file))
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    assert.deepEqual(payload.recent, ['alpha', 'beta'])

    const second = createHistory({ file })
    assert.equal(second.last, 'beta')
    assert.deepEqual(second.avoidSet(['alpha', 'beta', 'gamma'], 12).has('alpha'), true)
  } finally {
    cleanup()
  }
})

test('the file never grows past the history limit', async () => {
  const { file, cleanup } = tempFile()
  try {
    const history = createHistory({ file })
    for (let index = 0; index < HISTORY_LIMIT * 3; index += 1) history.remember(`g${index}`)
    await history.flush()
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    assert.equal(payload.recent.length, HISTORY_LIMIT)
    assert.equal(payload.recent.at(-1), `g${HISTORY_LIMIT * 3 - 1}`)
  } finally {
    cleanup()
  }
})

test('the gate never hands out the same game twice in a row', async () => {
  const { file, cleanup } = tempFile()
  try {
    const history = createHistory({ file })
    let clock = 1_000_000
    // Deterministic, adversarial rng: always picks the last candidate.
    const rng = () => 0.999
    const gate = createGate({
      settings: normalizeSettings({ cooldownSeconds: 0, noRepeatWindow: 8, gamesPerChallenge: 1 }),
      history,
      hasClient: () => true,
      save: async (candidate) => normalizeSettings(candidate),
      now: () => { clock += 1000; return clock },
      rng,
      log: () => {},
    })
    const exec = (index) => ({
      name: 'write',
      arguments: { path: `file-${index}.js` },
      signal: new AbortController().signal,
      agent: { session: { id: 'session-1' } },
    })
    const shown = []
    for (let index = 0; index < 60; index += 1) {
      const call = exec(index)
      const verdict = gate.inspect(call)
      const waiting = gate.wait(call, verdict)
      const challenge = gate.snapshot().pending[0]
      shown.push(challenge.current.id)
      gate.complete(challenge.id, challenge.current.id, challenge.current.goal.target)
      await waiting
    }
    for (let index = 1; index < shown.length; index += 1) {
      assert.notEqual(shown[index], shown[index - 1], `第 ${index} 次连续重复: ${shown[index]}`)
    }
    // With a window of 8 the most recent 8 must not come back either.
    for (let index = 9; index < shown.length; index += 1) {
      assert.ok(!shown.slice(index - 8, index).includes(shown[index]), `8 场内重复: ${shown[index]}`)
    }
    assert.ok(gate.snapshot().recent.length > 0)
  } finally {
    cleanup()
  }
})

test('switching a game also avoids the recent ones', async () => {
  const { file, cleanup } = tempFile()
  try {
    const history = createHistory({ file })
    const gate = createGate({
      settings: normalizeSettings({ cooldownSeconds: 0, noRepeatWindow: 20, gamesPerChallenge: 1 }),
      history,
      hasClient: () => true,
      save: async (candidate) => normalizeSettings(candidate),
      now: () => 2_000_000,
      rng: () => 0.5,
      log: () => {},
    })
    const call = {
      name: 'write',
      arguments: { path: 'a.js' },
      signal: new AbortController().signal,
      agent: { session: { id: 's' } },
    }
    const waiting = gate.wait(call, gate.inspect(call))
    const before = gate.snapshot().pending[0]
    const pool = eligibleGames(gate.settings).length
    assert.ok(pool > 2, '需要足够的池来验证换局')
    const swapped = gate.switchGame(before.id)
    assert.equal(swapped.ok, true)
    assert.notEqual(swapped.next.id, before.current.id, '换局不能换回当前游戏')
    assert.ok(!history.recent.slice(-2).includes(swapped.next.id) || history.last === swapped.next.id, '换局应避开最近出现过的')
    gate.abortSession('s', 'done')
    await waiting
  } finally {
    cleanup()
  }
})
