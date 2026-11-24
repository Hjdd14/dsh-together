defineGame({
  id: 'orbit',
  create(api) {
    const CX = api.w / 2
    const CY = api.h / 2 + 6
    const R_MIN = 44
    const R_MAX = 150
    const blocks = []
    const MAX = 16
    let t = 0
    let invuln = 1.1
    let spawn = 1.0
    let shake = 0
    let graze = 0
    let dead = false
    let ang = 0
    let rad = 96
    const trail = []

    const fx = []
    const FX_MAX = 56
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

    const angDist = (x, y) => {
      let d = x - y
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      return Math.abs(d)
    }
    const at = (a, r) => ({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r })

    function addBlock() {
      let b = null
      for (let i = 0; i < blocks.length; i += 1) {
        if (!blocks[i].on) {
          b = blocks[i]
          break
        }
      }
      if (!b) {
        if (blocks.length >= MAX) return
        b = { on: false, r: 0, a: 0, w: 0, len: 0, life: 0, age: 0 }
        blocks.push(b)
      }
      b.r = api.rnd(R_MIN + 8, R_MAX - 4)
      let a = api.rnd(0, Math.PI * 2)
      // 不在玩家身上凭空生成
      if (Math.abs(b.r - rad) < 30 && angDist(a, ang) < 0.85) a = ang + Math.PI + api.rnd(-0.6, 0.6)
      b.a = a
      b.w = (api.rng() < 0.5 ? -1 : 1) * api.rnd(0.55, 1.1)
      b.len = api.rnd(0.22, 0.4)
      b.life = 0
      b.age = 0
      b.on = true
    }

    return {
      update(dt) {
        if (dead) return
        t += dt
        invuln = Math.max(0, invuln - dt)
        shake = Math.max(0, shake - dt * 4)
        ang += (0.62 + Math.min(0.3, t * 0.02)) * dt
        if (api.down('up')) rad += 118 * dt
        if (api.down('down')) rad -= 118 * dt
        if (api.down('left')) ang -= 0.95 * dt
        if (api.down('right')) ang += 0.95 * dt
        rad = Math.max(R_MIN, Math.min(R_MAX, rad))
        trail.push({ a: ang, r: rad })
        if (trail.length > 12) trail.shift()

        spawn -= dt
        if (spawn <= 0) {
          addBlock()
          if (blocks.length > 6 && api.rng() < 0.5) addBlock()
          spawn = Math.max(0.5, 1.5 - t * 0.04)
        }

        for (let i = 0; i < blocks.length; i += 1) {
          const b = blocks[i]
          if (!b.on) continue
          b.a += b.w * dt
          b.age += dt
          b.life += dt
          if (b.age < 0.25) continue // 渐入期间不判定
          const nearR = Math.abs(b.r - rad) < 14
          const nearA = angDist(b.a, ang) < b.len + 0.09
          if (nearR && nearA) {
            if (invuln > 0) continue
            dead = true
            shake = 1
            burst(CX + Math.cos(ang) * rad, CY + Math.sin(ang) * rad, 22, '255,122,122', 200)
            halo(CX, CY, '255,122,122', 40, 260)
            api.lose('orbit')
            return
          }
          if (Math.abs(b.r - rad) < 26 && angDist(b.a, ang) < b.len + 0.5 && api.rng() < 0.25) {
            graze += 1
            burst(CX + Math.cos(b.a) * b.r, CY + Math.sin(b.a) * b.r, 1, '255,207,92', 70)
          }
          if (b.life > 26) b.on = false
        }
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(t * 126) * shake * 6 : 0
        const oy = shake > 0 ? Math.sin(t * 139) * shake * 5 : 0
        api.clear(api.colors.bg)
        const beat = Math.max(0, 1 - (t % 0.5) / 0.5)
        // 轨道圈（随拍扩散）
        for (let ring = R_MIN; ring <= R_MAX; ring += 26) {
          for (let i = 0; i < 26; i += 1) {
            const a = (i / 26) * Math.PI * 2
            api.circle(CX + Math.cos(a) * ring + ox, CY + Math.sin(a) * ring + oy, 1, 'rgba(143,160,180,' + (0.10 + beat * 0.05).toFixed(3) + ')')
          }
        }
        // 玩家当前所在轨道（让人一眼看出自己在哪条半径上）
        for (let i = 0; i < 36; i += 1) {
          const a = (i / 36) * Math.PI * 2
          api.circle(CX + Math.cos(a) * rad + ox, CY + Math.sin(a) * rad + oy, 1, 'rgba(139,220,122,0.22)')
        }
        // 障碍（渐入：前 0.25s 由小变大）
        for (let i = 0; i < blocks.length; i += 1) {
          const b = blocks[i]
          if (!b.on) continue
          const grow = Math.min(1, b.age / 0.25)
          const col = b.w > 0 ? api.colors.warn : api.colors.accent2
          for (let s = 0; s <= 6; s += 1) {
            const a = b.a - b.len + (b.len * 2 * s) / 6
            const p = at(a, b.r)
            api.circle(p.x + ox, p.y + oy, 7 * grow, col)
          }
          const c0 = at(b.a, b.r)
          api.circle(c0.x + ox, c0.y + oy, 3 * grow, 'rgba(16,20,24,0.8)')
        }
        // 玩家拖尾
        for (let i = 0; i < trail.length; i += 1) {
          const f = (i + 1) / trail.length
          const p = at(trail[i].a, trail[i].r)
          api.circle(p.x + ox, p.y + oy, 6 * f, 'rgba(139,220,122,' + (f * 0.16).toFixed(3) + ')')
        }
        // 核心
        api.circle(CX + ox, CY + oy, 16 + beat * 6, 'rgba(106,169,255,' + (0.18 + beat * 0.12).toFixed(3) + ')')
        api.circle(CX + ox, CY + oy, 8, api.colors.accent)
        // 玩家
        const pp = at(ang, rad)
        const blink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0
        if (!dead) {
          api.circle(pp.x + ox, pp.y + oy, 12, 'rgba(139,220,122,' + (blink ? 0.3 : 0.2) + ')')
          api.circle(pp.x + ox, pp.y + oy, 6, blink ? api.colors.fg : api.colors.good)
        }
        fxDraw(ox, oy)
        const ticks = Math.min(40, Math.floor(t))
        for (let i = 0; i < ticks; i += 1) api.rect(8 + i * 8, 4, 5, 5, i % 5 === 4 ? api.colors.accent2 : api.colors.accent)
        api.text(String(Math.floor(t)) + 's', api.w - 12, 7, { size: 11, color: api.colors.dim, align: 'right' })
        api.text('L' + (1 + Math.floor(t / 3)), 12, 26, { size: 11, color: api.colors.accent2 })
        if (graze > 0) api.text('GRAZE ' + graze, 62, 26, { size: 11, color: api.colors.dim })
        api.text('UP/DN', 12, api.h - 14, { size: 11, color: api.colors.dim })
      },
    }
  },
})
