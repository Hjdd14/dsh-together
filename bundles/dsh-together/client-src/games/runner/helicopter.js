defineGame({
  id: 'helicopter',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const CW = 40
    const GAP = 156
    const GRAV = 600
    const LIFT = 1300
    const LIM = H - 24 - GAP

    const ship = { x: 108, y: H * 0.5, vy: 0, r: 9 }
    const cols = []
    const fx = []
    let speed = 104
    let tap = 0
    let rotor = 0
    let dead = false
    let scroll = 0
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let puff = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 66) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v - 60, vy: Math.sin(a) * v, life: api.rnd(0.25, 0.6), color })
      }
    }

    function clampTop(t) {
      return Math.max(24, Math.min(LIM, t + api.rnd(-5, 5)))
    }

    let t0 = 104
    let cx = W + 10
    for (let i = 0; i < 10; i += 1) {
      cols.push({ x: cx, top: t0, done: false, clr: 999 })
      t0 = clampTop(t0)
      cx += CW
    }

    let keyHeld = false
    api.onKey((key, isDown) => {
      const hit = key === 'space' || key === 'up'
      if (!isDown) {
        if (hit) keyHeld = false
        return
      }
      if (!hit || keyHeld || dead) return
      keyHeld = true
      tap = 0.22
      spark(ship.x - 8, ship.y + 4, 2, C.dim, 80)
    })
    api.onPointer((e) => {
      if (e.type === 'down' && !dead) {
        tap = 0.22
        spark(ship.x - 8, ship.y + 4, 2, C.dim, 80)
      }
    })

    function update(dt) {
      if (dead) return
      const sdt = dt * (slow > 0 ? 0.45 : 1)
      if (slow > 0) slow -= dt
      if (flash > 0) flash -= dt * 2.4
      if (msgT > 0) msgT -= dt
      if (shake > 0) shake = Math.max(0, shake - dt * 30)
      shx = (api.rng() - 0.5) * shake
      shy = (api.rng() - 0.5) * shake

      rotor += sdt * 22
      if (tap > 0) tap -= sdt
      const lift = api.down('space') || api.down('up') || tap > 0

      ship.vy += GRAV * sdt
      if (lift) ship.vy -= LIFT * sdt
      if (ship.vy < -152) ship.vy = -152
      if (ship.vy > 152) ship.vy = 152
      ship.y += ship.vy * sdt
      if (ship.y < ship.r) {
        ship.y = ship.r
        if (ship.vy < 0) ship.vy = 0
      }
      if (ship.y > H - ship.r) {
        ship.y = H - ship.r
        if (ship.vy > 0) ship.vy = 0
      }

      puff -= sdt
      if (puff <= 0) {
        puff = 0.1
        spark(ship.x - 10, ship.y + 6, 1, 'rgba(255,207,92,0.45)', 34)
      }

      speed = Math.min(120, speed + sdt * 2)
      scroll += speed * sdt
      for (let i = cols.length - 1; i >= 0; i -= 1) {
        cols[i].x -= speed * sdt
        if (cols[i].x + CW < -20) cols.splice(i, 1)
      }
      let last = cols[cols.length - 1]
      if (!last) {
        last = { x: W, top: 104, done: false, clr: 999 }
        cols.push(last)
      }
      while (last.x < W + CW * 2) {
        const nc = { x: last.x + CW, top: clampTop(last.top), done: false, clr: 999 }
        cols.push(nc)
        last = nc
      }

      for (let i = 0; i < cols.length; i += 1) {
        const c = cols[i]
        const inside = ship.x + ship.r > c.x && ship.x - ship.r < c.x + CW
        if (inside) {
          const up = ship.y - ship.r - c.top
          const dn = c.top + GAP - (ship.y + ship.r)
          const m = Math.min(up, dn)
          if (m < c.clr) c.clr = m
          if (m < 1) {
            dead = true
            spark(ship.x, ship.y, 15, C.warn, 190)
            spark(ship.x, ship.y, 7, C.fg, 120)
            shake = 14
            api.lose('cave')
          }
        }
        if (!c.done && c.x + CW < ship.x - ship.r) {
          c.done = true
          if (c.clr < 10) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.8
            flash = 1
            slow = 0.09
            shake = Math.max(shake, 5)
          } else if (c.clr < 22) {
            combo += 1
            msg = 'CLOSE'
            msgT = 0.5
          } else {
            combo = 0
          }
        }
      }

      for (let i = fx.length - 1; i >= 0; i -= 1) {
        const q = fx[i]
        q.life -= sdt
        if (q.life <= 0) {
          fx.splice(i, 1)
          continue
        }
        q.x += q.vx * sdt
        q.y += q.vy * sdt
        q.vy += 180 * sdt
      }
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.03 - i * 0.003).toFixed(3) + ')')

      const far = (scroll * 0.25) % 90
      for (let x = -far; x < W; x += 90) {
        api.rect(x, 120, 52, H - 120, 'rgba(106,169,255,0.05)')
        api.rect(x + 18, 60, 52, H - 60, 'rgba(106,169,255,0.05)')
      }
      const mid = (scroll * 0.55) % 62
      for (let x = -mid; x < W; x += 62) api.rect(x, 190, 34, H - 190, 'rgba(106,169,255,0.09)')

      if (speed > 114) {
        for (let i = 0; i < 5; i += 1) {
          const y = 40 + i * 52
          api.rect(W - 20 - ((scroll * 1.5 + i * 70) % 140), y, 34, 2, 'rgba(232,238,246,0.2)')
        }
      }

      for (let i = 0; i < cols.length; i += 1) {
        const col = cols[i]
        api.rect(col.x + shx, shy, CW - 1, col.top, C.panel)
        api.rect(col.x + shx, col.top + GAP + shy, CW - 1, H - col.top - GAP, C.panel)
        api.rect(col.x + shx, col.top - 4 + shy, CW - 1, 4, C.dim)
        api.rect(col.x + shx, col.top + GAP + shy, CW - 1, 4, C.dim)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      api.circle(ship.x + shx, ship.y + shy, ship.r, dead ? C.dim : C.accent2)
      api.rect(ship.x - 2 + shx, ship.y - ship.r - 6 + shy, 4, 8, C.dim)
      const spin = Math.sin(rotor) * 9
      api.rect(ship.x - Math.abs(spin) + shx, ship.y - ship.r - 8 + shy, Math.abs(spin) * 2 + 3, 2, C.fg)
      api.rect(ship.x - 12 + shx, ship.y + 2 + shy, 6, 3, C.accent)

      api.text('SPACE', 12, 18, { size: 12, color: C.dim })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 44, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.2).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('CRASH', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
