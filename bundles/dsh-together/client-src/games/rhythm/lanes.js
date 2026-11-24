defineGame({
  id: 'lanes',
  create(api) {
    const W = api.w
    const H = api.h
    const SHIP_Y = H - 62
    const SHIP_W = 26
    const GAP = 104
    const gates = []
    let t = 0
    let x = W / 2
    let spawn = 0.4
    let passed = 0
    let shields = 3
    let hurt = 0
    let shake = 0
    let clean = 0
    let streak = 0
    let dead = false
    const trail = []

    const fx = []
    const FX_MAX = 72
    function fxNew() {
      for (let i = 0; i < fx.length; i += 1) if (!fx[i].on) return fx[i]
      if (fx.length >= FX_MAX) return null
      fx.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 2, life: 0, k: 0, grow: 0, c: '255,255,255' })
      return fx[fx.length - 1]
    }
    function burst(x, y, n, c, spd, dir) {
      for (let j = 0; j < n; j += 1) {
        const p = fxNew()
        if (!p) return
        const a = dir === undefined ? api.rnd(0, Math.PI * 2) : dir + api.rnd(-0.7, 0.7)
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
          p.vx *= 0.95
          p.vy *= 0.95
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

    function addGate() {
      let g = null
      for (let i = 0; i < gates.length; i += 1) {
        if (!gates[i].on) {
          g = gates[i]
          break
        }
      }
      if (!g) {
        if (gates.length >= 8) return
        g = { on: false, y: 0, gx: 0, done: false, speed: 0, age: 0 }
        gates.push(g)
      }
      g.gx = api.rnd(GAP / 2 + 18, W - GAP / 2 - 18)
      g.y = -26
      g.done = false
      g.speed = api.rnd(86, 104)
      g.age = 0
      g.on = true
    }

    return {
      update(dt) {
        if (dead) return
        t += dt
        hurt = Math.max(0, hurt - dt * 2)
        shake = Math.max(0, shake - dt * 5)
        clean = Math.max(0, clean - dt * 2.5)
        const boost = api.down('space')
        const speed = boost ? 300 : 182
        if (api.down('left')) x -= speed * dt
        if (api.down('right')) x += speed * dt
        x = Math.max(SHIP_W / 2 + 6, Math.min(W - SHIP_W / 2 - 6, x))
        trail.push({ x, y: SHIP_Y })
        if (trail.length > 8) trail.shift()
        if (boost && api.rng() < 0.5) burst(x, SHIP_Y + 16, 1, '255,207,92', 90, Math.PI / 2)

        spawn -= dt
        if (spawn <= 0) {
          addGate()
          spawn = Math.max(0.85, 1.6 - t * 0.03)
        }

        for (let i = 0; i < gates.length; i += 1) {
          const gate = gates[i]
          if (!gate.on) continue
          gate.y += gate.speed * dt
          gate.age += dt
          if (!gate.done && gate.y > SHIP_Y - 14 && gate.y < SHIP_Y + 18) {
            gate.done = true
            if (Math.abs(x - gate.gx) < GAP / 2 - SHIP_W / 2 - 2) {
              passed += 1
              streak += 1
              clean = 1
              halo(x, SHIP_Y, '139,220,122', 14, 300)
              burst(x, SHIP_Y, 9, '139,220,122', 160)
              api.progress(1)
            } else {
              shields -= 1
              hurt = 1
              shake = 1
              streak = 0
              burst(x, SHIP_Y, 14, '255,122,122', 190)
              if (shields <= 0) {
                dead = true
                api.lose('crash')
                return
              }
            }
          }
          if (gate.y > H + 40) gate.on = false
        }
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(t * 127) * shake * 6 : 0
        const oy = shake > 0 ? Math.sin(t * 139) * shake * 5 : 0
        api.clear(api.colors.bg)
        const beat = Math.max(0, 1 - (t % 0.5) / 0.5)
        // 航道
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (beat * 0.03).toFixed(3) + ')')
        for (let i = 0; i < 9; i += 1) {
          const yy = ((i * 52 + t * 120) % (H + 60)) - 40
          api.rect(8 + ox, yy + oy, 2, 22, 'rgba(143,160,180,0.16)')
          api.rect(W - 10 + ox, yy + oy, 2, 22, 'rgba(143,160,180,0.16)')
        }
        // 门（渐入）
        for (let i = 0; i < gates.length; i += 1) {
          const gate = gates[i]
          if (!gate.on) continue
          const grow = Math.min(1, gate.age / 0.25)
          const left = gate.gx - GAP / 2
          const hh = 16 * grow
          const col = gate.done ? 'rgba(143,160,180,0.35)' : api.colors.accent2
          api.rect(0 + ox, gate.y + oy, left, hh, col)
          api.rect(left + GAP + ox, gate.y + oy, W - left - GAP, hh, col)
          api.rect(left + ox, gate.y + oy, GAP, 4 * grow, 'rgba(255,255,255,0.35)')
          api.rect(left + ox, gate.y + 12 * grow + oy, GAP, 4 * grow, 'rgba(139,220,122,0.5)')
          if (!gate.done) {
            api.circle(gate.gx + ox, SHIP_Y + oy, 3, 'rgba(139,220,122,' + (0.25 + beat * 0.4).toFixed(3) + ')')
          }
        }
        // 船
        if (trail.length > 1) {
          for (let i = 0; i < trail.length - 1; i += 1) {
            const f = (i + 1) / trail.length
            api.circle(trail[i].x + ox, trail[i].y + 16 + oy, 4 * f, 'rgba(106,169,255,' + (f * 0.18).toFixed(3) + ')')
          }
        }
        if (!dead) {
          api.rect(x - SHIP_W / 2 + ox, SHIP_Y - 4 + oy, SHIP_W, 18, api.colors.accent)
          api.rect(x - 4 + ox, SHIP_Y - 14 + oy, 8, 12, api.colors.fg)
          api.circle(x + ox, SHIP_Y + 12 + oy, 6 + beat * 2, 'rgba(106,169,255,0.4)')
        }
        fxDraw(ox, oy)
        if (clean > 0) api.text('PASS', x + ox, SHIP_Y - 34 + oy, { size: 13, color: api.colors.good, align: 'center', weight: 'bold' })
        if (hurt > 0) api.rect(0, 0, W, H, 'rgba(255,122,122,' + (hurt * 0.22).toFixed(3) + ')')
        // HUD
        for (let i = 0; i < 3; i += 1) {
          api.circle(16 + i * 16, 14, 5, i < shields ? api.colors.good : 'rgba(143,160,180,0.25)')
        }
        api.text(String(passed), W - 14, 15, { size: 18, color: api.colors.fg, align: 'right', weight: 'bold' })
        if (streak > 1) api.text('x' + streak, W - 44, 16, { size: 12, color: api.colors.accent2, align: 'right', weight: 'bold' })
        api.text('SPACE', 12, H - 14, { size: 11, color: api.colors.dim })
      },
    }
  },
})
