defineGame({
  id: 'arkanoid',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const R = 5
    const paddle = { x: W / 2, y: H - 26, w: 66, h: 9 }
    const ball = { x: W / 2, y: H - 40, vx: 0, vy: 0, stuck: true }
    const bricks = []
    const parts = []
    const pops = []
    const VALUES = [30, 20, 15, 10]
    let speed = 200
    let lives = 3
    let got = 0
    let combo = 0
    let comboT = 0
    let stuckT = 0
    let prevSpace = false
    let shake = 0
    let flash = 0
    let t = 0
    let over = false

    function rack() {
      bricks.length = 0
      for (let r = 0; r < 4; r += 1) {
        for (let c = 0; c < 8; c += 1) {
          bricks.push({ x: 18 + c * 56, y: 44 + r * 20, w: 52, h: 16, v: VALUES[r], alive: true, hit: 0 })
        }
      }
    }
    rack()

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 44) parts.shift()
        parts.push({ x, y, vx: api.rnd(-120, 120), vy: api.rnd(-120, 120), life: api.rnd(0.2, 0.45), col })
      }
    }

    function tickFx(dt) {
      shake = Math.max(0, shake - dt * 2.8)
      flash = Math.max(0, flash - dt * 6)
      if (comboT > 0) {
        comboT -= dt
        if (comboT <= 0) combo = 0
      }
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - 2.4 * dt
        p.vy *= 1 - 2.4 * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
      for (let i = pops.length - 1; i >= 0; i -= 1) {
        pops[i].t += dt
        if (pops[i].t > 0.8) pops.splice(i, 1)
      }
    }

    function norm() {
      const m = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || 1
      if (Math.abs(ball.vy / m) * speed < 40) ball.vy = ball.vy >= 0 ? 40 : -40
      const n = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || 1
      ball.vx = (ball.vx / n) * speed
      ball.vy = (ball.vy / n) * speed
    }

    function serve() {
      ball.stuck = true
      stuckT = 0
      ball.x = paddle.x
      ball.y = paddle.y - R - 2
      ball.vx = 0
      ball.vy = 0
    }

    function launch() {
      let off = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.w / 2)))
      if (off > -0.08 && off < 0.08) off = off >= 0 ? 0.08 : -0.08
      const ang = -Math.PI / 2 + off * 0.7
      ball.vx = Math.cos(ang) * speed
      ball.vy = Math.sin(ang) * speed
      ball.stuck = false
    }

    function update(dt) {
      tickFx(dt)
      if (over) return
      t += dt
      speed = Math.min(260, 200 + got * 1.6)
      const sp = 300 * dt
      if (api.down('left')) paddle.x -= sp
      if (api.down('right')) paddle.x += sp
      paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x))

      const space = api.down('space')
      const edge = space && !prevSpace
      prevSpace = space

      if (ball.stuck) {
        stuckT += dt
        ball.x = paddle.x
        ball.y = paddle.y - R - 2
        // No auto-launch: the ball used to serve itself after 1.1s, which scored the
        // whole goal while the player did nothing. The player must press Space.
        if (edge) launch()
        return
      }

      ball.x += ball.vx * dt
      ball.y += ball.vy * dt

      if (ball.x < R) {
        ball.x = R
        ball.vx = Math.abs(ball.vx)
      }
      if (ball.x > W - R) {
        ball.x = W - R
        ball.vx = -Math.abs(ball.vx)
      }
      if (ball.y < R) {
        ball.y = R
        ball.vy = Math.abs(ball.vy)
      }

      if (ball.vy > 0 && ball.y + R >= paddle.y && ball.y - R < paddle.y + paddle.h + 4) {
        if (Math.abs(ball.x - paddle.x) <= paddle.w / 2 + R) {
          if (space) {
            ball.stuck = true
            stuckT = 0
            serve()
            api.setStatus('CAUGHT - press SPACE')
            return
          }
          const off = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.w / 2)))
          const ang = -Math.PI / 2 + off * 1.0
          ball.vx = Math.cos(ang) * speed
          ball.vy = Math.sin(ang) * speed
          ball.y = paddle.y - R - 1
          burst(ball.x, paddle.y - 4, C.accent, 5)
        }
      }

      for (const b of bricks) {
        if (!b.alive) continue
        if (ball.x + R < b.x || ball.x - R > b.x + b.w) continue
        if (ball.y + R < b.y || ball.y - R > b.y + b.h) continue
        const ox = b.w / 2 + R - Math.abs(ball.x - (b.x + b.w / 2))
        const oy = b.h / 2 + R - Math.abs(ball.y - (b.y + b.h / 2))
        if (ox < oy) ball.vx = -ball.vx
        else ball.vy = -ball.vy
        b.alive = false
        got += 1
        combo += 1
        comboT = 1.8
        const mult = combo >= 4 ? 2 : 1
        api.score(b.v * mult)
        shake = Math.min(1, shake + 0.4)
        flash = 1
        burst(b.x + b.w / 2, b.y + b.h / 2, C.accent2, 8)
        pops.push({ x: b.x + b.w / 2, y: b.y, t: 0, txt: '+' + b.v * mult })
        if (pops.length > 6) pops.shift()
        api.setStatus('BRICKS ' + got)
        norm()
        break
      }

      let any = false
      for (const b of bricks) if (b.alive) any = true
      if (!any) rack()

      if (ball.y > H + 12) {
        lives -= 1
        shake = 1
        flash = 1
        combo = 0
        burst(ball.x, H - 4, C.warn, 14)
        api.setStatus('LIVES ' + lives)
        if (lives <= 0) {
          over = true
          api.lose('all balls lost')
          return
        }
        serve()
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.08) * 3 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.1) * 3 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < 10; i += 1) {
        const y = 30 + ((i * 33 + t * 10) % (H - 30))
        Rr(0, y, W, 1, 'rgba(106,169,255,0.05)')
      }
      const pulse = 1 + Math.sin(t * 6) * 0.04
      for (const b of bricks) {
        if (!b.alive) continue
        const row = Math.floor((b.y - 44) / 20)
        const col = row === 0 ? C.accent2 : row === 1 ? C.accent : row === 2 ? C.good : C.dim
        Rr(b.x, b.y, b.w, b.h, col)
        Rr(b.x + 2, b.y + 2, b.w - 4, 3, 'rgba(16,20,24,0.25)')
        Rr(b.x + 3, b.y + b.h - 5, b.w - 6, 1, 'rgba(16,20,24,0.22)')
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      Ci(paddle.x, paddle.y + 4, 20, 'rgba(232,238,246,0.1)')
      Rr(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, C.fg)
      Rr(paddle.x - paddle.w / 2, paddle.y, paddle.w, 2, C.accent)
      Ci(ball.x, ball.y, R * pulse + 2, 'rgba(232,238,246,0.18)')
      Ci(ball.x, ball.y, R, ball.stuck ? C.accent2 : C.fg)
      for (const p of pops) {
        const a = Math.max(0, 1 - p.t * 1.2)
        api.text(p.txt, p.x, p.y - p.t * 20, { size: 11, color: 'rgba(255,207,92,' + a.toFixed(2) + ')', align: 'center' })
      }
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.08).toFixed(3) + ')')
      api.text('LIVES ' + lives, 12, 20, { size: 13, color: C.dim })
      api.text('SPACE catch', W - 12, 20, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo + (combo >= 4 ? ' (2x score)' : ''), W / 2, 20, { size: 13, color: C.accent2, align: 'center', weight: 'bold' })
      if (ball.stuck) api.text('SPACE to shoot', W / 2, H - 62, { size: 13, color: C.accent2, align: 'center' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.5)')
        api.text('GAME OVER', W / 2, 170, { size: 24, color: C.warn, align: 'center', weight: 'bold' })
      }
    }

    return {
      update,
      draw,
      dispose() {},
    }
  },
})
