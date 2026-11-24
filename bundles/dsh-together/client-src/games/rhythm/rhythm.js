defineGame({
  id: 'rhythm',
  create(api) {
    const CX = api.w / 2
    const TRACK_X = 40
    const TRACK_W = api.w - 80
    const TY = 168
    const PERIOD = 0.66 // 一拍走完一条轨
    const HALF = 0.12 // ±120ms 判定（恒定，不随难度收紧）
    const PERFECT = 0.045
    let clock = 0
    let hits = 0
    let combo = 0
    let bestCombo = 0
    let scored = -1
    let flash = 0
    let miss = 0
    let shake = 0
    let grade = ''
    let gradeT = 0
    let gradeX = CX
    let gradeC = '143,160,180'

    // ── 特效池（粒子 + 扩散光环），固定容量，全部复用 ──────────────────────────
    const fx = []
    const FX_MAX = 72
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
        p.vy = Math.sin(a) * v - 30
        p.r = api.rnd(1.6, 3.4)
        p.life = 1
        p.ring = 0
        p.c = c
      }
    }
    function halo(x, y, c) {
      const p = fxNew()
      if (!p) return
      p.on = true
      p.x = x
      p.y = y
      p.vx = 0
      p.vy = 0
      p.r = 8
      p.life = 1
      p.ring = 1
      p.c = c
    }
    function fxStep(dt) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.ring) {
          p.r += 200 * dt
          p.life -= dt * 2.6
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.93
          p.vy = p.vy * 0.93 + 70 * dt
          p.life -= dt * 2.1
        }
        if (p.life <= 0) p.on = false
      }
    }
    function fxDraw(ox, oy) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.ring) {
          const a0 = p.life * 0.55
          api.circle(p.x + ox, p.y + oy, p.r, 'rgba(' + p.c + ',' + (p.life * 0.15).toFixed(3) + ')')
          for (let k = 0; k < 6; k += 1) {
            const aa = (k / 6) * Math.PI * 2 + p.r * 0.03
            api.circle(p.x + ox + Math.cos(aa) * p.r, p.y + oy + Math.sin(aa) * p.r, 2, 'rgba(' + p.c + ',' + a0.toFixed(3) + ')')
          }
        }
        else api.circle(p.x + ox, p.y + oy, p.r * (0.35 + p.life * 0.65), 'rgba(' + p.c + ',' + p.life.toFixed(3) + ')')
      }
    }

    // 以 api.now() 为唯一时基：低帧率/掉帧也不会让判定窗口错位
    const nowSec = () => api.now() / 1000
    const headX = () => TRACK_X + ((nowSec() % PERIOD) / PERIOD) * TRACK_W

    function judge() {
      const t = nowSec()
      const beat = Math.round((t - PERIOD / 2) / PERIOD)
      const target = beat * PERIOD + PERIOD / 2
      const d = Math.abs(t - target)
      const px = headX()
      if (d > HALF) {
        combo = 0
        miss = 1
        shake = 1
        grade = 'MISS'
        gradeT = 1
        gradeX = px
        gradeC = '255,122,122'
        return
      }
      if (beat === scored) return // 长按/连点只结算一拍一次
      scored = beat
      hits += 1
      combo += 1
      if (combo > bestCombo) bestCombo = combo
      flash = 1
      grade = d <= PERFECT ? 'PERFECT' : 'GOOD'
      gradeT = 1
      gradeX = px
      gradeC = d <= PERFECT ? '139,220,122' : '255,207,92'
      halo(CX, TY + 11, '139,220,122')
      burst(px, TY + 11, d <= PERFECT ? 13 : 7, gradeC, 165)
      api.progress(1)
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown) return
      if (ev && ev.repeat) return // 按住不放不重复判定
      if (key === 'space' || key === 'enter') judge()
    })

    return {
      update(dt) {
        clock = nowSec()
        flash = Math.max(0, flash - dt * 4.5)
        miss = Math.max(0, miss - dt * 4)
        shake = Math.max(0, shake - dt * 5)
        gradeT = Math.max(0, gradeT - dt * 1.6)
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(clock * 120) * shake * 5 : 0
        const oy = shake > 0 ? Math.sin(clock * 143) * shake * 4 : 0
        api.clear(api.colors.bg)
        // 背景节拍脉动（纯视觉）
        const ph = (clock % PERIOD) / PERIOD
        const bgp = Math.max(0, 1 - ph * 2.4)
        api.rect(0, 0, api.w, api.h, 'rgba(106,169,255,' + (bgp * 0.05).toFixed(3) + ')')
        for (let i = 0; i < 6; i += 1) {
          const w = 2 + bgp * 30
          api.rect(CX - w / 2, 20 + i * 22, w, 10, 'rgba(106,169,255,' + (bgp * 0.10).toFixed(3) + ')')
        }
        const hw = (HALF / PERIOD) * TRACK_W
        const px = TRACK_X + ph * TRACK_W
        // 判定区
        api.rect(CX - hw - 6 + ox, TY - 46 + oy, hw * 2 + 12, 100, 'rgba(106,169,255,0.10)')
        api.rect(CX - hw + ox, TY - 6 + oy, hw * 2, 34, 'rgba(255,207,92,0.18)')
        api.rect(TRACK_X + ox, TY + oy, TRACK_W, 22, api.colors.panel)
        for (let i = 0; i <= 16; i += 1) {
          const x = TRACK_X + (i / 16) * TRACK_W
          api.rect(x - 1 + ox, TY + 22 + oy, 2, i % 2 === 0 ? 9 : 5, api.colors.dim)
        }
        api.rect(CX - hw + ox, TY + oy, hw * 2, 22, flash > 0 ? api.colors.good : 'rgba(255,207,92,0.42)')
        // 播放头（渐入缩放的小方块）
        api.rect(px - 2 + ox, TY - 20 + oy, 4, 62, api.colors.fg)
        api.circle(px + ox, TY + 11 + oy, 8 + flash * 3, flash > 0 ? api.colors.good : api.colors.accent2)
        api.circle(px + ox, TY + 11 + oy, 14 + flash * 10, 'rgba(255,207,92,' + (0.18 + flash * 0.3).toFixed(3) + ')')
        if (miss > 0) api.rect(CX - hw + ox, TY - 32 + oy, hw * 2, 6, 'rgba(255,122,122,' + (miss * 0.85).toFixed(3) + ')')
        fxDraw(ox, oy)
        // 分级提示
        if (gradeT > 0) {
          api.text(grade, gradeX + ox, TY - 46 + oy, {
            size: 13 + gradeT * 4,
            color: 'rgba(' + gradeC + ',' + Math.min(1, gradeT).toFixed(3) + ')',
            align: 'center',
            weight: 'bold',
          })
        }
        // 读数
        api.text(String(hits), CX, 288, { size: 60, color: api.colors.fg, align: 'center', weight: 'bold' })
        if (combo > 1) {
          api.text('x' + combo, CX, 330, { size: 15 + Math.min(9, combo), color: api.colors.good, align: 'center', weight: 'bold' })
        } else {
          api.text('TAP', CX, 330, { size: 14, color: api.colors.dim, align: 'center' })
        }
        if (bestCombo > 2) api.text('MAX x' + bestCombo, api.w - 22, 24, { size: 11, color: api.colors.dim, align: 'right' })
        api.text('SPACE', 24, 344, { size: 11, color: api.colors.dim })
      },
      dispose() {
        offKey()
      },
    }
  },
})
