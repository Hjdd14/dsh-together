defineGame({
  id: 'flickball',
  create(api) {
    const W = api.w
    const H = api.h
    const ball = { x: W / 2, y: H - 120, vx: 0, vy: 0, r: 11, live: false }
    const bumpers = [
      { x: 150, y: 150, r: 22, glow: 0 },
      { x: 330, y: 150, r: 22, glow: 0 },
      { x: 240, y: 240, r: 26, glow: 0 },
      { x: 100, y: 250, r: 18, glow: 0 },
    ]
    const trail = []
    const sparks = []
    let aim = null
    let score = 0
    let shake = 0

    const pop = (x, y, color, amount) => {
      for (let index = 0; index < amount; index += 1) {
        sparks.push({ x, y, vx: api.rnd(-150, 150), vy: api.rnd(-170, -20), life: api.rnd(0.25, 0.5), max: 0.5, color })
      }
      while (sparks.length > 120) sparks.shift()
    }

    api.onPointer((event) => {
      if (event.type === 'down' && !ball.live) aim = { x: event.x, y: event.y }
      if (event.type === 'move' && aim) aim = { x: event.x, y: event.y }
      if (event.type === 'up' && aim && !ball.live) {
        const dx = ball.x - aim.x
        const dy = ball.y - aim.y
        const length = Math.max(1, Math.hypot(dx, dy))
        ball.vx = (dx / length) * 430
        ball.vy = (dy / length) * 430
        ball.live = true
        aim = null
      }
    })

    return {
      update(dt) {
        shake = Math.max(0, shake - dt * 12)
        for (const bumper of bumpers) bumper.glow = Math.max(0, bumper.glow - dt * 2.6)
        for (let index = sparks.length - 1; index >= 0; index -= 1) {
          const mote = sparks[index]
          mote.vy += 480 * dt
          mote.x += mote.vx * dt
          mote.y += mote.vy * dt
          mote.life -= dt
          if (mote.life <= 0) sparks.splice(index, 1)
        }
        for (let index = trail.length - 1; index >= 0; index -= 1) {
          trail[index].life -= dt
          if (trail[index].life <= 0) trail.splice(index, 1)
        }
        if (!ball.live) return
        trail.push({ x: ball.x, y: ball.y, life: 0.32 })
        while (trail.length > 36) trail.shift()
        ball.vy += 420 * dt
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        const drag = Math.pow(0.992, dt * 60)
        ball.vx *= drag
        ball.vy *= drag
        if (ball.x < 24 + ball.r) { ball.x = 24 + ball.r; ball.vx = Math.abs(ball.vx) * 0.9 }
        if (ball.x > W - 24 - ball.r) { ball.x = W - 24 - ball.r; ball.vx = -Math.abs(ball.vx) * 0.9 }
        if (ball.y < 70 + ball.r) { ball.y = 70 + ball.r; ball.vy = Math.abs(ball.vy) * 0.9 }
        if (ball.y > H - 30) {
          ball.live = false
          ball.x = W / 2
          ball.y = H - 120
          ball.vx = 0
          ball.vy = 0
          trail.length = 0
          if (score >= 300) api.win()
        }
        for (const bumper of bumpers) {
          const dx = ball.x - bumper.x
          const dy = ball.y - bumper.y
          const distance = Math.hypot(dx, dy) || 1
          if (distance < bumper.r + ball.r) {
            ball.x = bumper.x + (dx / distance) * (bumper.r + ball.r + 1)
            ball.y = bumper.y + (dy / distance) * (bumper.r + ball.r + 1)
            ball.vx = (dx / distance) * 300
            ball.vy = (dy / distance) * 300 - 60
            bumper.glow = 1
            score += 50
            api.score(50)
            api.setStatus(`score ${score}`)
            shake = Math.min(4, shake + 1)
            pop(bumper.x, bumper.y, api.colors.accent2, 9)
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        g.save()
        if (shake > 0.05) g.translate(Math.sin(api.now() / 23) * shake, Math.cos(api.now() / 19) * shake * 0.5)
        api.rect(24, 70, W - 48, H - 100, '#101923')
        g.strokeStyle = api.colors.panel
        g.lineWidth = 3
        g.strokeRect(24, 70, W - 48, H - 100)
        for (const bumper of bumpers) {
          api.circle(bumper.x, bumper.y, bumper.r, api.colors.accent)
          api.circle(bumper.x, bumper.y, bumper.r - 7, '#0e141b')
          if (bumper.glow > 0.02) api.circle(bumper.x, bumper.y, bumper.r + 6 * bumper.glow, `rgba(255,255,255,${0.22 * bumper.glow})`)
        }
        for (const mote of trail) {
          const alpha = Math.max(0, mote.life / 0.32)
          api.circle(mote.x, mote.y, 7 * alpha + 2, `rgba(255,207,92,${0.2 * alpha})`)
        }
        if (ball.live) {
          api.circle(ball.x, ball.y, ball.r, api.colors.accent2)
          api.circle(ball.x - 3, ball.y - 3, 3.2, 'rgba(255,255,255,.6)')
        }
        for (const mote of sparks) {
          const alpha = Math.max(0, mote.life / mote.max)
          api.circle(mote.x, mote.y, 2.4 * alpha + 0.6, mote.color)
        }
        if (aim && !ball.live) {
          g.strokeStyle = api.colors.accent2
          g.lineWidth = 2
          g.setLineDash([5, 5])
          g.beginPath()
          g.moveTo(ball.x, ball.y)
          g.lineTo(ball.x + (ball.x - aim.x), ball.y + (ball.y - aim.y))
          g.stroke()
          g.setLineDash([])
        }
        g.restore()
        api.text('DRAG back from the ball and release to flick it', 12, 26, { size: 12, color: api.colors.dim })
        api.text(`${score} / 300`, W - 16, 26, { size: 13, color: api.colors.accent2, align: 'right' })
      },
    }
  },
})
