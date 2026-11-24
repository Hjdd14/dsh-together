defineGame({
  id: 'lasergrid',
  create(api) {
    const W = api.w
    const H = api.h
    const CW = 60
    const CH = 60
    const COLS = 8
    const ROWS = 6
    const P = { x: W / 2, y: H - 60, r: 6 }
    const SPEED = 176
    const lasers = []
    let t = 0
    let invuln = 1.1
    let spawn = 0.8
    let shake = 0
    let graze = 0
    let dead = false
    const trail = []

    const fx = []
    const FX_MAX = 90
    function fxNew() {
      for (let i = 0; i < fx.length; i += 1) if (!fx[i].on) return fx[i]
      if (fx.length >= FX_MAX) return null
      fx.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 2, life: 0, k: 0, grow: 0, c: '255,255,255' })
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
        p.r = api.rnd(1.6, 3.2)
        p.life = 1
        p.k = 0
        p.grow = 0
        p.c = c
      }
    }
    function halo(x, y, c, r0, growRate) {
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
      p.grow = growRate || 280
      p.c = c
    }
    function fxStep(dt) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.k === 1) {
          p.r += p.grow * dt
          p.life -= dt * 2.4
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.94
          p.vy *= 0.94
          p.life -= dt * 2.3
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

    const bandH = (idx) => idx * CH + CH / 2
    const bandV = (idx) => idx * CW + CW / 2

    function addLaser(horizontal, idx) {
      let l = null
      for (let i = 0; i < lasers.length; i += 1) {
        if (!lasers[i].on) {
          l = lasers[i]
          break
        }
      }
      if (!l) {
        if (lasers.length >= 6) return
        l = { on: false, h: true, idx: 0, warn: 0, live: 0 }
        lasers.push(l)
      }
      l.on = true
      l.h = horizontal
      l.idx = idx
      l.warn = 0.7
      l.live = 0
    }

    function pickLaser() {
      const horizontal = api.rng() < 0.62
      const count = horizontal ? ROWS : COLS
      let idx = api.irnd(0, count - 1)
      for (let i = 0; i < lasers.length; i += 1) {
        const l = lasers[i]
        if (l.on && l.h === horizontal && l.idx === idx && l.live < 0.15) idx = (idx + 1) % count
      }
      addLaser(horizontal, idx)
    }

    function inBand(l) {
      return l.h ? Math.abs(P.y - bandH(l.idx)) < CH / 2 + P.r * 0.2 : Math.abs(P.x - bandV(l.idx)) < CW / 2 + P.r * 0.2
    }

    return {
      update(dt) {
        if (dead) return
        t += dt
        invuln = Math.max(0, invuln - dt)
        shake = Math.max(0, shake - dt * 4)

        let vx = 0
        let vy = 0
        if (api.down('left')) vx -= 1
        if (api.down('right')) vx += 1
        if (api.down('up')) vy -= 1
        if (api.down('down')) vy += 1
        if (vx !== 0 || vy !== 0) {
          const n = Math.hypot(vx, vy)
          P.x += (vx / n) * SPEED * dt
          P.y += (vy / n) * SPEED * dt
        }
        P.x = Math.max(8, Math.min(W - 8, P.x))
        P.y = Math.max(14, Math.min(H - 10, P.y))
        trail.push({ x: P.x, y: P.y })
        if (trail.length > 7) trail.shift()

        spawn -= dt
        if (spawn <= 0) {
          pickLaser()
          spawn = Math.max(0.55, 1.15 - t * 0.03)
        }

        for (let i = lasers.length - 1; i >= 0; i -= 1) {
          const l = lasers[i]
          if (!l.on) continue
          if (l.warn > 0) {
            l.warn = Math.max(0, l.warn - dt)
            if (l.warn === 0) {
              burst(l.h ? P.x : bandV(l.idx), l.h ? bandH(l.idx) : P.y, 6, '255,207,92', 120)
            }
            continue
          }
          l.live += dt
          if (l.live > 0.34) {
            l.on = false
            continue
          }
          if (inBand(l)) {
            if (invuln > 0) continue
            dead = true
            shake = 1
            burst(P.x, P.y, 22, '255,122,122', 210)
            halo(P.x, P.y, '255,122,122', 8, 330)
            api.lose('laser')
            return
          }
          // 擦线：光束贴边掠过
          const near = l.h ? Math.abs(P.y - bandH(l.idx)) < CH / 2 + 16 : Math.abs(P.x - bandV(l.idx)) < CW / 2 + 16
          if (near && api.rng() < 0.3) {
            graze += 1
            burst(P.x, P.y, 1, '255,207,92', 70)
          }
        }
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(t * 128) * shake * 6 : 0
        const oy = shake > 0 ? Math.sin(t * 141) * shake * 5 : 0
        api.clear(api.colors.bg)
        // 视觉节拍：网格随拍点亮
        const beat = Math.max(0, 1 - (t % 0.5) / 0.5)
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (beat * 0.035).toFixed(3) + ')')
        for (let c = 1; c < COLS; c += 1) api.rect(c * CW - 1 + ox, 0, 2, H, 'rgba(143,160,180,' + (0.10 + beat * 0.06).toFixed(3) + ')')
        for (let r = 1; r < ROWS; r += 1) api.rect(0 + ox, r * CH - 1 + oy, W, 2, 'rgba(143,160,180,' + (0.10 + beat * 0.06).toFixed(3) + ')')

        for (let i = 0; i < lasers.length; i += 1) {
          const l = lasers[i]
          if (!l.on) continue
          if (l.warn > 0) {
            const k = 1 - l.warn / 0.7
            const pulse = 0.10 + k * 0.30 + Math.sin(l.warn * 46) * 0.05
            if (l.h) {
              api.rect(0 + ox, bandH(l.idx) - CH / 2 + oy, W, CH, 'rgba(255,207,92,' + Math.max(0, pulse).toFixed(3) + ')')
              api.rect(0 + ox, bandH(l.idx) - 2 + oy, W, 4, 'rgba(255,207,92,' + (k * 0.9).toFixed(3) + ')')
              // 倒计时收拢
              api.rect(0 + ox, bandH(l.idx) - 1 + oy, W * k, 2, api.colors.warn)
            } else {
              api.rect(bandV(l.idx) - CW / 2 + ox, 0 + oy, CW, H, 'rgba(255,207,92,' + Math.max(0, pulse).toFixed(3) + ')')
              api.rect(bandV(l.idx) - 2 + ox, 0 + oy, 4, H, 'rgba(255,207,92,' + (k * 0.9).toFixed(3) + ')')
              api.rect(bandV(l.idx) - 1 + ox, 0 + oy, 2, H * k, api.colors.warn)
            }
          } else if (l.h) {
            api.rect(0 + ox, bandH(l.idx) - CH / 2 + oy, W, CH, 'rgba(255,122,122,0.22)')
            api.rect(0 + ox, bandH(l.idx) - 10 + oy, W, 20, 'rgba(255,122,122,0.45)')
            api.rect(0 + ox, bandH(l.idx) - 5 + oy, W, 10, api.colors.warn)
            api.rect(0 + ox, bandH(l.idx) - 2 + oy, W, 4, api.colors.fg)
          } else {
            api.rect(bandV(l.idx) - CW / 2 + ox, 0 + oy, CW, H, 'rgba(255,122,122,0.22)')
            api.rect(bandV(l.idx) - 10 + ox, 0 + oy, 20, H, 'rgba(255,122,122,0.45)')
            api.rect(bandV(l.idx) - 5 + ox, 0 + oy, 10, H, api.colors.warn)
            api.rect(bandV(l.idx) - 2 + ox, 0 + oy, 4, H, api.colors.fg)
          }
        }
        // 玩家
        for (let i = 0; i < trail.length; i += 1) {
          const f = (i + 1) / trail.length
          api.circle(trail[i].x + ox, trail[i].y + oy, P.r * f * 0.9, 'rgba(106,169,255,' + (f * 0.12).toFixed(3) + ')')
        }
        const blink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0
        if (!dead) {
          api.circle(P.x + ox, P.y + oy, P.r + 6, 'rgba(106,169,255,' + (blink ? 0.3 : 0.18) + ')')
          api.circle(P.x + ox, P.y + oy, P.r, blink ? api.colors.fg : api.colors.accent)
        }
        fxDraw(ox, oy)
        const ticks = Math.min(40, Math.floor(t))
        for (let i = 0; i < ticks; i += 1) api.rect(8 + i * 8, 4, 5, 5, i % 5 === 4 ? api.colors.accent2 : api.colors.accent)
        api.text(String(Math.floor(t)) + 's', W - 12, 7, { size: 11, color: api.colors.dim, align: 'right' })
        api.text('L' + (1 + Math.floor(t / 3)), 12, 26, { size: 11, color: api.colors.accent2 })
        if (graze > 0) api.text('GRAZE ' + graze, 62, 26, { size: 11, color: api.colors.dim })
      },
    }
  },
})
