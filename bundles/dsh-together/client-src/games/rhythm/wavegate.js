defineGame({
  id: 'wavegate',
  create(api) {
    const W = api.w
    const H = api.h
    const PY = 292
    const PR = 7
    const SPEED = 208
    const GAP = 114
    const FALL = 92
    const waves = []
    let time = 0
    let px = W / 2
    let invuln = 1.1
    let spawn = 1.3
    let shake = 0
    let dead = false
    let pulse = 0
    let graze = 0
    const trail = []

    const fx = []
    const FX_MAX = 80
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
          p.vx *= 0.94
          p.vy *= 0.94
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

    function addWave() {
      let w = null
      for (let i = 0; i < waves.length; i += 1) {
        if (!waves[i].on) {
          w = waves[i]
          break
        }
      }
      if (!w) {
        if (waves.length >= 6) return
        w = { on: false, y: 0, gx: 0, done: false }
        waves.push(w)
      }
      w.on = true
      w.y = -30
      w.gx = api.rnd(GAP / 2 + 30, W - GAP / 2 - 30)
      w.done = false
    }

    return {
      update(dt) {
        if (dead) return
        time += dt
        invuln = Math.max(0, invuln - dt)
        shake = Math.max(0, shake - dt * 4)
        pulse = Math.max(0, pulse - dt * 3)

        let dir = 0
        if (api.down('left')) dir -= 1
        if (api.down('right')) dir += 1
        px += dir * SPEED * dt
        px = Math.max(PR + 6, Math.min(W - PR - 6, px))
        trail.push({ x: px, y: PY })
        if (trail.length > 7) trail.shift()

        spawn -= dt
        if (spawn <= 0) {
          addWave()
          pulse = 1
          spawn = Math.max(0.8, 1.15 - time * 0.012)
        }

        for (let i = 0; i < waves.length; i += 1) {
          const w = waves[i]
          if (!w.on) continue
          w.y += FALL * dt
          if (!w.done && w.y + 20 > PY - PR && w.y < PY + PR) {
            w.done = true
            if (Math.abs(px - w.gx) < GAP / 2 - PR - 2) {
              graze += 1
              burst(px, PY, 5, '139,220,122', 120)
            } else if (invuln <= 0) {
              dead = true
              shake = 1
              burst(px, PY, 22, '255,122,122', 210)
              halo(px, PY, '255,122,122', 8)
              api.lose('wave')
              return
            }
          }
          if (w.y > H + 40) w.on = false
        }
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(time * 126) * shake * 6 : 0
        const oy = shake > 0 ? Math.sin(time * 139) * shake * 5 : 0
        api.clear(api.colors.bg)
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (pulse * 0.05).toFixed(3) + ')')
        // 星尘背景
        for (let i = 0; i < 26; i += 1) {
          const sy = ((i * 97 + time * 40) % (H + 40) + H + 40) % (H + 40) - 20
          api.circle((i * 173) % W, sy, 1, 'rgba(143,160,180,0.28)')
        }
        // 玩家待机线
        api.rect(0, PY + PR + 8, W, 2, 'rgba(143,160,180,0.18)')
        // 波次
        for (let i = 0; i < waves.length; i += 1) {
          const w = waves[i]
          if (!w.on) continue
          const left = w.gx - GAP / 2
          const right = w.gx + GAP / 2
          const col = w.done ? 'rgba(143,160,180,0.3)' : api.colors.accent2
          api.rect(0 + ox, w.y + oy, left, 20, col)
          api.rect(right + ox, w.y + oy, W - right, 20, col)
          api.rect(0 + ox, w.y + oy, left, 3, 'rgba(255,255,255,0.45)')
          api.rect(right + ox, w.y + oy, W - right, 3, 'rgba(255,255,255,0.45)')
          if (!w.done) {
            api.circle(left + ox, PY + oy, 3, 'rgba(139,220,122,0.55)')
            api.circle(right + ox, PY + oy, 3, 'rgba(139,220,122,0.55)')
            api.rect(left + ox, PY - 10 + oy, GAP, 20, 'rgba(139,220,122,' + (0.05 + pulse * 0.08).toFixed(3) + ')')
          }
        }
        // 玩家拖尾 + 本体
        for (let i = 0; i < trail.length; i += 1) {
          const f = (i + 1) / trail.length
          api.circle(trail[i].x + ox, PY + oy, PR * f * 0.9, 'rgba(106,169,255,' + (f * 0.14).toFixed(3) + ')')
        }
        const blink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0
        if (!dead) {
          api.circle(px + ox, PY + oy, PR + 7, 'rgba(106,169,255,' + (blink ? 0.32 : 0.2) + ')')
          api.circle(px + ox, PY + oy, PR, blink ? api.colors.fg : api.colors.accent)
          api.circle(px + ox, PY + oy, 3, api.colors.fg)
        }
        fxDraw(ox, oy)
        const ticks = Math.min(40, Math.floor(time))
        for (let i = 0; i < ticks; i += 1) api.rect(8 + i * 8, 4, 5, 5, i % 5 === 4 ? api.colors.accent2 : api.colors.accent)
        api.text(String(Math.floor(time)) + 's', W - 12, 7, { size: 11, color: api.colors.dim, align: 'right' })
        api.text('L' + (1 + Math.floor(time / 5)), 12, 26, { size: 11, color: api.colors.accent2 })
        if (graze > 0) api.text('CLEAN ' + graze, 66, 26, { size: 11, color: api.colors.dim })
      },
    }
  },
})
