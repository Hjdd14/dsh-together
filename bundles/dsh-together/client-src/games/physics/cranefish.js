defineGame({
  id: 'cranefish',
  create(api) {
    const W = api.w
    const H = api.h
    const rail = { y: 96 }
    const claw = { x: W / 2, y: rail.y, phase: 'idle', speed: 0, holding: null }
    const prizes = [
      { x: 120, y: H - 70, r: 20, color: '#ffcf5c', alive: true, sway: api.rnd(0, 6.28) },
      { x: 240, y: H - 62, r: 22, color: '#8bdc7a', alive: true, sway: api.rnd(0, 6.28) },
      { x: 356, y: H - 74, r: 18, color: '#ff9a6b', alive: true, sway: api.rnd(0, 6.28) },
    ]
    const sparks = []
    let grabbed = 0
    let shake = 0
    let flash = 0

    const pop = (x, y, color) => {
      for (let index = 0; index < 10; index += 1) {
        sparks.push({ x, y, vx: api.rnd(-140, 140), vy: api.rnd(-180, -20), life: api.rnd(0.25, 0.55), max: 0.55, color })
      }
      while (sparks.length > 100) sparks.shift()
    }

    const drop = () => {
      if (claw.phase !== 'idle') return
      claw.phase = 'down'
      claw.speed = 300
    }

    api.onKey((key, down) => {
      if (!down) return
      if (key === 'left') claw.x = Math.max(60, claw.x - 26)
      if (key === 'right') claw.x = Math.min(W - 60, claw.x + 26)
      if (key === 'space' || key === 'enter') drop()
    })
    api.onPointer((event) => {
      if (event.type === 'down') drop()
      if (event.type === 'move') claw.x = Math.max(60, Math.min(W - 60, event.x))
    })

    return {
      update(dt) {
        shake = Math.max(0, shake - dt * 12)
        flash = Math.max(0, flash - dt * 3)
        for (let index = sparks.length - 1; index >= 0; index -= 1) {
          const mote = sparks[index]
          mote.vy += 520 * dt
          mote.x += mote.vx * dt
          mote.y += mote.vy * dt
          mote.life -= dt
          if (mote.life <= 0) sparks.splice(index, 1)
        }
        for (const prize of prizes) prize.sway += dt * 1.6

        if (claw.phase === 'down') {
          claw.y += claw.speed * dt
          const target = prizes.find((prize) => prize.alive && Math.abs(prize.x - claw.x) < prize.r + 12 && Math.abs(prize.y - claw.y) < 26)
          if (target) {
            claw.holding = target.id ?? target
            target.alive = false
            flash = 1
            claw.phase = 'up'
          } else if (claw.y > H - 40) {
            claw.phase = 'up'
          }
        } else if (claw.phase === 'up') {
          claw.y -= claw.speed * 0.85 * dt
          if (claw.holding) claw.holding.y = claw.y + 18
          if (claw.y <= rail.y) {
            claw.y = rail.y
            claw.phase = 'idle'
            if (claw.holding) {
              grabbed += 1
              api.progress(1)
              api.setStatus(`prizes ${grabbed}`)
              shake = 3
              pop(claw.x, rail.y + 20, claw.holding.color ?? api.colors.accent2)
              claw.holding = null
            }
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        g.save()
        if (shake > 0.05) g.translate(Math.sin(api.now() / 20) * shake, 0)
        api.rect(0, rail.y - 12, W, 12, api.colors.panel)
        api.rect(0, H - 26, W, 26, api.colors.panel)
        for (const prize of prizes) {
          if (!prize.alive) continue
          const offset = Math.sin(prize.sway) * 3
          api.circle(prize.x, prize.y + offset, prize.r, prize.color)
          api.circle(prize.x - prize.r * 0.3, prize.y + offset - prize.r * 0.3, prize.r * 0.28, 'rgba(255,255,255,.55)')
        }
        // crane arm
        api.rect(claw.x - 4, rail.y - 6, 8, 10, api.colors.fg)
        g.strokeStyle = api.colors.dim
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(claw.x, rail.y)
        g.lineTo(claw.x, claw.y)
        g.stroke()
        api.rect(claw.x - 16, claw.y, 6, 14, api.colors.fg)
        api.rect(claw.x + 10, claw.y, 6, 14, api.colors.fg)
        if (claw.holding) {
          api.circle(claw.x, claw.y + 18, claw.holding.r ?? 14, flash > 0.4 ? '#ffffff' : (claw.holding.color ?? api.colors.accent2))
        }
        for (const mote of sparks) {
          const alpha = Math.max(0, mote.life / mote.max)
          api.circle(mote.x, mote.y, 2.4 * alpha + 0.6, mote.color)
        }
        g.restore()
        api.text('MOVE the claw, CLICK or SPACE to drop it', 12, 26, { size: 12, color: api.colors.dim })
        api.text(`prizes ${grabbed}`, W - 16, 26, { size: 12, color: api.colors.accent2, align: 'right' })
      },
    }
  },
})
