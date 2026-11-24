/**
 * Which games were shown recently, so the same one cannot come up twice running.
 *
 * The list is persisted next to the settings file, so the guarantee survives a Host
 * restart. It is deliberately separate from user settings: rotating the pool is runtime
 * state, not a preference the user chose.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { homedir } from 'node:os'

/** How many recent ids are remembered (the widest window the settings offer). */
export const HISTORY_LIMIT = 40

function clampWindow(value, eligibleCount) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(HISTORY_LIMIT, Math.floor(parsed), Math.max(0, eligibleCount - 1)))
}

/** Absolute path of the runtime state file, next to the settings file. */
export function historyFilePath(env = process.env) {
  const profileDir = env.DSH_PROFILE_DIR?.trim()
  if (profileDir) return join(profileDir, 'dsh-together.state.json')
  const home = env.DSH_HOME?.trim() || join(homedir(), '.dsh')
  return join(home, 'dsh-together.state.json')
}

/**
 * @param {object} options
 * @param {string} options.file persisted state path
 * @param {(line: string) => void} [options.log]
 */
export function createHistory({ file, log = () => {} }) {
  /** @type {string[]} oldest → newest */
  let recent = []
  let last = undefined
  let saving = undefined
  let timer = undefined
  let disposed = false

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    if (Array.isArray(parsed?.recent)) {
      recent = parsed.recent.filter((id) => typeof id === 'string').slice(-HISTORY_LIMIT)
      last = recent[recent.length - 1]
    }
  } catch {
    // A missing or unreadable state file just means no history yet.
  }

  const persist = () => {
    if (disposed) return
    const payload = `${JSON.stringify({ recent }, null, 2)}\n`
    saving = (async () => {
      try {
        await mkdir(dirname(file), { recursive: true })
        const temporary = `${file}.${process.pid}.tmp`
        await writeFile(temporary, payload, 'utf8')
        await rename(temporary, file)
      } catch (error) {
        log(`history: could not persist (${error?.message ?? error})`)
      }
    })()
  }

  const scheduleSave = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      persist()
    }, 400)
    if (typeof timer.unref === 'function') timer.unref()
  }

  return {
    /** Ids that must not be chosen next, widest first. */
    avoidSet(eligibleIds, windowSize) {
      const eligible = new Set(eligibleIds)
      const window = clampWindow(windowSize, eligible.size)
      const avoid = new Set()
      if (window > 0) {
        for (const id of recent.slice(-window)) if (eligible.has(id)) avoid.add(id)
      }
      // The hard guarantee, independent of the window setting.
      if (last !== undefined && eligible.has(last)) avoid.add(last)
      return avoid
    },

    /** Remember a game that is about to be shown. */
    remember(id) {
      if (typeof id !== 'string' || id.length === 0) return
      recent = [...recent.filter((entry) => entry !== id), id].slice(-HISTORY_LIMIT)
      last = id
      scheduleSave()
    },

    get recent() {
      return [...recent]
    },

    get last() {
      return last
    },

    /** Whether the pool is too small for a comfortable window. */
    limited(eligibleIds, windowSize) {
      return eligibleIds.length <= clampWindow(windowSize, eligibleIds.length) + 1
    },

    async flush() {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
      persist()
      await saving
    },

    async dispose() {
      if (timer !== undefined) clearTimeout(timer)
      disposed = false
      await this.flush()
      disposed = true
    },
  }
}
