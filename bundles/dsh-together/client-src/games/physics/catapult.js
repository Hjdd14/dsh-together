defineGame({
  id: 'catapult',
  create(api) {
    const W = api.w
    const H = api.h
    const originX = 52
    const originY = H - 52
    const targetX = 372
    const targetW = 76
    const shots = []
    let angle = 0.9
    let direction = 1
    let cooldown = 0
    let hits = 0

    function launch() {
      if (cooldown > 0) return
      const power = 430
      shots.push({
        x: originX + 26,
        y: originY - 18,
        vx: Math.cos(angle) * power,
        vy: -Math.sin(angle) * power,
        alive: true,
      })
      cooldown = 0.45
    }

    api.onKey((key, down) => {
      if (!down) return
      if (key === 'space' || key === 'up' || key === 'enter') launch()
    })
    api.onPointer((event) => {
      if (event.type === 'down') launch()
    })

    return {
      update(dt) {
        cooldown = Math.max(0, cooldown - dt)
        angle += direction * 0.85 * dt
        if (angle > 1.35) { angle = 1.35; direction = -1 }
        if (angle < 0.35) { angle = 0.35; direction = 1 }
        for (let index = shots.length - 1; index >= 0; index -= 1) {
          const shot = shots[index]
          if (!shot.alive) { shots.splice(index, 1); continue }
          shot.vy += 520 * dt
          shot.x += shot.vx * dt
          shot.y += shot.vy * dt
          if (shot.x > W + 60 || (shot.y > H - 20 && shot.vy > 0)) { shots.splice(index, 1); continue }
          if (shot.vy > 0 && Math.abs(shot.x - targetX) < targetW / 2 && shot.y > H - 96) {
            shots.splice(index, 1)
            hits += 1
            api.progress(1)
            api.setStatus('hits ' + hits)
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        api.rect(0, H - 18, W, 18, api.colors.panel)
        // target tower
        api.rect(targetX - targetW / 2, H - 92, targetW, 74, api.colors.panel)
        api.rect(targetX - targetW / 2, H - 92, targetW, 6, api.colors.warn)
        // catapult arm
        api.circle(originX, originY - 18, 13, api.colors.accent)
        const armX = originX + Math.cos(angle) * 34
        const armY = originY - 18 - Math.sin(angle) * 34
        g.strokeStyle = api.colors.fg
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(originX, originY - 18)
        g.lineTo(armX, armY)
        g.stroke()
        for (const shot of shots) if (shot.alive) api.circle(shot.x, shot.y, 5, api.colors.accent2)
        api.text('SPACE to launch · angle sweeps by itself', 12, 18, { size: 12, color: api.colors.dim })
      },
    }
  },
})
