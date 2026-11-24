defineGame({
  id: 'beatjump',
  create(api) {
    const W = api.w
    const H = api.h
    const HERO_X = 108
    const GROUND_Y = 264
    const SPEED = 252
    const HALF = 0.12
    const PERFECT = 0.045
    const PERIOD = 0.7
    let time = 0
    let nextAt = 0.75
    let hits = 0
    let combo = 0
    let bestCombo = 0
    let flash = 0
    let miss = 0
    let shake = 0
    let hopT = 0
    let beatPulse = 0
    let grade = ''
    let gradeT = 0
    let gradeC = '143,160,180'
    const plates = []

    const fx = []
    const FX_MAX = 64
    function fxNew() {
      for (let i = 0; i < fx.length; i += 1) if (!fx[i].on) return fx[i]
      if (fx.length >= FX_MAX) return null
      fx.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 2, life: 0, k: 0, c: '255,255,255' })
      return fx[fx.length - 1]
    }
    function burst(x, y, n, c, spd, dir) {
      for (let j = 0; j < n; j += 1) {
        const p = fxNew()
        if (!p) return
        const a = dir === undefined ? api.rnd(0, Math.PI * 2) : dir + api.rnd(-0.8, 0.8)
        const v = api.rnd(spd * 0.3, spd)
        p.on = true
        p.x = x
        p.y = y
        p.vx = Math.cos(a) * v
        p.vy = Math.sin(a) * v
        p.r = api.rnd(1.6, 3.2)
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
          p.r += 205 * dt
          p.life -= dt * 2.5
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.94
          p.vy = p.vy * 0.94 + 200 * dt
          p.life -= dt * 2.1
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
      let best = -1
      let bd = 9
      for (let i = 0; i < plates.length; i += 1) {
        const p = plates[i]
        if (p.done) continue
        const d = Math.abs(time - p.at)
        if (d < bd) {
          bd = d
          best = i
        }
      }
      if (best < 0 || bd > HALF) {
        combo = 0
        miss = 1
        shake = 1
        hopT = 0.001
        grade = 'MISS'
        gradeC = '255,122,122'
        gradeT = 1
        burst(HERO_X, GROUND_Y, 4, '143,160,180', 90, -Math.PI / 2)
        return
      }
      const plate = plates[best]
      plate.done = true
      plate.hit = 1
      hits += 1
      combo += 1
      if (combo > bestCombo) bestCombo = combo
      hopT = 0.001
      flash = 1
      beatPulse = 1
      grade = bd <= PERFECT ? 'PERFECT' : 'GOOD'
      gradeC = bd <= PERFECT ? '139,220,122' : '255,207,92'
      gradeT = 1
      halo(HERO_X, GROUND_Y - 8, '139,220,122', 14)
      burst(HERO_X, GROUND_Y - 6, bd <= PERFECT ? 12 : 7, gradeC, 165, -Math.PI / 2)
      api.progress(1)
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return // 长按不重复结算
      if (key === 'space' || key === 'enter') judge()
    })

    return {
      update(dt) {
        time += dt
        if (time >= nextAt) {
          let guard = 0
          while (time >= nextAt && guard < 6) {
            guard += 1
            plates.push({ at: nextAt, done: false, hit: 0 })
            nextAt += PERIOD
            beatPulse = 1
          }
        }
        for (let i = plates.length - 1; i >= 0; i -= 1) {
          const p = plates[i]
          const px = HERO_X + (p.at - time) * SPEED
          if (!p.done && time > p.at + HALF) {
            p.done = true
            combo = 0
            miss = 1
            burst(px, GROUND_Y - 4, 4, '255,122,122', 80, -Math.PI / 2)
          }
          if (px < -60) plates.splice(i, 1)
        }
        hopT = hopT > 0 ? hopT + dt / 0.34 : 0
        if (hopT >= 1) hopT = 0
        flash = Math.max(0, flash - dt * 4.5)
        miss = Math.max(0, miss - dt * 3.5)
        shake = Math.max(0, shake - dt * 5)
        beatPulse = Math.max(0, beatPulse - dt * 3)
        gradeT = Math.max(0, gradeT - dt * 1.5)
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(time * 128) * shake * 5 : 0
        const oy = shake > 0 ? Math.sin(time * 141) * shake * 4 : 0
        api.clear(api.colors.bg)
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (beatPulse * 0.045).toFixed(3) + ')')
        // 远景节拍刻度
        for (let i = 0; i < 12; i += 1) {
          const gx = ((i * 80 - time * 120) % (W + 160) + W + 160) % (W + 160) - 80
          api.rect(gx, 40, 2, 26, 'rgba(143,160,180,0.12)')
        }
        // 地面
        api.rect(0, GROUND_Y, W, 3, 'rgba(143,160,180,0.35)')
        api.rect(0, GROUND_Y + 3, W, 60, 'rgba(24,32,40,0.75)')
        // 判定线
        api.rect(HERO_X - 1, GROUND_Y - 64, 2, 64, 'rgba(255,207,92,0.28)')
        api.circle(HERO_X, GROUND_Y, 4 + beatPulse * 6, 'rgba(255,207,92,' + (0.25 + beatPulse * 0.35).toFixed(3) + ')')
        // 踏板
        for (let i = 0; i < plates.length; i += 1) {
          const p = plates[i]
          const px = HERO_X + (p.at - time) * SPEED
          const y = GROUND_Y - 14
          api.rect(px - 26, y, 52, 14, p.hit ? api.colors.good : p.done ? 'rgba(143,160,180,0.35)' : api.colors.accent2)
          api.rect(px - 20, y + 4, 40, 3, 'rgba(16,20,24,0.4)')
          if (!p.done && Math.abs(px - HERO_X) < 60) {
            api.circle(px, y + 7, 3, 'rgba(139,220,122,0.6)')
          }
        }
        // 小人
        const lift = hopT > 0 ? Math.sin(hopT * Math.PI) * 58 : 0
        const hx = HERO_X + ox
        const hy = GROUND_Y - 18 - lift + oy
        api.circle(hx, GROUND_Y - 2, 12, 'rgba(0,0,0,0.35)')
        api.rect(hx - 7, hy - 16, 14, 20, flash > 0 ? api.colors.good : api.colors.fg)
        api.circle(hx, hy - 22, 7, api.colors.accent)
        api.rect(hx - 5, hy + 4, 4, 10, api.colors.accent)
        api.rect(hx + 2, hy + 4, 4, 10, api.colors.accent)
        fxDraw(ox, oy)
        if (gradeT > 0) {
          api.text(grade, hx, hy - 46, {
            size: 12 + gradeT * 4,
            color: 'rgba(' + gradeC + ',' + Math.min(1, gradeT).toFixed(3) + ')',
            align: 'center',
            weight: 'bold',
          })
        }
        // HUD
        api.text(String(hits), 20, 26, { size: 30, color: api.colors.fg, weight: 'bold' })
        if (combo > 1) api.text('x' + combo, 20, 50, { size: 13 + Math.min(8, combo), color: api.colors.good, weight: 'bold' })
        if (bestCombo > 2) api.text('MAX x' + bestCombo, W - 20, 24, { size: 11, color: api.colors.dim, align: 'right' })
        api.text('SPACE', W - 20, H - 16, { size: 11, color: api.colors.dim, align: 'right' })
        if (miss > 0) api.rect(0, 0, W, 6, 'rgba(255,122,122,' + (miss * 0.7).toFixed(3) + ')')
      },
      dispose() {
        offKey()
      },
    }
  },
})
