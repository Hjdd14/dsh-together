defineGame({
  id: 'beam',
  create(api) {
    const W = api.w
    const H = api.h
    const beam = { x: 60, y: H - 120, w: W - 120 }
    const player = { x: W / 2, vx: 0, y: beam.y - 12 }
    let wind = 0
    let windTimer = 0
    let elapsed = 0
    let dead = false

    api.onKey((key, down) => {
      if (!down) return
      if (key === 'left') player.vx -= 120
      if (key === 'right') player.vx += 120
    })

    return {
      update(dt) {
        if (dead) return
        elapsed += dt
        windTimer -= dt
        if (windTimer <= 0) {
          windTimer = 1.1
          // A symmetric noise wind cancels itself out, so standing still was safe.
          wind = 58 + Math.sin(elapsed * 0.8) * 46 + api.rnd(-12, 12)
        }
        player.vx += wind * dt * 2.2
        player.vx *= Math.pow(0.9, dt * 60)
        player.x += player.vx * dt
        const half = beam.w / 2
        const center = beam.x + half
        if (player.x < center - half || player.x > center + half) {
          dead = true
          api.lose('fell off')
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        api.rect(0, beam.y, W, H - beam.y, '#101820')
        api.rect(beam.x, beam.y, beam.w, 12, api.colors.accent)
        api.rect(beam.x - 8, beam.y, 8, 40, api.colors.panel)
        api.rect(beam.x + beam.w, beam.y, 8, 40, api.colors.panel)
        api.circle(player.x, player.y, 12, api.colors.accent2)
        const drift = wind > 0 ? '→ breeze' : '← breeze'
        api.text(`hold LEFT / RIGHT · ${drift}`, 12, 26, { size: 12, color: api.colors.dim })
        const held = Math.floor(api.now() / 1000)
        api.text(`stay on · ${held}s`, 12, 48, { size: 12, color: api.colors.dim })
      },
    }
  },
})
