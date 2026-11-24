defineGame({
  id: 'rescue',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const BASE_Y = H - 26
    const ship = { x: W / 2, y: BASE_Y - 40, vx: 0, vy: 0, carry: 0 }
    const rocks = []
    const people = []
    const parts = []
    const pops = []
    const wake = []
    let saved = 0
    let lives = 3
    let invuln = 0
    let spawnT = 1.1
    let personT = 0.4
    let streak = 0
    let streakT = 0
    let shake = 0
    let flash = 0
    let over = false
    let t = 0

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 44) parts.shift()
        parts.push({ x, y, vx: api.rnd(-110, 110), vy: api.rnd(-110, 110), life: api.rnd(0.2, 0.5), col })
      }
    }

    function tickFx(dt) {
      shake = Math.max(0, shake - dt * 2.6)
      flash = Math.max(0, flash - dt * 5)
      if (streakT > 0) {
        streakT -= dt
        if (streakT <= 0) streak = 0
      }
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - 2.2 * dt
        p.vy *= 1 - 2.2 * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
      for (let i = pops.length - 1; i >= 0; i -= 1) {
        pops[i].t += dt
        if (pops[i].t > 0.9) pops.splice(i, 1)
      }
      if (wake.length >= 14) wake.shift()
      wake.push({ x: ship.x, y: ship.y, t: 0 })
      for (let i = wake.length - 1; i >= 0; i -= 1) {
        wake[i].t += dt
        if (wake[i].t > 0.5) wake.splice(i, 1)
      }
    }

    function dropPerson() {
      if (people.length >= 2) return
      people.push({ x: api.rnd(40, W - 40), y: 24, vy: api.rnd(16, 26), ph: api.rnd(0, 6.28) })
    }
    dropPerson()

    function update(dt) {
      tickFx(dt)
      if (over) return
      t += dt
      invuln = Math.max(0, invuln - dt)
      const acc = 520 * dt
      if (api.down('left')) ship.vx -= acc
      if (api.down('right')) ship.vx += acc
      if (api.down('up')) ship.vy -= acc
      if (api.down('down')) ship.vy += acc
      ship.vx *= 1 - 3.2 * dt
      ship.vy *= 1 - 3.2 * dt
      ship.vx = Math.max(-165, Math.min(165, ship.vx))
      ship.vy = Math.max(-150, Math.min(150, ship.vy))
      ship.x += ship.vx * dt
      ship.y += ship.vy * dt
      ship.x = Math.max(14, Math.min(W - 14, ship.x))
      ship.y = Math.max(34, Math.min(BASE_Y - 8, ship.y))

      spawnT -= dt
      if (spawnT <= 0) {
        spawnT = Math.max(0.5, 1.2 - saved * 0.12)
        if (rocks.length < 10) {
          const fast = 52 + saved * 8
          rocks.push({
            x: api.rnd(20, W - 20),
            y: -14,
            r: api.rnd(7, 13),
            vy: api.rnd(fast, fast + 40),
            vx: api.rnd(-22, 22),
            spin: api.rnd(-2, 2),
          })
        }
      }

      for (let i = rocks.length - 1; i >= 0; i -= 1) {
        const r = rocks[i]
        r.x += r.vx * dt
        r.y += r.vy * dt
        if (r.x < r.r) r.vx = Math.abs(r.vx)
        if (r.x > W - r.r) r.vx = -Math.abs(r.vx)
        if (r.y > H + 20) {
          rocks.splice(i, 1)
          continue
        }
        const dx = r.x - ship.x
        const dy = r.y - ship.y
        if (invuln <= 0 && dx * dx + dy * dy < (r.r + 10) * (r.r + 10)) {
          rocks.splice(i, 1)
          lives -= 1
          invuln = 1.5
          streak = 0
          shake = 1
          flash = 1
          burst(r.x, r.y, C.warn, 16)
          api.setStatus('HIT - LIVES ' + lives)
          if (lives <= 0) {
            over = true
            api.lose('the boat was wrecked')
            return
          }
        }
      }

      personT -= dt
      if (people.length === 0 && personT <= 0) {
        personT = 1.4
        dropPerson()
      }
      for (let i = people.length - 1; i >= 0; i -= 1) {
        const p = people[i]
        p.y += p.vy * dt
        p.x += Math.sin(t * 1.6 + p.ph) * 14 * dt
        if (p.y > BASE_Y + 6) {
          people.splice(i, 1)
          pops.push({ x: p.x, y: BASE_Y - 6, t: 0, txt: 'MISSED' })
          if (pops.length > 6) pops.shift()
          continue
        }
        const dx = p.x - ship.x
        const dy = p.y - ship.y
        if (ship.carry === 0 && dx * dx + dy * dy < 20 * 20) {
          people.splice(i, 1)
          ship.carry = 1
          burst(p.x, p.y, C.accent2, 10)
          shake = Math.min(1, shake + 0.3)
          api.setStatus('ON BOARD - return to base')
        }
      }

      if (ship.carry > 0 && ship.y > BASE_Y - 30) {
        ship.carry = 0
        saved += 1
        streak += 1
        streakT = 8
        personT = 0.8
        shake = Math.min(1, shake + 0.4)
        flash = 1
        burst(ship.x, ship.y, C.good, 16)
        api.progress(1)
        api.setStatus('SAVED ' + saved + '/2')
        if (people.length === 0) dropPerson()
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.07) * 3 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.09) * 3 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < 7; i += 1) {
        const y = 30 + ((i * 44 + t * 12) % (BASE_Y - 30))
        Rr(0, y, W, 1, 'rgba(106,169,255,0.06)')
      }
      Rr(0, BASE_Y + 4, W, H - BASE_Y - 4, 'rgba(139,220,122,0.18)')
      Rr(0, BASE_Y + 4, W, 2, C.good)
      Ci(W / 2, BASE_Y + 4, 26 + Math.sin(t * 3) * 3, 'rgba(139,220,122,0.1)')
      api.text('BASE', 10, BASE_Y + 18, { size: 11, color: C.good })
      for (const w of wake) {
        const a = Math.max(0, 0.28 - w.t * 0.5)
        Rr(w.x - 6, w.y + 6, 12, 2, 'rgba(106,169,255,' + a.toFixed(2) + ')')
      }
      for (const r of rocks) {
        Ci(r.x, r.y, r.r + 3, 'rgba(143,160,180,0.12)')
        Ci(r.x, r.y, r.r, 'rgba(143,160,180,0.55)')
        Ci(r.x - r.r * 0.3, r.y - r.r * 0.3, r.r * 0.45, 'rgba(232,238,246,0.25)')
      }
      for (const p of people) {
        Ci(p.x, p.y, 9, 'rgba(255,207,92,0.14)')
        Ci(p.x, p.y, 5, C.accent2)
        Rr(p.x - 4, p.y + 3, 8, 5, C.accent2)
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      if (invuln <= 0 || Math.floor(t * 14) % 2 === 0) {
        Ci(ship.x, ship.y, 16, 'rgba(106,169,255,0.12)')
        Rr(ship.x - 12, ship.y - 5, 24, 11, C.accent)
        Rr(ship.x - 4, ship.y - 10, 8, 6, C.fg)
        if (ship.carry > 0) {
          Ci(ship.x, ship.y - 13, 5, C.accent2)
          Ci(ship.x, ship.y - 13, 8, 'rgba(255,207,92,0.2)')
        }
      }
      for (const p of pops) {
        const a = Math.max(0, 1 - p.t * 1.1)
        api.text(p.txt, p.x, p.y - p.t * 18, { size: 11, color: 'rgba(255,122,122,' + a.toFixed(2) + ')', align: 'center' })
      }
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.09).toFixed(3) + ')')
      api.text('SAVED ' + saved + '/2', 12, 20, { size: 13, color: C.dim })
      api.text('LIVES ' + lives, W - 12, 20, { size: 13, color: lives > 1 ? C.dim : C.warn, align: 'right' })
      if (streak > 1) api.text('STREAK x' + streak, W / 2, 20, { size: 13, color: C.accent2, align: 'center', weight: 'bold' })
      if (ship.carry > 0) api.text('RETURN TO BASE', W / 2, 44, { size: 12, color: C.accent2, align: 'center' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.5)')
        api.text('BOAT WRECKED', W / 2, 170, { size: 22, color: C.warn, align: 'center', weight: 'bold' })
      }
    }

    return { update, draw }
  },
})
