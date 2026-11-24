defineGame({
  id: 'guitar',
  create(api) {
    const W = api.w
    const H = api.h
    const LANES = 4
    const LW = W / LANES
    const LINE = H - 74
    const SPEED = 306
    const HALF = 42 // ≈±120ms 的落点窗口
    const PERFECT = 15
    const KEYS = ['d', 'f', 'j', 'k']
    const notes = []
    const clicks = []
    const laneGlow = [0, 0, 0, 0]
    let time = 0
    let spawn = 0.5
    let hits = 0
    let combo = 0
    let bestCombo = 0
    let missed = 0
    let flash = 0
    let miss = 0
    let shake = 0
    let beatPulse = 0
    let grade = ''
    let gradeT = 0
    let gradeC = '143,160,180'
    let gradeX = W / 2

    const fx = []
    const FX_MAX = 72
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
        const a = api.rnd(-Math.PI, 0)
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
    function halo(x, y, c) {
      const p = fxNew()
      if (!p) return
      p.on = true
      p.x = x
      p.y = y
      p.vx = 0
      p.vy = 0
      p.r = 10
      p.life = 1
      p.k = 1
      p.c = c
    }
    function fxStep(dt) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.k === 1) {
          p.r += 230 * dt
          p.life -= dt * 2.6
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy = p.vy * 0.94 + 150 * dt
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

    function judge(lane) {
      laneGlow[lane] = 1
      let best = -1
      let bd = 1e9
      for (let i = 0; i < notes.length; i += 1) {
        const n = notes[i]
        if (n.hit || n.lane !== lane) continue
        const d = Math.abs(n.y - LINE)
        if (d < bd) {
          bd = d
          best = i
        }
      }
      if (best < 0 || bd > HALF) {
        combo = 0
        miss = 1
        shake = 0.5
        grade = 'MISS'
        gradeC = '255,122,122'
        gradeT = 1
        gradeX = lane * LW + LW / 2
        return
      }
      const note = notes[best]
      note.hit = true
      hits += 1
      combo += 1
      if (combo > bestCombo) bestCombo = combo
      flash = 1
      beatPulse = 1
      const perfect = bd <= PERFECT
      grade = perfect ? 'PERFECT' : 'GOOD'
      gradeC = perfect ? '139,220,122' : '255,207,92'
      gradeT = 1
      gradeX = lane * LW + LW / 2
      halo(gradeX, LINE, gradeC)
      burst(gradeX, LINE, perfect ? 11 : 6, gradeC, 170)
      api.progress(1)
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return
      const lane = KEYS.indexOf(key)
      if (lane >= 0) judge(lane)
    })
    const offPtr = api.onPointer((ev) => {
      if (ev.type !== 'down') return
      if (clicks.length < 4) clicks.push(ev.x)
    })

    return {
      update(dt) {
        time += dt
        spawn -= dt
        if (spawn <= 0) {
          const last = notes.length > 0 ? notes[notes.length - 1].lane : -1
          let lane = api.irnd(0, LANES - 1)
          if (lane === last && api.rng() < 0.6) lane = (lane + 1 + api.irnd(0, LANES - 2)) % LANES
          notes.push({ lane, y: -26, hit: false })
          spawn = Math.max(0.34, 0.46 - time * 0.004)
        }
        for (let i = notes.length - 1; i >= 0; i -= 1) {
          const n = notes[i]
          n.y += SPEED * dt
          if (!n.hit && n.y > LINE + HALF + 8) {
            n.hit = true
            missed += 1
            combo = 0
            miss = 1
            shake = Math.max(shake, 0.4)
            burst(n.lane * LW + LW / 2, LINE + 20, 3, '255,122,122', 70)
          }
          if (n.y > H + 40) notes.splice(i, 1)
        }
        while (clicks.length) {
          const x = clicks.shift()
          judge(Math.max(0, Math.min(LANES - 1, Math.floor(x / LW))))
        }
        for (let i = 0; i < LANES; i += 1) laneGlow[i] = Math.max(0, laneGlow[i] - dt * 4)
        flash = Math.max(0, flash - dt * 5)
        miss = Math.max(0, miss - dt * 3.6)
        shake = Math.max(0, shake - dt * 5)
        beatPulse = Math.max(0, beatPulse - dt * 3)
        gradeT = Math.max(0, gradeT - dt * 1.7)
        fxStep(dt)
        api.setStatus(Math.floor(combo) > 1 ? 'COMBO x' + combo : 'hit ' + hits)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(time * 120) * shake * 5 : 0
        const oy = shake > 0 ? Math.sin(time * 143) * shake * 4 : 0
        api.clear(api.colors.bg)
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (beatPulse * 0.04).toFixed(3) + ')')
        for (let i = 0; i < LANES; i += 1) {
          const x = i * LW
          api.rect(x + 3 + ox, 0, LW - 6, H, i % 2 === 0 ? 'rgba(24,32,40,0.9)' : 'rgba(20,27,34,0.9)')
          if (laneGlow[i] > 0) api.rect(x + 3 + ox, 0, LW - 6, H, 'rgba(106,169,255,' + (laneGlow[i] * 0.18).toFixed(3) + ')')
          api.rect(x + LW / 2 - 1 + ox, 0, 2, H, 'rgba(143,160,180,0.18)')
        }
        // 判定线
        api.rect(0, LINE + oy, W, 2, 'rgba(255,207,92,0.45)')
        api.rect(0, LINE + 2 + oy, W, 22, 'rgba(255,207,92,' + (0.04 + beatPulse * 0.05).toFixed(3) + ')')
        // 音符（渐入）
        for (let i = 0; i < notes.length; i += 1) {
          const n = notes[i]
          if (n.hit) continue
          const x = n.lane * LW + 16
          const grow = Math.min(1, (n.y + 30) / 60)
          const h = 26 * (0.7 + grow * 0.3)
          const near = Math.abs(n.y - LINE) < HALF
          api.rect(x + ox, n.y - h / 2 + oy, LW - 32, h, near ? api.colors.good : api.colors.accent2)
          api.rect(x + 6 + ox, n.y - h / 2 + 5 + oy, LW - 44, h - 10, 'rgba(16,20,24,0.35)')
        }
        // 键位
        for (let i = 0; i < LANES; i += 1) {
          const cx = i * LW + LW / 2
          api.circle(cx + ox, LINE + 46 + oy, 16 + (laneGlow[i] > 0 ? laneGlow[i] * 4 : 0), laneGlow[i] > 0 ? api.colors.accent : 'rgba(143,160,180,0.22)')
          api.text(KEYS[i].toUpperCase(), cx + ox, LINE + 46 + oy, {
            size: 13,
            color: laneGlow[i] > 0 ? api.colors.bg : api.colors.dim,
            align: 'center',
            weight: 'bold',
          })
        }
        fxDraw(ox, oy)
        if (gradeT > 0) {
          api.text(grade, gradeX + ox, LINE - 34 + oy, {
            size: 12 + gradeT * 4,
            color: 'rgba(' + gradeC + ',' + Math.min(1, gradeT).toFixed(3) + ')',
            align: 'center',
            weight: 'bold',
          })
        }
        // HUD
        api.text(String(hits), 18 + ox, 26 + oy, { size: 30, color: api.colors.fg, weight: 'bold' })
        if (combo > 1) api.text('x' + combo, 18 + ox, 52 + oy, { size: 13 + Math.min(8, combo), color: api.colors.good, weight: 'bold' })
        if (missed > 0) api.text('-' + missed, W - 18, 26, { size: 17, color: api.colors.dim, align: 'right' })
        if (bestCombo > 2) api.text('MAX x' + bestCombo, W - 18, 46, { size: 11, color: api.colors.dim, align: 'right' })
        if (miss > 0) api.rect(0, H - 8, W, 8, 'rgba(255,122,122,' + (miss * 0.55).toFixed(3) + ')')
        if (flash > 0) api.rect(0, 0, W, 4, 'rgba(139,220,122,' + (flash * 0.5).toFixed(3) + ')')
      },
      dispose() {
        offKey()
        offPtr()
      },
    }
  },
})
