defineGame({
  id: 'pinball',
  create(api) {
    const W = api.w
    const H = api.h
    const left = 36
    const right = W - 36
    const ball = { x: W / 2, y: 96, vx: 35, vy: 40, r: 8 }
    const bumpers = [
      { x: 150, y: 140, r: 20 },
      { x: 330, y: 140, r: 20 },
      { x: 240, y: 206, r: 22 },
    ]
    const flippers = [
      { x: 120, y: H - 52, angle: 0.28, lift: 0 },
      { x: 360, y: H - 52, angle: Math.PI - 0.28, lift: 0 },
    ]
    const ARM = 120
    let score = 0
    let lives = 3
    let dead = false

    api.onKey((key, down) => {
      if (!down) return
      if (key === 'left') flippers[0].lift = 1
      if (key === 'right') flippers[1].lift = 1
      if (key === 'space') { flippers[0].lift = 1; flippers[1].lift = 1 }
    })
    api.onKey((key, down) => {
      if (down) return
      if (key === 'left') flippers[0].lift = 0
      if (key === 'right') flippers[1].lift = 0
      if (key === 'space') { flippers[0].lift = 0; flippers[1].lift = 0 }
    })

    const bounce = (bumper) => {
      const dx = ball.x - bumper.x
      const dy = ball.y - bumper.y
      const distance = Math.hypot(dx, dy) || 1
      const push = 250
      ball.vx = (dx / distance) * push
      ball.vy = (dy / distance) * push
      ball.x = bumper.x + (dx / distance) * (bumper.r + ball.r + 1)
      ball.y = bumper.y + (dy / distance) * (bumper.r + ball.r + 1)
      score += 15
      api.score(15)
      api.setStatus('score ' + score)
    }

    return {
      update(dt) {
        if (dead) return
        ball.vy += 330 * dt
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        if (ball.x < left + ball.r) { ball.x = left + ball.r; ball.vx = Math.abs(ball.vx) * 0.92 }
        if (ball.x > right - ball.r) { ball.x = right - ball.r; ball.vx = -Math.abs(ball.vx) * 0.92 }
        if (ball.y < 52 + ball.r) { ball.y = 52 + ball.r; ball.vy = Math.abs(ball.vy) * 0.92 }
        for (const bumper of bumpers) {
          if (Math.hypot(ball.x - bumper.x, ball.y - bumper.y) < bumper.r + ball.r) bounce(bumper)
        }
        for (const flipper of flippers) {
          const tipX = flipper.x + Math.cos(flipper.angle) * ARM
          const tipY = flipper.y - Math.sin(flipper.angle) * ARM + (flipper.lift ? -18 : 0)
          const steps = 6
          for (let step = 1; step <= steps; step += 1) {
            const px = flipper.x + ((tipX - flipper.x) * step) / steps
            const py = flipper.y + ((tipY - flipper.y) * step) / steps
            if (Math.hypot(ball.x - px, ball.y - py) < ball.r + 5) {
              ball.y = py - ball.r - 2
              ball.vy = -Math.max(240, Math.abs(ball.vy) * 1.1)
              ball.vx += (px - flipper.x) * 2.4
              break
            }
          }
        }
        if (ball.y > H + 20) {
          lives -= 1
          if (lives <= 0) {
            dead = true
            api.lose('drained')
          } else {
            ball.x = W / 2
            ball.y = 96
            ball.vx = 110
            ball.vy = 40
            flippers[0].lift = 0
            flippers[1].lift = 0
            api.setStatus('score ' + score + ' · life ' + lives)
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        api.rect(left, 52, right - left, H - 52, '#111820')
        g.strokeStyle = api.colors.panel
        g.lineWidth = 4
        g.strokeRect(left, 52, right - left, H - 52)
        for (const bumper of bumpers) {
          api.circle(bumper.x, bumper.y, bumper.r, api.colors.accent)
          api.circle(bumper.x, bumper.y, bumper.r - 6, '#0e141b')
        }
        for (const flipper of flippers) {
          const tipX = flipper.x + Math.cos(flipper.angle) * ARM
          const tipY = flipper.y - Math.sin(flipper.angle) * ARM + (flipper.lift ? -18 : 0)
          g.strokeStyle = api.colors.accent2
          g.lineWidth = 7
          g.beginPath()
          g.moveTo(flipper.x, flipper.y)
          g.lineTo(tipX, tipY)
          g.stroke()
        }
        api.circle(ball.x, ball.y, ball.r, api.colors.fg)
        api.text('LEFT / RIGHT flippers · score ' + score + ' · life ' + lives, 12, 26, { size: 12, color: api.colors.dim })
      },
    }
  },
})
