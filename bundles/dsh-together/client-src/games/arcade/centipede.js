defineGame({
  id: 'centipede',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const ship = { x: W / 2, y: H - 26 }
    const bullets = []
    const segs = []
    const parts = []
    let dir = 1
    let speed = 118
    let cool = 0
    let hits = 0
    let combo = 0
    let comboT = 0
    let shake = 0
    let flash = 0
    let lives = 3
    let invuln = 0
    let over = false
    let t = 0

    function newChain() {
      segs.length = 0
      const y = 74 + ((hits * 13) % 46)
      for (let i = 0; i < 5; i += 1) segs.push({ x: 132 + i * 22, y })
      dir = 1
      speed = Math.min(300, 114 + hits * 12)
    }
    newChain()

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
      cool = combo >= 3 ? 0.09 : 0.16
      if (bullets.length >= 6) bullets.shift()
      bullets.push({ x: ship.x, y: ship.y - 12 })
    }

    function hurt() {
      lives -= 1
      invuln = 1.6
      shake = 1
      flash = 1
      combo = 0
      burst(ship.x, ship.y, C.warn, 18)
      ship.x = W / 2
      ship.y = H - 26
      if (lives <= 0) {
        over = true
        api.lose('the centipede got through')
      }
    }

    const offKey = api.onKey((key, isDown) => {
      if (key === 'space' && isDown) fire()
    })

    function update(dt) {
      tickFx(dt)
      if (over) return
      t += dt
      cool = Math.max(0, cool - dt)
      invuln = Math.max(0, invuln - dt)
      if (api.down('space')) fire()
      const sp = 210 * dt
      if (api.down('left')) ship.x -= sp
      if (api.down('right')) ship.x += sp
      if (api.down('up')) ship.y -= sp * 0.5
      if (api.down('down')) ship.y += sp * 0.5
      ship.x = Math.max(16, Math.min(W - 16, ship.x))
      ship.y = Math.max(H - 74, Math.min(H - 18, ship.y))

      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        bullets[i].y -= 340 * dt
        if (bullets[i].y < -10) bullets.splice(i, 1)
      }

      if (segs.length > 0) {
        let minX = W
        let maxX = 0
        for (const s of segs) {
          if (s.x < minX) minX = s.x
          if (s.x > maxX) maxX = s.x
        }
        let dx = dir * speed * dt
        if (minX + dx < 12 || maxX + dx > W - 12) {
          dir = -dir
          dx = 0
          for (const s of segs) s.y += 15
        }
        for (const s of segs) s.x += dx
      }

      for (let i = segs.length - 1; i >= 0; i -= 1) {
        const s = segs[i]
        let killed = false
        for (let j = bullets.length - 1; j >= 0; j -= 1) {
          const b = bullets[j]
          if (Math.abs(b.x - s.x) < 12 && Math.abs(b.y - s.y) < 12) {
            bullets.splice(j, 1)
            segs.splice(i, 1)
            killed = true
            break
          }
        }
        if (killed) {
          hits += 1
          combo += 1
          comboT = 2.2
          shake = Math.min(1, shake + 0.5)
          flash = 1
          burst(s.x, s.y, C.accent2, 10)
          api.progress(1)
          api.setStatus('SEG ' + hits + '/5')
        }
      }

      if (segs.length === 0) newChain()
      for (const s of segs) {
        if (s.y > H - 44) {
          shake = 1
          flash = 1
          burst(s.x, s.y, C.warn, 16)
          over = true
          api.lose('the centipede reached the base')
          return
        }
        if (invuln <= 0 && Math.abs(s.x - ship.x) < 17 && Math.abs(s.y - ship.y) < 15) {
          hurt()
          if (over) return
        }
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.06) * 3.2 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.085) * 3.2 * shake : 0
      const R = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < 8; i += 1) {
        const y = 58 + ((i * 44 + t * 20) % (H - 58))
        R(0, y, W, 1, 'rgba(143,160,180,0.07)')
      }
      R(0, H - 14, W, 2, 'rgba(143,160,180,0.2)')
      for (const b of bullets) {
        R(b.x - 1.5, b.y - 6, 3, 11, C.accent2)
        R(b.x - 3.5, b.y - 3, 7, 3, 'rgba(255,207,92,0.25)')
      }
      for (const s of segs) {
        Ci(s.x, s.y, 11, 'rgba(106,169,255,0.18)')
        Ci(s.x, s.y, 9, combo >= 3 ? C.accent2 : C.accent)
        Ci(s.x, s.y, 4, C.bg)
      }
      for (const p of parts) R(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      if (invuln <= 0 || Math.floor(t * 14) % 2 === 0) {
        Ci(ship.x, ship.y, 15, 'rgba(139,220,122,0.16)')
        R(ship.x - 11, ship.y - 5, 22, 11, C.good)
        R(ship.x - 4, ship.y - 11, 8, 7, C.good)
      }
      if (flash > 0) R(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.12).toFixed(3) + ')')
      api.text('SEG ' + hits + '/5', 12, 20, { size: 13, color: C.dim })
      api.text('LIVES ' + lives, W - 12, 20, { size: 13, color: lives > 1 ? C.dim : C.warn, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, W / 2, 20, { size: 14, color: C.accent2, align: 'center', weight: 'bold' })
      if (combo >= 3) api.text('RAPID', W / 2, 40, { size: 11, color: C.good, align: 'center' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.5)')
        api.text('DOWN', W / 2, 160, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
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
