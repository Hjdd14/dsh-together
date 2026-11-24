defineGame({
  id: 'drumroll',
  create(api) {
    const CX = api.w / 2
    const CY = 150
    const DR = 44
    const HALF = 0.12 // ±120ms
    const PERFECT = 0.045
    let time = 0
    let period = 0.72
    let prevAt = 0
    let nextAt = 0.72
    let beatId = 0
    let scored = -1
    let hits = 0
    let combo = 0
    let bestCombo = 0
    let flash = 0
    let miss = 0
    let shake = 0
    let beatPulse = 0
    let grade = ''
    let gradeT = 0
    let gradeC = '143,160,180'

    // ── 特效池（固定容量、全复用）────────────────────────────────────────────
    const fx = []
    const FX_MAX = 76
    function fxNew() {
      for (let i = 0; i < fx.length; i += 1) if (!fx[i].on) return fx[i]
      if (fx.length >= FX_MAX) return null
      fx.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 2, life: 0, k: 0, c: '255,255,255' })
      return fx[fx.length - 1]
    }
    function burst(x, y, n, c, spd) {
      for (let j = 0; j < n; j += 1) {
        const p = fxNew()
        if (!p) return
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        p.on = true
        p.x = x
        p.y = y
        p.vx = Math.cos(a) * v
        p.vy = Math.sin(a) * v
        p.r = api.rnd(1.6, 3.3)
        p.life = 1
        p.k = 0
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
      p.k = 1
      p.c = c
    }
    function fxStep(dt) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.k === 1) {
          p.r += 210 * dt
          p.life -= dt * 2.5
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.93
          p.vy = p.vy * 0.93 + 80 * dt
          p.life -= dt * 2.2
        }
        if (p.life <= 0) p.on = false
      }
    }
    function fxDraw(ox, oy) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.k === 1) {
          const a0 = p.life * 0.55
          api.circle(p.x + ox, p.y + oy, p.r, 'rgba(' + p.c + ',' + (p.life * 0.15).toFixed(3) + ')')
          for (let k = 0; k < 6; k += 1) {
            const aa = (k / 6) * Math.PI * 2 + p.r * 0.03
            api.circle(p.x + ox + Math.cos(aa) * p.r, p.y + oy + Math.sin(aa) * p.r, 2, 'rgba(' + p.c + ',' + a0.toFixed(3) + ')')
          }
        } else {
          api.circle(p.x + ox, p.y + oy, p.r * (0.3 + p.life * 0.7), 'rgba(' + p.c + ',' + p.life.toFixed(3) + ')')
        }
      }
    }

    function judge() {
      const dPrev = Math.abs(time - prevAt)
      const dNext = Math.abs(time - nextAt)
      const usePrev = dPrev < dNext
      const d = usePrev ? dPrev : dNext
      const id = usePrev ? beatId : beatId + 1
      if (d > HALF) {
        combo = 0
        miss = 1
        shake = 1
        grade = 'MISS'
        gradeC = '255,122,122'
        gradeT = 1
        return
      }
      if (id === scored) return // 一拍只结算一次
      scored = id
      hits += 1
      combo += 1
      if (combo > bestCombo) bestCombo = combo
      flash = 1
      beatPulse = 1
      grade = d <= PERFECT ? 'PERFECT' : 'GOOD'
      gradeC = d <= PERFECT ? '139,220,122' : '255,207,92'
      gradeT = 1
      halo(CX, CY, '139,220,122', 18)
      burst(CX, CY + 6, d <= PERFECT ? 13 : 8, gradeC, 170)
      beatPulse = 1
      api.progress(1)
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return // 长按不重复结算
      if (key === 'space' || key === 'enter') judge()
    })

    return {
      update(dt) {
        time += dt
        let guard = 0
        while (time >= nextAt && guard < 8) {
          guard += 1
          prevAt = nextAt
          beatId += 1
          period = Math.max(0.42, 0.72 - beatId * 0.012)
          nextAt = prevAt + period
          beatPulse = 1
        }
        flash = Math.max(0, flash - dt * 4.5)
        miss = Math.max(0, miss - dt * 4)
        shake = Math.max(0, shake - dt * 5)
        beatPulse = Math.max(0, beatPulse - dt * 3.2)
        gradeT = Math.max(0, gradeT - dt * 1.5)
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(time * 130) * shake * 5 : 0
        const oy = shake > 0 ? Math.sin(time * 143) * shake * 4 : 0
        api.clear(api.colors.bg)
        // 背景节拍脉动
        api.rect(0, 0, api.w, api.h, 'rgba(106,169,255,' + (beatPulse * 0.05).toFixed(3) + ')')
        api.circle(CX, CY, 84 + beatPulse * 16, 'rgba(106,169,255,' + (beatPulse * 0.10).toFixed(3) + ')')
        // 逼近环（收缩到鼓沿就是要敲的时刻）
        const k = Math.max(0, Math.min(1, (nextAt - time) / period))
        const R = DR + 8 + k * 34
        for (let i = 0; i < 24; i += 1) {
          const a = (i / 24) * Math.PI * 2
          api.circle(CX + Math.cos(a) * R + ox, CY + Math.sin(a) * R + oy, 3, api.colors.accent2)
        }
        // 鼓身
        api.circle(CX + ox, CY + oy, DR + 8, 'rgba(24,32,40,0.9)')
        api.circle(CX + ox, CY + oy, DR, flash > 0 ? api.colors.good : api.colors.accent)
        api.circle(CX + ox, CY + oy, DR - 8 + beatPulse * 6, 'rgba(232,238,246,' + (0.10 + flash * 0.35).toFixed(3) + ')')
        api.circle(CX + ox, CY + oy, 8, 'rgba(16,20,24,0.55)')
        fxDraw(ox, oy)
        if (gradeT > 0) {
          api.text(grade, CX + ox, CY - DR - 26 + oy, {
            size: 12 + gradeT * 4,
            color: 'rgba(' + gradeC + ',' + Math.min(1, gradeT).toFixed(3) + ')',
            align: 'center',
            weight: 'bold',
          })
        }
        // 读数
        api.text(String(hits), api.w / 2, 268, { size: 46, color: api.colors.fg, align: 'center', weight: 'bold' })
        if (combo > 1) {
          api.text('x' + combo, api.w / 2, 302, { size: 14 + Math.min(8, combo), color: api.colors.good, align: 'center', weight: 'bold' })
        } else {
          api.text('SPACE', api.w / 2, 302, { size: 13, color: api.colors.dim, align: 'center' })
        }
        if (bestCombo > 2) api.text('MAX x' + bestCombo, 22, 24, { size: 11, color: api.colors.dim })
        api.text('BPM ' + Math.round(60 / period), api.w - 22, 24, { size: 11, color: api.colors.accent2, align: 'right' })
        if (miss > 0) api.rect(0, 0, api.w, 6, 'rgba(255,122,122,' + (miss * 0.7).toFixed(3) + ')')
      },
      dispose() {
        offKey()
      },
    }
  },
})
