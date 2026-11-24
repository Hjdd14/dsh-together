defineGame({
  id: 'stack',
  create(api) {
    const W = api.w
    const H = api.h
    const blocks = []
    const particles = []
    const cursor = { x: W / 2, dir: 1, speed: 150, w: 110 }
    let stacked = 0
    let over = false
    let shake = 0
    let squash = 0
    let flash = 0
    let perfects = 0

    const burst = (x, y, color, amount) => {
      for (let index = 0; index < amount; index += 1) {
        particles.push({
          x: x + api.rnd(-20, 20),
          y,
          vx: api.rnd(-110, 110),
          vy: api.rnd(-170, -30),
          life: api.rnd(0.3, 0.6),
          max: 0.6,
          color,
        })
      }
      while (particles.length > 140) particles.shift()
    }

    function drop() {
      if (over) return
      const top = blocks[blocks.length - 1]
      const offset = top ? Math.abs(cursor.x - top.x) : 0
      if (top && offset > top.w * 0.7) {
        over = true
        burst(cursor.x, H - 46 - blocks.length * 26, api.colors.warn, 16)
        shake = 6
        api.lose('missed')
        return
      }
      const perfect = top !== undefined && offset < 7
      blocks.push({ x: cursor.x, w: cursor.w })
      stacked += 1
      if (perfect) perfects += 1
      squash = 1
      flash = perfect ? 1 : 0.45
      shake = Math.min(3, shake + (perfect ? 2.2 : 0.8))
      burst(cursor.x, H - 46 - blocks.length * 26, perfect ? api.colors.good : api.colors.accent, perfect ? 10 : 5)
      api.progress(1)
      api.setStatus(perfect ? 'PERFECT' : 'layer ' + stacked)
      cursor.w = Math.max(46, cursor.w - 5)
      cursor.speed = Math.min(340, cursor.speed + 14)
      if (stacked >= 20) api.win()
    }

    api.onKey((key, down) => {
      if (!down) return
      if (key === 'space' || key === 'enter' || key === 'up') drop()
    })
    api.onPointer((event) => {
      if (event.type === 'down') drop()
    })

    return {
      update(dt) {
        squash = Math.max(0, squash - dt * 6)
        flash = Math.max(0, flash - dt * 3)
        shake = Math.max(0, shake - dt * 12)
        for (let index = particles.length - 1; index >= 0; index -= 1) {
          const particle = particles[index]
          particle.vy += 620 * dt
          particle.x += particle.vx * dt
          particle.y += particle.vy * dt
          particle.life -= dt
          if (particle.life <= 0) particles.splice(index, 1)
        }
        if (over) return
        cursor.x += cursor.dir * cursor.speed * dt
        if (cursor.x < 60) { cursor.x = 60; cursor.dir = 1 }
        if (cursor.x > W - 60) { cursor.x = W - 60; cursor.dir = -1 }
      },
      draw(g) {
        api.clear(api.colors.bg)
        g.save()
        if (shake > 0.05) g.translate(Math.sin(api.now() / 24) * shake, 0)
        api.rect(0, H - 22, W, 22, api.colors.panel)
        const baseSquash = 1 - squash * 0.14
        for (let index = 0; index < blocks.length; index += 1) {
          const block = blocks[index]
          const top = index === blocks.length - 1
          const scale = top ? baseSquash : 1
          const height = 22 * scale
          api.rect(
            block.x - block.w / 2,
            H - 46 - index * 26 + (22 - height),
            block.w,
            height,
            index % 2 === 0 ? api.colors.accent : api.colors.accent2,
          )
          if (top && flash > 0.02) {
            api.rect(block.x - block.w / 2, H - 46 - index * 26 + (22 - height), block.w, height, `rgba(255,255,255,${0.35 * flash})`)
          }
        }
        const y = H - 46 - blocks.length * 26
        api.rect(cursor.x - cursor.w / 2, y, cursor.w, 22, api.colors.fg)
        for (const particle of particles) {
          const alpha = Math.max(0, particle.life / particle.max)
          api.circle(particle.x, particle.y, 2.4 * alpha + 0.5, particle.color)
        }
        g.restore()
        api.text('SPACE / CLICK to drop', 12, 18, { size: 12, color: api.colors.dim })
        if (perfects > 0) {
          api.text(`PERFECT x${perfects}`, W - 16, 18, { size: 12, color: api.colors.good, align: 'right' })
        }
        if (squash > 0.5 && stacked > 0) {
          api.text('NICE', W / 2, 40, { size: 14, color: api.colors.accent2, align: 'center', weight: '600' })
        }
      },
    }
  },
})
