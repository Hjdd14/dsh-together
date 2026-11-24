/**
 * The bundle's own HTTP surface, served by `ctx.webServer` on the GUI's origin.
 *
 * Client half ⇄ Host half has no generated Remote namespace here: the browser half
 * is a plain script bundle, so a small same-origin JSON API is the transport. Every
 * route refuses untrusted peers through `ctx.connection.requestRejection`.
 */
import { GAMES, PACKS } from '../shared/catalog.js'
import { describeChallenge, eligibleGames, goalFor, pickGame } from './catalog.js'

export const ROUTE_PREFIX = '/x-together'
const MAX_BODY_BYTES = 64 * 1024

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

function sendMethodNotAllowed(res, allowed) {
  res.setHeader('allow', allowed)
  sendJson(res, 405, { ok: false, error: 'method-not-allowed' })
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('body-too-large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text.length === 0) return {}
  const parsed = JSON.parse(text)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('body-not-object')
  return parsed
}

/**
 * Register every route used by the overlay and the settings page.
 * @param {{ webServer: any, get: (name: string) => any }} ctx
 * @param {ReturnType<import('./gate.js').createGate>} gate
 * @param {{ log?: (line: string) => void }} [hooks]
 * @returns {() => void} disposer for all routes
 */
export function registerRoutes(ctx, gate, hooks = {}) {
  const log = hooks.log ?? (() => {})
  const onClientSeen = hooks.onClientSeen ?? (() => {})
  const disposers = []

  const registration = (path, handler, method) => {
    const dispose = ctx.webServer.register({
      kind: 'exact',
      path: `${ROUTE_PREFIX}/${path}`,
      handler: async (req, res) => {
        try {
          const connection = ctx.get('connection')
          const rejection = connection?.requestRejection?.(req)
          if (typeof rejection === 'number' && rejection > 0) {
            res.statusCode = rejection
            res.end()
            return
          }
          // This request proves a browser is attached to the GUI, which is a better
          // signal than the RPC client probe: the overlay polls over plain HTTP even
          // when the RPC connection has not been re-established after a restart.
          onClientSeen()
          if (req.method !== method) {
            sendMethodNotAllowed(res, method)
            return
          }
          await handler(req, res)
        } catch (error) {
          log(`route ${path} failed: ${error?.message ?? error}`)
          if (!res.headersSent) sendJson(res, 400, { ok: false, error: error?.message ?? 'bad-request' })
          else res.end()
        }
      },
    })
    disposers.push(dispose)
  }

  registration('state', async (req, res) => {
    const state = gate.snapshot()
    sendJson(res, 200, { ok: true, ...state, routePrefix: ROUTE_PREFIX })
  }, 'GET')

  registration('catalog', async (req, res) => {
    sendJson(res, 200, {
      ok: true,
      packs: PACKS,
      games: GAMES.map((game) => ({
        id: game.id,
        pack: game.pack,
        zh: game.zh,
        en: game.en,
        bz: game.bz,
        be: game.be,
        c: game.c,
      })),
    })
  }, 'GET')

  registration('complete', async (req, res) => {
    const body = await readJsonBody(req)
    const result = gate.complete(body.challengeId, body.gameId, body.score)
    sendJson(res, result.ok ? 200 : 409, result)
  }, 'POST')

  registration('switch', async (req, res) => {
    const body = await readJsonBody(req)
    const result = gate.switchGame(body.challengeId)
    sendJson(res, result.ok ? 200 : 409, result)
  }, 'POST')

  registration('fail', async (req, res) => {
    const body = await readJsonBody(req)
    const result = gate.reportFailure(body.challengeId, body.kind)
    sendJson(res, result.ok ? 200 : 409, result)
  }, 'POST')

  /** Tester escape hatch: release the waiting call without playing (never fakes a score). */
  registration('pass', async (req, res) => {
    const body = await readJsonBody(req)
    const result = gate.forcePass(body.challengeId)
    sendJson(res, result.ok ? 200 : 409, result)
  }, 'POST')

  /**
   * Interceptor health. `listenerSeen` is the giveaway: when the pre-execute listener
   * is not attached (a stale module generation after a hot reload), tool calls never
   * reach it and every check would pass silently.
   */  /**
   * Dispatch a real write through the tools service and report whether the gate saw it.
   * This is the only honest test of interception: it exercises the same waterfall a
   * normal tool call uses, so a green result means the next agent write will be gated.
   */
  registration('demo', async (req, res) => {
    const body = await readJsonBody(req)
    const result = await hooks.demo?.({ pack: body.pack })
    sendJson(res, 200, result ?? { ok: false, error: 'demo-unavailable' })
  }, 'POST')

  /** GET variant of `demo`, so a 3D game can be summoned by simply opening a URL. */
  registration('demo3d', async (req, res) => {
    const result = await hooks.demo?.({ pack: '3d' })
    sendJson(res, 200, result ?? { ok: false, error: 'demo-unavailable' })
  }, 'GET')

  /** Standalone player for any 2D game (3D games live on `play3d`). */
  registration('play', async (req, res) => {
    const query = new URL(req.url ?? '/', 'http://localhost').searchParams
    const gameId = query.get('game') ?? ''
    const html = hooks.play?.(gameId)
    if (typeof html !== 'string') {
      res.statusCode = 404
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.end(`unknown 2D game: ${gameId}`)
      return
    }
    res.statusCode = 200
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(html)
  }, 'GET')

  /** Standalone 3D player: the game alone on a blank page (no shell chrome). */
  registration('play3d', async (req, res) => {
    const query = new URL(req.url ?? '/', 'http://localhost').searchParams
    const gameId = query.get('game') ?? 'stack3d'
    const html = hooks.play3d?.(gameId)
    if (typeof html !== 'string') {
      res.statusCode = 404
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.end(`unknown 3D game: ${gameId}`)
      return
    }
    res.statusCode = 200
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(html)
  }, 'GET')

  registration('self-check', async (req, res) => {
    const report = hooks.selfCheck?.() ?? {}
    const state = gate.snapshot()
    sendJson(res, 200, {
      ok: true,
      ...report,
      enabled: state.settings.enabled,
      cooldownSeconds: state.settings.cooldownSeconds,
      noRepeatWindow: state.settings.noRepeatWindow,
      pending: state.pending.length,
      eligibleGames: state.gameCount,
      poolLimited: state.poolLimited,
      recent: state.recent.slice(-10),
      stats: state.stats,
    })
  }, 'GET')

  registration('settings', async (req, res) => {
    const body = await readJsonBody(req)
    const patch = body.patch && typeof body.patch === 'object' ? body.patch : body
    const settings = await gate.updateSettings(patch)
    sendJson(res, 200, { ok: true, settings })
  }, 'POST')

  /** One round for the settings page's "try a game" affordance; never a real gate. */
  registration('preview', async (req, res) => {
    const body = await readJsonBody(req)
    const settings = gate.settings
    const requested = typeof body.gameId === 'string' && body.gameId.length > 0 ? body.gameId : undefined
    const gameId = requested ?? pickGame(settings, Math.random)
    if (gameId === undefined) {
      sendJson(res, 409, { ok: false, error: 'no-games' })
      return
    }
    const goal = goalFor(gameId, settings.difficulty)
    sendJson(res, 200, { ok: true, game: describeChallenge(gameId, goal), attemptSeconds: settings.attemptSeconds })
  }, 'POST')

  /** Eligible game ids for the settings page's per-game list. */
  registration('eligibility', async (req, res) => {
    const settings = gate.settings
    const eligible = new Set(eligibleGames(settings).map((game) => game.id))
    sendJson(res, 200, { ok: true, eligible: [...eligible] })
  }, 'GET')

  return () => {
    for (const dispose of disposers.splice(0)) {
      try {
        dispose()
      } catch {
        // Disposal is best effort; a failing route disposer must not abort unload.
      }
    }
  }
}
