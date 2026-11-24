defineGame({
  id: 'beatreact',
  create(api) {
    const CX = api.w / 2
    const CY = 168
    const R = 104
    const PERIOD = 1.0
    const HALF = 0.12 / PERIOD // 判定弧宽（±120ms，恒定）
    const PERFECT = 0.045 / PERIOD
    let clock = 0
    let hits = 0
    let combo = 0
    let bestCombo = 0
    let target = 0.5
    let sweep = 0
    let lastSweep = -1
    let scored = -1
    let flash = 0
    let miss = 0
    let shake = 0
    let grade = ''
    let gradeT = 0
    let gradeC = '143,160,180'
    let trail = [0, 0, 0, 0, 0]

    const fx = []
    const FX_MAX = 64
    function fxNew() {
      for (let i = 0; i < fx.length; i += 1) if (!fx[i].on) return fx[i]
      if (fx.length >= FX_MAX) return null
      fx.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 2, life: 0, ring: 0, c: '255,255,255' })
      return fx[fx.length - 1]
    }
    function burst(x, y, n, c, spd) {
      for (let k = 0; k < n; k += 1) {
        const p = fxNew()
        if (!p) return
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.35, spd)
        p.on = true
        p.x = x
        p.y = y
        p.vx = Math.cos(a) * v
        p.vy = Math.sin(a) * v
        p.r = api.rnd(1.6, 3.2)
        p.life = 1
        p.ring = 0
        p.c = c
      }
    }
    function halo(x, y, c, r0) {
      const p = fxNew()
      if (!p) return
      p.on = true
      p.x = x
      p.y = y
      p.vx = 0
      p.vy = 0
      p.r = r0 || 10
      p.life = 1
      p.ring = 1
      p.c = c
    }
    function fxStep(dt) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.ring) {
          p.r += 210 * dt
          p.life -= dt * 2.4
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.93
          p.vy *= 0.93
          p.life -= dt * 2.2
        }
        if (p.life <= 0) p.on = false
      }
    }
    function fxDraw() {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.ring) {
          const a0 = p.life * 0.55
          api.circle(p.x, p.y, p.r, 'rgba(' + p.c + ',' + (p.life * 0.15).toFixed(3) + ')')
          for (let k = 0; k < 6; k += 1) {
            const aa = (k / 6) * Math.PI * 2 + p.r * 0.03
            api.circle(p.x + Math.cos(aa) * p.r, p.y + Math.sin(aa) * p.r, 2, 'rgba(' + p.c + ',' + a0.toFixed(3) + ')')
          }
        }
        else api.circle(p.x, p.y, p.r * (0.3 + p.life * 0.7), 'rgba(' + p.c + ',' + p.life.toFixed(3) + ')')
      }
    }

    const nowSec = () => api.now() / 1000
    const wrap = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
    const dist = (a, b) => {
      const d = Math.abs(a - b)
      return d > 0.5 ? 1 - d : d
    }
    const at = (f, rad) => {
      const a = -Math.PI / 2 + f * Math.PI * 2
      return { x: CX + Math.cos(a) * rad, y: CY + Math.sin(a) * rad }
    }

    function judge() {
      const t = nowSec()
      const s = (t % PERIOD) / PERIOD
      const d = dist(s, target)
      if (d <= HALF) {
        if (Math.floor(t / PERIOD) === scored) return // 一圈只结算一次
        scored = Math.floor(t / PERIOD)
        hits += 1
        combo += 1
        if (combo > bestCombo) bestCombo = combo
        flash = 1
        grade = d <= PERFECT ? 'PERFECT' : 'GOOD'
        gradeC = d <= PERFECT ? '139,220,122' : '255,207,92'
        const hp = at(target, R)
        halo(CX, CY, '139,220,122', 20)
        burst(hp.x, hp.y, d <= PERFECT ? 14 : 8, gradeC, 175)
        api.progress(1)
      } else {
        combo = 0
        miss = 1
        shake = 1
        grade = 'MISS'
        gradeC = '255,122,122'
        const hp = at(s, R)
        burst(hp.x, hp.y, 4, '255,122,122', 90)
      }
      gradeT = 1
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return
      if (key === 'space' || key === 'enter') judge()
    })

    return {
      update(dt) {
        clock = nowSec()
        sweep = Math.floor(clock / PERIOD)
        // 每圈换目标：按圈号触发，低帧率也不会漏掉换目标的机会
        if (sweep !== lastSweep) {
          lastSweep = sweep
          target = wrap(api.rnd(0.24, 0.84))
        }
        const s = (clock % PERIOD) / PERIOD
        trail = [s, trail[0], trail[1], trail[2], trail[3]]
        flash = Math.max(0, flash - dt * 4.5)
        miss = Math.max(0, miss - dt * 4)
        shake = Math.max(0, shake - dt * 5)
        gradeT = Math.max(0, gradeT - dt * 1.5)
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(clock * 130) * shake * 5 : 0
        const oy = shake > 0 ? Math.sin(clock * 141) * shake * 4 : 0
        api.clear(api.colors.bg)
        const s = (clock % PERIOD) / PERIOD
        // 背景节拍脉动
        const bgp = Math.max(0, 1 - s * 2.6)
        api.circle(CX, CY, 132 + bgp * 16, 'rgba(106,169,255,' + (bgp * 0.07).toFixed(3) + ')')
        // 静默环 + 刻度
        for (let i = 0; i < 48; i += 1) {
          const a = -Math.PI / 2 + (i / 48) * Math.PI * 2
          api.circle(CX + Math.cos(a) * R + ox, CY + Math.sin(a) * R + oy, 2, 'rgba(143,160,180,0.32)')
        }
        // 目标弧（渐入：靠近时更亮）
        const near = dist(s, target) < HALF * 2.2
        for (let i = 0; i <= 9; i += 1) {
          const f = target - HALF + ((HALF * 2) * i) / 9
          const p = at(wrap(f), R)
          api.circle(p.x + ox, p.y + oy, flash > 0 ? 10 : near ? 9 : 7, flash > 0 ? api.colors.good : api.colors.accent2)
        }
        for (let i = 0; i <= 6; i += 1) {
          const f = target - HALF * 1.7 + ((HALF * 3.4) * i) / 6
          const p = at(f, R - 17)
          api.circle(p.x + ox, p.y + oy, 2, 'rgba(255,207,92,0.35)')
        }
        // 播放头 + 拖尾
        for (let i = 4; i >= 0; i -= 1) {
          const p = at(trail[i], R)
          api.circle(p.x + ox, p.y + oy, 9 - i * 1.6, 'rgba(232,238,246,' + (0.1 + (4 - i) * 0.06).toFixed(3) + ')')
        }
        const hp = at(s, R)
        api.circle(hp.x + ox, hp.y + oy, 10 + flash * 3, api.colors.fg)
        api.circle(hp.x + ox, hp.y + oy, 18 + flash * 8, 'rgba(255,207,92,' + (0.14 + flash * 0.3).toFixed(3) + ')')
        fxDraw()
        // 中心面板
        api.circle(CX + ox, CY + oy, 62, 'rgba(24,32,40,0.92)')
        api.circle(CX + ox, CY + oy, 62 + bgp * 8, 'rgba(106,169,255,' + (bgp * 0.10).toFixed(3) + ')')
        api.text(String(hits), CX + ox, CY - 6 + oy, { size: 44, color: api.colors.fg, align: 'center', weight: 'bold' })
        if (combo > 1) {
          api.text('x' + combo, CX + ox, CY + 28 + oy, { size: 14 + Math.min(8, combo), color: api.colors.good, align: 'center', weight: 'bold' })
        } else {
          api.text('TAP', CX + ox, CY + 30 + oy, { size: 13, color: api.colors.dim, align: 'center' })
        }
        if (gradeT > 0) {
          api.text(grade, CX + ox, CY + 60 + oy, {
            size: 12 + gradeT * 4,
            color: 'rgba(' + gradeC + ',' + Math.min(1, gradeT).toFixed(3) + ')',
            align: 'center',
            weight: 'bold',
          })
        }
        if (bestCombo > 2) api.text('MAX x' + bestCombo, 20, 22, { size: 11, color: api.colors.dim })
        api.text('SPACE', 20, api.h - 14, { size: 11, color: api.colors.dim })
      },
      dispose() {
        offKey()
      },
    }
  },
})
