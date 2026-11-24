defineGame({
  id: 'pong',
  create(api) {
    const PW = 10
    const PH = 64
    const PAD_X = 22
    const AI_X = api.w - 22 - PW
    const R = 7
    const MAX_VY = 330

    let py = api.h / 2
    let ay = api.h / 2
    let aiTarget = api.h / 2
    let aiTimer = 0
    let ps = 0
    let cs = 0
    let serveTimer = 0.55
    let dead = false
    let speed = 250
    let combo = 0
    let padFlash = 0
    let aiFlash = 0
    let missFlash = 0
    let scoreFlash = 0
    let shake = 0
    let shx = 0
    let shy = 0
    const ball = { x: api.w / 2, y: api.h / 2, vx: 0, vy: 0 }
    const trail = []
    const parts = []

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 56; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.22, 0.5), max: 0.5,
          c: color, r: api.rnd(1.4, 3.2),
        })
      }
    }

    function serve(sign) {
      const ang = api.rnd(-0.5, 0.5)
      ball.x = api.w / 2
      ball.y = api.rnd(api.h * 0.3, api.h * 0.7)
      ball.vx = Math.cos(ang) * speed * sign
      ball.vy = Math.sin(ang) * speed
      serveTimer = 0.55
      trail.length = 0
    }

    function clampPad(v) {
      const half = PH / 2
      return v < half ? half : v > api.h - half ? api.h - half : v
    }

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'up') py -= 26
      else if (key === 'down') py += 26
      py = clampPad(py)
    })

    serve(api.rng() < 0.5 ? -1 : 1)
    api.setStatus('0 : 0')

    function update(dt) {
      if (dead) return
      if (padFlash > 0) padFlash = Math.max(0, padFlash - dt * 4)
      if (aiFlash > 0) aiFlash = Math.max(0, aiFlash - dt * 4)
      if (missFlash > 0) missFlash = Math.max(0, missFlash - dt * 1.5)
      if (scoreFlash > 0) scoreFlash = Math.max(0, scoreFlash - dt * 2)
      if (shake > 0) {
        shake = Math.max(0, shake - dt)
        shx = api.rnd(-1, 1) * shake * 10
        shy = api.rnd(-1, 1) * shake * 10
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
        p.vx *= 1 - 2.2 * dt
        p.vy *= 1 - 2.2 * dt
      }

      const pdir = (api.down('down') ? 1 : 0) - (api.down('up') ? 1 : 0)
      py = clampPad(py + pdir * 330 * dt)

      aiTimer -= dt
      if (aiTimer <= 0) {
        aiTimer = 0.22
        aiTarget = ball.vx > 0 ? ball.y : api.h / 2
      }
      const dy = aiTarget - ay
      const step = 128 * dt
      if (dy > step) ay += step
      else if (dy < -step) ay -= step
      ay = clampPad(ay)

      if (serveTimer > 0) {
        serveTimer -= dt
        return
      }

      ball.x += ball.vx * dt
      ball.y += ball.vy * dt
      trail.push({ x: ball.x, y: ball.y })
      if (trail.length > 9) trail.shift()

      if (ball.y < R) {
        ball.y = R
        ball.vy = Math.abs(ball.vy)
      } else if (ball.y > api.h - R) {
        ball.y = api.h - R
        ball.vy = -Math.abs(ball.vy)
      }

      if (ball.vx < 0 && ball.x - R <= PAD_X + PW && ball.x + R >= PAD_X
        && Math.abs(ball.y - py) <= PH / 2 + R) {
        const rel = (ball.y - py) / (PH / 2)
        const rel2 = rel < -1 ? -1 : rel > 1 ? 1 : rel
        speed = Math.min(speed + 10, 430)
        ball.vx = Math.min(Math.abs(ball.vx) + 12, speed)
        ball.vy = rel2 >= 0 ? rel2 * 230 + 40 : rel2 * 230 - 40
        ball.x = PAD_X + PW + R + 1
        padFlash = 1
        shake = Math.max(shake, 0.16)
        burst(ball.x, ball.y, api.colors.accent, 6, 150)
      }

      if (ball.vx > 0 && ball.x + R >= AI_X && ball.x - R <= AI_X + PW
        && Math.abs(ball.y - ay) <= PH / 2 + R) {
        const rel = (ball.y - ay) / (PH / 2)
        const rel2 = rel < -1 ? -1 : rel > 1 ? 1 : rel
        ball.vx = -Math.min(Math.abs(ball.vx) + 10, speed)
        ball.vy = rel2 >= 0 ? rel2 * 230 + 40 : rel2 * 230 - 40
        ball.x = AI_X - R - 1
        aiFlash = 1
        burst(ball.x, ball.y, api.colors.accent2, 6, 150)
      }

      if (ball.vy > MAX_VY) ball.vy = MAX_VY
      if (ball.vy < -MAX_VY) ball.vy = -MAX_VY
      if (Math.abs(ball.vy) < 50) ball.vy = ball.vy >= 0 ? 50 : -50

      if (ball.x < -R * 2) {
        cs += 1
        combo = 0
        missFlash = 1
        shake = 0.55
        burst(0, ball.y, api.colors.warn, 10, 180)
        api.setStatus(ps + ' : ' + cs)
        if (cs >= 5) {
          dead = true
          api.lose('cpu scored five')
        } else {
          serve(1)
        }
      } else if (ball.x > api.w + R * 2) {
        ps += 1
        combo += 1
        scoreFlash = 1
        shake = 0.4
        burst(api.w, ball.y, api.colors.good, 12, 210)
        api.score(1)
        api.setStatus(combo > 1 ? ps + ' : ' + cs + ' x' + combo : ps + ' : ' + cs)
        serve(-1)
      }
    }

    function draw(g) {
      api.clear(api.colors.bg)
      const t = api.now() / 1000
      for (let y = -20; y < api.h + 20; y += 40) {
        api.rect(0, y + ((t * 9) % 40), api.w, 1, api.colors.panel)
      }
      for (let y = 12; y < api.h - 8; y += 26) {
        api.rect(api.w / 2 - 1 + shx, y + shy, 2, 13, api.colors.panel)
      }
      for (let i = 0; i < trail.length; i += 1) {
        const p = trail[i]
        api.circle(p.x + shx, p.y + shy, R * (0.2 + (i / trail.length) * 0.75), api.colors.dim)
      }
      const pcol = padFlash > 0.4 ? api.colors.accent2 : api.colors.accent
      api.rect(PAD_X, py - PH / 2 + shy, PW, PH, pcol)
      const acol = aiFlash > 0.4 ? api.colors.fg : api.colors.accent2
      api.rect(AI_X, ay - PH / 2 + shy, PW, PH, acol)
      api.circle(ball.x + shx, ball.y + shy, R, api.colors.fg)
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i]
        api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
      }
      api.text(ps + ' : ' + cs, api.w / 2, 24, {
        size: 20, color: scoreFlash > 0.4 ? api.colors.good : api.colors.dim, align: 'center',
      })
      if (combo >= 2) {
        api.text('x' + combo, api.w / 2, 48, {
          size: 13, color: api.colors.accent2, align: 'center', weight: 'bold',
        })
      }
      if (missFlash > 0.5) {
        api.rect(0, 0, 8, api.h, api.colors.warn)
        api.rect(api.w - 8, 0, 8, api.h, api.colors.warn)
      }
      if (dead) {
        api.text('CPU REACHED 5', api.w / 2, api.h / 2 + 8, {
          size: 14, color: api.colors.dim, align: 'center',
        })
        api.text('LOSE', api.w / 2, api.h / 2 + 32, {
          size: 34, color: api.colors.warn, align: 'center', weight: 'bold',
        })
      }
    }

    return { update, draw, dispose() { parts.length = 0; trail.length = 0 } }
  },
})
