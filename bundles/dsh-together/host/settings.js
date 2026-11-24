/**
 * Settings persistence for the `dsh-together` bundle.
 *
 * Deliberately NOT a Cordis `Config`: an ordinary Config edit restarts the plugin,
 * which would strand every in-flight gate promise. These values are plain JSON in
 * the profile directory, written atomically, and re-read by the running Host half
 * as soon as a route updates them.
 */
import { readFileSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

import { GAMES, PACKS } from '../shared/catalog.js'

const PACK_IDS = new Set(PACKS.map((pack) => pack.id))
const GAME_IDS = new Set(GAMES.map((game) => game.id))
const DIFFICULTIES = ['relaxed', 'normal', 'strict']

/** Difficulty multipliers applied to a catalog goal target. */
export const DIFFICULTY_FACTORS = { relaxed: 0.7, normal: 1, strict: 1.3 }

/** Bumped whenever a new game pack ships, so old settings pick it up once. */
export const PACKS_VERSION = 2

export const DEFAULTS = Object.freeze({
  enabled: true,
  cooldownSeconds: 60,
  difficulty: 'relaxed',
  gamesPerChallenge: 1,
  gateShellTools: true,
  extraToolPatterns: [],
  excludedPathPatterns: [],
  allowGameSwitch: true,
  attemptSeconds: 90,
  // How many recently shown games to avoid. The hard "never twice in a row" guarantee
  // holds even at 0; this only widens the rotation.
  noRepeatWindow: 12,
  // Default off: `typertGateway.hasLiveClient()` reports false on hosts whose page uses
  // no RPC after a restart, and treating that as "no browser" silently disabled the whole
  // gate. Waiting is recoverable (test-pass button, three-failure auto-pass); letting
  // every change through is not. Turn this on only for a headless profile.
  pauseWhenNoClient: false,
  // Escape hatch for testing and for an unwinnable round: shows a 「测试放行」 control in
  // the overlay and in this settings page that releases the waiting tool call. It never
  // fakes a score, it just resolves the challenge through the same allow path.
  testPass: true,
  gamePacks: PACKS.map((pack) => pack.id),
  disabledGames: [],
  // Bumped when a new pack ships: an older file has no marker, so the new pack is
  // folded in once instead of being silently invisible in every existing install.
  packsVersion: PACKS_VERSION,
})

/** Absolute path of the settings file for this Harness home/profile. */
export function settingsFilePath(env = process.env) {
  const profileDir = env.DSH_PROFILE_DIR?.trim()
  if (profileDir) return join(profileDir, 'dsh-together.json')
  const home = env.DSH_HOME?.trim() || join(homedir(), '.dsh')
  return join(home, 'dsh-together.json')
}

function clampNumber(value, { min, max, fallback }) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function stringArray(value, known, keepWhenUnknown = false) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (trimmed.length === 0) continue
    if (known && !keepWhenUnknown && !known.has(trimmed)) continue
    if (!out.includes(trimmed)) out.push(trimmed)
  }
  return out
}

/** Coerce any input into a complete, in-range settings object. */
export function normalizeSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const storedPacks = stringArray(source.gamePacks, PACK_IDS)
  const storedVersion = Number(source.packsVersion)
  const packs = (Number.isFinite(storedVersion) ? storedVersion : 0) < PACKS_VERSION && storedPacks.length > 0
    ? [...new Set([...storedPacks, ...PACK_IDS])]
    : storedPacks
  const difficulty = DIFFICULTIES.includes(source.difficulty) ? source.difficulty : DEFAULTS.difficulty
  return {
    enabled: source.enabled === undefined ? DEFAULTS.enabled : Boolean(source.enabled),
    cooldownSeconds: Math.round(clampNumber(source.cooldownSeconds, { min: 0, max: 3600, fallback: DEFAULTS.cooldownSeconds })),
    difficulty,
    gamesPerChallenge: Math.round(clampNumber(source.gamesPerChallenge, { min: 1, max: 3, fallback: DEFAULTS.gamesPerChallenge })),
    gateShellTools: source.gateShellTools === undefined ? DEFAULTS.gateShellTools : Boolean(source.gateShellTools),
    extraToolPatterns: stringArray(source.extraToolPatterns).filter((pattern) => {
      try {
        // Validate now so a bad regex cannot break the very next tool call.
        new RegExp(pattern)
        return true
      } catch {
        return false
      }
    }),
    excludedPathPatterns: stringArray(source.excludedPathPatterns).filter((pattern) => {
      try {
        new RegExp(pattern)
        return true
      } catch {
        return false
      }
    }),
    allowGameSwitch: source.allowGameSwitch === undefined ? DEFAULTS.allowGameSwitch : Boolean(source.allowGameSwitch),
    testPass: source.testPass === undefined ? DEFAULTS.testPass : Boolean(source.testPass),
    attemptSeconds: Math.round(clampNumber(source.attemptSeconds, { min: 20, max: 300, fallback: DEFAULTS.attemptSeconds })),
    noRepeatWindow: Math.round(clampNumber(source.noRepeatWindow, { min: 0, max: 40, fallback: DEFAULTS.noRepeatWindow })),
    pauseWhenNoClient: source.pauseWhenNoClient === undefined ? DEFAULTS.pauseWhenNoClient : Boolean(source.pauseWhenNoClient),
    gamePacks: packs.length > 0 ? packs : [...DEFAULTS.gamePacks],
    packsVersion: DEFAULTS.packsVersion,
    disabledGames: stringArray(source.disabledGames, GAME_IDS),
  }
}

/** Read settings, falling back to defaults for a missing or corrupt file. */
export async function loadSettings(file) {
  try {
    const text = await readFile(file, 'utf8')
    return normalizeSettings(JSON.parse(text))
  } catch {
    return normalizeSettings({})
  }
}

/**
 * Synchronous start-up read: `apply` must finish building the gate before the first
 * tool call, and Cordis does not wait for an async `apply`.
 */
export function loadSettingsSync(file) {
  try {
    return normalizeSettings(JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    return normalizeSettings({})
  }
}

/** Atomically replace the settings file. */
export async function saveSettings(file, settings) {
  const normalized = normalizeSettings(settings)
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  await rename(temporary, file)
  return normalized
}
