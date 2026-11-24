/**
 * Gate state-machine tests: no Cordis, no browser, no filesystem.
 * Run: node --test test/gate.test.mjs
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import { createGate } from '../host/gate.js'
import { normalizeSettings, DIFFICULTY_FACTORS } from '../host/settings.js'
import { classify } from '../host/classifier.js'
import { goalFor } from '../host/catalog.js'

function makeGate(overrides = {}) {
  let clock = 1_000_000
  const saved = []
  const settings = normalizeSettings({ cooldownSeconds: 60, difficulty: 'normal', ...overrides.settings })
  const gate = createGate({
    settings,
    hasClient: overrides.hasClient ?? (() => true),
    save: async (candidate) => {
      saved.push(candidate)
      return normalizeSettings(candidate)
    },
    now: () => clock,
    rng: overrides.rng ?? (() => 0),
    log: () => {},
  })
  return {
    gate,
    saved,
    advance: (ms) => { clock += ms },
    exec: (name, args = {}, extra = {}) => ({
      name,
      arguments: args,
      signal: extra.signal ?? new AbortController().signal,
      agent: extra.agent ?? { session: { id: 'session-1' } },
    }),
    pending: () => gate.snapshot().pending[0],
  }
}

test('a read-only tool is never gated', () => {
  const { gate, exec } = makeGate()
  assert.equal(gate.inspect(exec('read', { path: 'a.txt' })).gate, false)
  assert.equal(gate.inspect(exec('grep', { pattern: 'x' })).gate, false)
})

test('a mutating tool is gated, and passing releases the exact call', async () => {
  const { gate, exec, pending } = makeGate()
  const tool = exec('write', { path: 'notes.md' })
  const verdict = gate.inspect(tool)
  assert.equal(verdict.gate, true)
  assert.equal(verdict.toolName, 'write')
  assert.equal(verdict.path, 'notes.md')

  const waiting = gate.wait(tool, verdict)
  const challenge = pending()
  assert.ok(challenge, 'a challenge is visible to the overlay')
  assert.equal(challenge.toolName, 'write')
  assert.equal(challenge.total, 1)

  const goal = challenge.current.goal
  const below = gate.complete(challenge.id, challenge.current.id, goal.target - 1)
  assert.equal(below.passed, false, 'a score under the goal does not release the call')
  assert.equal(gate.snapshot().pending.length, 1)

  const pass = gate.complete(challenge.id, challenge.current.id, goal.target)
  assert.equal(pass.passed, true)
  assert.equal(pass.done, true)
  assert.deepEqual(await waiting, { allow: true, reason: 'passed' })
  assert.equal(gate.snapshot().pending.length, 0)
})

test('cooldown suppresses the next game and expires', () => {
  const { gate, exec, advance, pending } = makeGate({ settings: { cooldownSeconds: 60 } })
  const first = exec('edit', { path: 'a.js' })
  const verdict = gate.inspect(first)
  const waiting = gate.wait(first, verdict)
  const challenge = pending()
  gate.complete(challenge.id, challenge.current.id, challenge.current.goal.target)
  assert.equal(gate.inspect(exec('write', { path: 'b.js' })).gate, false)
  assert.equal(gate.inspect(exec('write', { path: 'b.js' })).reason, 'cooldown')
  advance(61_000)
  assert.equal(gate.inspect(exec('write', { path: 'b.js' })).gate, true)
  return waiting
})

test('a zero cooldown asks again on the very next call', async () => {
  const { gate, exec, pending } = makeGate({ settings: { cooldownSeconds: 0 } })
  const first = exec('write', { path: 'a.js' })
  const waiting = gate.wait(first, gate.inspect(first))
  const challenge = pending()
  gate.complete(challenge.id, challenge.current.id, challenge.current.goal.target)
  await waiting
  assert.equal(gate.inspect(exec('write', { path: 'b.js' })).gate, true)
})

test('concurrent calls in one session share a single challenge', async () => {
  const { gate, exec, pending } = makeGate()
  const one = exec('write', { path: 'a.js' })
  const two = exec('edit', { path: 'b.js' })
  const firstWaiting = gate.wait(one, gate.inspect(one))
  const secondWaiting = gate.wait(two, gate.inspect(two))
  const state = gate.snapshot()
  assert.equal(state.pending.length, 1)
  assert.equal(state.stats.plays, 1, 'only one challenge was created')
  const challenge = state.pending[0]
  gate.complete(challenge.id, challenge.current.id, challenge.current.goal.target)
  assert.deepEqual(await firstWaiting, { allow: true, reason: 'passed' })
  assert.deepEqual(await secondWaiting, { allow: true, reason: 'passed' })
})

test('an aborted turn denies instead of hanging', async () => {
  const { gate, exec } = makeGate()
  const controller = new AbortController()
  const tool = exec('write', { path: 'a.js' }, { signal: controller.signal })
  const waiting = gate.wait(tool, gate.inspect(tool))
  controller.abort()
  const outcome = await waiting
  assert.equal(outcome.allow, false)
  assert.match(outcome.reason, /取消/)
})

test('plugin disposal resolves every outstanding challenge', async () => {
  const { gate, exec } = makeGate()
  const tool = exec('write', { path: 'a.js' })
  const waiting = gate.wait(tool, gate.inspect(tool))
  gate.dispose('卸载')
  const outcome = await waiting
  assert.equal(outcome.allow, false)
})

test('three infrastructure failures auto-pass, gameplay losses do not', async () => {
  const { gate, exec, pending } = makeGate()
  const tool = exec('write', { path: 'a.js' })
  const waiting = gate.wait(tool, gate.inspect(tool))
  const challenge = pending()
  assert.equal(gate.complete(challenge.id, challenge.current.id, 0).passed, false)
  assert.equal(gate.reportFailure(challenge.id, 'crash').autoPassed, false)
  assert.equal(gate.reportFailure(challenge.id, 'crash').autoPassed, false)
  const third = gate.reportFailure(challenge.id, 'timeout')
  assert.equal(third.autoPassed, true)
  assert.equal((await waiting).allow, true)
})

test('difficulty scales the goal and never below one', () => {
  const base = goalFor('snake', 'normal')
  assert.equal(base.target, 5)
  assert.equal(goalFor('snake', 'relaxed').target, Math.floor(5 * DIFFICULTY_FACTORS.relaxed))
  assert.equal(goalFor('snake', 'strict').target, Math.ceil(5 * DIFFICULTY_FACTORS.strict))
  assert.ok(goalFor('lander', 'relaxed').target >= 1)
})

test('a challenge can switch games without advancing the goal', async () => {
  const { gate, exec, pending } = makeGate({ rng: () => 0.5 })
  const tool = exec('write', { path: 'a.js' })
  const waiting = gate.wait(tool, gate.inspect(tool))
  const before = pending()
  const swapped = gate.switchGame(before.id)
  assert.equal(swapped.ok, true)
  assert.notEqual(swapped.next.id, before.current.id)
  const after = pending()
  assert.equal(after.index, 0, 'switching does not advance the round')
  gate.complete(after.id, after.current.id, after.current.goal.target)
  assert.equal((await waiting).allow, true)
})

test('switching can be disabled by settings', async () => {
  const { gate, exec, pending } = makeGate({ settings: { allowGameSwitch: false } })
  const tool = exec('write', { path: 'a.js' })
  const waiting = gate.wait(tool, gate.inspect(tool))
  assert.equal(gate.switchGame(pending().id).error, 'switch-disabled')
  gate.abortSession('session-1', 'done')
  assert.equal((await waiting).allow, false)
})

test('multi-round challenges need every round', async () => {
  const { gate, exec, pending } = makeGate({ settings: { gamesPerChallenge: 2 }, rng: () => 0.1 })
  const tool = exec('write', { path: 'a.js' })
  const waiting = gate.wait(tool, gate.inspect(tool))
  const first = pending()
  assert.equal(first.total, 2)
  const step = gate.complete(first.id, first.current.id, first.current.goal.target)
  assert.equal(step.done, false)
  assert.ok(step.next, 'the same challenge hands over the next round')
  const second = pending()
  assert.equal(second.index, 1)
  gate.complete(second.id, second.current.id, second.current.goal.target)
  assert.equal((await waiting).allow, true)
})

test('settings updates are normalized and persisted', async () => {
  const { gate, saved } = makeGate()
  const next = await gate.updateSettings({ cooldownSeconds: 9999, difficulty: 'nope', gamesPerChallenge: 9, gamePacks: ['arcade', 'ghost'] })
  assert.equal(next.cooldownSeconds, 3600)
  assert.equal(next.difficulty, 'relaxed')
  assert.equal(next.gamesPerChallenge, 3)
  assert.deepEqual(next.gamePacks, ['arcade'])
  assert.equal(saved.length, 1)
})

test('the no-browser escape only applies when it is switched on', () => {
  // Shipped default is false: a silent allow is worse than a wait the user can release.
  const strict = makeGate({ hasClient: () => false })
  assert.equal(strict.gate.inspect(strict.exec('write', { path: 'a.js' })).gate, true)

  const lenient = makeGate({ hasClient: () => false, settings: { pauseWhenNoClient: true } })
  assert.equal(lenient.gate.inspect(lenient.exec('write', { path: 'a.js' })).gate, false)
  assert.equal(lenient.gate.inspect(lenient.exec('write', { path: 'a.js' })).reason, 'no-client')
})

test('shell commands are classified by what they do', () => {
  const settings = normalizeSettings({})
  const verdict = (command) => classify({ name: 'bash', arguments: { command }, agent: { session: { id: 's' } } }, settings).gate
  assert.equal(verdict('ls -la'), false)
  assert.equal(verdict('grep -rn foo src'), false)
  assert.equal(verdict('echo hi > notes.md'), true)
  assert.equal(verdict('rm -rf build'), true)
  assert.equal(verdict('sed -i s/a/b/ file.txt'), true)
  assert.equal(verdict('git status'), false)
  // A program dispatched through run_code writes with the runtime's own bindings,
  // not with a shell redirect.
  assert.equal(verdict('await fs.writeFile("a.txt", "x")'), true)
  assert.equal(verdict('fs.mkdirSync("build")'), true)
  assert.equal(verdict('console.log(await readFile("a.txt"))'), false)
})

test('excluded paths and disabled settings short-circuit the gate', () => {
  const settings = normalizeSettings({ excludedPathPatterns: ['node_modules'] })
  assert.equal(classify({ name: 'write', arguments: { path: 'node_modules/x.js' } }, settings).gate, false)
  const off = normalizeSettings({ enabled: false })
  assert.equal(classify({ name: 'write', arguments: { path: 'a.js' } }, off).gate, false)
})

test('unknown tools and anonymous calls are not gated', () => {
  const settings = normalizeSettings({})
  assert.equal(classify({ name: 'web_search', arguments: {} }, settings).gate, false)
  assert.equal(classify({ name: 'write', arguments: { path: 'a.js' } }, { ...settings, enabled: false }).gate, false)
})

test('a call without an agent session is still gated', async () => {
  const { gate } = makeGate()
  const exec = { name: 'write', arguments: { path: 'a.js' }, signal: new AbortController().signal, token: 'tok-1' }
  const verdict = gate.inspect(exec)
  assert.equal(verdict.gate, true, 'an unattributed dispatch must not slip past the gate')
  const waiting = gate.wait(exec, verdict)
  const challenge = gate.snapshot().pending[0]
  assert.ok(challenge, 'the overlay still sees a challenge')
  gate.complete(challenge.id, challenge.current.id, challenge.current.goal.target)
  assert.equal((await waiting).allow, true)
})

test('replacement tool wrappers are recognised as file writes', () => {
  const settings = normalizeSettings({})
  const gated = (name) => classify({ name, arguments: { path: 'a.js' } }, settings).gate
  // `java-write` is the wrapper a tool layer installed in front of the native write:
  // a name-only allowlist missed it and let real edits through.
  assert.equal(gated('java-write'), true)
  assert.equal(gated('java-edit'), true)
  assert.equal(gated('node-patch'), true)
  assert.equal(gated('fs-write-file'), true)
  assert.equal(gated('ops_write_file'), true)
  // Bookkeeping tools that merely contain a mutating verb stay out of the gate.
  assert.equal(gated('schedule_edit'), false)
  assert.equal(gated('update_goal'), false)
  assert.equal(gated('team_task_update'), false)
  assert.equal(gated('plugin_manager'), false)
  assert.equal(gated('ops_read_files'), false)
})
