defineGame({
  id: 'galaxian',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const ship = { x: W / 2, y: H - 28 }
    const shots = []
    const foes = []
    const parts = []
    let kills = 0
    let lives = 3
    let invuln = 0
    let cool = 0
    let combo = 0
    let comboT = 0
    let diveT = 1.4
    let shake = 0
    let flash = 0
    let over = false
    let t = 0

    function addRow() {
      for (let i = foes.length - 1; i >= 0; i -= 1) if (!foes[i].alive) foes.splice(i, 1)
      const n = foes.length
      if (n >= 7) return
      for (let i = 0; i < 4 && foes.length < 11; i += 1) {
        foes.push({
          hx: 118 + ((i * 2 + n) % 4) * 76,
          hy: 62 + ((i + n) % 2) * 44,
          dv: -1,
          wing: (i + n) % 3 === 0,
          alive: true,
          x: 118 + ((i * 2 + n) % 4) * 76,
          y: 62 + ((i + n) % 2) * 44,
        })
      }
    }
    addRow()

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 46) parts.shift()
        parts.push({ x, y, vx: api.rnd(-115, 115), vy: api.rnd(-115, 115), life: api.rnd(0.2, 0.48), col })
      }
    }

    function fire() {
      if (over || cool > 0) return
      cool = combo >= 3 ? 0.1 : 0.16
      if (shots.length >= 6) shots.shift()
      shots.push({ x: ship.x, y: ship.y - 12 })
    }

    const offKey = api.onKey((key, isDown) => {
      if (key === 'space' && isDown) fire()
    })

    function hurt() {
      lives -= 1
      invuln = 1.5
      combo = 0
      shake = 1
      flash = 1
      burst(ship.x, ship.y, C.warn, 18)
      ship.x = W / 2
      if (lives <= 0) {
        over = true
        api.lose('the swarm broke through')
      }
    }

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.6)
      flash = Math.max(0, flash - dt * 5)
      if (comboT > 0) {
        comboT -= dt
        if (comboT <= 0) combo = 0
      }
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
      if (over) return
      t += dt
      cool = Math.max(0, cool - dt)
      invuln = Math.max(0, invuln - dt)
      if (api.down('space')) fire()
      const sp = 235 * dt
      if (api.down('left')) ship.x -= sp
      if (api.down('right')) ship.x += sp
      ship.x = Math.max(16, Math.min(W - 16, ship.x))

      for (let i = shots.length - 1; i >= 0; i -= 1) {
        shots[i].y -= 350 * dt
        if (shots[i].y < -10) shots.splice(i, 1)
      }

      let alive = 0
      for (const f of foes) if (f.alive) alive += 1
      if (alive <= 2) addRow()

      const sway = Math.sin(t * 0.95) * 38
      diveT -= dt
      if (diveT <= 0) {
        diveT = Math.max(0.8, 2.3 - kills * 0.11)
        const idle = foes.filter((f) => f.alive && f.dv < 0)
        if (idle.length > 0) api.pick(idle).dv = 0
      }

      for (const f of foes) {
        if (!f.alive) continue
        if (f.dv < 0) {
          f.x = f.hx + sway
          f.y = f.hy + Math.sin(t * 1.5 + f.hx) * 5
        } else {
          f.dv += dt * 0.52
          const k = Math.min(1, f.dv)
          f.y = f.hy + k * (H - 8 - f.hy)
          const arc = f.wing ? Math.sin(k * 9) * 78 : Math.sin(k * 6) * 54
          f.x = f.hx + sway * (1 - k) + arc
          if (k >= 1) {
            f.dv = -1
            f.x = f.hx
            f.y = f.hy
          }
          if (invuln <= 0 && Math.abs(f.x - ship.x) < 18 && Math.abs(f.y - ship.y) < 16) {
            hurt()
            if (over) return
          }
        }
      }

      for (const f of foes) {
        if (!f.alive) continue
        for (let j = shots.length - 1; j >= 0; j -= 1) {
          const b = shots[j]
          if (Math.abs(b.x - f.x) < 14 && Math.abs(b.y - f.y) < 14) {
            shots.splice(j, 1)
            f.alive = false
            kills += 1
            combo += 1
            comboT = 2.3
            shake = Math.min(1, shake + 0.4)
            flash = 1
            burst(f.x, f.y, f.wing ? C.accent : C.accent2, 10)
            api.progress(1)
            api.setStatus('KILL ' + kills + '/7')
            break
          }
        }
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.065) * 3.2 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.09) * 3.2 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < 24; i += 1) {
        Rr((i * 101) % W, (i * 57 + t * 22) % H, 1, 2, 'rgba(143,160,180,0.18)')
      }
      for (const f of foes) {
        if (!f.alive) continue
        const diving = f.dv >= 0
        const col = diving ? C.warn : f.wing ? C.accent : C.accent2
        if (diving) Rr(f.x - 2, f.y - 28, 4, 22, 'rgba(255,122,122,0.2)')
        Ci(f.x, f.y, 13, diving ? 'rgba(255,122,122,0.15)' : 'rgba(255,207,92,0.11)')
        Rr(f.x - 9, f.y - 3, 18, 6, col)
        Rr(f.x - 3, f.y - 9, 6, 6, col)
        Rr(f.x - 13, f.y - 1, 5, 3, col)
        Rr(f.x + 8, f.y - 1, 5, 3, col)
      }
      for (const b of shots) {
        Rr(b.x - 1.5, b.y - 7, 3, 12, C.good)
        Rr(b.x - 3, b.y - 2, 6, 2, 'rgba(139,220,122,0.25)')
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      if (invuln <= 0 || Math.floor(t * 14) % 2 === 0) {
        Ci(ship.x, ship.y, 15, 'rgba(106,169,255,0.14)')
        Rr(ship.x - 11, ship.y - 5, 22, 11, C.accent)
        Rr(ship.x - 4, ship.y - 11, 8, 7, C.accent)
      }
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.09).toFixed(3) + ')')
      api.text('KILL ' + kills + '/7', 12, 18, { size: 13, color: C.dim })
      api.text('LIVES ' + lives, W - 12, 18, { size: 13, color: lives > 1 ? C.dim : C.warn, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, W / 2, 18, { size: 13, color: C.accent2, align: 'center', weight: 'bold' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.55)')
        api.text('SWARM WINS', W / 2, 170, { size: 22, color: C.warn, align: 'center', weight: 'bold' })
      }
    }

    return {
      update,
      draw,
      dispose() {
        offKey()
      },
    }
  },
})
