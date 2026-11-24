defineGame({
  id: 'lander',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const groundY = 316
    const pad = { x: api.rnd(96, W - 96), w: 74 }
    const GRAV = 52
    const THRUST = 126
    const SIDE = 52
    const SAFE_VY = 56
    const SAFE_VX = 34
    const parts = []
    let ship = { x: W / 2, y: 46, vx: 0, vy: 6 }
    let thrusting = false
    let fuel = 100
    let crashes = 0
    let msg = ''
    let msgT = 0
    let wind = 0
    let windT = 2.5
    let over = false
    let flash = 0
    let shake = 0
    let pulse = 0
    let t = 0

    function reset() {
      ship = { x: api.rnd(120, W - 120), y: 46, vx: api.rnd(-14, 14), vy: 6 }
      fuel = 100
      thrusting = false
    }

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 40) parts.shift()
        parts.push({ x, y, vx: api.rnd(-70, 70), vy: api.rnd(-70, 70), life: api.rnd(0.2, 0.5), col })
      }
    }

    function tickFx(dt) {
      shake = Math.max(0, shake - dt * 2.4)
      flash = Math.max(0, flash - dt * 4)
      pulse = Math.max(0, pulse - dt * 2)
      msgT = Math.max(0, msgT - dt)
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
    }

    function crash(why) {
      crashes += 1
      flash = 1
      shake = 1
      msg = crashes >= 3 ? 'MISSION LOST' : why
      msgT = 1.6
      burst(ship.x, groundY - 8, C.warn, 22)
      api.setStatus('CRASH ' + crashes + '/3')
      if (crashes >= 3) {
        over = true
        api.lose('three crashed landers')
        return
      }
      reset()
    }

    function update(dt) {
      tickFx(dt)
      if (over) return
      t += dt
      windT -= dt
      if (windT <= 0) {
        windT = api.rnd(3.5, 6)
        wind = api.rnd(-26, 26)
        msg = wind < 0 ? 'WIND <<' : 'WIND >>'
        msgT = 1.2
      }
      thrusting = (api.down('up') || api.down('space')) && fuel > 0
      if (thrusting) {
        fuel = Math.max(0, fuel - 9 * dt)
        ship.vy -= THRUST * dt
        if (parts.length < 36) {
          parts.push({
            x: ship.x + api.rnd(-4, 4),
            y: ship.y + 10,
            vx: api.rnd(-24, 24),
            vy: api.rnd(40, 90),
            life: api.rnd(0.15, 0.35),
            col: C.accent2,
          })
        }
      }
      ship.vy += GRAV * dt
      if (api.down('left')) ship.vx -= SIDE * dt
      if (api.down('right')) ship.vx += SIDE * dt
      ship.vx += wind * dt
      ship.vx *= 1 - 0.9 * dt
      ship.vx = Math.max(-110, Math.min(110, ship.vx))
      ship.vy = Math.max(-130, Math.min(190, ship.vy))
      ship.x += ship.vx * dt
      ship.y += ship.vy * dt

      if (ship.x < 10) {
        ship.x = 10
        ship.vx = Math.abs(ship.vx) * 0.4
      }
      if (ship.x > W - 10) {
        ship.x = W - 10
        ship.vx = -Math.abs(ship.vx) * 0.4
      }
      if (ship.y < 12) {
        ship.y = 12
        ship.vy = Math.abs(ship.vy) * 0.3
      }

      if (ship.y >= groundY - 8) {
        const onPad = Math.abs(ship.x - pad.x) <= pad.w / 2 - 4
        const soft = Math.abs(ship.vy) <= SAFE_VY && Math.abs(ship.vx) <= SAFE_VX
        if (onPad && soft) {
          ship.y = groundY - 8
          ship.vx = 0
          ship.vy = 0
          pulse = 1
          shake = 0.5
          flash = 1
          burst(ship.x, groundY - 6, C.good, 16)
          msg = Math.abs(ship.x - pad.x) < 8 ? 'PERFECT' : 'TOUCHDOWN'
          msgT = 2
          api.progress(1)
          api.setStatus('LANDED')
          over = true
          return
        }
        crash(onPad ? 'TOO FAST' : 'MISSED PAD')
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.07) * 3 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.09) * 3 * shake : 0
      const R = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < 26; i += 1) {
        const sx = (i * 131) % W
        const sy = (i * 47 + t * 6) % (groundY - 40)
        R(sx, sy, 1, 1, 'rgba(232,238,246,0.45)')
      }
      R(0, groundY, W, H - groundY, 'rgba(143,160,180,0.22)')
      for (let i = 0; i < 6; i += 1) {
        const mx = 26 + i * 82
        R(mx, groundY - 6 - (i % 3) * 7, 22, 6 + (i % 3) * 7, 'rgba(143,160,180,0.3)')
      }
      R(pad.x - pad.w / 2, groundY - 3, pad.w, 3, C.good)
      R(pad.x - pad.w / 2, groundY - 1, 6, 5, C.good)
      R(pad.x + pad.w / 2 - 6, groundY - 1, 6, 5, C.good)
      Ci(pad.x, groundY - 4, 14 + Math.sin(t * 4) * 2, 'rgba(139,220,122,0.16)')
      for (const p of parts) R(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      const bump = 1 + pulse * 0.5
      Ci(ship.x, ship.y, 16 * bump, 'rgba(232,238,246,0.1)')
      R(ship.x - 9 * bump, ship.y - 6 * bump, 18 * bump, 12 * bump, flash > 0.5 ? C.warn : C.fg)
      R(ship.x - 4 * bump, ship.y - 10 * bump, 8 * bump, 5 * bump, C.accent)
      R(ship.x - 12, ship.y + 6, 5, 4, C.dim)
      R(ship.x + 7, ship.y + 6, 5, 4, C.dim)
      const vy = Math.abs(ship.vy)
      const vx = Math.abs(ship.vx)
      api.text('V ' + vy.toFixed(0), 12, 20, { size: 13, color: vy > SAFE_VY ? C.warn : C.good })
      api.text('H ' + vx.toFixed(0), 12, 38, { size: 13, color: vx > SAFE_VX ? C.warn : C.good })
      api.text('LIVES ' + (3 - crashes), W - 12, 20, { size: 13, color: C.dim, align: 'right' })
      api.rect(12, 52, 100, 6, 'rgba(143,160,180,0.25)')
      api.rect(12, 52, fuel, 6, fuel > 30 ? C.good : C.warn)
      api.text('FUEL', 118, 55, { size: 10, color: C.dim })
      if (msgT > 0) {
        const good = msg === 'TOUCHDOWN' || msg === 'PERFECT'
        api.text(msg, W / 2, 132, { size: good ? 22 : 16, color: good ? C.good : C.warn, align: 'center', weight: 'bold' })
      }
      if (over && crashes >= 3) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.5)')
        api.text('LANDER LOST', W / 2, 190, { size: 22, color: C.warn, align: 'center', weight: 'bold' })
      }
    }

    return { update, draw }
  },
})
