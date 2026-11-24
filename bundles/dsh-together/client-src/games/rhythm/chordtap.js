defineGame({
  id: 'chordtap',
  create(api) {
    const W = api.w
    const H = api.h
    const PADS = 4
    const KEY_W = 104
    const KEY_H = 176
    const KEY_Y = 96
    const WINDOW = 2.6
    const clicks = []
    const mark = [0, 0, 0, 0]
    let chord = [0, 1]
    let phase = 'arm'
    let arm = 0.6
    let gap = 0
    let left = WINDOW
    let time = 0
    let done = 0
    let round = 0
    let combo = 0
    let bestCombo = 0
    let flash = 0
    let warn = 0
    let shake = 0
    let pulse = 0

    const fx = []
    const FX_MAX = 64
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
          p.r += 220 * dt
          p.life -= dt * 2.4
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.93
          p.vy = p.vy * 0.93 + 120 * dt
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

    const keyX = (i) => 18 + i * (KEY_W + 8)
    const inChord = (i) => chord.indexOf(i) >= 0

    function newChord() {
      const n = round >= 4 ? 3 : 2
      const pool = [0, 1, 2, 3]
      chord = []
      for (let i = 0; i < n; i += 1) {
        const j = api.irnd(0, pool.length - 1)
        chord.push(pool[j])
        pool.splice(j, 1)
      }
      mark[0] = 0
      mark[1] = 0
      mark[2] = 0
      mark[3] = 0
      left = WINDOW
      phase = 'arm'
      arm = 0.9
      pulse = 1
    }

    function tap(i) {
      if (phase !== 'play') return
      const cx = keyX(i) + KEY_W / 2
      if (!inChord(i)) {
        warn = 1
        shake = 1
        combo = 0
        mark[0] = 0
        mark[1] = 0
        mark[2] = 0
        mark[3] = 0
        burst(cx, KEY_Y + 60, 6, '255,122,122', 130)
        return
      }
      if (mark[i]) return
      mark[i] = 1
      halo(cx, KEY_Y + KEY_H / 2, '139,220,122', 12)
      burst(cx, KEY_Y + KEY_H / 2, 6, '139,220,122', 140)
      let ok = 0
      for (let k = 0; k < PADS; k += 1) if (mark[k]) ok += 1
      if (ok < chord.length) return
      // 整组按对
      done += 1
      round += 1
      combo += 1
      if (combo > bestCombo) bestCombo = combo
      flash = 1
      for (let k = 0; k < PADS; k += 1) halo(keyX(k) + KEY_W / 2, KEY_Y + KEY_H / 2, '139,220,122', 10)
      burst(W / 2, KEY_Y + KEY_H / 2, 16, '139,220,122', 200)
      api.progress(1)
      phase = 'gap'
      gap = 0.8
    }

    const offPtr = api.onPointer((ev) => {
      if (ev.type !== 'down') return
      if (clicks.length < 4) clicks.push({ x: ev.x, y: ev.y })
    })
    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return
      const n = '1234'.indexOf(key)
      if (n >= 0) tap(n)
    })

    newChord()

    return {
      update(dt) {
        time += dt
        pulse = Math.max(0, pulse - dt * 2.6)
        flash = Math.max(0, flash - dt * 4)
        warn = Math.max(0, warn - dt * 3)
        shake = Math.max(0, shake - dt * 5)
        fxStep(dt)
        while (clicks.length) {
          const c = clicks.shift()
          for (let i = 0; i < PADS; i += 1) {
            if (c.x >= keyX(i) && c.x <= keyX(i) + KEY_W && c.y >= KEY_Y && c.y <= KEY_Y + KEY_H) {
              tap(i)
              break
            }
          }
        }
        if (phase === 'arm') {
          arm -= dt
          if (arm <= 0) phase = 'play'
          return
        }
        if (phase === 'gap') {
          gap -= dt
          if (gap <= 0) newChord()
          return
        }
        left -= dt
        if (left <= 0) {
          left = 0
          combo = 0
          warn = 1
          phase = 'gap'
          gap = 0.5
        }
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(time * 128) * shake * 5 : 0
        const oy = shake > 0 ? Math.sin(time * 141) * shake * 4 : 0
        api.clear(api.colors.bg)
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (pulse * 0.05).toFixed(3) + ')')
        for (let i = 0; i < PADS; i += 1) {
          const x = keyX(i)
          const lit = phase === 'play' && inChord(i)
          const got = mark[i] === 1
          const col = got ? api.colors.good : lit ? api.colors.accent2 : api.colors.panel
          api.rect(x + ox, KEY_Y + oy, KEY_W, KEY_H, 'rgba(143,160,180,0.16)')
          api.rect(x + 3 + ox, KEY_Y + 3 + oy, KEY_W - 6, KEY_H - 6, col)
          if (lit) {
            api.rect(x + 3 + ox, KEY_Y + 3 + oy, KEY_W - 6, 6, 'rgba(232,238,246,' + (0.35 + pulse * 0.4).toFixed(3) + ')')
            api.circle(x + KEY_W / 2 + ox, KEY_Y + KEY_H / 2 + oy, 22 + pulse * 8, 'rgba(255,207,92,0.16)')
          }
          api.rect(x + 3 + ox, KEY_Y + KEY_H - 30 + oy, KEY_W - 6, 3, 'rgba(16,20,24,0.35)')
          api.text(String(i + 1), x + KEY_W / 2 + ox, KEY_Y + KEY_H - 14 + oy, {
            size: 13,
            color: got || lit ? api.colors.bg : api.colors.dim,
            align: 'center',
            weight: 'bold',
          })
        }
        fxDraw(ox, oy)
        const frac = left > 0 ? left / WINDOW : 0
        api.rect(18, 78, W - 36, 6, 'rgba(143,160,180,0.18)')
        api.rect(18, 78, (W - 36) * frac, 6, frac < 0.3 ? api.colors.warn : api.colors.good)
        api.text(String(done), 20 + ox, 34 + oy, { size: 28, color: api.colors.fg, weight: 'bold' })
        api.text('x' + chord.length, 56 + ox, 40 + oy, { size: 12, color: api.colors.dim })
        if (combo > 1) {
          api.text('x' + combo, W - 20 + ox, 34 + oy, { size: 16 + Math.min(8, combo), color: api.colors.good, align: 'right', weight: 'bold' })
        }
        if (bestCombo > 2) api.text('MAX x' + bestCombo, W - 20, H - 16, { size: 11, color: api.colors.dim, align: 'right' })
        if (warn > 0) api.rect(0, 0, W, 6, 'rgba(255,122,122,' + (warn * 0.7).toFixed(3) + ')')
        if (flash > 0) api.rect(0, H - 5, W, 5, 'rgba(139,220,122,' + (flash * 0.6).toFixed(3) + ')')
      },
      dispose() {
        offPtr()
        offKey()
      },
    }
  },
})
