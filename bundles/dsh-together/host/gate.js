/**
 * The gate: the state machine that makes an agent wait for a played game.
 *
 * Deliberately free of Cordis imports so `test/gate.test.mjs` can drive it directly.
 * Every promise this module creates is resolved exactly once — on pass, on abort,
 * on plugin disposal, or after repeated infrastructure failures — so a tool call can
 * never be stranded forever.
 */
import { classify } from './classifier.js'
import { describeChallenge, eligibleGames, goalFor, pickGame } from './catalog.js'

/** Infrastructure failures (crash or timeout) after which the gate gives up. */
const FAILURE_LIMIT = 3

let sequence = 0

function nextId() {
  sequence += 1
  return `together-${Date.now().toString(36)}-${sequence.toString(36)}`
}

function describeRound(challenge, settings) {
  const round = challenge.rounds[challenge.index]
  if (!round) return undefined
  return {
    ...describeChallenge(round.gameId, round.goal),
    attemptSeconds: settings.attemptSeconds,
  }
}

/**
 * @param {object} options
 * @param {ReturnType<import('./settings.js').normalizeSettings>} options.settings
 * @param {(next: object) => Promise<object>} options.save persist + normalize settings
 * @param {() => boolean} [options.hasClient] whether a browser is attached
 * @param {(line: string) => void} [options.log]
 * @param {() => number} [options.now]
 * @param {() => number} [options.rng]
 */
