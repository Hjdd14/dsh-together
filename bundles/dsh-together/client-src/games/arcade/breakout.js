defineGame({
  id: 'breakout',
  create(api) {
    const COLS = 6
    const ROWS = 4
    const BW = 62
    const BH = 18
    const GAP = 4
    const X0 = 44
    const Y0 = 52
    const PAD_W = 76
    const PAD_H = 10
    const PAD_Y = 332
    const R = 6
    const TINTS = [api.colors.accent, api.colors.good, api.colors.accent2, api.colors.warn]

    const bricks = []
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        bricks.push({ x: X0 + c * (BW + GAP), y: Y0 + r * (BH + GAP), tint: r, alive: true })
      }
    }

    let padX = api.w / 2
    let ball = { x: api.w / 2, y: PAD_Y - 30, vx: 0, vy: 0 }
    let speed = 250
    let lives = 3
    let broken = 0
    let serveTimer = 0.5
    let dead = false
    let reason = ''
    let combo = 0
    let comboPeak = 0
    let padFlash = 0
    let missFlash = 0
    let shake = 0
    let shx = 0
    let shy = 0
    const parts = []
    const trail = []

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 70; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.35, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.3, 0.6), max: 0.6,
          c: color, r: api.rnd(1.5, 3.6),
        })
      }
    }

    function serve() {
      ball.x = padX
      ball.y = PAD_Y - 26
      const ang = api.rnd(-0.62, 0.62)
      ball.vx = Math.sin(ang) * speed
      ball.vy = -Math.cos(ang) * speed
      serveTimer = 0.45
      combo = 0
      trail.length = 0
    }

    function bouncePad() {
      const rel = (ball.x - padX) / (PAD_W / 2)
      const clampRel = rel < -1 ? -1 : rel > 1 ? 1 : rel
      const ang = clampRel * 0.92
      speed = Math.min(speed + 8, 335)
      ball.vx = Math.sin(ang) * speed
      ball.vy = -Math.abs(Math.cos(ang) * speed)
      ball.y = PAD_Y - R - 1
      padFlash = 1
      combo = 0
    }

    function clampPad() {
      padX = padX < PAD_W / 2 ? PAD_W / 2 : padX > api.w - PAD_W / 2 ? api.w - PAD_W / 2 : padX
    }

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'left') padX -= 26
      else if (key === 'right') padX += 26
      clampPad()
    })

    serve()

    function update(dt) {
      if (dead) return
      if (padFlash > 0) padFlash = Math.max(0, padFlash - dt * 4)
      if (missFlash > 0) missFlash = Math.max(0, missFlash - dt * 1.6)
      if (shake > 0) {
        shake = Math.max(0, shake - dt)
        shx = api.rnd(-1, 1) * shake * 14
        shy = api.rnd(-1, 1) * shake * 14
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
        p.vy += 220 * dt
        p.vx *= 1 - 1.6 * dt
      }

      const dir = (api.down('right') ? 1 : 0) - (api.down('left') ? 1 : 0)
      padX += dir * 340 * dt
      clampPad()

      if (serveTimer > 0) {
        serveTimer -= dt
        ball.x = padX
        ball.y = PAD_Y - 26
        return
      }

      ball.x += ball.vx * dt
      ball.y += ball.vy * dt

      trail.push({ x: ball.x, y: ball.y })
      if (trail.length > 9) trail.shift()

      if (ball.x < R) {
        ball.x = R
        ball.vx = Math.abs(ball.vx)
      } else if (ball.x > api.w - R) {
        ball.x = api.w - R
        ball.vx = -Math.abs(ball.vx)
      }
      if (ball.y < R) {
        ball.y = R
        ball.vy = Math.abs(ball.vy)
      }

      for (let i = 0; i < bricks.length; i += 1) {
        const b = bricks[i]
        if (!b.alive) continue
        if (ball.x + R < b.x || ball.x - R > b.x + BW) continue
        if (ball.y + R < b.y || ball.y - R > b.y + BH) continue
        b.alive = false
        broken += 1
        combo += 1
        if (combo > comboPeak) comboPeak = combo
        shake = Math.max(shake, 0.18 + Math.min(0.3, combo * 0.04))
        burst(b.x + BW / 2, b.y + BH / 2, TINTS[b.tint], 7, 165)
        api.progress(1)
        api.setStatus(combo > 1 ? 'bricks ' + broken + ' x' + combo : 'bricks ' + broken)
        const cx = b.x + BW / 2
        const cy = b.y + BH / 2
        if (Math.abs(ball.x - cx) / BW > Math.abs(ball.y - cy) / BH) {
          ball.vx = ball.x < cx ? -Math.abs(ball.vx) : Math.abs(ball.vx)
          ball.x = ball.x < cx ? b.x - R : b.x + BW + R
        } else {
          ball.vy = ball.y < cy ? -Math.abs(ball.vy) : Math.abs(ball.vy)
          ball.y = ball.y < cy ? b.y - R : b.y + BH + R
        }
        break
      }

      if (ball.vy > 0 && ball.y + R >= PAD_Y && ball.y - R <= PAD_Y + PAD_H
        && Math.abs(ball.x - padX) <= PAD_W / 2 + R) {
        bouncePad()
      }

      if (ball.y - R > api.h) {
        lives -= 1
        missFlash = 1
        shake = 0.7
        burst(ball.x, api.h - 12, api.colors.warn, 12, 200)
        api.setStatus('bricks ' + broken + ' · life ' + lives)
        if (lives <= 0) {
          dead = true
          reason = 'ball lost'
          api.lose(reason)
        } else {
          serve()
        }
      }
    }

    function draw(g) {
      api.clear(api.colors.bg)
      const t = api.now() / 1000
      for (let y = -20; y < api.h + 20; y += 44) {
        for (let x = 20; x < api.w; x += 60) {
          const yy = y + ((t * 12) % 44)
          api.circle(x + ((y / 44) % 2) * 30, yy, 1.4, api.colors.panel)
        }
      }
      for (let i = 0; i < bricks.length; i += 1) {
        const b = bricks[i]
        if (!b.alive) continue
        api.rect(b.x + shx, b.y + shy, BW, BH, TINTS[b.tint])
        api.rect(b.x + shx, b.y + shy, BW, 3, api.colors.fg)
      }
      for (let i = 0; i < trail.length; i += 1) {
        const p = trail[i]
        api.circle(p.x + shx, p.y + shy, R * (0.25 + (i / trail.length) * 0.7), api.colors.dim)
      }
      if (!dead) api.circle(ball.x + shx, ball.y + shy, R, api.colors.fg)
      const padCol = padFlash > 0.35 ? api.colors.accent2 : api.colors.fg
      api.rect(padX - PAD_W / 2 + shx, PAD_Y + shy, PAD_W, PAD_H, padCol)
      api.rect(padX - 12 + shx, PAD_Y + shy, 24, PAD_H, api.colors.accent)
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i]
        api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
      }
      api.text('life ' + (lives > 0 ? lives : 0), 12, 18, { size: 13, color: api.colors.dim })
      api.text('bricks ' + broken, api.w - 12, 18, {
        size: 13, color: api.colors.dim, align: 'right',
      })
      if (combo >= 2 && !dead) {
        api.text('x' + combo, api.w / 2, 18, {
          size: 14 + Math.min(10, combo * 2), color: api.colors.accent2,
          align: 'center', weight: 'bold',
        })
      }
      if (missFlash > 0.55) {
        api.rect(0, 0, api.w, 6, api.colors.warn)
        api.rect(0, api.h - 6, api.w, 6, api.colors.warn)
      }
      if (dead) {
        api.text('LOSE · ' + reason, api.w / 2, api.h / 2 - 18, {
          size: 14, color: api.colors.dim, align: 'center',
        })
        api.text('LOSE', api.w / 2, api.h / 2 + 16, {
          size: 38, color: api.colors.warn, align: 'center', weight: 'bold',
        })
      }
    }

    return { update, draw, dispose() { parts.length = 0; trail.length = 0 } }
  },
})
