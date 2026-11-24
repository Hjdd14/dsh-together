defineGame({
  id: 'asteroids',
  create(api) {
    const BASE = 6
    const R = 9
    const TURN = 3.1
    const THRUST = 130
    const MAX_SPD = 190
    const SHOT_SPEED = 330

    const ship = { x: api.w / 2, y: api.h / 2, vx: 0, vy: 0, a: -Math.PI / 2 }
    const rocks = []
    const shots = []
    const parts = []
    const stars = []
    for (let i = 0; i < 34; i += 1) {
      stars.push({ x: api.rnd(0, api.w), y: api.rnd(0, api.h), r: api.rnd(0.6, 1.6), z: api.rnd(0.4, 1.4) })
    }

    let lives = 3
    let invuln = 1.6
    let cool = 0
    let broke = 0
    let combo = 0
    let comboTimer = 0
    let dead = false
    let reason = ''
    let shake = 0
    let shx = 0
    let shy = 0
    let thrustPuff = 0

    function wrap(v, span) {
      if (v < 0) return v + span
      if (v > span) return v - span
      return v
    }

    function spawnRock() {
      let x = 0
      let y = 0
      let best = -1
      for (let i = 0; i < 26; i += 1) {
        const tx = api.rnd(30, api.w - 30)
        const ty = api.rnd(30, api.h - 70)
        const dx = tx - ship.x
        const dy = ty - ship.y
        const d = dx * dx + dy * dy
        if (d > best) { best = d; x = tx; y = ty }
        if (d > 120 * 120) { x = tx; y = ty; break }
      }
      const ang = api.rnd(0, Math.PI * 2)
      const spd = api.rnd(26, 62)
      return {
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: api.rnd(13, 20),
        spin: api.rnd(-1.4, 1.4),
        a: api.rnd(0, Math.PI),
      }
    }

    for (let i = 0; i < BASE; i += 1) rocks.push(spawnRock())
    api.setStatus('rocks ' + broke)

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 80; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.24, 0.6), max: 0.6,
          c: color, r: api.rnd(1.3, 3.4),
        })
      }
    }

    function fire() {
      if (dead || cool > 0) return
      cool = 0.2
      if (shots.length > 4) shots.shift()
      shots.push({
        x: ship.x + Math.cos(ship.a) * (R + 5),
        y: ship.y + Math.sin(ship.a) * (R + 5),
        vx: Math.cos(ship.a) * SHOT_SPEED,
        vy: Math.sin(ship.a) * SHOT_SPEED,
        life: 1.1,
      })
    }

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'space') fire()
      else if (key === 'left') ship.a -= 0.34
      else if (key === 'right') ship.a += 0.34
    })

    function hitShip() {
      if (invuln > 0) return
      lives -= 1
      shake = 0.85
      burst(ship.x, ship.y, api.colors.warn, 18, 210)
      combo = 0
      if (lives <= 0) {
        dead = true
        reason = 'ship smashed'
        api.lose(reason)
        return
      }
      invuln = 1.8
      ship.x = api.w / 2
      ship.y = api.h / 2
      ship.vx = 0
      ship.vy = 0
      ship.a = -Math.PI / 2
    }

    function update(dt) {
      if (dead) return
      if (cool > 0) cool -= dt
      if (invuln > 0) invuln -= dt
      if (thrustPuff > 0) thrustPuff = Math.max(0, thrustPuff - dt * 5)
      if (comboTimer > 0) {
        comboTimer -= dt
        if (comboTimer <= 0) combo = 0
      }
      if (shake > 0) {
        shake = Math.max(0, shake - dt)
        shx = api.rnd(-1, 1) * shake * 13
        shy = api.rnd(-1, 1) * shake * 13
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
        p.vx *= 1 - 1.8 * dt
        p.vy *= 1 - 1.8 * dt
      }

      const turn = (api.down('right') ? 1 : 0) - (api.down('left') ? 1 : 0)
      ship.a += turn * TURN * dt
      if (api.down('up')) {
        ship.vx += Math.cos(ship.a) * THRUST * dt
        ship.vy += Math.sin(ship.a) * THRUST * dt
        thrustPuff = 1
        if (parts.length < 60 && api.rng() < 0.55) {
          parts.push({
            x: ship.x - Math.cos(ship.a) * (R + 2),
            y: ship.y - Math.sin(ship.a) * (R + 2),
            vx: -Math.cos(ship.a) * 70 + api.rnd(-24, 24),
            vy: -Math.sin(ship.a) * 70 + api.rnd(-24, 24),
            life: 0.3, max: 0.3, c: api.colors.accent2, r: api.rnd(1.4, 2.6),
          })
        }
      }
      if (api.down('space')) fire()

      const spd = Math.hypot(ship.vx, ship.vy)
      if (spd > MAX_SPD) {
        ship.vx = (ship.vx / spd) * MAX_SPD
        ship.vy = (ship.vy / spd) * MAX_SPD
      }
      ship.vx *= 0.994
      ship.vy *= 0.994
      ship.x = wrap(ship.x + ship.vx * dt, api.w)
      ship.y = wrap(ship.y + ship.vy * dt, api.h)

      for (let i = 0; i < rocks.length; i += 1) {
        const r = rocks[i]
        r.x = wrap(r.x + r.vx * dt, api.w)
        r.y = wrap(r.y + r.vy * dt, api.h)
        r.a += r.spin * dt
      }

      for (let i = shots.length - 1; i >= 0; i -= 1) {
        const b = shots[i]
        b.life -= dt
        b.x = wrap(b.x + b.vx * dt, api.w)
        b.y = wrap(b.y + b.vy * dt, api.h)
        if (b.life <= 0) { shots.splice(i, 1); continue }
        for (let j = rocks.length - 1; j >= 0; j -= 1) {
          const r = rocks[j]
          const dx = b.x - r.x
          const dy = b.y - r.y
          if (dx * dx + dy * dy <= (r.r + 2) * (r.r + 2)) {
            shots.splice(i, 1)
            rocks.splice(j, 1)
            broke += 1
            combo = comboTimer > 0 ? combo + 1 : 1
            comboTimer = 2.5
            shake = Math.max(shake, 0.22 + Math.min(0.3, combo * 0.05))
            burst(r.x, r.y, api.colors.dim, 9, 170)
            api.progress(1)
            api.setStatus(combo > 1 ? 'rocks ' + broke + ' x' + combo : 'rocks ' + broke)
            rocks.push(spawnRock())
            break
          }
        }
      }
      if (rocks.length > BASE + 3) rocks.length = BASE + 3

      if (invuln <= 0) {
        for (let j = 0; j < rocks.length; j += 1) {
          const r = rocks[j]
          const dx = ship.x - r.x
          const dy = ship.y - r.y
          const reach = r.r + R - 2
          if (dx * dx + dy * dy <= reach * reach) { hitShip(); break }
        }
      }
    }

    function draw(g) {
      api.clear(api.colors.bg)
      const t = api.now() / 1000
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i]
        const x = (s.x + t * 5 * s.z) % api.w
        api.circle(x, s.y, s.r, api.colors.panel)
      }
      for (let i = 0; i < rocks.length; i += 1) {
        const r = rocks[i]
        api.circle(r.x + shx, r.y + shy, r.r, api.colors.panel)
        const ex = r.x + Math.cos(r.a) * r.r * 0.55 + shx
        const ey = r.y + Math.sin(r.a) * r.r * 0.55 + shy
        api.circle(ex, ey, r.r * 0.36, api.colors.dim)
        const hx = r.x - Math.cos(r.a) * r.r * 0.5 + shx
        const hy = r.y - Math.sin(r.a) * r.r * 0.5 + shy
        api.circle(hx, hy, r.r * 0.2, api.colors.fg)
      }
      for (let i = 0; i < shots.length; i += 1) {
        api.circle(shots[i].x + shx, shots[i].y + shy, 2.5, api.colors.accent2)
      }
      if (!dead && (invuln <= 0 || Math.floor(api.now() / 100) % 2 === 0)) {
        const ca = Math.cos(ship.a)
        const sa = Math.sin(ship.a)
        const ax = ship.x + ca * R + shx
        const ay = ship.y + sa * R + shy
        const bx = ship.x - ca * R * 0.7 + sa * R * 0.8 + shx
        const by = ship.y - sa * R * 0.7 - ca * R * 0.8 + shy
        const cx2 = ship.x - ca * R * 0.7 - sa * R * 0.8 + shx
        const cy2 = ship.y - sa * R * 0.7 + ca * R * 0.8 + shy
        g.fillStyle = invuln > 0 ? api.colors.accent2 : api.colors.good
        g.beginPath()
        g.moveTo(ax, ay)
        g.lineTo(bx, by)
        g.lineTo(cx2, cy2)
        g.closePath()
        g.fill()
        if (thrustPuff > 0) {
          api.circle(ship.x - ca * (R + 4) + shx, ship.y - sa * (R + 4) + shy,
            3 + thrustPuff * 2, api.colors.warn)
        }
      }
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i]
        api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
      }
      api.text('life ' + (lives > 0 ? lives : 0), 12, 20, { size: 13, color: api.colors.dim })
      api.text('rocks ' + broke, api.w - 12, 20, { size: 13, color: api.colors.dim, align: 'right' })
      if (combo >= 2 && !dead) {
        api.text('x' + combo, api.w / 2, 20, {
          size: 13 + Math.min(9, combo * 2), color: api.colors.accent2,
          align: 'center', weight: 'bold',
        })
      }
      if (dead) {
        api.text(reason, api.w / 2, api.h / 2 - 16, {
          size: 14, color: api.colors.dim, align: 'center',
        })
        api.text('LOSE', api.w / 2, api.h / 2 + 16, {
          size: 36, color: api.colors.warn, align: 'center', weight: 'bold',
        })
      }
    }

    return {
      update,
      draw,
      dispose() {
        rocks.length = 0
        shots.length = 0
        parts.length = 0
      },
    }
  },
})
