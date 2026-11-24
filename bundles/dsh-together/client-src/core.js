/* ════════════════════════════════════════════════════════════════════════════
 * Client half of @hjdd14/dsh-together.
 *
 * Built by `build.mjs` into `lib/client.js`: this file is concatenated after the
 * catalog block and before the game files, all inside one module factory. Games
 * reach this scope only through `defineGame`, and the shell reaches the Host half
 * through the `/x-together/*` routes.
 * ═══════════════════════════════════════════════════════════════════════════ */

const TG_NS = 'dshTogether'
const TG_ROUTE = '/x-together'

/* ── copy ─────────────────────────────────────────────────────────────────── */

const TG_ZH = {
  'nav': '工作中小游戏',
  'title': 'Agent 正在等你通关',
  'subtitle': '修改文件之前，先玩一局。通关后 Agent 会立刻继续。',
  'blockedCall': '被拦下的操作',
  'round': '第 {index}/{total} 局',
  'goal.score': '目标分数',
  'goal.count': '目标',
  'goal.survive': '坚持',
  'unit.second': '秒',
  'passed': '通过！Agent 继续执行。',
  'nextRound': '下一局…',
  'retry': '重来',
  'switch': '换一个游戏',
  'pause': '暂停',
  'resume': '继续',
  'timeLeft': '剩余 {seconds}s',
  'crashed': '这个游戏出错了，换一个继续。',
  'unsupported3d': '这个 3D 游戏在当前环境没有 WebGL，换一个继续。',
  'timeUp': '时间到，再来一次。',
  'lost': '这局没通过，再来一次。',
  'blockedNote': '只有通关才会放行；按 Esc 只是暂停。',
  'offline': '与主进程断开，正在重试…',
  'loading': '加载中…',
  'cooldown': '冷却中，{seconds}s 内不再弹出',
  'play': '开始',
  'trial': '试玩结束',
  'trialNote': '试玩不影响 Agent 的放行。',
  'controls.arrows': '方向键',
  'controls.space': '空格',
  'controls.click': '点击',
  'controls.drag': '拖动',
  'controls.keys': '字母 / 数字键',
  'controls.type': '键盘输入',
  'controls.mixed': '混合操作',
  'settings.enabled': '启用拦截图游戏',
  'settings.enabled.hint': '关闭后 Agent 修改文件不会再被打断。',
  'settings.cooldown': '冷却时间（秒）',
  'settings.cooldown.hint': '通关后的免打扰时长；0 表示每次修改都要玩。',
  'settings.difficulty': '难度',
  'settings.difficulty.relaxed': '轻松',
  'settings.difficulty.normal': '标准',
  'settings.difficulty.strict': '严格',
  'settings.rounds': '一次挑战几局',
  'settings.rounds.hint': '1–3 局连玩，全部通过才放行。',
  'settings.noRepeat': '不重复窗口',
  'settings.noRepeat.hint': '最近这么多个游戏不再出现；0 表示只保证不连续重复同一个。',
  'selfCheck.ok': '拦截器已生效',
  'selfCheck.stale': '拦截器未生效（需要重启 dsh 或重新安装插件）',
  'selfCheck.pending': '检测中…',
  'selfCheck.mounted': '已挂载，等一次验证（点「验证拦截」）',
  'selfCheck.demo': '验证拦截',
  'selfCheck.demo.running': '验证中…（会弹出一局）',
  'selfCheck.demo.hint': '让插件真的发起一次写文件，验证拦截链路是否生效。',
  'selfCheck.demo3d': '看一个 3D 游戏',
  'selfCheck.demo3d.running': '正在调起 3D…',
  'selfCheck.demo3d.hint': '同样会发起一次写文件，但强制抽 3D 包，用来检查立体画面。',
  'selfCheck.demo.shown': '已调起 {game}',
  'selfCheck.demo.failed': '验证失败：{error}',
  'selfCheck.pool': '可选游戏 {count} 个',
  'selfCheck.limited': '可选游戏太少，无法完全避免重复',
  'settings.attempt': '单局时限（秒）',
  'settings.attempt.hint': '超时不判通过，只提示重来或换一局。',
  'settings.shell': '也拦截写文件的命令',
  'settings.shell.hint': '只对 bash / pwsh 里看起来会写文件的命令生效。',
  'settings.switchGame': '允许「换一个游戏」',
  'settings.noClient': '没有浏览器时直接放行',
  'settings.noClient.hint': '避免无人在场时把会话永久卡住。',
  'settings.extraTools': '额外拦截的工具名（正则，每行一个）',
  'settings.excludedPaths': '放行的路径（正则，每行一个）',
  'settings.packs': '参与的游戏包',
  'settings.disabledGames': '禁用的单个游戏',
  'settings.gamesCount': '{count} 个游戏可用',
  'settings.stats': '统计',
  'settings.stats.plays': '累计弹出',
  'settings.stats.passes': '累计通关',
  'settings.stats.fails': '故障次数',
  'settings.stats.auto': '自动放行',
  'settings.saving': '保存中…',
  'settings.saved': '已保存',
  'settings.failed': '保存失败：{error}',
  'settings.try': '试玩一局',
  'settings.resetPacks': '全选',
  'settings.toggleList': '展开/收起',
  'settings.unknownGame': '未知游戏',
  'testPass': '测试放行',
  'testPass.hint': '不玩直接放行这次修改；不记分数、不产生冷却。',
  'testPass.done': '已放行，Agent 继续执行。',
  'testPass.none': '当前没有等待中的修改。',
  'testPass.failed': '放行失败：{error}',
  'settings.testPass': '显示「测试放行」后门',
  'settings.testPass.hint': '在浮层和本页显示一个直接放行按钮，用于调试或不方便玩的时候，避免把自己卡住。',
  'settings.testPass.now': '放行当前等待',
  'settings.autoPause': '页面不在前台时自动暂停计时',
}

