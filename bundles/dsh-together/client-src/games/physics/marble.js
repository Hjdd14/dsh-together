defineGame({
  id: 'marble',
  create(api) {
    const W = api.w
    const H = api.h
    const walls = [
      { x: 0, y: 40, w: W, h: 10 },
      { x: 0, y: H - 10, w: W, h: 10 },
      { x: 0, y: 40, w: 10, h: H - 50 },
      { x: W - 10, y: 40, w: 10, h: H - 50 },
      { x: 140, y: 40, w: 14, h: 170 },
      { x: 140, y: 250, w: 200, h: 14 },
      { x: 300, y: 130, w: 14, h: 134 },
      { x: 388, y: 40, w: 14, h: 180 },
    ]
    const goal = { x: 420, y: 300, r: 16 }
    const ball = { x: 60, y: 90, vx: 0, vy: 0, r: 9 }
    let tilt = { x: 0, y: 0 }
    let pointerTilt = false
    let done = false

    const update_tilt = (event) => {
      const dx = event.x - W / 2
      const dy = event.y - H / 2
      const length = Math.hypot(dx, dy) || 1
      const strength = Math.min(1, length / 180)
      tilt = { x: (dx / length) * strength, y: (dy / length) * strength }
    }

    api.onPointer((event) => {
      if (event.type === 'down') {
        pointerTilt = true
        update_tilt(event)
      } else if (event.type === 'move' && pointerTilt) {
        update_tilt(event)
      } else if (event.type === 'up') {
        pointerTilt = false
        tilt = { x: 0, y: 0 }
      }
    })
    api.onKey((key, down) => {
      if (!down) return
      if (key === 'left' || key === 'right' || key === 'up' || key === 'down') pointerTilt = false
    })

    const circleHitsRect = (cx, cy, cr, rect) => {
      const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w))
      const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h))
      return Math.hypot(cx - nearestX, cy - nearestY) < cr
    }

    return {
      update(dt) {
        if (done) return
        if (!pointerTilt) {
          let tx = 0
          let ty = 0
          if (api.down('left')) tx -= 1
          if (api.down('right')) tx += 1
          if (api.down('up')) ty -= 1
          if (api.down('down')) ty += 1
          tilt = { x: tx, y: ty }
        }
        ball.vx += tilt.x * 420 * dt
        ball.vy += tilt.y * 420 * dt
        const drag = Math.pow(0.985, dt * 60)
        ball.vx *= drag
        ball.vy *= drag
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        for (const rect of walls) {
          if (!circleHitsRect(ball.x, ball.y, ball.r, rect)) continue
          const nearestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w))
          const nearestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h))
          const dx = ball.x - nearestX
          const dy = ball.y - nearestY
          if (Math.abs(dx) > Math.abs(dy)) {
            ball.vx = -ball.vx * 0.6
            ball.x = nearestX + Math.sign(dx || 1) * (ball.r + 1)
          } else {
            ball.vy = -ball.vy * 0.6
            ball.y = nearestY + Math.sign(dy || 1) * (ball.r + 1)
          }
        }
        if (Math.hypot(ball.x - goal.x, ball.y - goal.y) < goal.r - 2) {
          done = true
          api.progress(1)
          api.win()
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        for (const rect of walls) api.rect(rect.x, rect.y, rect.w, rect.h, '#243040')
        api.circle(goal.x, goal.y, goal.r, api.colors.good)
        api.circle(goal.x, goal.y, goal.r - 6, '#0f161d')
        api.circle(ball.x, ball.y, ball.r, api.colors.accent2)
        api.text('DRAG to tilt the table (release to level)', 12, 22, { size: 12, color: api.colors.dim })
      },
    }
  },
})
