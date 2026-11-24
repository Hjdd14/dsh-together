defineGame({
  id: 'bowling',
  create(api) {
    const W = api.w
    const H = api.h
    const laneTop = 74
    const laneBottom = H - 24
    const ball = { x: 90, y: (laneTop + laneBottom) / 2, vx: 0, vy: 0, rolling: false, r: 11 }
    const pins = []
    const particles = []
    const trail = []
    let down = 0
    let aim = null
    let lastResult = ''
    let resultTimer = 0
    let shake = 0

    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column <= row; column += 1) {
        pins.push({
          x: 372 + row * 22,
          y: (laneTop + laneBottom) / 2 + (column - row / 2) * 26,
          alive: true,
          fade: 0,
        })
      }
    }

    const burst = (x, y, amount) => {
      for (let index = 0; index < amount; index += 1) {
        particles.push({
          x, y,
          vx: api.rnd(-150, 150),
          vy: api.rnd(-190, -30),
          life: api.rnd(0.3, 0.6),
          max: 0.6,
        })
      }
      while (particles.length > 160) particles.shift()
    }

    api.onPointer((event) => {
      if (event.type === 'down' && !ball.rolling) aim = { x: event.x, y: event.y }
      if (event.type === 'move' && aim) aim = { x: event.x, y: event.y }
      if (event.type === 'up' && aim && !ball.rolling) {
        const dx = Math.max(30, aim.x - ball.x)
        const dy = aim.y - ball.y
        const length = Math.max(1, Math.hypot(dx, dy))
        ball.vx = (dx / length) * 350
        ball.vy = (dy / length) * 350
        ball.rolling = true
        aim = null
      }
    })
    api.onKey((key, down2) => {
      if (!down2 || ball.rolling) return
      if (key === 'space' || key === 'enter') {
        ball.vx = 350
        ball.vy = (api.rng() - 0.5) * 40
        ball.rolling = true
      }
    })

    return {
      update(dt) {
        resultTimer = Math.max(0, resultTimer - dt)
        shake = Math.max(0, shake - dt * 12)
        for (const pin of pins) if (pin.fade > 0) pin.fade = Math.max(0, pin.fade - dt * 2.2)
        for (let index = particles.length - 1; index >= 0; index -= 1) {
          const particle = particles[index]
          particle.vy += 560 * dt
          particle.x += particle.vx * dt
          particle.y += particle.vy * dt
          particle.life -= dt
          if (particle.life <= 0) particles.splice(index, 1)
        }
        for (let index = trail.length - 1; index >= 0; index -= 1) {
          trail[index].life -= dt
          if (trail[index].life <= 0) trail.splice(index, 1)
        }
        if (!ball.rolling) return
        trail.push({ x: ball.x, y: ball.y, life: 0.35 })
        while (trail.length > 40) trail.shift()
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        const slowdown = Math.pow(0.995, dt * 60)
        ball.vx *= slowdown
        ball.vy *= slowdown
        if (ball.y < laneTop + ball.r) { ball.y = laneTop + ball.r; ball.vy = Math.abs(ball.vy) }
        if (ball.y > laneBottom - ball.r) { ball.y = laneBottom - ball.r; ball.vy = -Math.abs(ball.vy) }
        for (const pin of pins) {
          if (!pin.alive) continue
          if (Math.hypot(pin.x - ball.x, pin.y - ball.y) < ball.r + 9) {
            pin.alive = false
            pin.fade = 1
            down += 1
            shake = Math.min(4, shake + 1.2)
            burst(pin.x, pin.y, 7)
            api.progress(1)
            api.setStatus(`pins ${down}`)
            lastResult = down >= 10 ? 'STRIKE!' : down >= 6 ? 'GREAT!' : 'HIT'
            resultTimer = 0.9
            ball.vx *= 0.94
          }
        }
        if (ball.vx < 12 || ball.x > W + 30) {
          ball.rolling = false
          ball.x = 90
          ball.y = (laneTop + laneBottom) / 2
          ball.vx = 0
          ball.vy = 0
          trail.length = 0
          const remaining = pins.filter((pin) => pin.alive).length
          if (remaining === 0) api.win()
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        g.save()
        if (shake > 0.05) g.translate(Math.sin(api.now() / 22) * shake, Math.cos(api.now() / 19) * shake * 0.4)
        api.rect(0, laneTop, W, laneBottom - laneTop, '#131a22')
        for (let x = 40; x < W; x += 40) api.rect(x, laneTop, 1, laneBottom - laneTop, '#1c2632')
        for (const particle of trail) {
          const alpha = Math.max(0, particle.life / 0.35)
          api.circle(particle.x, particle.y, 7 * alpha + 2, `rgba(106,169,255,${0.22 * alpha})`)
        }
        for (const pin of pins) {
          if (pin.fade > 0) {
            api.circle(pin.x, pin.y + (1 - pin.fade) * 10, 8 * pin.fade + 2, `rgba(255,255,255,${0.35 * pin.fade})`)
          }
          if (!pin.alive) continue
          api.circle(pin.x, pin.y, 8, api.colors.fg)
          api.circle(pin.x, pin.y, 4, api.colors.warn)
        }
        api.circle(ball.x, ball.y, ball.r, api.colors.accent)
        api.circle(ball.x - 3, ball.y - 3, 3.4, 'rgba(255,255,255,.55)')
        for (const particle of particles) {
          const alpha = Math.max(0, particle.life / particle.max)
          api.circle(particle.x, particle.y, 2.4 * alpha + 0.6, `rgba(255,207,92,${alpha})`)
        }
        if (aim) {
          g.strokeStyle = api.colors.accent2
          g.lineWidth = 2
          g.setLineDash([6, 6])
          g.beginPath()
          g.moveTo(ball.x, ball.y)
          g.lineTo(aim.x, aim.y)
          g.stroke()
          g.setLineDash([])
        }
        g.restore()
        api.text('DRAG from the ball to aim, release to roll • SPACE for a straight ball', 12, 18, { size: 11, color: api.colors.dim })
        if (resultTimer > 0) {
          api.text(lastResult, W / 2, 40, { size: 18, color: api.colors.accent2, align: 'center', weight: '600' })
        }
      },
    }
  },
})
