defineGame({
  id: 'tinywings',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GRAV = 980

    const bird = { x: 160, y: 200, vx: 0, vy: 0, air: false, wing: 0 }
    const fx = []
    let worldX = 0
    let speed = 300
    let stall = 0
    let dead = false
    let time = 0
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let hilly = 0

    function groundAt(x) {
      return 252 + 54 * Math.sin(x * 0.0052) + 26 * Math.sin(x * 0.0151 + 1.3) + 13 * Math.sin(x * 0.0293 + 2.7)
    }

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 56) fx.shift()
        fx.push({
          x, y,
          vx: -api.rnd(40, spd),
          vy: api.rnd(-spd, spd * 0.4),
          life: api.rnd(0.18, 0.45),
          color,
        })
      }
    }

    bird.y = groundAt(0) - 11
    bird.vx = speed

    function update(dt) {
      if (dead) return
      const sdt = dt * (slow > 0 ? 0.45 : 1)
      if (slow > 0) slow -= dt
      if (flash > 0) flash -= dt * 2.4
      if (msgT > 0) msgT -= dt
      if (shake > 0) shake = Math.max(0, shake - dt * 30)
      shx = (api.rng() - 0.5) * shake
      shy = (api.rng() - 0.5) * shake
      time += sdt
      bird.wing += sdt * (bird.air ? 12 : 5)

      const hold = api.down('space') || api.down('up')
      const slope = groundAt(worldX + 8) - groundAt(worldX)
      hilly += Math.abs(slope) * sdt

      if (hold) {
        speed += slope * 34 * sdt
        if (bird.air) bird.vy += GRAV * 1.35 * sdt
      } else {
        speed -= 42 * sdt
        if (bird.air) bird.vy += GRAV * 0.62 * sdt
      }
      speed -= 12 * sdt
      if (speed > 560) speed = 560

      worldX += speed * sdt
      const gy = groundAt(worldX) - 11

      if (!bird.air && slope < -1.1 && !hold && speed > 210) {
        bird.air = true
        bird.vy = -(speed * 0.34 + 120)
        spark(bird.x, bird.y + 10, 4, C.accent2, 90)
        combo += 1
      }

      if (speed < 165) stall += sdt
      else stall = 0

      if (stall > 0.9) {
        bird.air = true
        bird.vy = 220
        bird.y += 300 * sdt
        if (bird.y > H + 20) {
          dead = true
          spark(bird.x, H - 20, 12, C.warn, 170)
          shake = 12
          api.lose('stall')
        }
      } else if (bird.air) {
        bird.y += bird.vy * sdt
        if (bird.y >= gy) {
          bird.y = gy
          bird.vy = 0
          bird.air = false
          spark(bird.x, bird.y + 12, 3, C.dim, 70)
        }
      } else {
        bird.y += (gy - bird.y) * Math.min(1, sdt * 16)
        if (slope > 0.9 && Math.floor(time * 6) % 3 === 0) spark(bird.x - 6, bird.y + 12, 1, 'rgba(232,238,246,0.5)', 40)
      }

      if (stall > 0.35 && msgT <= 0) {
        msg = 'STALL'
        msgT = 0.3
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
        q.vy += 240 * sdt
      }
      api.setStatus('speed ' + Math.round(speed))
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.055 - i * 0.006).toFixed(3) + ')')

      const far = (worldX * 0.12) % 130
      for (let x = -far; x < W; x += 130) api.rect(x, 150, 62, 60, 'rgba(106,169,255,0.06)')

      const startX = Math.floor(worldX / 8) * 8
      for (let i = -2; i < 68; i += 1) {
        const wx = startX + i * 8
        const sx = bird.x + (wx - worldX)
        if (sx < -20 || sx > W + 20) continue
        const gy = groundAt(wx)
        api.rect(sx, gy, 9, H - gy + 10, i % 6 === 0 ? C.panel : 'rgba(24,32,40,0.92)')
      }
      for (let i = -2; i < 68; i += 1) {
        const wx = startX + i * 8
        const sx = bird.x + (wx - worldX)
        if (sx < -20 || sx > W + 20) continue
        const gy = groundAt(wx)
        api.rect(sx, gy, 9, 3, C.accent)
      }

      if (speed > 430) {
        for (let i = 0; i < 6; i += 1) {
          const y = 60 + i * 42
          api.rect(W - 20 - ((worldX * 0.7 + i * 74) % 150), y, 34, 2, 'rgba(232,238,246,0.2)')
        }
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      const flap = Math.sin(bird.wing) * 5
      api.circle(bird.x + shx, bird.y + shy, 11, dead ? C.dim : C.good)
      api.rect(bird.x - 16 + shx, bird.y - 2 + flap + shy, 16, 6, C.accent2)
      api.rect(bird.x + 2 + shx, bird.y - 3 + shy, 9, 4, C.warn)
      api.circle(bird.x + 5 + shx, bird.y - 4 + shy, 2, C.bg)

      api.text('HOLD = DIVE', 12, 18, { size: 12, color: C.dim })
      api.text(time.toFixed(1), W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      api.rect(12, 30, 84, 5, C.panel)
      api.rect(12, 30, Math.max(0, Math.min(84, (speed - 150) / 5)), 5, speed < 200 ? C.warn : C.accent)
      if (combo > 1) api.text('FLIGHTS x' + combo, 12, 46, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 66, { size: 20, color: C.warn, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.16).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('STALLED', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('hold to dive downhill', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
