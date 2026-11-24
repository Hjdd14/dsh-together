defineGame({
  id: 'pvz',
  create(api) {
    const C = api.colors
    const LANES = 5
    const COLS = 8
    const FX = 44
    const FY = 64
    const CW = 48
    const CH = 50
    const COST = 25
    let sun = 50
    let plants = []
    let zombies = []
    let shots = []
    let t = 0
    let spawnT = 3.2
    let sunAcc = 0
    let shakeT = 0
    let flashT = 0
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let lost = false
    const parts = []

    function laneY(lane) {
      return FY + lane * CH + CH / 2
    }

    function colX(col) {
      return FX + col * CW + CW / 2
    }

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(40, 170)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
          life: api.rnd(0.4, 0.85), age: 0, r: api.rnd(1.4, 3),
        })
      }
      while (parts.length > 80) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.7
    }

    function plantAt(lane, col) {
      for (let i = 0; i < plants.length; i += 1) {
        if (plants[i].lane === lane && plants[i].col === col) return
      }
      if (sun < COST) {
        pop('NEED 25 SUN', C.warn)
        flashT = 0.3
        return
      }
      sun -= COST
      plants.push({ lane, col, cd: 0.4 })
      burst(colX(col), laneY(lane), 10)
      pop('PLANTED', C.good)
    }

    function spawnZombie() {
      const lane = api.irnd(0, LANES - 1)
      zombies.push({
        lane,
        x: 452,
        hp: 2 + (api.rng() < 0.15 ? 1 : 0),
        speed: 9 + api.rnd(0, 4),
        hit: 0,
      })
    }

    api.onPointer((ev) => {
      if (ev.type !== 'down' || lost) return
      const col = Math.floor((ev.x - FX) / CW)
      const lane = Math.floor((ev.y - FY) / CH)
      if (col < 0 || col >= COLS || lane < 0 || lane >= LANES) return
      plantAt(lane, col)
    })

    return {
      update(dt) {
        t += dt
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        sunAcc += dt
        while (sunAcc >= 1) {
          sunAcc -= 1
          sun = Math.min(220, sun + 13)
        }
        spawnT -= dt
        if (spawnT <= 0) {
          spawnT = Math.max(2, 3 - t * 0.025)
          spawnZombie()
        }
        for (let i = 0; i < plants.length; i += 1) {
          const p = plants[i]
          p.cd -= dt
          if (p.cd > 0) continue
          p.cd = 0.85
          shots.push({ lane: p.lane, x: colX(p.col) + 16 })
        }
        for (let i = shots.length - 1; i >= 0; i -= 1) {
          const s = shots[i]
          s.x += 260 * dt
          if (s.x > 470) {
            shots.splice(i, 1)
            continue
          }
          for (let k = 0; k < zombies.length; k += 1) {
            const z = zombies[k]
            if (z.lane !== s.lane) continue
            if (Math.abs(z.x - s.x) > 15) continue
            z.hp -= 1
            z.hit = 0.18
            burst(s.x, laneY(s.lane), 5)
            shots.splice(i, 1)
            if (z.hp <= 0) {
              burst(z.x, laneY(z.lane), 14)
              zombies.splice(k, 1)
            }
            break
          }
        }
        for (let i = zombies.length - 1; i >= 0; i -= 1) {
          const z = zombies[i]
          z.x -= z.speed * dt
          if (z.hit > 0) z.hit = Math.max(0, z.hit - dt)
          if (z.x < 40) {
            lost = true
            api.lose('overrun')
            return
          }
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 300 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        for (let i = 0; i < 3; i += 1) {
          api.rect(0, ((t * 7 + i * 150) % 460) - 70, api.w, 110, 'rgba(96,200,120,0.035)')
        }
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('PLANT DEFENSE', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.circle(346, 26, 9, C.accent2)
        api.text(String(Math.floor(sun)), 360, 27, { size: 15, color: C.accent2, weight: 'bold' })
        api.text('hold ' + Math.max(0, Math.ceil(api.attemptSeconds - t)) + 's', api.w - 18, 27, {
          size: 14, color: C.accent, align: 'right', weight: 'bold',
        })
        const sx = shakeT > 0 ? Math.sin(shakeT * 70) * 5 : 0
        for (let lane = 0; lane < LANES; lane += 1) {
          for (let col = 0; col < COLS; col += 1) {
            const x = FX + col * CW + sx
            const y = FY + lane * CH
            api.rect(x + 1, y + 1, CW - 2, CH - 2, (lane + col) % 2 ? 'rgba(255,255,255,0.022)' : 'rgba(255,255,255,0.05)')
          }
        }
        for (let i = 0; i < plants.length; i += 1) {
          const p = plants[i]
          const x = colX(p.col) + sx
          const y = laneY(p.lane)
          api.circle(x, y + 4, 15, 'rgba(96,200,120,0.25)')
          api.circle(x, y, 13, C.good)
          api.rect(x + 6, y - 5, 14, 10, C.good)
          api.circle(x + 19, y, 4, '#0d1218')
          api.rect(x - 4, y + 14, 8, 9, 'rgba(96,200,120,0.5)')
        }
        for (let i = 0; i < shots.length; i += 1) {
          const s = shots[i]
          api.circle(s.x + sx, laneY(s.lane), 4, C.accent2)
        }
        for (let i = 0; i < zombies.length; i += 1) {
          const z = zombies[i]
          const x = z.x + sx
          const y = laneY(z.lane)
          const ink = z.hit > 0 ? C.warn : 'rgba(150,120,200,0.95)'
          api.rect(x - 12, y - 8, 24, 34, ink)
          api.circle(x, y - 16, 11, ink)
          api.rect(x - 5, y - 18, 4, 4, C.fg)
          api.rect(x + 2, y - 18, 4, 4, C.fg)
          api.rect(x - 14, y - 4, 8, 4, 'rgba(150,120,200,0.7)')
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 336, { size: 13 + popT * 8, color: popColor, align: 'center', weight: 'bold' })
        }
        api.rect(0, api.h - 20, api.w, 20, C.panel)
        api.text('click an empty square · 25 sun each', api.w / 2, api.h - 10, { size: 11, color: C.dim, align: 'center' })
      },
    }
  },
})
