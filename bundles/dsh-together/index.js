/**
 * Host half of `@hjdd14/dsh-together`.
 *
 * Every file-changing tool call runs through `tools/pre-execute`; this plugin holds
 * it there until the browser half reports a score that meets the Host-side goal.
 * No `@deepseek-ai/*` import: a linked workspace bundle has no dependency tree of its
 * own, so only `node:*` builtins and this package's own modules are available.
 */


import { loadSettingsSync, saveSettings, settingsFilePath } from './host/settings.js'
import { createGate } from './host/gate.js'
import { createHistory, historyFilePath } from './host/history.js'
import { renderPlay3d } from './host/play3d.js'
import { renderPlay } from './host/play2d.js'
import { registerRoutes } from './host/routes.js'

export const inject = ['tools', 'webServer']

const PREFIX = '[dsh-together]'

export function apply(ctx) {
  const file = settingsFilePath()
  const bootedAt = Date.now()
  const settings = loadSettingsSync(file)
  const log = (line) => {
    try {
      console.info(`${PREFIX} ${line}`)
    } catch {
      // Logging must never break the gate.
    }
  }

  const gateway = () => {
    try {
      return ctx.get('typertGateway')
    } catch {
      return undefined
    }
  }
  // A browser is "attached" when the overlay has polled recently — that request comes
  // from the page itself, so it is stronger evidence than the RPC client probe, which
  // stays silent after a Host restart until the page makes an RPC call.
  let lastClientSeenAt = 0
  const noteClientSeen = () => { lastClientSeenAt = Date.now() }
  const hasClient = () => {
    if (Date.now() - lastClientSeenAt < 20_000) return true
    try {
      const has = gateway()?.hasLiveClient?.()
      return typeof has === 'boolean' ? has : true
    } catch {
      return true
    }
  }

  const history = createHistory({ file: historyFilePath(), log })
  const instanceId = Math.random().toString(36).slice(2, 8)
  let lastToolCallAt = 0

  const gate = createGate({
    settings,
    hasClient,
    history,
    log,
    save: (candidate) => saveSettings(file, candidate),
  })

  // The gate itself: awaitable, so the tool dispatch waits instead of failing.
  //
  // Registered on three scopes on purpose. A Cordis event only reaches the emitting
  // context and its ancestors, and the dispatch carrier is `scopeTarget(tools, agent)`;
  // a listener on this plugin's own fiber does not reliably see a call made by an agent
  // created outside it. The agent's own context always sits on that chain, so the
  // per-agent registration below is the one that cannot be missed. `seen` keeps a call
  // from being charged to more than one registration.
  const seen = new WeakSet()

  const preExecute = async (exec, next) => {
    if (exec !== null && typeof exec === 'object') {
      if (seen.has(exec)) return next()
      seen.add(exec)
    }
    lastToolCallAt = Date.now()
    let verdict
    try {
      verdict = gate.inspect(exec)
    } catch (error) {
      log(`classifier failed, allowing the call: ${error?.message ?? error}`)
      return next()
    }
    if (!verdict.gate) {
      if (verdict.reason !== 'not-mutating') {
        log(`pass ${verdict.toolName ?? '?'}: ${verdict.reason}${verdict.sessionId ? ` (session ${verdict.sessionId.slice(0, 8)})` : ' (no session)'}`)
      }
      return next()
    }
    log(`gate ${verdict.toolName ?? '?'}${verdict.path ? ` ${verdict.path}` : ''}`)
    let outcome
    try {
      outcome = await gate.wait(exec, verdict)
    } catch (error) {
      log(`gate failed, allowing the call: ${error?.message ?? error}`)
      return next()
    }
    if (!outcome?.allow) {
      return {
        kind: 'deny',
        reason: `Waiting for a mini-game: ${outcome?.reason ?? 'the game was not passed'}`,
      }
    }
    return next()
  }

  ctx.effect(() => ctx.on('tools/pre-execute', preExecute), 'dsh-together: pre-execute gate (plugin)')

  // Root scope catches every dispatch in the tree.
  //
  // The dispatch waterfall runs on `scopeTarget(tools, agent)`, and an event only
  // reaches the emitting context and its ancestors. This plugin's own fiber is not an
  // ancestor of that target, and `ctx.inject(['tools'], …)` yields a *child* of this
  // plugin, not the provider's context — which is why interception silently disappeared
  // after some restarts. The root context is an ancestor of everything, so this
  // registration cannot be missed; `seen` keeps a call from being charged twice.
  ctx.effect(() => ctx.root.on('tools/pre-execute', preExecute), 'dsh-together: pre-execute gate (root)')

  ctx.inject(['tools'], (toolsCtx) => {
    toolsCtx.effect(() => toolsCtx.on('tools/pre-execute', preExecute), 'dsh-together: pre-execute gate (tools)')
  })

  // Per-agent registration: guaranteed to sit on the dispatch carrier's ancestor chain.
  const agentGates = new Map()
  ctx.effect(() => ctx.on('agent/created', ({ agent }) => {
    const key = agent?.session?.id ?? agent
    if (key === undefined || agentGates.has(key)) return
    const dispose = agent.ctx.effect(
      () => agent.ctx.on('tools/pre-execute', preExecute),
      'dsh-together: pre-execute gate (agent)',
    )
    agentGates.set(key, dispose)
  }), 'dsh-together: per-agent gate registration')

  ctx.effect(() => ctx.on('agent/disposed', ({ agent }) => {
    const key = agent?.session?.id ?? agent
    const dispose = agentGates.get(key)
    if (dispose !== undefined) {
      agentGates.delete(key)
      try {
        dispose()
      } catch {
        // A disposed agent may have already unwound its scoped registrations.
      }
    }
  }), 'dsh-together: per-agent gate cleanup')

  // A closed session must not leave its tool call waiting forever.
  ctx.effect(() => ctx.on('agent/disposed', ({ agent }) => {
    const sessionId = agent?.session?.id
    if (sessionId !== undefined) gate.abortSession(sessionId, '会话已结束，小游戏未通过')
  }), 'dsh-together: session cleanup')

  ctx.effect(() => registerRoutes(ctx, gate, {
    log,
    onClientSeen: noteClientSeen,
    /**
     * Summon a game on demand. `pack: '3d'` pins the draw to the 3D pack so the player
     * can inspect the WebGL games; nothing is written and no score is faked.
     */
    demo: async ({ pack } = {}) => gate.showDemo(pack === '3d' ? '3d' : undefined),
    play3d: (gameId) => renderPlay3d(gameId),
    play: (gameId) => renderPlay(gameId),
    selfCheck: () => ({
      instanceId,
      lastToolCallAt,
      listenerScopes: 4,
      listenerSeen: lastToolCallAt > 0,
      uptimeMs: Date.now() - bootedAt,
      historyPersisted: historyFilePath(),
    }),
  }), 'dsh-together: routes')

  // Unload resolves every outstanding challenge so nothing is stranded.
  ctx.effect(() => () => {
    gate.dispose('插件已卸载，小游戏未通过')
    history.flush().catch(() => {})
  }, 'dsh-together: gate teardown')

  log(`active with ${gate.settings.gamePacks.length} packs, cooldown ${gate.settings.cooldownSeconds}s, settings at ${file}`)
}
