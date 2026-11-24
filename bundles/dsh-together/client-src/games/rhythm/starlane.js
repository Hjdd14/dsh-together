defineGame({
  id: 'starlane',
  create(api) {
    const W = api.w
    const H = api.h
    const COLS = 6
    const COLW = W / COLS
    const PY = 300
    const PR = 8
    const SPEED = 300
    const BW = 72
    const blocks = []
    let time = 0
    let px = W / 2
    let invuln = 1.1
    let spawn = 1.1
    let shake = 0
    let dead = false
    let pulse = 0
    let dodged = 0
    let lastCol = -1
    const trail = []

    const fx = []
    const FX_MAX = 90
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

    function addBlock() {
      let b = null
      for (let i = 0; i < blocks.length; i += 1) {
        if (!blocks[i].on) {
          b = blocks[i]
          break
        }
      }
      if (!b) {
        if (blocks.length >= 40) return
        b = { on: false, x: 0, y: 0, w: BW, h: 64, vy: 0, spark: 0 }
        blocks.push(b)
      }
      let col = api.irnd(0, COLS - 1)
      // 与上一块至少隔一列：保证总有一条能站的道
      if (Math.abs(col - lastCol) <= 1 && lastCol >= 0) {
        const shift = 2 + api.irnd(0, COLS - 4)
        col = (lastCol + (api.rng() < 0.5 ? shift : -shift) + COLS * 2) % COLS
      }
      lastCol = col
      b.on = true
      b.x = col * COLW + (COLW - BW) / 2
      b.y = -64 - api.rnd(0, 40)
      b.h = api.rnd(40, 60)
      b.vy = api.rnd(172, 212)
      b.spark = 0
      pulse = 1
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
        px = Math.max(PR + 5, Math.min(W - PR - 5, px))
        trail.push({ x: px, y: PY })
        if (trail.length > 7) trail.shift()

        spawn -= dt
        if (spawn <= 0) {
          addBlock()
          if (time > 6 && api.rng() < 0.1) addBlock()
          spawn = Math.max(0.55, 0.9 - time * 0.008)
        }

        for (let i = 0; i < blocks.length; i += 1) {
          const b = blocks[i]
          if (!b.on) continue
          b.y += b.vy * dt
          b.spark += dt
          if (b.spark > 0.09) {
            b.spark = 0
            burst(b.x + BW / 2 + api.rnd(-26, 26), b.y + 6, 1, '255,207,92', 40)
          }
          if (b.y > H + 80) {
            b.on = false
            dodged += 1
            continue
          }
          const cx = b.x + BW / 2
          const cy = b.y + b.h / 2
          // The columns tile the screen, so a player standing on a seam is still overlapping a
          // block; the old -4 slack made that seam a free safe spot (idle survived forever).
          if (Math.abs(px - cx) < BW / 2 + PR && Math.abs(PY - cy) < b.h / 2 + PR) {
            if (invuln > 0) continue
            dead = true
            shake = 1
            burst(px, PY, 22, '255,122,122', 215)
            halo(px, PY, '255,122,122', 8)
            api.lose('rail')
            return
          }
        }
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(time * 126) * shake * 6 : 0
        const oy = shake > 0 ? Math.sin(time * 139) * shake * 5 : 0
        api.clear(api.colors.bg)
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (pulse * 0.045).toFixed(3) + ')')
        // 星轨（列）
        for (let c = 1; c < COLS; c += 1) {
          api.rect(c * COLW - 1 + ox, 16, 2, H - 16, 'rgba(143,160,180,' + (0.10 + pulse * 0.06).toFixed(3) + ')')
        }
        for (let i = 0; i < 30; i += 1) {
          const sx = ((i * 149 + 17) % W)
          const sy = ((i * 83 + time * 150) % (H + 30) + H + 30) % (H + 30) - 15
          api.circle(sx + ox, sy + oy, 1, 'rgba(143,160,180,0.3)')
        }
        // 障碍：星轨段
        for (let i = 0; i < blocks.length; i += 1) {
          const b = blocks[i]
          if (!b.on) continue
          api.rect(b.x + ox, b.y + oy, BW, b.h, 'rgba(255,207,92,0.16)')
          api.rect(b.x + 4 + ox, b.y + oy, 4, b.h, api.colors.accent2)
          api.rect(b.x + BW - 8 + ox, b.y + oy, 4, b.h, api.colors.accent2)
          api.rect(b.x + 4 + ox, b.y + oy, BW - 8, 5, 'rgba(255,207,92,0.85)')
          api.rect(b.x + 4 + ox, b.y + b.h - 5 + oy, BW - 8, 5, 'rgba(255,207,92,0.55)')
          api.circle(b.x + BW / 2 + ox, b.y + 8 + oy, 4, api.colors.fg)
        }
        // 玩家
        api.rect(0, PY + PR + 6, W, 2, 'rgba(143,160,180,0.16)')
        for (let i = 0; i < trail.length; i += 1) {
          const f = (i + 1) / trail.length
          api.circle(trail[i].x + ox, PY + oy, PR * f * 0.85, 'rgba(106,169,255,' + (f * 0.14).toFixed(3) + ')')
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
        api.text('L' + (1 + Math.floor(time / 4)), 12, 26, { size: 11, color: api.colors.accent2 })
        if (dodged > 0) api.text('PASS ' + dodged, 66, 26, { size: 11, color: api.colors.dim })
      },
    }
  },
})
