defineGame({
  id: 'slingbreak',
  create(api) {
    const W = api.w
    const H = api.h
    const anchor = { x: 70, y: H - 86 }
    const blocks = []
    const balls = []
    const dust = []
    let aiming = false
    let pull = null
    let toppled = 0
    let shake = 0

    // Three short layers of a tower: knocking a layer over counts once.
    for (let layer = 0; layer < 3; layer += 1) {
      for (let column = 0; column < 2; column += 1) {
        blocks.push({
          x: 330 + column * 34,
          y: H - 46 - layer * 40,
          w: 30,
          h: 36,
          layer,
          alive: true,
          fall: 0,
          counted: false,
        })
      }
    }

    const burst = (x, y, amount) => {
      for (let index = 0; index < amount; index += 1) {
        dust.push({ x, y, vx: api.rnd(-140, 140), vy: api.rnd(-190, -30), life: api.rnd(0.3, 0.6), max: 0.6 })
      }
      while (dust.length > 120) dust.shift()
    }

    api.onPointer((event) => {
      if (event.type === 'down') {
        aiming = true
        pull = { dx: Math.max(-110, Math.min(10, event.x - anchor.x)), dy: Math.max(-90, Math.min(30, event.y - anchor.y)) }
      } else if (event.type === 'move' && aiming) {
        pull = { dx: Math.max(-110, Math.min(10, event.x - anchor.x)), dy: Math.max(-90, Math.min(30, event.y - anchor.y)) }
      } else if (event.type === 'up' && aiming) {
        aiming = false
        if (pull) {
          balls.push({ x: anchor.x + pull.dx * 0.6, y: anchor.y + pull.dy * 0.6, vx: -pull.dx * 6, vy: -pull.dy * 6, alive: true })
        }
        pull = null
      }
    })
    api.onKey((key, down) => {
      if (!down) return
      if (key === 'space') balls.push({ x: anchor.x - 20, y: anchor.y - 24, vx: 520, vy: -80, alive: true })
    })

    return {
      update(dt) {
        shake = Math.max(0, shake - dt * 12)
        for (let index = dust.length - 1; index >= 0; index -= 1) {
          const mote = dust[index]
          mote.vy += 620 * dt
          mote.x += mote.vx * dt
          mote.y += mote.vy * dt
          mote.life -= dt
          if (mote.life <= 0) dust.splice(index, 1)
        }
        for (const ball of balls) {
          if (!ball.alive) continue
          ball.vy += 640 * dt
          ball.x += ball.vx * dt
          ball.y += ball.vy * dt
          if (ball.x > W + 40 || ball.y > H + 40 || ball.x < -40) { ball.alive = false; continue }
          for (const block of blocks) {
            if (!block.alive) continue
            if (ball.x > block.x - block.w / 2 - 8 && ball.x < block.x + block.w / 2 + 8 &&
              ball.y > block.y - block.h && ball.y < block.y + 6) {
              block.alive = false
              ball.alive = false
              shake = 4
              burst(block.x, block.y - block.h / 2, 8)
              break
            }
          }
        }
        const knocked = new Set(blocks.filter((block) => !block.alive).map((block) => block.layer))
        for (const layer of knocked) {
          const entry = blocks.find((block) => block.layer === layer && !block.counted)
          if (entry) {
            for (const block of blocks) if (block.layer === layer) block.counted = true
            toppled += 1
            api.progress(1)
            api.setStatus(`layers ${toppled}`)
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        g.save()
        if (shake > 0.05) g.translate(Math.sin(api.now() / 22) * shake, 0)
        api.rect(0, H - 26, W, 26, api.colors.panel)
        for (const block of blocks) {
          if (!block.alive) {
            api.rect(block.x - block.w / 2, H - 40, block.w, 12, 'rgba(120,140,165,.28)')
            continue
          }
          api.rect(block.x - block.w / 2, block.y - block.h, block.w, block.h, api.colors.warn)
          api.rect(block.x - block.w / 2, block.y - block.h, block.w, 4, 'rgba(255,255,255,.28)')
        }
        for (const ball of balls) if (ball.alive) api.circle(ball.x, ball.y, 8, api.colors.accent2)
        for (const mote of dust) {
          const alpha = Math.max(0, mote.life / mote.max)
          api.circle(mote.x, mote.y, 2.4 * alpha + 0.6, `rgba(255,215,140,${alpha})`)
        }
        api.rect(anchor.x - 5, anchor.y, 10, 42, api.colors.fg)
        api.rect(anchor.x - 16, anchor.y - 24, 4, 24, api.colors.fg)
        api.rect(anchor.x + 12, anchor.y - 24, 4, 24, api.colors.fg)
        if (pull && aiming) {
          api.circle(anchor.x + pull.dx, anchor.y + pull.dy - 20, 8, api.colors.accent2)
          g.strokeStyle = api.colors.accent
          g.lineWidth = 2
          g.beginPath()
          g.moveTo(anchor.x, anchor.y - 22)
          g.lineTo(anchor.x + pull.dx, anchor.y + pull.dy - 22)
          g.stroke()
        }
        g.restore()
        api.text('DRAG back from the slingshot and release', 12, 26, { size: 12, color: api.colors.dim })
      },
    }
  },
})
