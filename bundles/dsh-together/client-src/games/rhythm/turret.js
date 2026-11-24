defineGame({
  id: 'turret',
  create(api) {
    const W = api.w
    const H = api.h
    const BX = W / 2
    const BY = H / 2
    const ENEMY = []
    const MAX = 24
    const PER_WAVE = 4
    const clicks = []
    const traces = []
    let t = 0
    let spawn = 0.7
    let kills = 0
    let energy = 8
    let banner = 0
    let hurt = 0
    let shake = 0
    let shots = 0
    let streak = 0
    let dead = false

    const fx = []
    const FX_MAX = 80
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
          p.vx *= 0.93
          p.vy *= 0.93
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

    const offPtr = api.onPointer((ev) => {
      if (ev.type !== 'down') return
      if (clicks.length < 6) clicks.push({ x: ev.x, y: ev.y })
    })

    function addEnemy() {
      let e = null
      for (let i = 0; i < ENEMY.length; i += 1) {
        if (!ENEMY[i].on) {
          e = ENEMY[i]
          break
        }
      }
      if (!e) {
        if (ENEMY.length >= MAX) return
        e = { on: false, x: 0, y: 0, r: 11, sp: 0, age: 0, spin: 0 }
        ENEMY.push(e)
      }
      const side = api.irnd(0, 3)
      if (side === 0) {
        e.x = api.rnd(20, W - 20)
        e.y = -18
      } else if (side === 1) {
        e.x = api.rnd(20, W - 20)
        e.y = H + 18
      } else if (side === 2) {
        e.x = -18
        e.y = api.rnd(24, H - 24)
      } else {
        e.x = W + 18
        e.y = api.rnd(24, H - 24)
      }
      e.r = 11
      e.sp = api.rnd(36, 52)
      e.age = 0
      e.spin = api.rnd(0, 6)
      e.on = true
    }

    function fire() {
      while (clicks.length) {
        const c = clicks.shift()
        let best = -1
        let bd = 34
        for (let i = 0; i < ENEMY.length; i += 1) {
          const e = ENEMY[i]
          if (!e.on) continue
          const d = Math.hypot(e.x - c.x, e.y - c.y)
          if (d < bd) {
            bd = d
            best = i
          }
        }
        if (best < 0) {
          streak = 0
          burst(c.x, c.y, 2, '143,160,180', 60)
          continue
        }
        const e = ENEMY[best]
        e.on = false
        shots += 1
        streak += 1
        if (traces.length > 5) traces.shift()
        traces.push({ x1: BX, y1: BY, x2: e.x, y2: e.y, life: 1 })
        burst(e.x, e.y, 10, '255,207,92', 150)
        halo(e.x, e.y, '255,207,92', 8, 240)
        kills += 1
        if (kills >= PER_WAVE) {
          kills = 0
          banner = 1
          energy = Math.min(8, energy + 2)
          halo(BX, BY, '139,220,122', 26, 300)
          burst(BX, BY, 16, '139,220,122', 190)
          api.progress(1)
        }
      }
    }

    return {
      update(dt) {
        if (dead) return
        t += dt
        banner = Math.max(0, banner - dt * 1.6)
        hurt = Math.max(0, hurt - dt * 2)
        shake = Math.max(0, shake - dt * 5)
        for (let i = traces.length - 1; i >= 0; i -= 1) {
          traces[i].life -= dt * 5
          if (traces[i].life <= 0) traces.splice(i, 1)
        }
        fire()

        spawn -= dt
        if (spawn <= 0 && banner <= 0) {
          addEnemy()
          spawn = Math.max(0.55, 1.35 - t * 0.02)
        }

        for (let i = 0; i < ENEMY.length; i += 1) {
          const e = ENEMY[i]
          if (!e.on) continue
          e.age += dt
          e.spin += dt * 2.4
          const dx = BX - e.x
          const dy = BY - e.y
          const d = Math.hypot(dx, dy) || 1
          e.x += (dx / d) * e.sp * dt
          e.y += (dy / d) * e.sp * dt
          if (d < 26 + e.r) {
            e.on = false
            energy -= 1
            hurt = 1
            shake = 1
            streak = 0
            burst(e.x, e.y, 14, '255,122,122', 160)
            if (energy <= 0) {
              dead = true
              api.lose('breach')
              return
            }
          }
        }
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(t * 124) * shake * 6 : 0
        const oy = shake > 0 ? Math.sin(t * 137) * shake * 5 : 0
        api.clear(api.colors.bg)
        const beat = Math.max(0, 1 - (t % 0.5) / 0.5)
        // 雷达圈（随拍扩散）
        for (let ring = 1; ring <= 3; ring += 1) {
          api.circle(BX + ox, BY + oy, 26 + ring * 34, 'rgba(143,160,180,' + (0.04 + beat * 0.02).toFixed(3) + ')')
        }
        // 弹道
        for (let i = 0; i < traces.length; i += 1) {
          const tr = traces[i]
          for (let k = 1; k <= 8; k += 1) {
            const f = k / 8
            api.circle(tr.x1 + (tr.x2 - tr.x1) * f + ox, tr.y1 + (tr.y2 - tr.y1) * f + oy, 2, 'rgba(255,207,92,' + (tr.life * 0.5 * (1 - f * 0.5)).toFixed(3) + ')')
          }
        }
        // 敌方（渐入）
        for (let i = 0; i < ENEMY.length; i += 1) {
          const e = ENEMY[i]
          if (!e.on) continue
          const grow = Math.min(1, e.age / 0.22)
          const rr = e.r * grow
          api.rect(e.x - 2 + ox, e.y - rr - 4 + oy, 4, rr * 2 + 8, 'rgba(255,122,122,0.45)')
          api.rect(e.x - rr - 4 + ox, e.y - 2 + oy, rr * 2 + 8, 4, 'rgba(255,122,122,0.45)')
          api.circle(e.x + ox, e.y + oy, rr + 3, 'rgba(255,122,122,0.18)')
          api.circle(e.x + ox, e.y + oy, rr, api.colors.warn)
          api.circle(e.x + ox + Math.cos(e.spin) * rr * 0.35, e.y + oy + Math.sin(e.spin) * rr * 0.35, Math.max(1, rr * 0.32), 'rgba(16,20,24,0.8)')
        }
        // 炮塔
        api.circle(BX + ox, BY + oy, 24 + beat * 4, 'rgba(106,169,255,' + (0.2 + beat * 0.12).toFixed(3) + ')')
        api.circle(BX + ox, BY + oy, 15, api.colors.accent)
        api.circle(BX + ox, BY + oy, 6, api.colors.fg)
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2 + t
          api.circle(BX + Math.cos(a) * 32 + ox, BY + Math.sin(a) * 32 + oy, 2, 'rgba(106,169,255,0.5)')
        }
        fxDraw(ox, oy)
        if (hurt > 0) api.rect(0, 0, W, H, 'rgba(255,122,122,' + (hurt * 0.18).toFixed(3) + ')')
        // HUD
        for (let i = 0; i < energy; i += 1) api.rect(12 + i * 13, 10, 9, 8, api.colors.good)
        for (let i = 0; i < PER_WAVE; i += 1) {
          api.circle(W - 16 - i * 16, 14, 5, i < kills ? api.colors.accent2 : 'rgba(143,160,180,0.3)')
        }
        if (streak > 1) api.text('x' + streak, 150, 14, { size: 13 + Math.min(7, streak), color: api.colors.accent2, weight: 'bold' })
        if (banner > 0) {
          api.rect(0, H / 2 - 26, W, 52, 'rgba(139,220,122,' + (banner * 0.22).toFixed(3) + ')')
          api.text('WAVE CLEAR', W / 2, H / 2, { size: 20, color: api.colors.good, align: 'center', weight: 'bold' })
        }
        api.text('CLICK', 12, H - 14, { size: 11, color: api.colors.dim })
        if (shots > 0) api.text('HITS ' + shots, W - 12, H - 14, { size: 11, color: api.colors.dim, align: 'right' })
      },
      dispose() {
        offPtr()
      },
    }
  },
})
