defineGame({
  id: 'galaga',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const ship = { x: W / 2, y: H - 28 }
    const bullets = []
    const foes = []
    const parts = []
    let t = 0
    let diveT = 1.5
    let cool = 0
    let kills = 0
    let lives = 3
    let invuln = 0
    let combo = 0
    let comboT = 0
    let shake = 0
    let flash = 0
    let respawnT = 0
    let over = false

    function addWave() {
      for (let i = foes.length - 1; i >= 0; i -= 1) if (!foes[i].alive) foes.splice(i, 1)
      const n = foes.length
      if (n >= 6) return
      for (let i = 0; i < 4 && foes.length < 10; i += 1) {
        foes.push({
          hx: 138 + ((i * 2 + n) % 4) * 68,
          hy: 66 + ((i + n) % 2) * 50,
          dv: -1,
          alive: true,
          x: 0,
          y: 0,
        })
      }
      for (const f of foes) {
        if (f.x === 0 && f.y === 0) {
          f.x = f.hx
          f.y = f.hy
        }
      }
    }
    addWave()

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 48) parts.shift()
        parts.push({ x, y, vx: api.rnd(-115, 115), vy: api.rnd(-115, 115), life: api.rnd(0.22, 0.5), col })
      }
    }

    function tickFx(dt) {
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
        p.vx *= 1 - 2.2 * dt
        p.vy *= 1 - 2.2 * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
    }

    function fire() {
      if (over || cool > 0) return
      cool = combo >= 3 ? 0.1 : 0.17
      if (bullets.length >= 6) bullets.shift()
      bullets.push({ x: ship.x, y: ship.y - 12 })
    }

    const offKey = api.onKey((key, isDown) => {
      if (key === 'space' && isDown) fire()
    })

    function hitShip() {
      lives -= 1
      invuln = 1.5
      ship.x = W / 2
      shake = 1
      flash = 1
      combo = 0
      burst(ship.x, ship.y, C.warn, 18)
      if (lives <= 0) {
        over = true
        api.lose('the fighters broke through')
      }
    }

    function update(dt) {
      tickFx(dt)
      if (over) return
      t += dt
      cool = Math.max(0, cool - dt)
      invuln = Math.max(0, invuln - dt)
      if (api.down('space')) fire()
      const sp = 230 * dt
      if (api.down('left')) ship.x -= sp
      if (api.down('right')) ship.x += sp
      ship.x = Math.max(16, Math.min(W - 16, ship.x))

      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        bullets[i].y -= 340 * dt
        if (bullets[i].y < -10) bullets.splice(i, 1)
      }

      let alive = 0
      for (const f of foes) if (f.alive) alive += 1
      if (alive <= 2) {
        respawnT -= dt
        if (respawnT <= 0) {
          respawnT = 2.4
          addWave()
        }
      }

      const sway = Math.sin(t * 0.85) * 44
      diveT -= dt
      if (diveT <= 0) {
        diveT = Math.max(0.85, 2.4 - kills * 0.1)
        const idle = foes.filter((f) => f.alive && f.dv < 0)
        if (idle.length > 0) api.pick(idle).dv = 0
      }

      for (const f of foes) {
        if (!f.alive) continue
        if (f.dv < 0) {
          f.x = f.hx + sway
          f.y = f.hy + Math.sin(t * 1.4 + f.hx) * 4
        } else {
          f.dv += dt * 0.5
          const k = Math.min(1, f.dv)
          f.y = f.hy + k * (H - 10 - f.hy)
          f.x = f.hx + sway * (1 - k) + Math.sin(k * 7) * 62
          if (k >= 1) {
            f.dv = -1
            f.x = f.hx
            f.y = f.hy
          }
          if (invuln <= 0 && Math.abs(f.x - ship.x) < 18 && Math.abs(f.y - ship.y) < 16) {
            hitShip()
            if (over) return
          }
        }
      }

      for (const f of foes) {
        if (!f.alive) continue
        for (let j = bullets.length - 1; j >= 0; j -= 1) {
          const b = bullets[j]
          if (Math.abs(b.x - f.x) < 14 && Math.abs(b.y - f.y) < 14) {
            bullets.splice(j, 1)
            f.alive = false
            kills += 1
            combo += 1
            comboT = 2.4
            shake = Math.min(1, shake + 0.45)
            flash = 1
            burst(f.x, f.y, C.accent2, 10)
            api.progress(1)
            api.setStatus('KILL ' + kills + '/6')
            break
          }
        }
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.06) * 3.2 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.085) * 3.2 * shake : 0
      const R = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < 22; i += 1) {
        const sx = (i * 97) % W
        const sy = (i * 53 + t * 26) % H
        R(sx, sy, 1, 2, 'rgba(143,160,180,0.2)')
      }
      for (let i = 0; i < 12; i += 1) {
        const sx = (i * 167) % W
        const sy = (i * 79 + t * 11) % H
        R(sx, sy, 1, 1, 'rgba(232,238,246,0.45)')
      }
      for (const f of foes) {
        if (!f.alive) continue
        const diving = f.dv >= 0
        const col = diving ? C.warn : C.accent2
        if (diving) R(f.x - 2, f.y - 26, 4, 20, 'rgba(255,122,122,0.22)')
        Ci(f.x, f.y, 13, diving ? 'rgba(255,122,122,0.16)' : 'rgba(255,207,92,0.12)')
        R(f.x - 9, f.y - 3, 18, 6, col)
        R(f.x - 3, f.y - 9, 6, 6, col)
        R(f.x - 13, f.y - 1, 4, 3, col)
        R(f.x + 9, f.y - 1, 4, 3, col)
      }
      for (const b of bullets) {
        R(b.x - 1.5, b.y - 6, 3, 11, C.good)
        R(b.x - 3, b.y - 2, 6, 2, 'rgba(139,220,122,0.25)')
      }
      for (const p of parts) R(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      if (invuln <= 0 || Math.floor(t * 14) % 2 === 0) {
        Ci(ship.x, ship.y, 15, 'rgba(106,169,255,0.14)')
        R(ship.x - 11, ship.y - 5, 22, 11, C.accent)
        R(ship.x - 4, ship.y - 11, 8, 7, C.accent)
      }
      if (flash > 0) R(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.1).toFixed(3) + ')')
      api.text('KILL ' + kills + '/6', 12, 20, { size: 13, color: C.dim })
      api.text('LIVES ' + lives, W - 12, 20, { size: 13, color: lives > 1 ? C.dim : C.warn, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, W / 2, 20, { size: 14, color: C.accent2, align: 'center', weight: 'bold' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.5)')
        api.text('SHIP LOST', W / 2, 160, { size: 24, color: C.warn, align: 'center', weight: 'bold' })
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