const TG_EN = {
  'nav': 'Work games',
  'title': 'The agent is waiting for you',
  'subtitle': 'Play one round before the file change goes through. Passing resumes the agent immediately.',
  'blockedCall': 'Blocked call',
  'round': 'Round {index}/{total}',
  'goal.score': 'Target score',
  'goal.count': 'Target',
  'goal.survive': 'Survive',
  'unit.second': 's',
  'passed': 'Passed! The agent continues.',
  'nextRound': 'Next round…',
  'retry': 'Retry',
  'switch': 'Another game',
  'pause': 'Pause',
  'resume': 'Resume',
  'timeLeft': '{seconds}s left',
  'crashed': 'This game broke. Switch to another one.',
  'unsupported3d': 'This 3D game needs WebGL, which is not available here. Switch to another one.',
  'timeUp': "Time's up, one more try.",
  'lost': 'Not this time, try again.',
  'blockedNote': 'Only a pass lets it through; Esc just pauses.',
  'offline': 'Lost the host, retrying…',
  'loading': 'Loading…',
  'cooldown': 'Cooling down, no prompt for {seconds}s',
  'play': 'Play',
  'trial': 'Trial over',
  'trialNote': 'A trial never releases the agent.',
  'controls.arrows': 'Arrow keys',
  'controls.space': 'Space',
  'controls.click': 'Click',
  'controls.drag': 'Drag',
  'controls.keys': 'Letter / number keys',
  'controls.type': 'Type',
  'controls.mixed': 'Mixed',
  'settings.enabled': 'Intercept file changes with a game',
  'settings.enabled.hint': 'When off, the agent never stops for a game.',
  'settings.cooldown': 'Cooldown (seconds)',
  'settings.cooldown.hint': 'Quiet time after a pass; 0 asks for a game every change.',
  'settings.difficulty': 'Difficulty',
  'settings.difficulty.relaxed': 'Relaxed',
  'settings.difficulty.normal': 'Normal',
  'settings.difficulty.strict': 'Strict',
  'settings.rounds': 'Rounds per challenge',
  'settings.rounds.hint': '1–3 rounds; every round must pass.',
  'settings.noRepeat': 'No-repeat window',
  'settings.noRepeat.hint': 'How many recent games to keep out of the pool; 0 still guarantees never twice in a row.',
  'selfCheck.ok': 'Interceptor is active',
  'selfCheck.stale': 'Interceptor is not attached (restart dsh or reinstall the plugin)',
  'selfCheck.pending': 'Checking…',
  'selfCheck.mounted': 'Mounted, waiting for one verification (press "Verify")',
  'selfCheck.demo': 'Verify interception',
  'selfCheck.demo.running': 'Verifying… (a game will pop up)',
  'selfCheck.demo.hint': 'Have the plugin dispatch a real file write to prove the gate is wired.',
  'selfCheck.demo3d': 'Show a 3D game',
  'selfCheck.demo3d.running': 'Opening 3D…',
  'selfCheck.demo3d.hint': 'Same write, but drawn from the 3D pack, so you can check the 3D picture.',
  'selfCheck.demo.shown': 'Showing {game}',
  'selfCheck.demo.failed': 'Verification failed: {error}',
  'selfCheck.pool': '{count} games available',
  'selfCheck.limited': 'Pool too small to avoid repeats entirely',
  'settings.attempt': 'Round limit (seconds)',
  'settings.attempt.hint': 'A timeout never passes; it only offers retry or another game.',
  'settings.shell': 'Also intercept file-writing commands',
  'settings.shell.hint': 'Only bash / pwsh commands that look like writes.',
  'settings.switchGame': 'Allow "another game"',
  'settings.noClient': 'Let calls through with no browser',
  'settings.noClient.hint': 'Keeps a session from waiting forever with nobody watching.',
  'settings.extraTools': 'Extra tool names (regex, one per line)',
  'settings.excludedPaths': 'Excluded paths (regex, one per line)',
  'settings.packs': 'Game packs in rotation',
  'settings.disabledGames': 'Disabled games',
  'settings.gamesCount': '{count} games available',
  'settings.stats': 'Statistics',
  'settings.stats.plays': 'Challenges',
  'settings.stats.passes': 'Passed',
  'settings.stats.fails': 'Failures',
  'settings.stats.auto': 'Auto-passed',
  'settings.saving': 'Saving…',
  'settings.saved': 'Saved',
  'settings.failed': 'Could not save: {error}',
  'settings.try': 'Try one round',
  'settings.resetPacks': 'Select all',
  'settings.toggleList': 'Show / hide',
  'settings.unknownGame': 'Unknown game',
  'testPass': 'Test pass',
  'testPass.hint': 'Releases this change without playing; no score, no cooldown.',
  'testPass.done': 'Released. The agent continues.',
  'testPass.none': 'Nothing is waiting right now.',
  'testPass.failed': 'Release failed: {error}',
  'settings.testPass': 'Show the "test pass" back door',
  'settings.testPass.hint': 'Adds a direct release button to the overlay and this page, so testing or an unwinnable round never locks you out.',
  'settings.testPass.now': 'Release what is waiting',
  'settings.autoPause': 'Pause the round while the page is in the background',
}

/* ── tiny helpers ─────────────────────────────────────────────────────────── */

function tgFormat(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (whole, key) => (params && key in params ? String(params[key]) : whole))
}

function useLocaleId(ctx) {
  try {
    const snapshot = ctx.locale.getLocale()
    const raw = String(snapshot?.id ?? snapshot?.locale ?? snapshot?.current ?? 'en').toLowerCase()
    // Only two languages are shipped for game text and the plugin UI; anything else
    // that starts with `zh` still means Simplified Chinese.
    return raw.startsWith('zh') ? 'zh' : 'en'
  } catch {
    return 'en'
  }
}

/** Interceptor health, refreshed slowly: a silent miss is the worst failure mode. */
function useSelfCheck() {
  const [report, setReport] = React.useState(null)
  React.useEffect(() => {
    let stopped = false
    const tick = async () => {
      if (stopped) return
      try {
        const payload = await tgGet('self-check')
        if (!stopped) setReport(payload)
      } catch {
        if (!stopped) setReport(null)
      }
      if (!stopped) window.setTimeout(tick, 5000)
    }
    tick()
    return () => { stopped = true }
  }, [])
  return report
}

/**
 * The language game text should use, derived from the locale service's own answer.
 *
 * Reading `getLocale()` directly was unreliable (its snapshot shape is not part of the
 * plugin contract), which is why an English explanation appeared under a Chinese UI.
 * Asking the bound translator for a known string cannot be wrong: if it comes back in
 * Chinese, the active language is Chinese.
 */
function useGameLang(ctx, t) {
  const [, bump] = React.useState(0)
  React.useEffect(() => ctx.locale.subscribe(() => bump((value) => value + 1)), [ctx])
  return t('nav') === TG_ZH['nav'] ? 'zh' : 'en'
}

function tgName(value, localeId) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[localeId] ?? value.en ?? value.zh ?? ''
}

function tgControl(t, code) {
  const key = `controls.${code}`
  return t(key) === key ? t('controls.click') : t(key)
}

/* ── styles ───────────────────────────────────────────────────────────────── */

