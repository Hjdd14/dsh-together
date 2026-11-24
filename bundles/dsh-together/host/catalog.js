/**
 * Host-side game authority: which game a challenge uses and what the pass mark is.
 *
 * The browser never decides whether a challenge passed. It reports a score against
 * a challenge id; the goal below is the only yardstick.
 */
import { GAMES, GAME_BY_ID, HOW_TO, PACKS, howTo } from '../shared/catalog.js'
import { DIFFICULTY_FACTORS } from './settings.js'

export { GAMES, PACKS, GAME_BY_ID, HOW_TO, howTo }

/**
 * Scale one catalog target by the configured difficulty.
 * Relaxed ×0.7 rounds down (a friendlier mark), strict ×1.3 rounds up.
 */
export function scaleTarget(target, difficulty) {
  const factor = DIFFICULTY_FACTORS[difficulty] ?? 1
  const scaled = factor < 1 ? Math.floor(target * factor) : Math.ceil(target * factor)
  return Math.max(1, scaled)
}

/** The pass mark for one game under the current difficulty. */
export function goalFor(gameId, difficulty) {
  const game = GAME_BY_ID.get(gameId)
  if (!game) return undefined
  const [type, target] = game.goal
  return { type, target: scaleTarget(target, difficulty) }
}

/** Games a challenge may pick from under these settings. */
export function eligibleGames(settings) {
  const packs = new Set(settings.gamePacks ?? [])
  const disabled = new Set(settings.disabledGames ?? [])
  return GAMES.filter((game) => packs.has(game.pack) && !disabled.has(game.id))
}

/** Pick one eligible game id; undefined when every game is filtered out. */
export function pickGame(settings, rng = Math.random, avoid = undefined) {
  const pool = eligibleGames(settings)
  if (pool.length === 0) return undefined
  const avoidSet = avoid instanceof Set ? avoid : new Set(avoid ?? [])
  const fresh = avoidSet.size > 0 ? pool.filter((game) => !avoidSet.has(game.id)) : pool
  const source = fresh.length > 0 ? fresh : pool
  return source[Math.floor(rng() * source.length)].id
}

/** Payload shape the overlay renders, including the already-scaled goal. */
export function describeChallenge(gameId, goal) {
  const game = GAME_BY_ID.get(gameId)
  if (!game || !goal) return undefined
  return {
    id: game.id,
    pack: game.pack,
    name: { zh: game.zh, en: game.en },
    brief: { zh: game.bz, en: game.be },
    // One short line explaining the controls, shown above the game window.
    how: howTo(gameId),
    controls: game.c,
    goal,
  }
}
