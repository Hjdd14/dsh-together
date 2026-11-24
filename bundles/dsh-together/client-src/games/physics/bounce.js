defineGame({
  id: 'bounce',
  create(api) {
    const W = api.w
    const H = api.h
    const paddle = { x: W / 2, w: 104, h: 12 }
    const ball = { x: W / 2, y: 90, vx: 130, vy: 205, r: 9 }
    let hits = 0
    let lives = 3
    let dead = false

    const resetBall = () => {
      ball.x = W / 2
      ball.y = 90
      ball.vx = 130
      ball.vy = 205
    }

    const movePaddle = (x) => {
      paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, x))
    }

    api.onPointer((event) => {
      if (event.type !== 'up') movePaddle(event.x)
    })
    api.onKey((key, down) => {
      if (!down) return
      if (key === 'left') movePaddle(paddle.x - 46)
      if (key === 'right') movePaddle(paddle.x + 46)
    })

    return {
      update(dt) {
        if (dead) return
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) }
        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) }
        if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy) }
        const top = ball.y + ball.r
        if (top >= H - 44 && top <= H - 20 && Math.abs(ball.x - paddle.x) < paddle.w / 2 + ball.r) {
          ball.y = H - 44 - ball.r
          ball.vy = -Math.abs(ball.vy) * 1.02
          const offset = (ball.x - paddle.x) / (paddle.w / 2)
          ball.vx = 190 * offset + (api.rng() - 0.5) * 40
          hits += 1
          api.progress(1)
          api.setStatus('hits ' + hits)
        }
        if (ball.y > H) {
          lives -= 1
          if (lives <= 0) {
            dead = true
            api.lose('dropped')
          } else {
            api.setStatus('hits ' + hits + ' · life ' + lives)
            resetBall()
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        for (let line = 1; line < 6; line += 1) api.rect(0, (H / 6) * line, W, 1, '#1b2430')
        api.rect(paddle.x - paddle.w / 2, H - 34, paddle.w, 12, api.colors.accent)
        api.circle(ball.x, ball.y, ball.r, api.colors.accent2)
        api.text('MOVE the paddle with the mouse or arrows', 12, 18, { size: 12, color: api.colors.dim })
        api.text('hits ' + hits + ' · life ' + lives, W - 12, 18, { size: 12, color: api.colors.dim, align: 'right' })
      },
    }
  },
})