const TG_CSS = `
.tg-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:2147483000;
  background:rgba(8,10,14,.58);backdrop-filter:blur(2px);pointer-events:none}
.tg-panel{pointer-events:auto;width:min(560px,94vw);max-height:92vh;overflow:auto;box-sizing:border-box;
  background:var(--dsw-alias-bg-layer-1,#161a1f);color:var(--dsw-alias-label-primary,#e8eaed);
  border:1px solid var(--dsw-alias-border-l3,rgba(255,255,255,.12));border-radius:14px;
  padding:16px 18px 14px;box-shadow:0 24px 60px rgba(0,0,0,.45);
  font-size:13px;line-height:1.45}
.tg-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:2px}
.tg-title{font-size:15px;font-weight:600;letter-spacing:.01em}
.tg-round{color:var(--dsw-alias-label-tertiary,#9aa3ad);font-size:12px;white-space:nowrap}
.tg-sub{color:var(--dsw-alias-label-secondary,#b6bcc4);font-size:12px;margin:0 0 10px}
.tg-call{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px;font-size:12px;
  color:var(--dsw-alias-label-secondary,#b6bcc4)}
.tg-chip{background:var(--dsw-alias-bg-module-platform,rgba(255,255,255,.06));
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));border-radius:6px;
  padding:1px 7px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;
  color:var(--dsw-alias-label-primary,#e8eaed);max-width:44ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tg-hud{display:flex;align-items:center;gap:12px;font-variant-numeric:tabular-nums;
  margin:0 0 8px;color:var(--dsw-alias-label-secondary,#b6bcc4);font-size:12px;min-height:18px}
.tg-hud b{color:var(--dsw-alias-label-primary,#e8eaed);font-weight:600}
.tg-hud .tg-grow{flex:1}
.tg-stage{position:relative;border-radius:10px;overflow:hidden;background:#0d1015;
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));aspect-ratio:4/3;
  pointer-events:auto;cursor:pointer}
.tg-btn-sm{padding:3px 9px;font-size:11px;border-radius:6px}
.tg-stage canvas{display:block;width:100%;height:100%;touch-action:none;outline:none;pointer-events:auto}
.tg-veil{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:8px;background:rgba(8,10,14,.72);color:#f2f5f8;text-align:center;padding:16px}
.tg-how{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#b6bcc4);
  background:var(--dsw-alias-bg-module-platform,rgba(255,255,255,.05));
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.08));border-radius:7px;
  padding:6px 10px;margin:0 0 8px}
.tg-veil .tg-veil-title{font-size:15px;font-weight:600}
.tg-veil .tg-veil-note{font-size:12px;color:#b9c2cc;max-width:34ch}
.tg-foot{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
.tg-grow{flex:1}
.tg-btn{appearance:none;border:1px solid var(--dsw-alias-border-l3,rgba(255,255,255,.14));
  background:var(--dsw-alias-bg-module-platform,rgba(255,255,255,.05));
  color:var(--dsw-alias-label-primary,#e8eaed);border-radius:8px;padding:5px 11px;font-size:12px;
  cursor:pointer;font-family:inherit}
.tg-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.09))}
.tg-btn:disabled{opacity:.5;cursor:default}
.tg-btn.tg-primary{background:var(--dsw-alias-button-primary-fill,#2f6fed);border-color:transparent;color:#fff}
.tg-btn.tg-primary:hover{background:var(--dsw-alias-button-primary-hover,#2a63d4)}
.tg-note{color:var(--dsw-alias-label-tertiary,#9aa3ad);font-size:11px}
.tg-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#9aa3ad;flex:0 0 auto}
.tg-banner{margin-top:8px;padding:6px 10px;border-radius:8px;font-size:12px;
  background:var(--dsw-alias-state-success-secondary,rgba(70,180,110,.16));
  color:var(--dsw-alias-state-success-primary,#4ac17a)}
.tg-warn{margin-top:8px;padding:6px 10px;border-radius:8px;font-size:12px;
  background:var(--dsw-alias-state-warn-secondary,rgba(230,170,60,.16));
  color:var(--dsw-alias-state-warn-label,#e0aa4c)}
.tg-settings{display:flex;flex-direction:column;gap:2px;padding-bottom:24px;max-width:720px}
.tg-settings h2{font-size:15px;font-weight:600;margin:0 0 2px}
.tg-settings .tg-lead{color:var(--dsw-alias-label-secondary,#b6bcc4);font-size:12px;margin:0 0 14px}
.tg-card{border:1px solid var(--dsw-alias-settings-card-stroke,rgba(255,255,255,.1));
  background:var(--dsw-alias-settings-card-fill,transparent);border-radius:10px;
  padding:12px 14px;margin-bottom:10px}
.tg-row{display:flex;align-items:flex-start;gap:16px;padding:7px 0}
.tg-row + .tg-row{border-top:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.07))}
.tg-row-main{flex:1;min-width:0}
.tg-row-label{font-size:13px;color:var(--dsw-alias-label-primary,#e8eaed)}
.tg-row-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#9aa3ad);margin-top:2px}
.tg-row-side{flex:0 0 auto;display:flex;align-items:center;gap:8px}
.tg-switch{width:38px;height:22px;border-radius:999px;border:1px solid var(--dsw-alias-border-l3,rgba(255,255,255,.16));
  background:var(--dsw-alias-bg-module-platform,rgba(255,255,255,.06));position:relative;cursor:pointer;padding:0}
.tg-switch[aria-checked="true"]{background:var(--dsw-alias-button-primary-fill,#2f6fed);border-color:transparent}
.tg-switch i{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;
  transition:transform .15s ease}
.tg-switch[aria-checked="true"] i{transform:translateX(16px)}
.tg-input{background:var(--dsw-alias-bg-module-platform,rgba(255,255,255,.05));
  border:1px solid var(--dsw-alias-border-l3,rgba(255,255,255,.14));border-radius:7px;
  color:var(--dsw-alias-label-primary,#e8eaed);font-family:inherit;font-size:12px;padding:4px 8px;width:88px}
.tg-input.tg-wide{width:100%;max-width:420px}
.tg-input.tg-area{min-height:54px;resize:vertical;width:100%;max-width:420px;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}
.tg-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l3,rgba(255,255,255,.14));border-radius:8px;overflow:hidden}
.tg-seg button{appearance:none;background:transparent;border:0;color:var(--dsw-alias-label-secondary,#b6bcc4);
  font:inherit;font-size:12px;padding:4px 10px;cursor:pointer}
.tg-seg button[aria-pressed="true"]{background:var(--dsw-alias-button-primary-fill,#2f6fed);color:#fff}
.tg-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px 12px;margin-top:6px}
.tg-list label{display:flex;gap:6px;align-items:center;font-size:12px;
  color:var(--dsw-alias-label-secondary,#b6bcc4);cursor:pointer}
.tg-grid-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
.tg-stat{background:var(--dsw-alias-bg-module-platform,rgba(255,255,255,.05));border-radius:8px;padding:8px 10px}
.tg-stat b{display:block;font-size:17px;color:var(--dsw-alias-label-primary,#e8eaed);font-variant-numeric:tabular-nums}
.tg-stat span{font-size:11px;color:var(--dsw-alias-label-tertiary,#9aa3ad)}
.tg-error{color:var(--dsw-alias-state-error-primary,#e5675f);font-size:12px}
.tg-trial{margin-top:10px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.07))}
`

/* ── engine ───────────────────────────────────────────────────────────────── */

const TG_ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
const TG_WASD = { w: 'up', a: 'left', s: 'down', d: 'right' }
const TG_NAMED = { ' ': 'space', Spacebar: 'space', Enter: 'enter', Escape: 'escape', Shift: 'shift' }

/** Normalize a DOM key event into the plain key names games receive. */
function tgKeyNames(event) {
  const key = event.key
  if (TG_NAMED[key]) return [TG_NAMED[key]]
  if (TG_ARROWS[key]) return [TG_ARROWS[key]]
  if (typeof key === 'string' && key.length === 1) {
    const lower = key.toLowerCase()
    if (!/[a-z0-9]/.test(lower)) return []
    const movement = TG_WASD[lower]
    return movement ? [lower, movement] : [lower]
  }
  return []
}

function tgMulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TG_COLORS = {
  bg: '#0d1015', panel: '#161c24', fg: '#e8eef6', dim: '#8fa0b4',
  accent: '#6aa9ff', accent2: '#ffcf5c', warn: '#ff7a7a', good: '#8bdc7a',
}


/**
 * One playable round: owns the canvas, the game instance and the HUD.
 * The parent owns challenge bookkeeping (pass/fail reporting, switching games).
 */
function GameStage({ definition, game, attemptSeconds, paused, restartKey, t, onPass, onFail }) {
  const canvasRef = React.useRef(null)
  const [hud, setHud] = React.useState({ value: 0, target: game.goal.target, status: '', end: null, seconds: 0 })
  const [sessionKey, setSessionKey] = React.useState(0)
  const callbacks = React.useRef({ onPass, onFail })
  callbacks.current = { onPass, onFail }
  const pausedRef = React.useRef(paused)
  pausedRef.current = paused

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const goal = game.goal
    // A canvas carries one context type for its lifetime, so the game's declared mode
    // decides it once, here. 3D games get WebGL and no 2D context at all.
    const is3d = definition.mode === '3d'
    const api2d = is3d ? null : canvas.getContext('2d')
    if (!is3d && !api2d) return undefined
    const gl = is3d ? (canvas.getContext('webgl', { alpha: false, antialias: true }) || canvas.getContext('experimental-webgl')) : null
    if (is3d && !gl) {
      console.error(`[dsh-together] ${game.id} needs WebGL, which this surface does not provide`)
      setHud({ value: 0, target: goal.target, status: '', end: 'unsupported', seconds: 0 })
      reportFail('unsupported')
      return undefined
    }
    const gl3d = is3d ? tgCreateGl3d(gl) : null

    const cssWidth = 480
    const cssHeight = 360
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
    canvas.width = Math.round(cssWidth * dpr)
    canvas.height = Math.round(cssHeight * dpr)
    if (is3d) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LEQUAL)
      gl.clearColor(0.04, 0.06, 0.09, 1)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    } else {
      api2d.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const startedAt = performance.now()
    const keySubs = new Set()
    const pointerSubs = new Set()
    const held = new Set()
    const store = new Map()
    const rng = tgMulberry32(((Date.now() ^ (game.id.length * 2654435761)) >>> 0) || 1)
    let score = 0
    let progress = 0
    let elapsedMs = 0
    let status = ''
    let ended = null
    let reported = false
    let rafId = 0
    let lastFrame = 0
    let lastHudAt = 0
    let disposed = false

    const reportFail = (kind) => {
      if (reported) return
      reported = true
      callbacks.current.onFail?.(kind)
    }
    const reportPass = (value) => {
      if (reported) return
      reported = true
      callbacks.current.onPass?.(value)
    }
    const stop = (end) => {
      if (ended !== null) return
      ended = end
      setHud((previous) => ({ ...previous, end, value: currentValue() }))
    }
    function currentValue() {
      if (goal.type === 'survive') return elapsedMs / 1000
      if (goal.type === 'score') return score
      return progress
    }

    let instance
    const api = {
      w: cssWidth,
      h: cssHeight,
      g: api2d,
      // 3D capability surface (only meaningful when `mode: '3d'`).
      gl,
      gl3d,
      depth: tgDepth(cssWidth, cssHeight),
      mode: is3d ? '3d' : '2d',
      attemptSeconds,
      dt: 0,
      colors: TG_COLORS,
      rng: () => rng(),
      rnd: (min = 0, max = 1) => min + rng() * (max - min),
      irnd: (min, max) => min + Math.floor(rng() * (Math.floor(max) - Math.ceil(min) + 1)),
      pick: (list) => (Array.isArray(list) && list.length > 0 ? list[Math.floor(rng() * list.length)] : undefined),
      now: () => performance.now() - startedAt,
      score: (amount) => { score += Math.max(0, Number(amount) || 0) },
      progress: (amount = 1) => { progress += Math.max(0, Number(amount) || 0) },
      setStatus: (text) => { status = String(text ?? '') },
      win: () => stop('won'),
      lose: () => stop('lost'),
      onKey: (fn) => {
        if (typeof fn !== 'function') return () => {}
        keySubs.add(fn)
        return () => keySubs.delete(fn)
      },
      onPointer: (fn) => {
        if (typeof fn !== 'function') return () => {}
        pointerSubs.add(fn)
        return () => pointerSubs.delete(fn)
      },
      down: (key) => held.has(key),
      storage: {
        get: (key, fallback) => (store.has(key) ? store.get(key) : fallback),
        set: (key, value) => { store.set(key, value) },
      },
      clear: (color) => {
        if (is3d) {
          gl3d.clear(color ?? '#0b1016')
          return
        }
        api2d.fillStyle = color ?? TG_COLORS.bg
        api2d.fillRect(0, 0, cssWidth, cssHeight)
      },
      rect: (x, y, w, hgt, color) => {
        if (is3d) return
        api2d.fillStyle = color ?? TG_COLORS.fg
        api2d.fillRect(x, y, w, hgt)
      },
      circle: (x, y, r, color) => {
        if (is3d) return
        api2d.fillStyle = color ?? TG_COLORS.fg
        api2d.beginPath()
        api2d.arc(x, y, Math.max(0, r), 0, Math.PI * 2)
        api2d.fill()
      },
      text: (text, x, y, options = {}) => {
        // A WebGL surface has no 2D drawing; 3D games report through the HUD instead.
        if (is3d) return
        api2d.fillStyle = options.color ?? TG_COLORS.fg
        api2d.font = `${options.weight ?? 'normal'} ${options.size ?? 16}px ui-sans-serif, system-ui, sans-serif`
        api2d.textAlign = options.align ?? 'left'
        api2d.textBaseline = options.baseline ?? 'middle'
        api2d.fillText(String(text), x, y)
      },
    }

    try {
      instance = definition.create(api)
      if (!instance || typeof instance.update !== 'function' || typeof instance.draw !== 'function') {
        throw new Error('create() must return { update, draw }')
      }
    } catch (error) {
      console.error(`[dsh-together] ${game.id} failed to start`, error)
      setHud({ value: 0, target: goal.target, status: '', end: 'crashed', seconds: 0 })
      reportFail('crash')
      return undefined
    }

    const onKeyDown = (event) => {
      const names = tgKeyNames(event)
      if (names.length === 0) return
      if (names.includes('left') || names.includes('right') || names.includes('up') || names.includes('down') || names.includes('space')) {
        if (event.target === document.body || event.target === canvas) event.preventDefault()
      }
      for (const name of names) {
        if (event.repeat && !held.has(name)) continue
        held.add(name)
        for (const fn of keySubs) fn(name, true, event)
      }
    }
    const onKeyUp = (event) => {
      for (const name of tgKeyNames(event)) {
        held.delete(name)
        for (const fn of keySubs) fn(name, false, event)
      }
    }
    const pointerAt = (event) => {
      const box = canvas.getBoundingClientRect()
      const scaleX = box.width > 0 ? cssWidth / box.width : 1
      const scaleY = box.height > 0 ? cssHeight / box.height : 1
      return { x: (event.clientX - box.left) * scaleX, y: (event.clientY - box.top) * scaleY }
    }
    let dragging = false
    let lastDownStamp = 0
    let lastMoveStamp = 0
    let lastUpStamp = 0
    // A real click delivers pointerdown AND mousedown; the automation surface sometimes
    // delivers only the mouse pair. Both paths feed the game, with a guard so one
    // physical click is never counted twice.
    const onPointerDown = (event) => {
      const stamp = Date.now()
      if (stamp - lastDownStamp < 45) return
      lastDownStamp = stamp
      canvas.focus?.()
      dragging = true
      const at = pointerAt(event)
      for (const fn of pointerSubs) fn({ ...at, type: 'down', dragging })
      event.preventDefault()
    }
    const onPointerMove = (event) => {
      const stamp = Date.now()
      if (stamp - lastMoveStamp < 12) return
      lastMoveStamp = stamp
      const at = pointerAt(event)
      for (const fn of pointerSubs) fn({ ...at, type: 'move', dragging })
    }
    const onPointerUp = (event) => {
      const stamp = Date.now()
      if (stamp - lastUpStamp < 45) return
      lastUpStamp = stamp
      const at = pointerAt(event)
      dragging = false
      for (const fn of pointerSubs) fn({ ...at, type: 'up', dragging: false })
    }

    // Listen on the stage wrapper, not the canvas: the frame-wide overlay layer is
    // click-through by design, and a canvas child in that layer was dropping the
    // pointer edge. Events bubble from the canvas to the stage, so a wrapper listener
    // receives everything while the coordinates stay canvas-relative.
    const stage = canvas.parentElement ?? canvas
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('mousedown', onPointerDown)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('mousemove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('mouseup', onPointerUp)

    const frame = (timestamp) => {
      if (disposed) return
      rafId = window.requestAnimationFrame(frame)
      if (lastFrame === 0) lastFrame = timestamp
      const rawDt = (timestamp - lastFrame) / 1000
      lastFrame = timestamp
      if (ended !== null) return
      if (pausedRef.current) {
        // Keep the last frame on screen, but do not advance the clock.
        return
      }
      // A round must not burn its attempt while nobody can see it: leaving the tab in
      // the background pauses the clock exactly like the pause button.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        lastFrame = timestamp
        return
      }
      const dt = Math.min(0.05, Math.max(0.001, rawDt))
      api.dt = dt
      elapsedMs += dt * 1000
      try {
        instance.update(dt)
        if (is3d) {
          gl.viewport(0, 0, canvas.width, canvas.height)
          instance.draw(gl)
        } else {
          api2d.save()
          api2d.fillStyle = TG_COLORS.bg
          api2d.fillRect(0, 0, cssWidth, cssHeight)
          instance.draw(api2d)
          api2d.restore()
        }
      } catch (error) {
        console.error(`[dsh-together] ${game.id} crashed mid-round`, error)
        stop('crashed')
        reportFail('crash')
        return
      }
      if (ended === null) {
        if (currentValue() >= goal.target) stop('won')
        else if (elapsedMs / 1000 >= attemptSeconds) {
          stop('timeout')
          reportFail('timeout')
        }
      }
      if (timestamp - lastHudAt > 90) {
        lastHudAt = timestamp
        setHud({ value: currentValue(), target: goal.target, status, end: ended, seconds: Math.max(0, Math.ceil(attemptSeconds - elapsedMs / 1000)) })
      }
      if (ended === 'won') reportPass(goal.type === 'survive' ? goal.target : currentValue())
    }
    rafId = window.requestAnimationFrame(frame)
    setHud({ value: 0, target: goal.target, status: '', end: null, seconds: attemptSeconds })

    return () => {
      disposed = true
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      try {
        instance.dispose?.()
      } catch {
        // A game's disposer must never break teardown.
      }
    }
  }, [game.id, game.goal.type, game.goal.target, attemptSeconds, restartKey, sessionKey])

  const value = game.goal.type === 'survive'
    ? `${Math.min(hud.seconds !== undefined ? attemptSeconds - hud.seconds : 0, game.goal.target).toFixed(0)}`
    : `${Math.floor(hud.value)}`
  const label = game.goal.type === 'score' ? t('goal.score') : game.goal.type === 'survive' ? t('goal.survive') : t('goal.count')
  const targetText = game.goal.type === 'survive'
    ? `${game.goal.target}${t('unit.second')}`
    : `${game.goal.target}`

  return h('div', null,
    h('div', { className: 'tg-hud' },
      h('span', null, label, ' ', h('b', null, targetText)),
      h('span', null, '·'),
      h('span', null, game.goal.type === 'survive' ? '' : `${Math.floor(hud.value)}`),
      hud.status ? h('span', { className: 'tg-chip' }, hud.status) : null,
      h('span', { className: 'tg-grow' }),
      hud.end === null ? h('span', null, hud.seconds === undefined ? '' : t('timeLeft', { seconds: hud.seconds })) : null,
    ),
    h('div', { className: 'tg-stage' },
      h('canvas', { ref: canvasRef, tabIndex: 0, 'aria-label': tgName(game.name, 'en') }),
      hud.end === null ? null : h('div', { className: 'tg-veil' },
        h('div', { className: 'tg-veil-title' },
          hud.end === 'won' ? t('passed')
            : hud.end === 'crashed' ? t('crashed')
              : hud.end === 'unsupported' ? t('unsupported3d')
                : hud.end === 'timeout' ? t('timeUp')
                  : t('lost')),
        h('div', { className: 'tg-veil-note' },
          hud.end === 'won' ? t('nextRound') : t('blockedNote')),
        hud.end === 'won' ? null : h('button', {
          className: 'tg-btn tg-primary',
          onClick: () => { setSessionKey((value2) => value2 + 1) },
        }, t('retry')),
      ),
    ),
    h('div', { className: 'tg-foot' },
      h('span', { className: 'tg-note' }, `${tgName(game.name, 'en')} · ${tgControl(t, game.controls)}`),
      h('span', { className: 'tg-grow' }),
      hud.end === null ? null : h('button', {
        className: 'tg-btn',
        onClick: () => { setSessionKey((value2) => value2 + 1) },
      }, t('retry')),
    ),
  )
}

