/**
 * Bundle integration test: loads the generated `lib/client.js` the way the Harness
 * Web client does, then inspects what the plugin registers.
 *
 * No React, no DOM: the factory only builds components, and `apply` receives a
 * recording stand-in for the Client context.
 * Run after `node build.mjs`: node --test test/bundle.test.mjs
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BUNDLE = join(ROOT, 'lib', 'client.js')

function loadBundle() {
  const source = readFileSync(BUNDLE, 'utf8')
  let captured = null
  const previous = globalThis.window
  globalThis.window = { __ModuleLoader__: { load: (record) => { captured = record } } }
  try {
    // eslint-disable-next-line no-new-func
    new Function(source)()
  } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
  return captured
}

const stubRequire = (name) => {
  if (name === 'react') {
    return {
      createElement: (...args) => ({ type: args[0], props: args[1], children: args.slice(2) }),
      useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
      useRef: (initial) => ({ current: initial }),
      useEffect: () => {},
      useCallback: (fn) => fn,
      useMemo: (fn) => fn(),
    }
  }
  throw new Error(`unexpected require(${name})`)
}

test('the built bundle exists and registers the package id', () => {
  assert.ok(existsSync(BUNDLE), 'run `node build.mjs` first')
  const record = loadBundle()
  assert.ok(record, 'window.__ModuleLoader__.load was not called')
  assert.equal(record.id, '@hjdd14/dsh-together')
  assert.equal(typeof record.factory, 'function')
})

test('the factory returns { inject, apply } and apply fills both slots', () => {
  const record = loadBundle()
  const client = record.factory(stubRequire)
  assert.deepEqual(client.inject, ['slots', 'locale'])
  assert.equal(typeof client.apply, 'function')

  const registrations = []
  const localeCalls = []
  const ctx = {
    effect: (callback) => callback(),
    locale: {
      register: (namespace, dictionaries) => { localeCalls.push({ namespace, dictionaries }); return () => {} },
      bind: () => (key) => key,
      getLocale: () => ({ id: 'en' }),
      subscribe: () => () => {},
    },
    slots: {
      inject: (name, callback) => { callback(); return () => {} },
      register: (options, component) => { registrations.push({ options, component }); return () => {} },
    },
  }
  client.apply(ctx)

  assert.equal(localeCalls.length, 1)
  assert.equal(localeCalls[0].namespace, 'dshTogether')
  assert.ok(localeCalls[0].dictionaries.zh && localeCalls[0].dictionaries.en)

  assert.deepEqual(registrations.map((entry) => entry.options.name).sort(), ['settings.section', 'shell.overlay'])
  const overlay = registrations.find((entry) => entry.options.name === 'shell.overlay')
  const settings = registrations.find((entry) => entry.options.name === 'settings.section')
  assert.equal(overlay.options.id, 'dsh-together.game')
  assert.equal(settings.options.id, 'dsh-together')
  assert.equal(typeof overlay.component, 'function')
  assert.equal(typeof settings.component, 'function')
  assert.equal(typeof overlay.options.label, 'function', 'the label must re-read the active locale')
})

test('every catalog game is present in the bundle', async () => {
  const { GAMES } = await import('../shared/catalog.js')
  const source = readFileSync(BUNDLE, 'utf8')
  for (const game of GAMES) {
    assert.ok(source.includes(`id: '${game.id}'`), `bundle is missing game ${game.id}`)
  }
  const definitions = source.match(/defineGame\(\s*\{/g) ?? []
  assert.equal(definitions.length, GAMES.length, 'the bundle must define exactly one game per catalog entry')
})

test('the bundle carries no module-system escape hatches', () => {
  const source = readFileSync(BUNDLE, 'utf8')
  assert.ok(!/^\s*import\s/m.test(source), 'bundle must not use import')
  assert.ok(!/^\s*export\s/m.test(source), 'bundle must not use export')
  assert.ok(!/\brequire\(\s*['"]react-dom/.test(source), 'no react-dom dependency')
})
