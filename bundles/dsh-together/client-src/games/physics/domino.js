defineGame({
  id: 'domino',
  create(api) {
    const W = api.w
    const H = api.h
    const count = 14
    const dominoes = []
    const particles = []
    for (let index = 0; index < count; index += 1) {
      dominoes.push({
        x: 64 + index * ((W - 128) / (count - 1)),
        fall: 0,
        falling: false,
        done: false,
        flash: 0,
      })
    }
    let toppled = 0
    let started = false
    let shake = 0
    let combo = 0
    let comboTimer = 0

    const push = (index) => {
      const domino = dominoes[index]
      if (!domino || domino.falling) return
      domino.falling = true
      started = true
    }

    api.onPointer((event) => {
      if (event.type !== 'down') return
      let nearest = 0
      let best = Infinity
      for (let index = 0; index < dominoes.length; index += 1) {
        const distance = Math.abs(dominoes[index].x - event.x)
        if (distance < best) { best = distance; nearest = index }
      }
      push(nearest)
    })
    api.onKey((key, down) => {
      if (down && (key === 'space' || key === 'enter' || key === 'right')) push(0)
    })

    const burst = (x, amount) => {
      for (let index = 0; index < amount; index += 1) {
        particles.push({
          x: x + api.rnd(-7, 7),
          y: H - 30,
          vx: api.rnd(-90, 90),
          vy: api.rnd(-180, -40),
          life: api.rnd(0.35, 0.7),
          max: 0.7,
        })
      }
      while (particles.length > 120) particles.shift()
    }

    return {
      update(dt) {
        for (let index = 0; index < dominoes.length; index += 1) {
          const domino = dominoes[index]
          if (domino.flash > 0) domino.flash = Math.max(0, domino.flash - dt * 2.4)
          if (!domino.falling) continue
          domino.fall = Math.min(1, domino.fall + dt * 5.5)
          if (domino.fall >= 1 && !domino.done) {
            domino.done = true
            domino.flash = 1
            toppled += 1
            combo += 1
            comboTimer = 0.9
            shake = Math.min(4, shake + 1.1)
            api.progress(1)
            api.setStatus(combo >= 4 ? `chain x${combo}` : 'toppling')
            burst(domino.x, 5)
            const next = dominoes[index + 1]
            if (next) next.falling = true
          }
        }
        comboTimer = Math.max(0, comboTimer - dt)
        if (comboTimer === 0) combo = 0
        shake = Math.max(0, shake - dt * 14)
        for (let index = particles.length - 1; index >= 0; index -= 1) {
          const particle = particles[index]
          particle.vy += 520 * dt
          particle.x += particle.vx * dt
          particle.y += particle.vy * dt
          particle.life -= dt
          if (particle.life <= 0) particles.splice(index, 1)
        }
        if (!started) api.setStatus('click any domino')
      },
      draw(g) {
        api.clear(api.colors.bg)
        g.save()
        if (shake > 0.05) g.translate(Math.sin(api.now() / 26) * shake, 0)
        api.rect(0, H - 30, W, 30, api.colors.panel)
        api.rect(0, H - 30, W, 2, '#2a3646')
        for (const domino of dominoes) {
          const angle = domino.fall * 1.15
          g.save()
          g.translate(domino.x, H - 30)
          g.rotate(angle)
          const glow = domino.flash
          api.rect(-7, -54, 14, 54, glow > 0.02 ? api.colors.accent2 : domino.fall > 0.98 ? api.colors.dim : api.colors.fg)
          if (glow > 0.02) api.rect(-9, -56, 18, 58, `rgba(255,207,92,${0.25 * glow})`)
          g.restore()
        }
        for (const particle of particles) {
          const alpha = Math.max(0, particle.life / particle.max)
          api.circle(particle.x, particle.y, 2.2 * alpha + 0.6, `rgba(220,230,245,${0.7 * alpha})`)
        }
        g.restore()
        api.text('CLICK a domino to start the chain', 12, 26, { size: 12, color: api.colors.dim })
        if (combo >= 3) {
          api.text(`CHAIN x${combo}`, W - 20, 26, { size: 13, color: api.colors.accent2, align: 'right', weight: '600' })
        }
        if (toppled >= count) {
          api.text('PERFECT RUN', W - 20, 46, { size: 12, color: api.colors.good, align: 'right' })
        }
      },
    }
  },
})
