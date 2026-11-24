defineGame({
  id: 'angrylite',
  create(api) {
    const W = api.w
    const H = api.h
    const anchor = { x: 74, y: H - 96 }
    const targets = [
      { x: 352, y: H - 76, w: 26, h: 34, alive: true },
      { x: 388, y: H - 40, w: 26, h: 34, alive: true },
      { x: 412, y: H - 76, w: 22, h: 26, alive: true },
    ]
    const balls = []
    let aiming = false
    let pulls = null
    let hits = 0

    const toVec = (event) => ({
      dx: Math.max(-96, Math.min(0, event.x - anchor.x)),
      dy: Math.max(-96, Math.min(60, event.y - anchor.y)),
    })

    api.onPointer((event) => {
      if (event.type === 'down') {
        aiming = true
        pulls = toVec(event)
      } else if (event.type === 'move' && aiming) {
        pulls = toVec(event)
      } else if (event.type === 'up' && aiming) {
        aiming = false
        if (pulls) {
          balls.push({
            x: anchor.x + pulls.dx * 0.7,
            y: anchor.y + pulls.dy * 0.7,
            vx: -pulls.dx * 5.2,
            vy: -pulls.dy * 5.2,
            alive: true,
          })
        }
        pulls = null
      }
    })
    api.onKey((key, down) => {
      if (!down) return
      if (key === 'space') {
        balls.push({ x: anchor.x - 24, y: anchor.y - 20, vx: 430, vy: -120, alive: true })
      }
    })

    return {
      update(dt) {
        for (const ball of balls) {
          if (!ball.alive) continue
          ball.vy += 380 * dt
          ball.x += ball.vx * dt
          ball.y += ball.vy * dt
          if (ball.x > W + 40 || ball.y > H + 40 || ball.x < -40) { ball.alive = false; continue }
          for (const target of targets) {
            if (!target.alive) continue
            const inside = ball.x > target.x - target.w / 2 && ball.x < target.x + target.w / 2 &&
              ball.y > target.y - target.h && ball.y < target.y + 4
            if (inside) {
              target.alive = false
              ball.alive = false
              hits += 1
              api.progress(1)
              api.setStatus('targets ' + hits)
            }
          }
        }
        while (balls.length > 12) balls.shift()
      },
      draw(g) {
        api.clear(api.colors.bg)
        api.rect(0, H - 16, W, 16, api.colors.panel)
        for (const target of targets) {
          if (!target.alive) continue
          api.rect(target.x - target.w / 2, target.y - target.h, target.w, target.h, api.colors.warn)
          api.rect(target.x - target.w / 2, target.y - target.h + 8, target.w, 3, '#00000055')
        }
        // slingshot
        api.rect(anchor.x - 5, anchor.y - 4, 10, 40, api.colors.fg)
        api.rect(anchor.x - 16, anchor.y - 22, 4, 22, api.colors.fg)
        api.rect(anchor.x + 12, anchor.y - 22, 4, 22, api.colors.fg)
        for (const ball of balls) if (ball.alive) api.circle(ball.x, ball.y, 7, api.colors.accent2)
        if (pulls && aiming) {
          g.strokeStyle = api.colors.accent
          g.lineWidth = 2
          g.beginPath()
          g.moveTo(anchor.x, anchor.y - 18)
          g.lineTo(anchor.x + pulls.dx, anchor.y + pulls.dy - 18)
          g.stroke()
          api.circle(anchor.x + pulls.dx, anchor.y + pulls.dy - 18, 7, api.colors.accent2)
        }
        api.text('DRAG back from the slingshot, release to fire', 12, 18, { size: 12, color: api.colors.dim })
      },
    }
  },
})
