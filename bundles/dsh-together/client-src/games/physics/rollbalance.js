defineGame({
  id: 'rollbalance',
  create(api) {
    const W = api.w
    const H = api.h
    const beam = { x: 40, y: H - 96, w: W - 80, h: 12 }
    const ball = { x: W / 2, vx: 0, vy: 0, r: 12, onBeam: true, spin: 0 }
    const trail = []
    let wind = 0
    let windTimer = 0
    let elapsed = 0
    let dead = false
    let shake = 0

    api.onKey((key, down) => {
      if (!down) return
      if (key === 'left') ball.vx -= 165
      if (key === 'right') ball.vx += 165
    })
    api.onPointer((event) => {
      if (event.type === 'down' || event.type === 'move') {
        ball.vx += Math.max(-90, Math.min(90, (event.x - ball.x) * 0.35))
      }
    })

    return {
      update(dt) {
        if (dead) return
        shake = Math.max(0, shake - dt * 10)
        elapsed += dt
        windTimer -= dt
        if (windTimer <= 0) {
          windTimer = 0.9
          // A symmetric noise wind cancels itself out, so standing still was safe.
          wind = 64 + Math.sin(elapsed * 0.9) * 50 + api.rnd(-14, 14)
        }
        ball.vx += wind * dt * 3
        ball.vx *= Math.pow(0.93, dt * 60)
        ball.x += ball.vx * dt
        ball.spin += ball.vx * dt * 0.06
        trail.push({ x: ball.x, life: 0.3 })
        while (trail.length > 24) trail.shift()
        for (let index = trail.length - 1; index >= 0; index -= 1) {
          trail[index].life -= dt
          if (trail[index].life <= 0) trail.splice(index, 1)
        }
        const half = beam.w / 2
        const center = beam.x + half
        if (ball.x < center - half || ball.x > center + half) {
          dead = true
          shake = 5
          api.lose('rolled off')
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        g.save()
        if (shake > 0.05) g.translate(Math.sin(api.now() / 18) * shake, 0)
        api.rect(0, H - 60, W, H - beam.y, '#0f151d')
        api.rect(beam.x, beam.y, beam.w, beam.h, api.colors.accent)
        api.rect(beam.x - 10, beam.y, 10, 42, api.colors.panel)
        api.rect(beam.x + beam.w, beam.y, 10, 42, api.colors.panel)
        for (const mote of trail) {
          const alpha = Math.max(0, mote.life / 0.3)
          api.circle(mote.x, beam.y - ball.r, 9 * alpha + 3, `rgba(255,207,92,${0.18 * alpha})`)
        }
        g.save()
        g.translate(ball.x, beam.y - ball.r)
        g.rotate(ball.spin)
        api.circle(0, 0, ball.r, api.colors.accent2)
        g.strokeStyle = 'rgba(0,0,0,.35)'
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(-ball.r * 0.7, 0)
        g.lineTo(ball.r * 0.7, 0)
        g.stroke()
        g.restore()
        // wind indicator
        const windRatio = wind / 95
        api.rect(W / 2 - 60, 44, 120, 6, '#1b2430')
        api.rect(W / 2 - 60 + (windRatio < 0 ? 60 : 60), 44, Math.abs(windRatio) * 60, 6, windRatio < 0 ? api.colors.accent : api.colors.warn)
        g.restore()
        api.text('hold LEFT / RIGHT to stay on the rail', 12, 26, { size: 12, color: api.colors.dim })
        const left = Math.max(0, Math.ceil(api.attemptSeconds - api.now() / 1000))
        api.text(`balance · ${left}s`, W - 16, 26, { size: 12, color: api.colors.accent2, align: 'right' })
      },
    }
  },
})
