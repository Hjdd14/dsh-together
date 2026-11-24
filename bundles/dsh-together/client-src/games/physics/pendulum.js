defineGame({
  id: 'pendulum',
  create(api) {
    const W = api.w
    const H = api.h
    const pivot = { x: W / 2, y: 70 }
    const length = 190
    // Start the cup clear of the bob's swing (min bobX = W/2 - 165 = 75): with a
    // centred cup the game caught every ball without any input.
    const cup = { x: 48, w: 56 }
    const balls = []
    let angle = 0.9
    let direction = -1
    let caught = 0
    let dropTimer = 0
    let missed = 0

    api.onKey((key, down) => {
      if (!down) return
      if (key === 'left') cup.x = Math.max(50, cup.x - 26)
      if (key === 'right') cup.x = Math.min(W - 50, cup.x + 26)
    })
    api.onPointer((event) => {
      if (event.type !== 'up') cup.x = Math.max(50, Math.min(W - 50, event.x))
    })

    return {
      update(dt) {
        angle += direction * 1.5 * dt
        if (angle > 1.05) { angle = 1.05; direction = -1 }
        if (angle < -1.05) { angle = -1.05; direction = 1 }
        dropTimer -= dt
        if (dropTimer <= 0) {
          dropTimer = 0.55
          const bobX = pivot.x + Math.sin(angle) * length
          const bobY = pivot.y + Math.cos(angle) * length
          if (bobY > H - 220) {
            balls.push({ x: bobX, y: bobY, vy: 40, alive: true })
          }
        }
        for (const ball of balls) {
          if (!ball.alive) continue
          ball.vy += 620 * dt
          ball.y += ball.vy * dt
          if (ball.y > H - 96 && ball.y < H - 60 && Math.abs(ball.x - cup.x) < cup.w / 2) {
            ball.alive = false
            caught += 1
            api.progress(1)
            api.setStatus('caught ' + caught)
          } else if (ball.y > H) {
            ball.alive = false
            missed += 1
          }
        }
        while (balls.length > 10) balls.shift()
      },
      draw(g) {
        api.clear(api.colors.bg)
        const bobX = pivot.x + Math.sin(angle) * length
        const bobY = pivot.y + Math.cos(angle) * length
        g.strokeStyle = api.colors.dim
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(pivot.x, pivot.y)
        g.lineTo(bobX, bobY)
        g.stroke()
        api.circle(pivot.x, pivot.y, 6, api.colors.dim)
        api.circle(bobX, bobY, 14, api.colors.warn)
        for (const ball of balls) if (ball.alive) api.circle(ball.x, ball.y, 7, api.colors.accent2)
        api.rect(cup.x - cup.w / 2, H - 70, cup.w, 10, api.colors.accent)
        api.rect(cup.x - cup.w / 2, H - 60, 6, 26, api.colors.accent)
        api.rect(cup.x + cup.w / 2 - 6, H - 60, 6, 26, api.colors.accent)
        api.text('move the cup with arrows or the mouse', 12, 26, { size: 12, color: api.colors.dim })
        api.text(`caught ${caught} · missed ${missed}`, W - 20, 26, { size: 12, color: api.colors.accent2, align: 'right' })
      },
    }
  },
})
