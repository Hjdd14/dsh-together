defineGame({
  id: 'meteor',
  create(api) {
    const W = api.w
    const H = api.h
    const P = { x: W / 2, y: H - 46, r: 6 }
    const SPEED = 178
    const MAX = 80
    const rocks = []
    let t = 0
    let invuln = 1.1
    let spawn = 1.0
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
          p.vy = p.vy * 0.94 + 90 * dt
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

    function addRock() {
      let r = null
      for (let i = 0; i < rocks.length; i += 1) {
        if (!rocks[i].on) {
          r = rocks[i]
          break
        }
      }
      if (!r) {
        if (rocks.length >= MAX) return
        r = { on: false, x: 0, y: 0, vx: 0, vy: 0, r: 8, spin: 0, age: 0 }
        rocks.push(r)
      }
      r.on = true
      r.r = api.rnd(7, 13)
      r.x = api.rnd(14, W - 14)
      r.y = -r.r * 2
      r.vx = api.rnd(-38, 38)
      r.vy = api.rnd(112, 186)
      r.spin = api.rnd(0, 6)
      r.age = 0
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
        P.y = Math.max(30, Math.min(H - 12, P.y))
        trail.push({ x: P.x, y: P.y })
        if (trail.length > 7) trail.shift()

        spawn -= dt
        if (spawn <= 0) {
          addRock()
          if (api.rng() < 0.2 + Math.min(0.25, t * 0.01)) addRock()
          spawn = Math.max(0.24, 0.5 - t * 0.005)
        }

        for (let i = 0; i < rocks.length; i += 1) {
          const rock = rocks[i]
          if (!rock.on) continue
          rock.y += rock.vy * dt
          rock.x += rock.vx * dt
          rock.spin += dt * 3
          rock.age += dt
          if (rock.y > H + rock.r * 2 || rock.x < -40 || rock.x > W + 40) {
            rock.on = false
            continue
          }
          const d = Math.hypot(rock.x - P.x, rock.y - P.y)
          if (d < rock.r + P.r) {
            if (invuln > 0) continue
            dead = true
            shake = 1
            burst(P.x, P.y, 22, '255,122,122', 210)
            halo(P.x, P.y, '255,122,122', 8, 330)
            api.lose('meteor')
            return
          }
          if (rock.age > 0.35 && d < rock.r + P.r + 12 && api.rng() < 0.25) {
            graze += 1
            burst(rock.x, rock.y, 1, '106,169,255', 60)
          }
        }
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(t * 125) * shake * 6 : 0
        const oy = shake > 0 ? Math.sin(t * 138) * shake * 5 : 0
        api.clear(api.colors.bg)
        // 星空（节拍时整体微亮）
        const beat = Math.max(0, 1 - (t % 0.5) / 0.5)
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (beat * 0.04).toFixed(3) + ')')
        for (let i = 0; i < 24; i += 1) {
          const sx = (i * 197) % W
          const sy = ((i * 113 + t * 26) % H + H) % H
          api.circle(sx + ox, sy + oy, 1, 'rgba(143,160,180,' + (0.25 + beat * 0.3).toFixed(3) + ')')
        }
        api.rect(0, 18, W, 2, 'rgba(255,207,92,0.22)')
        // 陨石（落地前渐入 + 缩放）
        for (let i = 0; i < rocks.length; i += 1) {
          const rock = rocks[i]
          if (!rock.on) continue
          const grow = Math.min(1, rock.age / 0.3)
          const rr = rock.r * (0.5 + grow * 0.5)
          api.rect(rock.x - 2 + ox, Math.max(0, rock.y - rock.r * 3) + oy, 4, Math.max(0, rock.r * 2), 'rgba(255,122,122,' + (0.14 * grow).toFixed(3) + ')')
          api.circle(rock.x + ox, rock.y + oy, rr + 3, 'rgba(255,122,122,' + (0.16 * grow).toFixed(3) + ')')
          api.circle(rock.x + ox, rock.y + oy, rr, 'rgba(255,122,122,' + (0.35 + grow * 0.65).toFixed(3) + ')')
          api.circle(rock.x + ox, rock.y + oy, rr * 0.94, api.colors.warn)
          api.circle(
            rock.x + Math.cos(rock.spin) * rr * 0.4 + ox,
            rock.y + Math.sin(rock.spin) * rr * 0.4 + oy,
            Math.max(1, rr * 0.3),
            'rgba(16,20,24,0.75)'
          )
        }
        // 玩家 + 拖尾
        for (let i = 0; i < trail.length; i += 1) {
          const f = (i + 1) / trail.length
          api.circle(trail[i].x + ox, trail[i].y + oy, P.r * f * 0.9, 'rgba(106,169,255,' + (f * 0.12).toFixed(3) + ')')
        }
        const blink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0
        if (!dead) {
          api.circle(P.x + ox, P.y + oy, P.r + 6, 'rgba(106,169,255,' + (blink ? 0.3 : 0.18) + ')')
          api.circle(P.x + ox, P.y + oy, P.r, blink ? api.colors.fg : api.colors.accent)
          api.circle(P.x + ox, P.y + oy, 2, api.colors.fg)
        }
        fxDraw(ox, oy)
        const ticks = Math.min(40, Math.floor(t))
        for (let i = 0; i < ticks; i += 1) api.rect(8 + i * 8, 4, 5, 5, i % 5 === 4 ? api.colors.accent2 : api.colors.accent)
        api.text(String(Math.floor(t)) + 's', W - 12, 7, { size: 11, color: api.colors.dim, align: 'right' })
        api.text('L' + (1 + Math.floor(t / 4)), 12, 26, { size: 11, color: api.colors.accent2 })
        if (graze > 0) api.text('GRAZE ' + graze, 62, 26, { size: 11, color: api.colors.dim })
      },
    }
  },
})
