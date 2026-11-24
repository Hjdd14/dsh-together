/**
 * Which tool calls count as "the agent is about to change my files".
 *
 * Deliberately name/pattern based rather than hooking the filesystem service:
 * the composed FileSystem is also how the Session log persists, and gating that
 * path would either deadlock the harness or double-charge a single edit.
 * `tools/pre-execute` sees every tool call, including PTC sub-dispatches.
 */
import { DEFAULT_OVERRIDES } from './overrides.js'

/** Tools that only ever mutate files (or patch them). */
export const MUTATING_TOOLS = new Set([
  'write',
  'edit',
  'apply_patch',
  'str_replace_editor',
  'create_file',
  'delete_file',
  'move_file',
  'notebook_edit',
  'ops_write_file',
  'ops_edit_file',
  'ops_replace',
  'ops_move',
  'ops_remove',
  'ops_copy',
])

/** Shell-like tools: only gated when the command text looks like a write. */
export const SHELL_TOOLS = new Set([
  'bash',
  'sh',
  'zsh',
  'shell',
  'pwsh',
  'powershell',
  'terminal',
  'run_code',
  'ops_bash',
  'win_bash',
])

/**
 * Tools that mutate something *other* than the workspace, so a file gate must not
 * stop them: chatbot schedules, goals, team/task-board bookkeeping, plugin management.
 */
export const NON_FILE_TOOLS = new Set([
  'create_goal',
  'get_goal',
  'update_goal',
  'schedule_create',
  'schedule_edit',
  'schedule_delete',
  'schedule_list',
  'schedule_view',
  'task_board_create',
  'task_board_update',
  'task_board_manage',
  'task_board_run',
  'team_task_create',
  'team_task_update',
  'plugin_manager',
  'plugin_market',
  'purge_apply',
  'purge_revert',
  'interrupt_agent',
  'job_kill',
  'send_message',
  'spawn_teammate',
  'todo_write',
])

/**
 * Tool names that mutate content whatever preset ships them: `write`, `edit`,
 * `apply_patch`, `ops_write_file`, and the replacement wrappers some tool layers
 * install in front of the native tools (`java-write`, `node-edit`, …).
 */
export const MUTATING_NAME_PATTERN = /(?:^|[-_.])(write|edit|patch|replace|append|truncate|remove|delete|unlink|move|rename|copy)(?:[-_.]|$)/i

/** Command shapes that change something on disk. */
export const SHELL_WRITE_PATTERNS = [
  /(^|[^\d&>])>>?\s*[^\s&|;]/,
  /\btee\b/,
  /\bsed\s+-[a-z]*i/,
  /\brm\s+/,
  /\bmv\s+/,
  /\bcp\s+/,
  /\binstall\s+-m/,
  /\btruncate\b/,
  /\bdd\s+[^\n]*\bof=/,
  /\bpatch\s+-p/,
  /\bgit\s+apply\b/,
  /\bmkdir\s+/,
  /\btouch\s+/,
  /\bchmod\s+/,
  /\bchown\s+/,
  /\bnode\s+-e\b/,
  /\bpython[0-9.]*\s+-c\b/,
  /\bSet-Content\b/i,
  /\bAdd-Content\b/i,
  /\bRemove-Item\b/i,
  /\bOut-File\b/i,
  /\bNew-Item\b/i,
  /\bCopy-Item\b/i,
  /\bMove-Item\b/i,
  // A program passed to `run_code` writes through the host runtime's own fs bindings,
  // not a shell redirect — these are the calls that actually touch the disk.
  /\bwriteFile(?:Sync)?\s*\(/,
  /\bappendFile(?:Sync)?\s*\(/,
  /\bcreateWriteStream\s*\(/,
  /\bunlink(?:Sync)?\s*\(/,
  /\brm(?:Sync)?\s*\(/,
  /\brename(?:Sync)?\s*\(/,
  /\bmkdir(?:Sync)?\s*\(/,
  /\bcopyFile(?:Sync)?\s*\(/,
  /\btruncate(?:Sync)?\s*\(/,
  /\bwriteText\s*\(/,
  /\beditText\s*\(/,
  /\bdeleteFile\s*\(/,
]

const PATH_KEYS = ['path', 'file_path', 'filePath', 'target', 'source', 'dest', 'destination', 'to', 'from', 'new_path', 'newPath']
const COMMAND_KEYS = ['command', 'cmd', 'script', 'code', 'input']

function firstString(object, keys) {
  if (!object || typeof object !== 'object') return undefined
  for (const key of keys) {
    const value = object[key]
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return undefined
}

function compileAll(patterns) {
  const compiled = []
  for (const pattern of patterns ?? []) {
    try {
      compiled.push(new RegExp(pattern, 'i'))
    } catch {
      // Settings validation already dropped invalid patterns; ignore defensively.
    }
  }
  return compiled
}

/**
 * Decide whether one tool execution must pass the game gate.
 *
 * @param {{ name?: string, arguments?: unknown, agent?: { session?: { id?: string } } }} exec
 * @param {ReturnType<import('./settings.js').normalizeSettings>} settings
 * @param {Set<string>} overrides extra tool names treated as mutating
 * @returns {{ gate: false, reason: string } | { gate: true, toolName: string, path: string | undefined, sessionId: string | undefined, reason: string }}
 */
export function classify(exec, settings, overrides = DEFAULT_OVERRIDES) {
  const toolName = typeof exec?.name === 'string' ? exec.name : ''
  const args = exec?.arguments
  const sessionId = exec?.agent?.session?.id
  const path = firstString(args, PATH_KEYS)
  const base = { toolName, path, sessionId }

  if (!settings.enabled) return { gate: false, reason: 'disabled', ...base }
  if (toolName.length === 0) return { gate: false, reason: 'anonymous', ...base }
  // Bookkeeping tools change schedules, goals, or teams — never workspace files.
  if (NON_FILE_TOOLS.has(toolName)) return { gate: false, reason: 'non-file-tool', ...base }

  const excluded = compileAll(settings.excludedPathPatterns)
  if (path !== undefined && excluded.some((pattern) => pattern.test(path))) {
    return { gate: false, reason: 'excluded-path', ...base }
  }

  const extra = compileAll(settings.extraToolPatterns)
  const extraHit = extra.some((pattern) => pattern.test(toolName))
  const renameHit = MUTATING_NAME_PATTERN.test(toolName)

  if (MUTATING_TOOLS.has(toolName) || overrides.has(toolName) || extraHit || renameHit) {
    return {
      gate: true,
      reason: extraHit ? 'extra-pattern' : renameHit && !MUTATING_TOOLS.has(toolName) ? 'mutating-name' : 'mutating-tool',
      ...base,
    }
  }

  if (SHELL_TOOLS.has(toolName)) {
    if (!settings.gateShellTools) return { gate: false, reason: 'shell-tools-off', ...base }
    const command = [firstString(args, COMMAND_KEYS), typeof args === 'string' ? args : undefined]
      .filter((value) => typeof value === 'string')
      .join('\n')
    if (command.length === 0) return { gate: false, reason: 'shell-read', ...base }
    const writeish = SHELL_WRITE_PATTERNS.some((pattern) => pattern.test(command))
    return writeish
      ? { gate: true, reason: 'shell-write', ...base }
      : { gate: false, reason: 'shell-read', ...base }
  }

  return { gate: false, reason: 'not-mutating', ...base }
}