/* ── host bridge ──────────────────────────────────────────────────────────── */

async function tgGet(path) {
  const response = await fetch(`${TG_ROUTE}/${path}`, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function tgPost(path, body) {
  const response = await fetch(`${TG_ROUTE}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok && payload.error === undefined) throw new Error(`HTTP ${response.status}`)
  return payload
}

/** Poll the Host half. Fast while a challenge is pending, slow otherwise. */
function useTogetherState(pollEnabled) {
  const [state, setState] = React.useState(null)
  const [error, setError] = React.useState(null)
  const latest = React.useRef(null)

  React.useEffect(() => {
    if (pollEnabled === false) return undefined
    let stopped = false
    let timer = 0
    const loop = async () => {
      if (stopped) return
      const pending = Array.isArray(latest.current?.pending) && latest.current.pending.length > 0
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      const delay = hidden ? 5000 : pending ? 500 : 2500
      try {
        const payload = await tgGet('state')
        if (!stopped) {
          latest.current = payload
          setState(payload)
          setError(null)
        }
      } catch (failure) {
        if (!stopped) setError(String(failure?.message ?? failure))
      }
      if (!stopped) timer = window.setTimeout(loop, delay)
    }
    loop()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [pollEnabled])

  return { state, error, refresh: () => tgGet('state').then((payload) => { latest.current = payload; setState(payload) }).catch(() => {}) }
}

/* ── overlay ──────────────────────────────────────────────────────────────── */

function TogetherOverlay({ t, ctx }) {
  const { state, error } = useTogetherState(true)
  const lang = useGameLang(ctx, t)
  const [paused, setPaused] = React.useState(false)
  const [restartKey, setRestartKey] = React.useState(0)
  const [override, setOverride] = React.useState(null)
  const [banner, setBanner] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState(null)

  const pending = state?.pending?.[0] ?? null
  const settings = state?.settings ?? {}
  const signature = pending ? `${pending.id}:${pending.index}` : 'none'

  React.useEffect(() => {
    setOverride(null)
    setPaused(false)
    setRestartKey((value) => value + 1)
  }, [signature])

  const clearMessageSoon = React.useCallback((next) => {
    setMessage(next)
    window.setTimeout(() => setMessage(null), 3200)
  }, [])

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setPaused((value) => !value)
    }
  }

  // Registered before the empty-state return so the hook order never changes.
  React.useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!pending) {
    if (!banner) return null
    return h('div', { className: 'tg-overlay' },
      h('div', { className: 'tg-panel', style: { width: 'min(420px, 92vw)' } },
        h('div', { className: 'tg-title' }, t('passed')),
        h('div', { className: 'tg-sub' }, t('settings.saved')),
      ),
    )
  }

  const game = override ?? pending.current
  const definition = game ? DEFINITIONS.find((entry) => entry.id === game.id) : undefined

  const handlePass = async (score) => {
    if (!game || busy) return
    setBusy(true)
    try {
      const result = await tgPost('complete', { challengeId: pending.id, gameId: game.id, score: Math.round(Number(score) || 0) })
      if (result.ok && result.done) {
        setBanner('passed')
        window.setTimeout(() => setBanner(null), 1500)
      } else if (result.ok && result.next) {
        setOverride(result.next)
        setRestartKey((value) => value + 1)
      } else if (result.ok === false) {
        clearMessageSoon(t('settings.failed', { error: result.error ?? 'unknown' }))
      }
    } catch (failure) {
      clearMessageSoon(t('settings.failed', { error: String(failure?.message ?? failure) }))
    } finally {
      setBusy(false)
    }
  }

  const handleFail = async (kind) => {
    if (!game) return
    try {
      const result = await tgPost('fail', { challengeId: pending.id, kind })
      if (result.ok && result.autoPassed) clearMessageSoon(t('crashed'))
    } catch {
      // The overlay keeps offering a retry; a failed report is not fatal.
    }
  }

  const handleSwitch = async () => {
    if (!game || busy) return
    setBusy(true)
    try {
      const result = await tgPost('switch', { challengeId: pending.id })
      if (result.ok && result.next) {
        setOverride(result.next)
        setRestartKey((value) => value + 1)
      } else if (result.ok === false) {
        clearMessageSoon(t('settings.failed', { error: result.error ?? 'unknown' }))
      }
    } catch (failure) {
      clearMessageSoon(t('settings.failed', { error: String(failure?.message ?? failure) }))
    } finally {
      setBusy(false)
    }
  }

  // The tester's escape hatch: release the waiting tool call without playing. It never
  // records a score, so it cannot inflate the goal or skip the next real change.
  const handleTestPass = async () => {
    if (busy) return
    setBusy(true)
    try {
      const result = await tgPost('pass', { challengeId: pending.id })
      if (result.ok) {
        setBanner('passed')
        window.setTimeout(() => setBanner(null), 1400)
      } else {
        clearMessageSoon(t('testPass.failed', { error: result.error ?? 'unknown' }))
      }
    } catch (failure) {
      clearMessageSoon(t('testPass.failed', { error: String(failure?.message ?? failure) }))
    } finally {
      setBusy(false)
    }
  }

  return h('div', { className: 'tg-overlay' },
    h('div', { className: 'tg-panel', role: 'dialog', 'aria-modal': 'true' },
      h('style', null, TG_CSS),
      h('div', { className: 'tg-head' },
        h('div', { className: 'tg-title' }, t('title')),
        h('div', { className: 'tg-round' }, t('round', { index: pending.index + 1, total: pending.total })),
      ),
      h('p', { className: 'tg-sub' }, t('subtitle')),
      h('div', { className: 'tg-call' },
        h('span', null, t('blockedCall')),
        h('span', { className: 'tg-chip' }, pending.toolName ?? 'tool'),
        pending.path ? h('span', { className: 'tg-chip', title: pending.path }, pending.path) : null,
      ),
      game && game.how
        ? h('div', { className: 'tg-how' }, tgName(game.how, lang))
        : null,
      !definition
        ? h('div', { className: 'tg-warn' }, t('settings.unknownGame'), ` (${game?.id ?? '?'})`)
        : h(GameStage, {
          definition,
          game,
          attemptSeconds: game.attemptSeconds ?? settings.attemptSeconds ?? 90,
          paused,
          restartKey,
          t,
          onPass: handlePass,
          onFail: handleFail,
        }),
      message ? h('div', { className: 'tg-warn' }, message) : null,
      error ? h('div', { className: 'tg-warn' }, t('offline')) : null,
      h('div', { className: 'tg-foot' },
        settings.testPass === false ? null : h('button', {
          className: 'tg-btn',
          disabled: busy,
          title: t('testPass.hint'),
          onClick: handleTestPass,
        }, t('testPass')),
        h('button', { className: 'tg-btn', onClick: () => setPaused((value) => !value) },
          paused ? t('resume') : t('pause')),
        settings.allowGameSwitch === false ? null : h('button', {
          className: 'tg-btn',
          disabled: busy,
          onClick: handleSwitch,
        }, t('switch')),
        h('span', { className: 'tg-grow' }),
        h('span', { className: 'tg-note' }, t('blockedNote')),
      ),
    ),
  )
}

/* ── settings page ────────────────────────────────────────────────────────── */

function Toggle({ checked, onChange, label }) {
  return h('button', {
    type: 'button',
    className: 'tg-switch',
    role: 'switch',
    'aria-checked': checked ? 'true' : 'false',
    'aria-label': label,
    onClick: () => onChange(!checked),
  }, h('i'))
}

function Row({ label, hint, children }) {
  return h('div', { className: 'tg-row' },
    h('div', { className: 'tg-row-main' },
      h('div', { className: 'tg-row-label' }, label),
      hint ? h('div', { className: 'tg-row-hint' }, hint) : null,
    ),
    h('div', { className: 'tg-row-side' }, children),
  )
}

function TogetherSettings({ t, ctx }) {
  const { state, error } = useTogetherState(true)
  const lang = useGameLang(ctx, t)
  const selfCheck = useSelfCheck()
  const [demoBusy, setDemoBusy] = React.useState(null)
  const [demoResult, setDemoResult] = React.useState('')
  const runDemo = async (pack) => {
    setDemoBusy(pack ?? 'any')
    setDemoResult('')
    try {
      const result = await tgPost('demo', pack ? { pack } : {})
      if (!result?.ok) setDemoResult(t('selfCheck.demo.failed', { error: result?.error ?? 'unknown' }))
      else setDemoResult(t('selfCheck.demo.shown', { game: result.game ?? '?' }))
    } catch (error) {
      setDemoResult(t('selfCheck.demo.failed', { error: error?.message ?? String(error) }))
    } finally {
      setDemoBusy(null)
    }
  }
  const [draft, setDraft] = React.useState(null)
  const [catalog, setCatalog] = React.useState(null)
  const [saveState, setSaveState] = React.useState('idle')
  const [saveError, setSaveError] = React.useState(null)
  const [showGames, setShowGames] = React.useState(false)
  const [trial, setTrial] = React.useState(null)
  // Serialized form of the settings the Host has already accepted. An effect that
  // compared object identity instead of this ran the save loop forever, which is what
  // left "saving…" on screen after every toggle.
  const accepted = React.useRef(null)
  const idleTimer = React.useRef(0)

  React.useEffect(() => {
    if (state?.settings && draft === null) {
      setDraft(state.settings)
      accepted.current = JSON.stringify(state.settings)
    }
  }, [state, draft])

  React.useEffect(() => {
    let cancelled = false
    tgGet('catalog').then((payload) => { if (!cancelled) setCatalog(payload) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    if (draft === null) return undefined
    const serialized = JSON.stringify(draft)
    if (accepted.current === serialized) return undefined
    setSaveState('saving')
    const timer = window.setTimeout(async () => {
      try {
        const result = await tgPost('settings', { patch: draft })
        if (!result.ok) {
          setSaveState('failed')
          setSaveError(result.error ?? 'unknown')
          return
        }
        const normalized = JSON.stringify(result.settings)
        accepted.current = normalized
        setSaveError(null)
        setSaveState('saved')
        window.clearTimeout(idleTimer.current)
        idleTimer.current = window.setTimeout(() => setSaveState('idle'), 1600)
        if (normalized !== JSON.stringify(draft)) {
          // Adopt the Host's clamped values without scheduling another write.
          setDraft(result.settings)
        }
      } catch (failure) {
        setSaveState('failed')
        setSaveError(String(failure?.message ?? failure))
      }
    }, 320)
    return () => window.clearTimeout(timer)
  }, [draft])

  React.useEffect(() => () => window.clearTimeout(idleTimer.current), [])

  const patch = (changes) => setDraft((current) => ({ ...(current ?? {}), ...changes }))

  const [releaseNote, setReleaseNote] = React.useState(null)
  const releaseNow = React.useCallback(async () => {
    try {
      const result = await tgPost('pass', {})
      setReleaseNote(result.ok ? t('testPass.done') : t('testPass.none'))
    } catch {
      setReleaseNote(t('testPass.none'))
    }
    window.setTimeout(() => setReleaseNote(null), 2600)
  }, [t])

  if (draft === null) {
    return h('div', { className: 'tg-settings' }, h('style', null, TG_CSS), h('h2', null, t('nav')), h('p', { className: 'tg-lead' }, t('loading')))
  }

  const games = catalog?.games ?? []
  const packs = catalog?.packs ?? []
  const eligibleCount = games.length > 0 ? games.filter((game) => (draft.gamePacks ?? []).includes(game.pack) && !(draft.disabledGames ?? []).includes(game.id)).length : 0
  const stats = state?.stats ?? {}

  const lines = (value) => (Array.isArray(value) ? value.join('\n') : '')
  const fromLines = (text) => String(text ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

  const tryGame = async () => {
    try {
      const result = await tgPost('preview', {})
      if (result.ok) setTrial({ game: result.game, attemptSeconds: result.attemptSeconds ?? draft.attemptSeconds })
    } catch (failure) {
      setSaveError(String(failure?.message ?? failure))
    }
  }

  const trialDefinition = trial ? DEFINITIONS.find((entry) => entry.id === trial.game.id) : undefined

  return h('div', { className: 'tg-settings' },
    h('style', null, TG_CSS),
    h('h2', null, t('nav')),
    h('p', { className: 'tg-lead' }, t('subtitle')),
    saveState === 'failed'
      ? h('div', { className: 'tg-error' }, t('settings.failed', { error: saveError ?? 'unknown' }))
      : saveState === 'saved' ? h('div', { className: 'tg-note' }, t('settings.saved'))
        : saveState === 'saving' ? h('div', { className: 'tg-note' }, t('settings.saving')) : null,
    releaseNote ? h('div', { className: 'tg-banner' }, releaseNote) : null,
    h('div', { className: 'tg-note', style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' } },
      h('span', {
        className: 'tg-dot',
        style: {
          background: selfCheck === null ? '#9aa3ad'
            : selfCheck.listenerSeen ? '#4ac17a' : '#e0aa4c',
        },
      }),
      h('span', null,
        selfCheck === null
          ? t('selfCheck.pending')
          : selfCheck.listenerSeen ? t('selfCheck.ok') : t('selfCheck.mounted')),
      selfCheck ? h('span', null, '·', ' ', t('selfCheck.pool', { count: selfCheck.eligibleGames ?? 0 })) : null,
      selfCheck?.poolLimited ? h('span', { style: { color: 'var(--dsw-alias-state-warn-label,#e0aa4c)' } }, '·', ' ', t('selfCheck.limited')) : null,
      h('button', {
        className: 'tg-btn tg-btn-sm',
        disabled: demoBusy !== null,
        title: t('selfCheck.demo.hint'),
        onClick: () => runDemo(null),
      }, demoBusy === 'any' ? t('selfCheck.demo.running') : t('selfCheck.demo')),
      h('button', {
        className: 'tg-btn tg-btn-sm',
        disabled: demoBusy !== null,
        title: t('selfCheck.demo3d.hint'),
        onClick: () => runDemo('3d'),
      }, demoBusy === '3d' ? t('selfCheck.demo3d.running') : t('selfCheck.demo3d')),
      demoResult ? h('span', null, demoResult) : null,
    ),

    h('div', { className: 'tg-card' },
      h(Row, { label: t('settings.enabled'), hint: t('settings.enabled.hint') },
        h(Toggle, { checked: Boolean(draft.enabled), label: t('settings.enabled'), onChange: (value) => patch({ enabled: value }) })),
      h(Row, { label: t('settings.cooldown'), hint: t('settings.cooldown.hint') },
        h('input', {
          className: 'tg-input',
          type: 'number',
          min: 0,
          max: 3600,
          value: draft.cooldownSeconds,
          onChange: (event) => patch({ cooldownSeconds: Number(event.target.value) }),
        })),
      h(Row, { label: t('settings.difficulty') },
        h('div', { className: 'tg-seg' }, ['relaxed', 'normal', 'strict'].map((level) => h('button', {
          key: level,
          type: 'button',
          'aria-pressed': draft.difficulty === level ? 'true' : 'false',
          onClick: () => patch({ difficulty: level }),
        }, t(`settings.difficulty.${level}`))))),
      h(Row, { label: t('settings.rounds'), hint: t('settings.rounds.hint') },
        h('input', {
          className: 'tg-input',
          type: 'number',
          min: 1,
          max: 3,
          value: draft.gamesPerChallenge,
          onChange: (event) => patch({ gamesPerChallenge: Number(event.target.value) }),
        })),
      h(Row, { label: t('settings.noRepeat'), hint: t('settings.noRepeat.hint') },
        h('input', {
          className: 'tg-input',
          type: 'number',
          min: 0,
          max: 40,
          value: draft.noRepeatWindow,
          onChange: (event) => patch({ noRepeatWindow: Number(event.target.value) }),
        })),
      h(Row, { label: t('settings.attempt'), hint: t('settings.attempt.hint') },
        h('input', {
          className: 'tg-input',
          type: 'number',
          min: 20,
          max: 300,
          value: draft.attemptSeconds,
          onChange: (event) => patch({ attemptSeconds: Number(event.target.value) }),
        })),
      h(Row, { label: t('settings.shell'), hint: t('settings.shell.hint') },
        h(Toggle, { checked: Boolean(draft.gateShellTools), label: t('settings.shell'), onChange: (value) => patch({ gateShellTools: value }) })),
      h(Row, { label: t('settings.switchGame') },
        h(Toggle, { checked: Boolean(draft.allowGameSwitch), label: t('settings.switchGame'), onChange: (value) => patch({ allowGameSwitch: value }) })),
      h(Row, { label: t('settings.testPass'), hint: t('settings.testPass.hint') },
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
          h(Toggle, { checked: draft.testPass !== false, label: t('settings.testPass'), onChange: (value) => patch({ testPass: value }) }),
          h('button', { className: 'tg-btn', onClick: releaseNow }, t('settings.testPass.now')),
        )),
      h(Row, { label: t('settings.noClient'), hint: t('settings.noClient.hint') },
        h(Toggle, { checked: Boolean(draft.pauseWhenNoClient), label: t('settings.noClient'), onChange: (value) => patch({ pauseWhenNoClient: value }) })),
      h(Row, { label: t('settings.extraTools') },
        h('textarea', {
          className: 'tg-input tg-area',
          value: lines(draft.extraToolPatterns),
          onChange: (event) => patch({ extraToolPatterns: fromLines(event.target.value) }),
        })),
      h(Row, { label: t('settings.excludedPaths') },
        h('textarea', {
          className: 'tg-input tg-area',
          value: lines(draft.excludedPathPatterns),
          onChange: (event) => patch({ excludedPathPatterns: fromLines(event.target.value) }),
        })),
    ),

    h('div', { className: 'tg-card' },
      h('div', { className: 'tg-row-label' }, t('settings.packs'), ' ',
        h('span', { className: 'tg-note' }, t('settings.gamesCount', { count: eligibleCount }))),
      h('div', { className: 'tg-list' }, packs.map((pack) => h('label', { key: pack.id },
        h('input', {
          type: 'checkbox',
          checked: (draft.gamePacks ?? []).includes(pack.id),
          onChange: (event) => {
            const current = new Set(draft.gamePacks ?? [])
            if (event.target.checked) current.add(pack.id)
            else current.delete(pack.id)
            patch({ gamePacks: [...current] })
          },
        }),
        tgName(pack, lang),
      ))),
      h('div', { style: { marginTop: '8px' } },
        h('button', { className: 'tg-btn', onClick: () => patch({ gamePacks: packs.map((pack) => pack.id) }) }, t('settings.resetPacks')),
        ' ',
        h('button', { className: 'tg-btn', onClick: () => setShowGames((value) => !value) }, t('settings.disabledGames')),
      ),
      showGames ? h('div', { className: 'tg-list' }, games.map((game) => h('label', { key: game.id },
        h('input', {
          type: 'checkbox',
          checked: !(draft.disabledGames ?? []).includes(game.id),
          onChange: (event) => {
            const current = new Set(draft.disabledGames ?? [])
            if (event.target.checked) current.delete(game.id)
            else current.add(game.id)
            patch({ disabledGames: [...current] })
          },
        }),
        tgName({ zh: game.zh, en: game.en }, lang),
      ))) : null,
    ),

    h('div', { className: 'tg-card' },
      h('div', { className: 'tg-row-label' }, t('settings.stats')),
      h('div', { className: 'tg-grid-stats' },
        h('div', { className: 'tg-stat' }, h('b', null, stats.plays ?? 0), h('span', null, t('settings.stats.plays'))),
        h('div', { className: 'tg-stat' }, h('b', null, stats.passes ?? 0), h('span', null, t('settings.stats.passes'))),
        h('div', { className: 'tg-stat' }, h('b', null, stats.fails ?? 0), h('span', null, t('settings.stats.fails'))),
        h('div', { className: 'tg-stat' }, h('b', null, stats.autoPasses ?? 0), h('span', null, t('settings.stats.auto'))),
      ),
      h('div', { className: 'tg-trial' },
        h('button', { className: 'tg-btn', onClick: tryGame }, t('settings.try')),
        ' ',
        h('span', { className: 'tg-note' }, t('trialNote')),
        trial && trialDefinition ? h('div', { style: { marginTop: '10px' } },
          trial.game.how ? h('div', { className: 'tg-how' }, tgName(trial.game.how, lang)) : null,
          h(GameStage, {
            definition: trialDefinition,
            game: trial.game,
            attemptSeconds: trial.attemptSeconds,
            paused: false,
            restartKey: 0,
            t,
            onPass: () => {},
            onFail: () => {},
          })) : null,
      ),
    ),
    error ? h('div', { className: 'tg-warn' }, t('offline')) : null,
    h('div', { className: 'tg-note' }, `${games.length} games · ${packs.length} packs`),
  )
}

/* ── plugin registration ──────────────────────────────────────────────────── */

const inject = ['slots', 'locale']

function apply(ctx) {
  ctx.effect(() => ctx.locale.register(TG_NS, { zh: TG_ZH, en: TG_EN }), 'dsh-together: dictionaries')
  const t = ctx.locale.bind(TG_NS)

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dsh-together.game',
    order: 60,
    label: () => t('title'),
  }, (props) => h(TogetherOverlay, { ...props, t, ctx })))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-together',
    order: 70,
    label: () => t('nav'),
  }, (props) => h(TogetherSettings, { ...props, t, ctx })))
}
