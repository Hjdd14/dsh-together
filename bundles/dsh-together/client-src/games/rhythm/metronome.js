defineGame({
  id: 'metronome',
  create(api) {
    const W = api.w
    const H = api.h
    const CX = W / 2
    const PIVOT_Y = 268
    const BEAT = 0.625
    const BAR = BEAT * 4
    const HALF = 0.12 // ±120ms，恒定
    const PERFECT = 0.04
    let clock = 0
    let curBar = 0
    let bars = 0
    let hits = 0
    let combo = 0
    let bestCombo = 0
    let flags = [0, 0, 0, 0] // 0 空 / 1 GOOD / 2 PERFECT
    let flash = 0
    let miss = 0
    let shake = 0
    let grade = ''
    let gradeT = 0
    let gradeC = '143,160,180'
    let swingTrail = [0, 0, 0, 0, 0, 0]

    const fx = []
    const FX_MAX = 56
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
        p.vy = Math.sin(a) * v - 40
        p.r = api.rnd(1.5, 3.2)
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
      p.r = r0 || 12
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
          p.life -= dt * 2.5
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.93
          p.vy = p.vy * 0.93 + 80 * dt
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

    const nowSec = () => api.now() / 1000

    function judge() {
      const t = nowSec()
      const bn = Math.round(t / BEAT)
      const d = Math.abs(t - bn * BEAT)
      const inBar = ((bn % 4) + 4) % 4
      if (d <= HALF && Math.floor(bn / 4) === curBar) {
        if (flags[inBar]) return // 同一拍只结算一次
        const perfect = d <= PERFECT
        flags[inBar] = perfect ? 2 : 1
        hits += 1
        combo += 1
        if (combo > bestCombo) bestCombo = combo
        flash = 1
        grade = perfect ? 'PERFECT' : 'GOOD'
        gradeC = perfect ? '139,220,122' : '255,207,92'
        const bx = CX - 84 + inBar * 56
        halo(bx, 312, perfect ? '139,220,122' : '255,207,92', 10)
        burst(bx, 312, perfect ? 10 : 6, gradeC, 130)
      } else {
        combo = 0
        miss = 1
        shake = 1
        grade = 'MISS'
        gradeC = '255,122,122'
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
        flash = Math.max(0, flash - dt * 4)
        miss = Math.max(0, miss - dt * 3.5)
        shake = Math.max(0, shake - dt * 5)
        gradeT = Math.max(0, gradeT - dt * 1.5)
        const swing = Math.cos(((clock % (BEAT * 2)) / (BEAT * 2)) * Math.PI * 2)
        swingTrail = [swing, swingTrail[0], swingTrail[1], swingTrail[2], swingTrail[3], swingTrail[4]]
        fxStep(dt)
        // 小节结算：时间跳变（切后台）时直接跳过，不连刷进度
        const bar = Math.floor(clock / BAR)
        if (bar - curBar > 3) {
          curBar = bar - 1
          flags = [0, 0, 0, 0]
        }
        while (curBar < bar) {
          let count = 0
          for (let i = 0; i < 4; i += 1) if (flags[i]) count += 1
          if (count >= 3) {
            bars += 1
            halo(CX, 200, '139,220,122', 30)
            burst(CX, 200, 14, '139,220,122', 170)
            api.progress(1)
          }
          flags = [0, 0, 0, 0]
          curBar += 1
        }
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(clock * 125) * shake * 5 : 0
        const oy = shake > 0 ? Math.sin(clock * 137) * shake * 4 : 0
        api.clear(api.colors.bg)
        const beatPhase = (clock % BEAT) / BEAT
        const swing = swingTrail[0]
        const bgp = Math.max(0, 1 - beatPhase * 2.3)
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (bgp * 0.05).toFixed(3) + ')')
        api.circle(CX + ox, 170 + oy, 60 + bgp * 26, 'rgba(106,169,255,' + (bgp * 0.08).toFixed(3) + ')')
        // 底座
        api.rect(CX - 70 + ox, PIVOT_Y + oy, 140, 10, api.colors.panel)
        api.rect(CX - 60 + ox, PIVOT_Y + 10 + oy, 120, 6, 'rgba(143,160,180,0.25)')
        // 摆臂拖尾
        for (let k = 5; k >= 1; k -= 1) {
          const f = 0.86
          api.circle(CX + swingTrail[k] * f * 78 + ox, PIVOT_Y - f * 150 + oy, 3, 'rgba(106,169,255,' + (0.05 * (6 - k)).toFixed(3) + ')')
        }
        for (let i = 0; i <= 12; i += 1) {
          const f = i / 12
          api.circle(CX + swing * f * 78 + ox, PIVOT_Y - f * 150 + oy, 4 + (1 - f) * 2, i === 12 ? api.colors.accent2 : api.colors.accent)
        }
        api.circle(CX + ox, PIVOT_Y + oy, 7, api.colors.fg)
        // 拍点光晕
        const pulse = Math.max(0, 1 - beatPhase * 2.4)
        if (pulse > 0) api.circle(CX + swing * 78 + ox, 118 + oy, 10 + pulse * 26, 'rgba(255,207,92,' + (pulse * 0.33).toFixed(3) + ')')
        // 四拍格
        for (let i = 0; i < 4; i += 1) {
          const bx = CX - 84 + i * 56
          const on = flags[i] > 0
          const col = flags[i] === 2 ? api.colors.good : flags[i] === 1 ? api.colors.accent2 : 'rgba(143,160,180,0.22)'
          api.circle(bx + ox, 312 + oy, 14, on ? col : 'rgba(143,160,180,0.18)')
          api.circle(bx + ox, 312 + oy, 20, on ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0)')
          api.text(String(i + 1), bx + ox, 312 + oy, {
            size: 13,
            color: on ? api.colors.bg : api.colors.dim,
            align: 'center',
            weight: 'bold',
          })
        }
        fxDraw(ox, oy)
        // HUD
        api.text(String(bars), 14 + ox, 22 + oy, { size: 24, color: api.colors.fg, weight: 'bold' })
        api.text('BAR', 46 + ox, 24 + oy, { size: 11, color: api.colors.dim })
        if (combo > 1) api.text('x' + combo, W - 16 + ox, 22 + oy, { size: 18, color: api.colors.good, align: 'right', weight: 'bold' })
        if (gradeT > 0) {
          api.text(grade, CX + ox, 258 + oy, {
            size: 12 + gradeT * 4,
            color: 'rgba(' + gradeC + ',' + Math.min(1, gradeT).toFixed(3) + ')',
            align: 'center',
            weight: 'bold',
          })
        }
        if (bestCombo > 3) api.text('MAX x' + bestCombo, 14, H - 30, { size: 11, color: api.colors.dim })
        api.text('SPACE', 14, H - 14, { size: 11, color: api.colors.dim })
      },
      dispose() {
        offKey()
      },
    }
  },
})
