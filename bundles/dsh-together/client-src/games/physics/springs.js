defineGame({
  id: 'springs',
  create(api) {
    const W = api.w
    const H = api.h
    const ball = { x: W / 2, y: 60, vx: 40, vy: 0, r: 10 }
    const springs = []
    let bounces = 0
    let lives = 3
    let dead = false

    for (let index = 0; index < 4; index += 1) {
      springs.push({ x: 90 + index * 100, y: H - 70, w: 72, squash: 0 })
    }

    api.onKey((key, down) => {
      if (!down) return
      if (key === 'left') ball.vx -= 90
      if (key === 'right') ball.vx += 90
    })
    api.onPointer((event) => {
      if (event.type === 'down' || event.type === 'move') {
        ball.vx += Math.max(-120, Math.min(120, (event.x - ball.x) * 0.8))
      }
    })

    return {
      update(dt) {
        if (dead) return
        ball.vy += 700 * dt
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        ball.vx *= Math.pow(0.995, dt * 60)
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) }
        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) }
        for (const spring of springs) {
          const top = spring.y
          if (ball.vy > 0 && ball.y + ball.r > top && ball.y + ball.r < top + 22 &&
            ball.x > spring.x - spring.w / 2 && ball.x < spring.x + spring.w / 2) {
            ball.y = top - ball.r
            ball.vy = -520
            spring.squash = 1
            bounces += 1
            api.progress(1)
            api.setStatus('bounces ' + bounces)
          }
          spring.squash = Math.max(0, spring.squash - dt * 4)
        }
        if (ball.y > H + 20) {
          lives -= 1
          if (lives <= 0) {
            dead = true
            api.lose('fell through')
          } else {
            api.setStatus('bounces ' + bounces + ' · life ' + lives)
            ball.x = W / 2
            ball.y = 60
            ball.vx = 40
            ball.vy = 0
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        api.rect(0, H - 28, W, 28, api.colors.panel)
        for (const spring of springs) {
          const squash = spring.squash * 10
          g.strokeStyle = api.colors.accent
          g.lineWidth = 3
          g.beginPath()
          for (let step = 0; step <= 6; step += 1) {
            const px = spring.x - spring.w / 2 + (spring.w / 6) * step
            const py = spring.y + 14 + (step % 2 === 0 ? -6 : 6) + squash
            if (step === 0) g.moveTo(px, py)
            else g.lineTo(px, py)
          }
          g.stroke()
          api.rect(spring.x - spring.w / 2, spring.y + squash, spring.w, 6, api.colors.accent2)
        }
        api.circle(ball.x, ball.y, ball.r, api.colors.fg)
        api.text('arrows / mouse nudge the ball · keep landing on springs', 12, 26, { size: 12, color: api.colors.dim })
        api.text('bounces ' + bounces, W - 20, 26, { size: 12, color: api.colors.accent2, align: 'right' })
        api.text('life ' + lives, W - 20, 46, { size: 12, color: api.colors.dim, align: 'right' })
      },
    }
  },
})
