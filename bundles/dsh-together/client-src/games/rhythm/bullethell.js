defineGame({
  id: 'bullethell',
  create(api) {
    const W = api.w
    const H = api.h
    const P = { x: W / 2, y: H - 60, r: 6 }
    const SPEED = 172
    const MAX = 200
    const bullets = []
    let t = 0
    let invuln = 1.1
    let spawn = 0.7
    let shake = 0
    let graze = 0
    let dead = false
    const trail = []

    // ── 特效池 ────────────────────────────────────────────────────────────────
    const fx = []
    const FX_MAX = 90
    function fxNew() {
      for (let i = 0; i < fx.length; i += 1) if (!fx[i].on) return fx[i]
      if (fx.length >= FX_MAX) return null
      fx.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 2, life: 0, k: 0, grow: 0, c: '255,255,255' })
      return fx[fx.length - 1]
    }
    function burst(x, y, n, c, spd) {
      for (let k = 0; k < n; k += 1) {
        const p = fxNew()
        if (!p) return
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        p.on = true
        p.x = x
        p.y = y
        p.vx = Math.cos(a) * v
        p.vy = Math.sin(a) * v
        p.r = api.rnd(1.6, 3.4)
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
      p.grow = growRate || 260
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

    function shot(x, y, vx, vy, r) {
      let b = null
      for (let i = 0; i < bullets.length; i += 1) {
        if (!bullets[i].on) {
          b = bullets[i]
          break
        }
      }
      if (!b) {
        if (bullets.length >= MAX) return
        b = { on: false, x: 0, y: 0, vx: 0, vy: 0, r: 4, grazed: 0 }
        bullets.push(b)
      }
      b.on = true
      b.x = x
      b.y = y
      b.vx = vx
      b.vy = vy
      b.r = r
      b.grazed = 0
    }

    // 朝玩家方向略带偏差地出弹
    function shotAt(x, y, speed) {
      const dx = P.x - x
      const dy = P.y - y
      const len = Math.hypot(dx, dy) || 1
      const j = api.rnd(-0.62, 0.62)
      const cs = Math.cos(j)
      const sn = Math.sin(j)
      shot(x, y, ((dx / len) * cs - (dy / len) * sn) * speed, ((dx / len) * sn + (dy / len) * cs) * speed, api.rnd(4, 6))
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
        P.x = Math.max(10, Math.min(W - 10, P.x))
        P.y = Math.max(28, Math.min(H - 12, P.y))
        trail.push({ x: P.x, y: P.y })
        if (trail.length > 8) trail.shift()

        // 密度随时间缓慢爬升（判定窗口与玩家速度不变）
        spawn -= dt
        if (spawn <= 0) {
          if (api.rng() < 0.7) shotAt(api.rnd(20, W - 20), -8, api.rnd(70, 100))
          else {
            const left = api.rng() < 0.5
            shotAt(left ? -8 : W + 8, api.rnd(40, H - 120), api.rnd(74, 100))
          }
          if (api.rng() < 0.18 + Math.min(0.2, t * 0.006)) {
            shotAt(api.rnd(20, W - 20), -8, api.rnd(72, 96))
          }
          spawn = Math.max(0.26, 0.46 - t * 0.005)
        }

        for (let i = 0; i < bullets.length; i += 1) {
          const b = bullets[i]
          if (!b.on) continue
          b.x += b.vx * dt
          b.y += b.vy * dt
          if (b.x < -24 || b.x > W + 24 || b.y < -24 || b.y > H + 24) {
            b.on = false
            continue
          }
          const d = Math.hypot(b.x - P.x, b.y - P.y)
          const hitR = b.r + P.r
          if (d < hitR) {
            if (invuln > 0) continue
            dead = true
            shake = 1
            burst(P.x, P.y, 22, '255,122,122', 210)
            halo(P.x, P.y, '255,122,122', 8, 320)
            api.lose('hit')
            return
          }
          // 擦弹：贴脸掠过给一点点火花反馈（不计分，纯爽感）
          if (!b.grazed && d < hitR + 10) {
            b.grazed = 1
            graze += 1
            burst(b.x, b.y, 2, '106,169,255', 70)
          }
        }
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(t * 120) * shake * 6 : 0
        const oy = shake > 0 ? Math.sin(t * 133) * shake * 5 : 0
        api.clear(api.colors.bg)
        // 视觉节拍：每 0.5s 脉动一次的网格与顶栏
        const beat = Math.max(0, 1 - (t % 0.5) / 0.5)
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (beat * 0.045).toFixed(3) + ')')
        for (let y = 40; y < H; y += 40) api.rect(0 + ox, y + oy, W, 1, 'rgba(143,160,180,' + (0.07 + beat * 0.05).toFixed(3) + ')')
        for (let x = 40; x < W; x += 40) api.rect(x + ox, 0 + oy, 1, H, 'rgba(143,160,180,' + (0.07 + beat * 0.05).toFixed(3) + ')')
        // 玩家拖尾
        for (let i = 0; i < trail.length; i += 1) {
          const f = (i + 1) / trail.length
          api.circle(trail[i].x + ox, trail[i].y + oy, P.r * f * 0.9, 'rgba(106,169,255,' + (f * 0.12).toFixed(3) + ')')
        }
        // 弹幕
        for (let i = 0; i < bullets.length; i += 1) {
          const b = bullets[i]
          if (!b.on) continue
          api.circle(b.x + ox, b.y + oy, b.r + 3, 'rgba(255,122,122,0.18)')
          api.circle(b.x + ox, b.y + oy, b.r, api.colors.warn)
        }
        // 玩家
        const blink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0
        if (!dead) {
          api.circle(P.x + ox, P.y + oy, P.r + 6, 'rgba(106,169,255,' + (blink ? 0.3 : 0.18) + ')')
          api.circle(P.x + ox, P.y + oy, P.r, blink ? api.colors.fg : api.colors.accent)
          api.circle(P.x + ox, P.y + oy, 2, api.colors.fg)
        }
        fxDraw(ox, oy)
        // HUD：存活刻度 + 等级
        api.rect(0, 0, W, 16, 'rgba(16,20,24,0.7)')
        const ticks = Math.min(40, Math.floor(t))
        for (let i = 0; i < ticks; i += 1) api.rect(8 + i * 8, 5, 5, 6, i % 5 === 4 ? api.colors.accent2 : api.colors.accent)
        api.text(String(Math.floor(t)) + 's', W - 12, 8, { size: 11, color: api.colors.dim, align: 'right' })
        api.text('L' + (1 + Math.floor(t / 4)), 12, 26, { size: 11, color: api.colors.accent2 })
        if (graze > 0) api.text('GRAZE ' + graze, 62, 26, { size: 11, color: api.colors.dim })
      },
    }
  },
})
