defineGame({
  id: 'elevator',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const FLOORS = 4
    const TOP = 74
    const GAP = 74
    const SHAFT_X = 214
    const SHAFT_W = 62
    const EXIT_X = 424
    const floorY = (i) => TOP + i * GAP
    const player = { floor: 0, x: 110, carry: 0 }
    const car = { floor: 0, y: floorY(0) }
    const people = []
    const parts = []
    let saved = 0
    let missed = 0
    let spawnT = 1.5
    let rideT = 0
    let over = false
    let shake = 0
    let flash = 0
    let t = 0

    function spawnPerson() {
      if (people.length >= 3) return
      const fl = api.irnd(0, FLOORS - 1)
      people.push({ floor: fl, x: api.rnd(60, 176), patience: 24, ph: api.rnd(0, 6.28) })
    }
    spawnPerson()
    spawnPerson()

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 36) parts.shift()
        parts.push({ x, y, vx: api.rnd(-90, 90), vy: api.rnd(-90, 90), life: api.rnd(0.2, 0.45), col })
      }
    }

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.6)
      flash = Math.max(0, flash - dt * 4)
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
      if (over) return
      t += dt
      car.y += (floorY(car.floor) - car.y) * Math.min(1, dt * 9)

      const half = SHAFT_W / 2 - 8
      const carHere = car.floor === player.floor
      const sp = 150 * dt
      let nx = player.x
      if (api.down('left')) nx -= sp
      if (api.down('right')) nx += sp
      if (!carHere) {
        const lo = SHAFT_X - SHAFT_W / 2
        const hi = SHAFT_X + SHAFT_W / 2
        if (player.x <= lo && nx > lo) nx = lo
        if (player.x >= hi && nx < hi) nx = hi
      }
      player.x = Math.max(36, Math.min(W - 36, nx))

      const inShaft = Math.abs(player.x - SHAFT_X) < half
      rideT = Math.max(0, rideT - dt)
      if (inShaft && carHere && rideT <= 0) {
        if (api.down('up') && player.floor > 0) {
          player.floor -= 1
          car.floor = player.floor
          rideT = 0.26
          shake = Math.min(1, shake + 0.12)
        } else if (api.down('down') && player.floor < FLOORS - 1) {
          player.floor += 1
          car.floor = player.floor
          rideT = 0.26
          shake = Math.min(1, shake + 0.12)
        }
      }
      const py = inShaft && carHere ? car.y : floorY(player.floor)
      const pxNow = inShaft && carHere ? SHAFT_X : player.x

      for (let i = people.length - 1; i >= 0; i -= 1) {
        const p = people[i]
        p.patience -= dt
        if (p.patience <= 0) {
          people.splice(i, 1)
          missed += 1
          shake = 1
          burst(pxNow, py, C.warn, 8)
          if (missed >= 3) {
            over = true
            api.lose('three people gave up')
            return
          }
          continue
        }
        if (player.carry === 0 && p.floor === player.floor && Math.abs(p.x - pxNow) < 22 && Math.abs(car.y - floorY(p.floor)) < 60) {
          people.splice(i, 1)
          player.carry = 1
          burst(p.x, floorY(p.floor) - 6, C.accent2, 8)
          api.setStatus('ESCORT - ride to the exit')
        }
      }

      if (player.carry > 0 && player.floor === 0 && pxNow > EXIT_X - 30) {
        player.carry = 0
        saved += 1
        flash = 1
        shake = Math.min(1, shake + 0.3)
        burst(pxNow, py, C.good, 14)
        api.progress(1)
        api.setStatus('SAVED ' + saved + '/3')
      }

      spawnT -= dt
      if (spawnT <= 0) {
        spawnT = 3.2
        spawnPerson()
      }
      if (over) return
      if (saved + missed >= 3 && missed >= 3) {
        over = true
        api.lose('three people gave up')
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.07) * 3 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.09) * 3 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < FLOORS; i += 1) {
        const y = floorY(i)
        Rr(20, y + 14, W - 40, 3, 'rgba(143,160,180,0.22)')
        for (let k = 0; k < 9; k += 1) Rr(44 + k * 48, y - 8, 2, 22, 'rgba(143,160,180,0.07)')
        Rr(20, y - 8, 3, 24, 'rgba(106,169,255,0.16)')
      }
      Rr(SHAFT_X - SHAFT_W / 2, TOP - 30, SHAFT_W, FLOORS * GAP + 30, 'rgba(106,169,255,0.07)')
      Rr(SHAFT_X - SHAFT_W / 2, TOP - 30, 2, FLOORS * GAP + 30, 'rgba(106,169,255,0.32)')
      Rr(SHAFT_X + SHAFT_W / 2 - 2, TOP - 30, 2, FLOORS * GAP + 30, 'rgba(106,169,255,0.32)')
      Rr(SHAFT_X - SHAFT_W / 2 + 5, car.y + 8, SHAFT_W - 10, 7, C.accent)
      Ci(SHAFT_X, car.y + 10, 19, 'rgba(106,169,255,0.1)')
      Rr(EXIT_X - 20, floorY(0) - 4, 40, 20, 'rgba(139,220,122,0.18)')
      Rr(EXIT_X - 20, floorY(0) + 16, 40, 2, C.good)
      api.text('EXIT', EXIT_X, floorY(0) - 16, { size: 10, color: C.good, align: 'center' })
      for (const p of people) {
        const py = floorY(p.floor)
        const low = p.patience < 7
        Ci(p.x, py - 4, 5, low ? C.warn : C.accent2)
        Rr(p.x - 4, py + 2, 8, 9, low ? C.warn : C.accent2)
        Rr(p.x - 15, py + 18, 30 * Math.max(0, p.patience / 24), 3, low ? C.warn : C.dim)
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      const half = SHAFT_W / 2 - 8
      const inShaft = Math.abs(player.x - SHAFT_X) < half
      const carHere = car.floor === player.floor
      const px = inShaft && carHere ? SHAFT_X : player.x
      const py = (inShaft && carHere ? car.y : floorY(player.floor)) + 2
      Ci(px, py, 15, 'rgba(232,238,246,0.1)')
      Rr(px - 6, py - 12, 12, 14, C.fg)
      Rr(px - 4, py - 18, 8, 7, C.accent)
      if (player.carry > 0) {
        Ci(px + 13, py - 6, 4, C.accent2)
        Rr(px + 9, py - 1, 8, 7, C.accent2)
      }
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.08).toFixed(3) + ')')
      api.text('SAVED ' + saved + '/3', 8, 18, { size: 12, color: C.dim })
      api.text('MISSED ' + missed + '/3', W - 8, 18, { size: 12, color: missed > 1 ? C.warn : C.dim, align: 'right' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.55)')
        api.text('SHIFT OVER', W / 2, 170, { size: 22, color: C.warn, align: 'center', weight: 'bold' })
      }
    }

    return { update, draw }
  },
})