export function createGate({ settings, save, hasClient, history, log = () => {}, now = () => Date.now(), rng = Math.random }) {
  let current = settings
  /** @type {Map<string, number>} sessionId → cooldown end (ms) */
  const cooldowns = new Map()
  /** @type {Map<string, object>} challengeId → challenge */
  const byId = new Map()
  /** @type {Map<string, object>} sessionId → challenge */
  const bySession = new Map()
  const stats = { plays: 0, passes: 0, fails: 0, best: {}, autoPasses: 0, testPasses: 0, lastPassAt: 0 }
  let disposed = false
  /** When set, the next challenge only draws from this pack (used to demo 3D). */
  let demoPack

  function cooldownRemaining(sessionId) {
    const until = sessionId ? cooldowns.get(sessionId) : undefined
    if (until === undefined) return 0
    const remaining = until - now()
    if (remaining <= 0) {
      cooldowns.delete(sessionId)
      return 0
    }
    return remaining
  }

  function settle(challenge, outcome) {
    if (challenge.settled) return
    challenge.settled = true
    byId.delete(challenge.id)
    if (bySession.get(challenge.sessionId) === challenge) bySession.delete(challenge.sessionId)
    challenge.resolve(outcome)
  }

  function makeRounds(settingsNow) {
    const rounds = []
    const used = new Set()
    const count = Math.max(1, Math.min(3, settingsNow.gamesPerChallenge || 1))
    // A demo can pin the pack (e.g. show a 3D game on demand) without touching settings.
    const scoped = demoPack === undefined
      ? settingsNow
      : { ...settingsNow, gamePacks: [demoPack], disabledGames: [] }
    const eligibleIds = eligibleGames(scoped).map((game) => game.id)
    const historicAvoid = history !== undefined
      ? history.avoidSet(eligibleIds, settingsNow.noRepeatWindow)
      : new Set()
    for (let index = 0; index < count; index += 1) {
      const avoid = new Set([...historicAvoid, ...used])
      const gameId = pickGame(scoped, rng, avoid)
      if (gameId === undefined) continue
      used.add(gameId)
      history?.remember(gameId)
      rounds.push({ gameId, goal: goalFor(gameId, settingsNow.difficulty), passed: false })
    }
    return rounds
  }

  return {
    /** Read-only settings snapshot. */
    get settings() {
      return current
    },
    get stats() {
      return stats
    },

    /**
     * Decide whether this tool call has to wait for a game.
     * @param {{ name?: string, arguments?: unknown, agent?: { session?: { id?: string } } }} exec
     */
    inspect(exec) {
      if (disposed) return { gate: false, reason: 'disposed' }
      const verdict = classify(exec, current)
      if (!verdict.gate) return verdict
      if (current.pauseWhenNoClient && typeof hasClient === 'function' && !hasClient()) {
        return { ...verdict, gate: false, reason: 'no-client' }
      }
      if (cooldownRemaining(verdict.sessionId) > 0) return { ...verdict, gate: false, reason: 'cooldown' }
      return verdict
    },

    /** Human-readable cooldown left for one session (ms). */
    cooldownRemaining,

    /**
     * Wait for this tool call's challenge to pass. Resolves with `{ allow, reason }`.
     * Concurrent calls in the same session share one challenge.
     */
    async wait(exec, verdict) {
      if (disposed) return { allow: true, reason: '插件已卸载' }
      // A programmatic dispatch may carry no Agent; fall back to the call's own
      // correlation token so the gate still applies instead of silently allowing it.
      const sessionId = verdict.sessionId ?? exec?.token ?? nextId()
      if (sessionId === undefined) return { allow: true, reason: '无法归属会话' }

      let challenge = bySession.get(sessionId)
      if (challenge === undefined) {
        const rounds = makeRounds(current)
        if (rounds.length === 0) return { allow: true, reason: '没有可用的游戏' }
        let resolve
        const promise = new Promise((done) => { resolve = done })
        challenge = {
          id: nextId(),
          sessionId,
          toolName: verdict.toolName,
          path: verdict.path,
          issuedAt: now(),
          rounds,
          index: 0,
          attempts: 0,
          settled: false,
          resolve,
          promise,
        }
        byId.set(challenge.id, challenge)
        bySession.set(sessionId, challenge)
        stats.plays += 1
        log(`challenge ${challenge.id} for ${verdict.toolName}${verdict.path ? ` (${verdict.path})` : ''}: ${rounds.map((round) => round.gameId).join(' → ')}`)
      }

      const signal = exec?.signal
      const onAbort = () => settle(challenge, { allow: false, reason: '操作已取消，小游戏未通过' })
      if (signal && typeof signal.addEventListener === 'function') {
        if (signal.aborted) onAbort()
        else {
          signal.addEventListener('abort', onAbort, { once: true })
          challenge.promise.finally(() => signal.removeEventListener('abort', onAbort)).catch(() => {})
        }
      }
      return challenge.promise
    },

    /** Report a score for the current round of one challenge. */
    /**
     * Show a challenge that no tool call is waiting on.
     *
     * Used to summon a specific game (the 3D demo) without a real dispatch, because
     * `tools.execute` cannot run without an agent scope. Passing it means the user can
     * look at a game, nothing else; it never fakes a score or a cooldown.
     */
    showDemo(pack) {
      if (disposed) return { ok: false, error: 'disposed' }
      demoPack = typeof pack === 'string' && pack.length > 0 ? pack : undefined
      const rounds = makeRounds(current)
      demoPack = undefined
      if (rounds.length === 0) return { ok: false, error: 'no-eligible-game' }
      const challenge = {
        id: nextId(),
        sessionId: `__demo__${nextId()}`,
        toolName: 'preview',
        rounds,
        index: 0,
        attempts: 0,
        issuedAt: now(),
        waiters: [],
        demo: true,
      }
      byId.set(challenge.id, challenge)
      bySession.set(challenge.sessionId, challenge)
      log(`demo challenge ${challenge.id}: ${rounds[0].gameId}`)
      return {
        ok: true,
        id: challenge.id,
        game: rounds[0].gameId,
        current: describeRound(challenge, current),
      }
    },

    complete(challengeId, gameId, score) {
      const challenge = byId.get(challengeId)
      if (challenge === undefined) return { ok: false, error: 'unknown-challenge' }
      if (challenge.demo === true) {
        byId.delete(challenge.id)
        bySession.delete(challenge.sessionId)
        return { ok: true, passed: true, done: true, demo: true }
      }
      const round = challenge.rounds[challenge.index]
      if (round === undefined) return { ok: false, error: 'no-active-round' }
      if (gameId !== undefined && gameId !== round.gameId) return { ok: false, error: 'game-mismatch' }
      const numeric = Number(score)
      if (!Number.isFinite(numeric) || numeric < 0) return { ok: false, error: 'bad-score' }

      const best = stats.best[round.gameId] ?? 0
      if (numeric > best) stats.best[round.gameId] = Math.round(numeric)

      if (numeric < round.goal.target) {
        return { ok: true, passed: false, done: false, goal: round.goal, current: numeric }
      }
      round.passed = true
      challenge.index += 1
      if (challenge.index < challenge.rounds.length) {
        return { ok: true, passed: true, done: false, next: describeRound(challenge, current) }
      }
      stats.passes += 1
      stats.lastPassAt = now()
      const cooldownMs = Math.max(0, current.cooldownSeconds) * 1000
      if (cooldownMs > 0) cooldowns.set(challenge.sessionId, now() + cooldownMs)
      settle(challenge, { allow: true, reason: 'passed' })
      return { ok: true, passed: true, done: true, cooldownMs }
    },

    /** Swap the current round for a different game. Never advances the goal. */
    switchGame(challengeId) {
      const challenge = byId.get(challengeId)
      if (challenge === undefined) return { ok: false, error: 'unknown-challenge' }
      if (!current.allowGameSwitch) return { ok: false, error: 'switch-disabled' }
      const round = challenge.rounds[challenge.index]
      if (round === undefined) return { ok: false, error: 'no-active-round' }
      const eligibleIds = eligibleGames(current).map((game) => game.id)
      const historicAvoid = history !== undefined
        ? history.avoidSet(eligibleIds, current.noRepeatWindow)
        : new Set()
      const replacement = pickGame(
        current,
        rng,
        new Set([...historicAvoid, round.gameId, ...challenge.rounds.map((entry) => entry.gameId)]),
      )
      if (replacement === undefined) return { ok: false, error: 'no-replacement' }
      history?.remember(replacement)
      round.gameId = replacement
      round.goal = goalFor(replacement, current.difficulty)
      return { ok: true, next: describeRound(challenge, current) }
    },

    /**
     * Record an infrastructure failure (game crashed, or the player never got a
     * workable round). Normal gameplay losses do not come through here.
     */
    reportFailure(challengeId, kind = 'crash') {
      const challenge = byId.get(challengeId)
      if (challenge === undefined) return { ok: false, error: 'unknown-challenge' }
      challenge.attempts += 1
      stats.fails += 1
      if (challenge.attempts >= FAILURE_LIMIT) {
        stats.autoPasses += 1
        log(`challenge ${challenge.id} auto-passed after ${challenge.attempts} ${kind} failures`)
        settle(challenge, { allow: true, reason: '游戏反复失败，已自动放行' })
        return { ok: true, autoPassed: true, attempts: challenge.attempts }
      }
      return { ok: true, autoPassed: false, attempts: challenge.attempts, remaining: FAILURE_LIMIT - challenge.attempts }
    },

    /**
     * Release the waiting call without playing it: the tester's escape hatch.
     *
     * It resolves through the same allow path a real pass uses, but it never records a
     * score and never starts a cooldown, so it cannot silently skip the *next* real
     * change. Disabled by the `testPass` setting.
     */
    forcePass(challengeId) {
      if (!current.testPass) return { ok: false, error: 'test-pass-disabled' }
      const wanted = typeof challengeId === 'string' && challengeId.length > 0 ? challengeId : undefined
      const challenge = wanted !== undefined
        ? byId.get(wanted)
        : [...byId.values()].sort((left, right) => left.issuedAt - right.issuedAt)[0]
      if (challenge === undefined) return { ok: false, error: 'no-pending-challenge' }
      if (challenge.demo === true) {
        byId.delete(challenge.id)
        bySession.delete(challenge.sessionId)
        return { ok: true, released: challenge.id, demo: true }
      }
      stats.testPasses += 1
      log(`challenge ${challenge.id} released by the test escape hatch`)
      settle(challenge, { allow: true, reason: '测试放行' })
      return { ok: true, released: challenge.id, toolName: challenge.toolName }
    },

    /** Drop a session's challenge (turn cancelled, session closed). */
    abortSession(sessionId, reason) {      const challenge = bySession.get(sessionId)
      if (challenge === undefined) return false
      settle(challenge, { allow: false, reason: reason ?? '会话已结束，小游戏未通过' })
      return true
    },

    /** Merge a settings patch, persist it, and use it from the next tool call on. */
    async updateSettings(patch) {
      const candidate = { ...current, ...(patch && typeof patch === 'object' ? patch : {}) }
      const saved = await save(candidate)
      current = saved
      return current
    },

    /** Payload for `GET /x-together/state`. */
    snapshot() {
      const pending = []
      for (const challenge of byId.values()) {
        pending.push({
          id: challenge.id,
          sessionId: challenge.sessionId,
          toolName: challenge.toolName,
          path: challenge.path,
          issuedAt: challenge.issuedAt,
          index: challenge.index,
          total: challenge.rounds.length,
          attempts: challenge.attempts,
          current: describeRound(challenge, current),
        })
      }
      pending.sort((left, right) => left.issuedAt - right.issuedAt)
      const sessionIds = pending.map((entry) => entry.sessionId)
      const eligibleIds = eligibleGames(current).map((game) => game.id)
      return {
        serverTime: now(),
        settings: current,
        pending,
        cooldownRemainingMs: sessionIds.length > 0 ? cooldownRemaining(sessionIds[0]) : 0,
        recent: history?.recent ?? [],
        poolLimited: history !== undefined ? history.limited(eligibleIds, current.noRepeatWindow) : false,
        stats: {
          plays: stats.plays,
          passes: stats.passes,
          fails: stats.fails,
          autoPasses: stats.autoPasses,
          testPasses: stats.testPasses,
          best: { ...stats.best },
        },
        gameCount: eligibleIds.length,
      }
    },

    /** Resolve every outstanding challenge; used on plugin unload. */
    /** Pin the next challenge to one pack ('' clears it). */
    get demoPack() {
      return demoPack
    },
    set demoPack(value) {
      demoPack = typeof value === 'string' && value.length > 0 ? value : undefined
    },

    dispose(reason = '插件已卸载') {
      disposed = true
      for (const challenge of [...byId.values()]) settle(challenge, { allow: false, reason })
      cooldowns.clear()
    },
  }
}
