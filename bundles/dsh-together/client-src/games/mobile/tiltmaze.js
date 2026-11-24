defineGame({
  id: 'tiltmaze',
  create(api) {
    const W = api.w
    const H = api.h
    const R = 8
    const ACC = 470

    const WALLS = [
      { x: 0, y: 0, w: W, h: 14 },
      { x: 0, y: H - 14, w: W, h: 14 },
      { x: 0, y: 0, w: 14, h: H },
      { x: W - 14, y: 0, w: 14, h: H },
      { x: 120, y: 14, w: 14, h: 120 },
      { x: 120, y: 220, w: 14, h: H - 234 },
      { x: 260, y: 90, w: 120, h: 14 },
      { x: 340, y: 104, w: 14, h: 130 },
      { x: 200, y: 240, w: 100, h: 14 },
    ]
    const HOLES = [
      { x: 70, y: 300, r: 15 },
      { x: 232, y: 200, r: 15 },
      { x: 300, y: 300, r: 15 },
    ]
    const GOAL = { x: 420, y: 300, r: 16 }
    const ball = { x: 48, y: 58, vx: 0, vy: 0 }

    let tiltX = 0
    let tiltY = 0
    let pointerTilt = false
    let done = false
    let dead = false
    let flash = 0
    let shake = 0
    let shx = 0
    let shy = 0
    const trail = []
    const parts = []

    function tiltFrom(event) {
      const dx = event.x - W / 2
      const dy = event.y - H / 2
      const len = Math.hypot(dx, dy) || 1
      const strength = Math.min(1, len / 140)
      tiltX = (dx / len) * strength
      tiltY = (dy / len) * strength
    }

    api.onPointer((event) => {
      if (event.type === 'down') {
        pointerTilt = true
        tiltFrom(event)
      } else if (event.type === 'move' && pointerTilt) {
        tiltFrom(event)
      } else if (event.type === 'up') {
        pointerTilt = false
        tiltX = 0
        tiltY = 0
      }
    })
    api.onKey((key, isDown) => {
      if (!isDown) return
      pointerTilt = false
      if (key === 'left') { tiltX = -1; tiltY = 0 }
      else if (key === 'right') { tiltX = 1; tiltY = 0 }
      else if (key === 'up') { tiltX = 0; tiltY = -1 }
      else if (key === 'down') { tiltX = 0; tiltY = 1 }
    })

    api.setStatus('roll to the exit')

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 40; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.22, 0.5), max: 0.5,
          c: color, r: api.rnd(1.2, 2.8),
        })
      }
    }

    return {
      update(dt) {
        if (flash > 0) flash = Math.max(0, flash - dt * 2.4)
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
          p.vx *= 1 - 2 * dt
          p.vy *= 1 - 2 * dt
        }
        if (done || dead) return

        if (!pointerTilt) {
          let tx = 0
          let ty = 0
          if (api.down('left')) tx -= 1
          if (api.down('right')) tx += 1
          if (api.down('up')) ty -= 1
          if (api.down('down')) ty += 1
          if (tx !== 0 || ty !== 0) { tiltX = tx; tiltY = ty }
        }

        ball.vx += tiltX * ACC * dt
        ball.vy += tiltY * ACC * dt
        const drag = Math.pow(0.985, dt * 60)
        ball.vx *= drag
        ball.vy *= drag
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt

        trail.push({ x: ball.x, y: ball.y })
        if (trail.length > 8) trail.shift()

        for (let i = 0; i < WALLS.length; i += 1) {
          const wall = WALLS[i]
          const nx = Math.max(wall.x, Math.min(ball.x, wall.x + wall.w))
          const ny = Math.max(wall.y, Math.min(ball.y, wall.y + wall.h))
          const dx = ball.x - nx
          const dy = ball.y - ny
          if (dx * dx + dy * dy >= R * R) continue
          if (Math.abs(dx) > Math.abs(dy)) {
            ball.x = nx + (dx > 0 ? R + 1 : -(R + 1))
            ball.vx = -ball.vx * 0.55
          } else {
            ball.y = ny + (dy > 0 ? R + 1 : -(R + 1))
            ball.vy = -ball.vy * 0.55
          }
        }

        const sp = Math.hypot(ball.vx, ball.vy)
        if (sp > 300) {
          ball.vx = (ball.vx / sp) * 300
          ball.vy = (ball.vy / sp) * 300
        }

        for (let i = 0; i < HOLES.length; i += 1) {
          if (Math.hypot(ball.x - HOLES[i].x, ball.y - HOLES[i].y) > HOLES[i].r - 2) continue
          dead = true
          shake = 0.8
          burst(ball.x, ball.y, api.colors.warn, 14, 170)
          api.lose('fell in a hole')
          return
        }

        if (Math.hypot(ball.x - GOAL.x, ball.y - GOAL.y) < GOAL.r) {
          done = true
          flash = 1
          burst(GOAL.x, GOAL.y, api.colors.good, 16, 190)
          api.progress(1)
          api.setStatus('home')
          api.win()
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        const t = api.now() / 1000
        for (let y = 14; y < H - 14; y += 38) {
          for (let x = 14; x < W - 14; x += 38) {
            api.rect(x + shx, y + shy, 2, 2, api.colors.panel)
          }
        }
        for (let i = 0; i < WALLS.length; i += 1) {
          const w = WALLS[i]
          api.rect(w.x + shx, w.y + shy, w.w, w.h, api.colors.dim)
          api.rect(w.x + 2 + shx, w.y + 2 + shy, Math.max(0, w.w - 4), 3, api.colors.fg)
        }
        for (let i = 0; i < HOLES.length; i += 1) {
          const h = HOLES[i]
          const pulse = 0.85 + 0.15 * Math.sin(t * 3 + i)
          api.circle(h.x + shx, h.y + shy, h.r * pulse, api.colors.panel)
          api.circle(h.x + shx, h.y + shy, h.r * 0.55 * pulse, api.colors.bg)
          api.rect(h.x - 2 + shx, h.y - 1 + shy, 4, 2, api.colors.warn)
        }
        const gp = 0.8 + 0.2 * Math.sin(t * 4)
        api.rect(GOAL.x - 15 + shx, GOAL.y - 15 + shy, 30, 30, api.colors.good)
        api.rect(GOAL.x - 10 + shx, GOAL.y - 10 + shy, 20 * gp, 20 * gp, api.colors.bg)
        api.rect(GOAL.x - 4 + shx, GOAL.y - 4 + shy, 8, 8, api.colors.good)
        for (let i = 0; i < trail.length; i += 1) {
          const p = trail[i]
          api.rect(p.x - 3 + shx, p.y - 3 + shy, 6, 6, i % 2 === 0 ? api.colors.panel : api.colors.dim)
        }
        if (!dead && !done) {
          api.rect(ball.x - R + shx, ball.y - R + shy, R * 2, R * 2, api.colors.accent2)
          api.rect(ball.x - R + 2 + shx, ball.y - R + 2 + shy, R * 2 - 4, 3, api.colors.fg)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.rect(p.x + shx, p.y + shy, p.r * 2, p.r * 2, p.c)
        }
        api.text('TILT MAZE', 20, 12, { size: 11, color: api.colors.dim })
        if (done) {
          api.text('HOME', W / 2, H / 2 - 10, {
            size: 30, color: api.colors.good, align: 'center', weight: 'bold',
          })
        }
        if (dead) {
          api.text('fell in a hole', W / 2, H / 2 - 14, {
            size: 13, color: api.colors.dim, align: 'center',
          })
          api.text('LOSE', W / 2, H / 2 + 18, {
            size: 32, color: api.colors.warn, align: 'center', weight: 'bold',
          })
        }
        if (flash > 0.6) api.rect(0, 0, W, 3, api.colors.good)
      },
      dispose() { parts.length = 0; trail.length = 0 },
    }
  },
})
