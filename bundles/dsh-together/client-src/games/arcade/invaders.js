defineGame({
  id: 'invaders',
  create(api) {
    const COLS = 4
    const ROWS = 3
    const GAP_X = 52
    const GAP_Y = 34
    const AW = 26
    const AH = 18
    const PW = 28
    const PLAYER_Y = 326
    const BULLET_SPEED = 380

    const ships = []
    const shots = []
    const foeShots = []
    const parts = []
    const stars = []
    for (let i = 0; i < 46; i += 1) {
      stars.push({ x: api.rnd(0, api.w), y: api.rnd(0, api.h), z: api.rnd(0.35, 1.5), r: api.rnd(0.7, 1.7) })
    }

    let px = api.w / 2
    let lives = 3
    let invuln = 0
    let cool = 0
    let fleetX = 0
    let fleetY = 0
    let fleetDir = 1
    let fleetStep = 0.55
    let shotTimer = 1.1
    let hits = 0
    let combo = 0
    let comboTimer = 0
    let dead = false
    let reason = ''
    let shake = 0
    let shx = 0
    let shy = 0
    let hurtFlash = 0
    let muzzle = 0

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 76; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.24, 0.55), max: 0.55,
          c: color, r: api.rnd(1.3, 3.2),
        })
      }
    }

    function buildFleet() {
      ships.length = 0
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) ships.push({ cx: c, cy: r, alive: true, wob: api.rnd(0, 6.28) })
      }
      fleetX = 0
      fleetY = 0
      fleetDir = 1
      fleetStep = 0.55
    }

    function fleetLife() {
      let n = 0
      for (let i = 0; i < ships.length; i += 1) if (ships[i].alive) n += 1
      return n
    }

    function shipPos(s, t) {
      const spanX = (COLS - 1) * GAP_X
      const originX = (api.w - spanX) / 2
      const bob = Math.sin(t * 3 + s.wob) * 2.5
      return { x: originX + s.cx * GAP_X + fleetX, y: 56 + s.cy * GAP_Y + fleetY + bob }
    }

    function shoot() {
      if (dead || cool > 0) return
      cool = 0.26
      muzzle = 1
      if (shots.length > 4) shots.shift()
      shots.push({ x: px, y: PLAYER_Y - 10 })
    }

    function hurt() {
      lives -= 1
      hurtFlash = 1
      shake = 0.7
      burst(px, PLAYER_Y, api.colors.warn, 14, 200)
      if (lives <= 0) {
        dead = true
        reason = 'ship destroyed'
        api.lose(reason)
        return
      }
      px = api.w / 2
      invuln = 1.1
    }

    buildFleet()
    api.setStatus('hits ' + hits)

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'space') shoot()
    })

    function update(dt) {
      if (dead) return
      const t = api.now() / 1000
      if (cool > 0) cool -= dt
      if (muzzle > 0) muzzle = Math.max(0, muzzle - dt * 6)
      if (invuln > 0) invuln -= dt
      if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt * 1.6)
      if (comboTimer > 0) {
        comboTimer -= dt
        if (comboTimer <= 0) combo = 0
      }
      if (shake > 0) {
        shake = Math.max(0, shake - dt)
        shx = api.rnd(-1, 1) * shake * 12
        shy = api.rnd(-1, 1) * shake * 12
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
        p.vx *= 1 - 2 * dt
        p.vy *= 1 - 2 * dt
      }

      const dir = (api.down('right') ? 1 : 0) - (api.down('left') ? 1 : 0)
      px += dir * 250 * dt
      px = px < PW / 2 ? PW / 2 : px > api.w - PW / 2 ? api.w - PW / 2 : px
      if (api.down('space')) shoot()

      fleetStep -= dt
      if (fleetStep <= 0) {
        fleetStep = 0.55
        fleetX += fleetDir * 12
        let left = Infinity
        let right = -Infinity
        for (let i = 0; i < ships.length; i += 1) {
          if (!ships[i].alive) continue
          const p = shipPos(ships[i], t)
          if (p.x - AW / 2 < left) left = p.x - AW / 2
          if (p.x + AW / 2 > right) right = p.x + AW / 2
        }
        if (right > api.w - 12 || left < 12) {
          fleetDir = -fleetDir
          fleetY += 14
          if (fleetY > 120) fleetY = 120
        }
      }

      shotTimer -= dt
      if (shotTimer <= 0) {
        shotTimer = api.rnd(0.9, 1.7)
        const pool = []
        for (let i = 0; i < ships.length; i += 1) if (ships[i].alive) pool.push(i)
        if (pool.length > 0 && foeShots.length < 5) {
          const idx = pool[api.irnd(0, pool.length - 1)]
          const p = shipPos(ships[idx], t)
          foeShots.push({ x: p.x, y: p.y + AH / 2 })
        }
      }

      for (let i = shots.length - 1; i >= 0; i -= 1) {
        const b = shots[i]
        b.y -= BULLET_SPEED * dt
        if (b.y < -12) { shots.splice(i, 1); continue }
        for (let j = 0; j < ships.length; j += 1) {
          const s = ships[j]
          if (!s.alive) continue
          const p = shipPos(s, t)
          if (Math.abs(b.x - p.x) <= AW / 2 + 2 && Math.abs(b.y - p.y) <= AH / 2 + 3) {
            s.alive = false
            shots.splice(i, 1)
            hits += 1
            combo = comboTimer > 0 ? combo + 1 : 1
            comboTimer = 2.6
            shake = Math.max(shake, 0.24)
            burst(p.x, p.y, api.colors.accent2, 10, 190)
            api.progress(1)
            api.setStatus(combo > 1 ? 'hits ' + hits + ' x' + combo : 'hits ' + hits)
            break
          }
        }
      }
      if (fleetLife() === 0) buildFleet()

      for (let i = foeShots.length - 1; i >= 0; i -= 1) {
        const b = foeShots[i]
        b.y += 165 * dt
        if (b.y > api.h + 10) { foeShots.splice(i, 1); continue }
        if (invuln <= 0 && Math.abs(b.x - px) <= PW / 2 + 3 && Math.abs(b.y - PLAYER_Y) <= 10) {
          foeShots.splice(i, 1)
          hurt()
          if (dead) return
        }
      }

      if (invuln <= 0) {
        for (let i = 0; i < ships.length; i += 1) {
          if (!ships[i].alive) continue
          const p = shipPos(ships[i], t)
          if (Math.abs(p.x - px) <= (AW + PW) / 2 && Math.abs(p.y - PLAYER_Y) <= (AH + 12) / 2) {
            hurt()
            break
          }
        }
      }
    }

    function draw(g) {
      api.clear(api.colors.bg)
      const t = api.now() / 1000
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i]
        const y = (s.y + t * 16 * s.z) % api.h
        api.circle(s.x, y, s.r, t > 0 ? api.colors.panel : api.colors.panel)
      }
      api.rect(0, api.h - 6, api.w, 6, api.colors.panel)
      for (let i = 0; i < ships.length; i += 1) {
        const s = ships[i]
        if (!s.alive) continue
        const p = shipPos(s, t)
        const x = p.x + shx
        const y = p.y + shy
        api.rect(x - AW / 2, y - AH / 2, AW, AH, api.colors.accent2)
        api.rect(x - 6, y + AH / 2 - 2, 12, 3, api.colors.warn)
        api.circle(x - 5, y - 2, 2, api.colors.bg)
        api.circle(x + 5, y - 2, 2, api.colors.bg)
      }
      for (let i = 0; i < shots.length; i += 1) {
        api.rect(shots[i].x - 1.5 + shx, shots[i].y - 8 + shy, 3, 10, api.colors.fg)
      }
      for (let i = 0; i < foeShots.length; i += 1) {
        api.circle(foeShots[i].x + shx, foeShots[i].y + shy, 3, api.colors.warn)
      }
      if (!dead && (invuln <= 0 || Math.floor(api.now() / 90) % 2 === 0)) {
        const yy = PLAYER_Y + shy
        api.rect(px - PW / 2 + shx, yy - 8, PW, 14, api.colors.good)
        api.rect(px - 3 + shx, yy - 16, 6, 8, api.colors.good)
        const flame = 4 + Math.sin(t * 22) * 2
        api.rect(px - 2 + shx, yy + 6, 4, flame, api.colors.accent2)
        if (muzzle > 0) api.circle(px + shx, yy - 18, 4 * muzzle, api.colors.accent2)
      }
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i]
        api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
      }
      api.text('life ' + (lives > 0 ? lives : 0), 12, 20, { size: 13, color: api.colors.dim })
      api.text('hits ' + hits, api.w - 12, 20, { size: 13, color: api.colors.dim, align: 'right' })
      if (combo >= 2 && !dead) {
        api.text('COMBO x' + combo, api.w / 2, 20, {
          size: 13 + Math.min(8, combo * 2), color: api.colors.accent2,
          align: 'center', weight: 'bold',
        })
      }
      if (hurtFlash > 0.5) {
        api.rect(0, 0, api.w, 5, api.colors.warn)
        api.rect(0, api.h - 5, api.w, 5, api.colors.warn)
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
      dispose() { ships.length = 0; shots.length = 0; foeShots.length = 0; parts.length = 0 },
    }
  },
})
