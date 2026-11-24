defineGame({
  id: 'spaceimpact',
  create(api) {
    const W = api.w
    const H = api.h
    const SHIP_X = 62
    const SHIP_W = 26
    const SHIP_H = 16
    const BULLET_SPEED = 470

    const ship = { x: SHIP_X, y: H / 2 }
    const shots = []
    const foes = []
    const foeShots = []
    const stars = []
    const parts = []
    for (let i = 0; i < 40; i += 1) {
      stars.push({ x: api.rnd(0, W), y: api.rnd(0, H), z: api.rnd(0.3, 1.4), r: api.rnd(1, 2) })
    }

    let lives = 3
    let invuln = 1.2
    let cool = 0
    let kills = 0
    let spawnTimer = 0.7
    let dead = false
    let reason = ''
    let shake = 0
    let shx = 0
    let shy = 0
    let hitFlash = 0
    let killFlash = 0
    let scroll = 0

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 56; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.2, 0.45), max: 0.45,
          c: color, r: api.rnd(1.2, 2.8),
        })
      }
    }

    function spawnFoe() {
      if (foes.length >= 4) return
      const y = api.rnd(48, H - 60)
      foes.push({
        x: W + 30,
        y,
        vx: -api.rnd(95, 155),
        vy: api.rnd(-18, 18),
        hp: 1,
        cd: api.rnd(0.9, 2.1),
        wig: api.rnd(0, 6.28),
      })
    }

    function hurt() {
      if (invuln > 0 || dead) return
      lives -= 1
      invuln = 1.3
      hitFlash = 1
      shake = 0.8
      burst(ship.x, ship.y, api.colors.warn, 14, 180)
      if (lives <= 0) {
        dead = true
        reason = 'ship destroyed'
        api.lose(reason)
        return
      }
      ship.y = H / 2
      api.setStatus('kills ' + kills + ' · life ' + lives)
    }

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'space') {
        if (cool > 0) return
        cool = 0.17
        if (shots.length > 6) shots.shift()
        shots.push({ x: ship.x + SHIP_W / 2, y: ship.y })
      }
    })

    api.setStatus('kills 0')

    return {
      update(dt) {
        scroll += dt * 90
        if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - dt * 1.6)
        if (killFlash > 0) killFlash = Math.max(0, killFlash - dt * 3)
        if (invuln > 0) invuln -= dt
        if (cool > 0) cool -= dt
        if (shake > 0) {
          shake = Math.max(0, shake - dt)
          shx = api.rnd(-1, 1) * shake * 10
          shy = api.rnd(-1, 1) * shake * 10
        } else {
          shx = 0
          shy = 0
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.life -= dt
          if (p.life <= 0) { parts.splice(i, 1); continue }
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 1 - 1.6 * dt
        }
        if (dead) return

        const dir = (api.down('down') ? 1 : 0) - (api.down('up') ? 1 : 0)
        ship.y += dir * 250 * dt
        if (ship.y < 36) ship.y = 36
        if (ship.y > H - 36) ship.y = H - 36
        if (api.down('space')) {
          if (cool <= 0) {
            cool = 0.17
            if (shots.length > 6) shots.shift()
            shots.push({ x: ship.x + SHIP_W / 2, y: ship.y })
          }
        }

        spawnTimer -= dt
        if (spawnTimer <= 0) {
          spawnTimer = api.rnd(0.85, 1.5)
          spawnFoe()
        }

        for (let i = shots.length - 1; i >= 0; i -= 1) {
          const b = shots[i]
          b.x += BULLET_SPEED * dt
          if (b.x > W + 12) { shots.splice(i, 1); continue }
          for (let j = 0; j < foes.length; j += 1) {
            const f = foes[j]
            if (Math.abs(b.x - f.x) > 16 || Math.abs(b.y - f.y) > 14) continue
            shots.splice(i, 1)
            f.hp -= 1
            if (f.hp <= 0) {
              foes.splice(j, 1)
              kills += 1
              killFlash = 1
              shake = Math.max(shake, 0.24)
              burst(f.x, f.y, api.colors.accent2, 10, 170)
              api.progress(1)
              api.setStatus('kills ' + kills)
            } else {
              burst(f.x, f.y, api.colors.fg, 4, 110)
            }
            break
          }
        }

        for (let i = foes.length - 1; i >= 0; i -= 1) {
          const f = foes[i]
          f.x += f.vx * dt
          f.y += Math.sin(api.now() / 400 + f.wig) * f.vy * dt
          if (f.y < 36) f.y = 36
          if (f.y > H - 36) f.y = H - 36
          if (f.x < -40) { foes.splice(i, 1); continue }

          f.cd -= dt
          if (f.cd <= 0 && f.x < W - 20) {
            f.cd = api.rnd(1.3, 2.4)
            if (foeShots.length < 6) foeShots.push({ x: f.x - 10, y: f.y })
          }

          if (Math.abs(f.x - ship.x) < SHIP_W / 2 + 14 && Math.abs(f.y - ship.y) < SHIP_H / 2 + 12) {
            foes.splice(i, 1)
            burst(f.x, f.y, api.colors.warn, 8, 140)
            hurt()
            if (dead) return
          }
        }

        for (let i = foeShots.length - 1; i >= 0; i -= 1) {
          const b = foeShots[i]
          b.x -= 290 * dt
          if (b.x < -12) { foeShots.splice(i, 1); continue }
          if (Math.abs(b.x - ship.x) < SHIP_W / 2 + 3 && Math.abs(b.y - ship.y) < SHIP_H / 2 + 3) {
            foeShots.splice(i, 1)
            hurt()
            if (dead) return
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        const t = api.now() / 1000
        for (let i = 0; i < stars.length; i += 1) {
          const s = stars[i]
          const x = (s.x - scroll * s.z + W * 2) % W
          api.rect(x + shx, s.y + shy, s.r, s.r, i % 5 === 0 ? api.colors.dim : api.colors.panel)
        }
        for (let i = 0; i < shots.length; i += 1) {
          api.rect(shots[i].x + shx, shots[i].y - 1 + shy, 7, 2, api.colors.accent2)
        }
        for (let i = 0; i < foeShots.length; i += 1) {
          api.rect(foeShots[i].x - 5 + shx, foeShots[i].y - 1 + shy, 6, 2, api.colors.warn)
        }
        for (let i = 0; i < foes.length; i += 1) {
          const f = foes[i]
          const x = f.x + shx
          const y = f.y + shy
          api.rect(x - 10, y - 8, 20, 16, api.colors.warn)
          api.rect(x - 14, y - 3, 4, 6, api.colors.warn)
          api.rect(x - 4, y - 5, 5, 3, api.colors.bg)
          api.rect(x - 4, y + 2, 5, 3, api.colors.bg)
          api.rect(x + 6, y - 2, 6, 4, api.colors.accent2)
        }
        if (invuln <= 0 || Math.floor(api.now() / 90) % 2 === 0) {
          const sx = ship.x + shx
          const sy = ship.y + shy
          api.rect(sx - 11, sy - 5, 22, 10, api.colors.good)
          api.rect(sx - 2, sy - 9, 12, 6, api.colors.good)
          api.rect(sx - 14, sy - 2, 3, 4, api.colors.accent2)
          api.rect(sx - 4, sy - 2, 4, 3, api.colors.bg)
          const flame = 3 + Math.sin(t * 26) * 2
          api.rect(sx - 13, sy - 2, flame, 4, api.colors.warn)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.rect(p.x + shx, p.y + shy, p.r * 2, p.r * 2, p.c)
        }
        api.text('KILL ' + kills, 10, 12, { size: 11, color: api.colors.good })
        for (let i = 0; i < lives; i += 1) {
          api.rect(W - 16 - i * 14, 8, 10, 6, api.colors.good)
        }
        if (killFlash > 0.6) api.rect(0, 0, W, 2, api.colors.accent2)
        if (hitFlash > 0.5) api.rect(0, 0, W, 3, api.colors.warn)
        if (dead) {
          api.text(reason, W / 2, H / 2 - 14, { size: 13, color: api.colors.dim, align: 'center' })
          api.text('LOSE', W / 2, H / 2 + 18, {
            size: 34, color: api.colors.warn, align: 'center', weight: 'bold',
          })
        }
      },
      dispose() { shots.length = 0; foes.length = 0; foeShots.length = 0; parts.length = 0 },
    }
  },
})
