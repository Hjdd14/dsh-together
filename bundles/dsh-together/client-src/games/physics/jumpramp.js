defineGame({
  id: 'jumpramp',
  create(api) {
    const W = api.w
    const H = api.h
    const ground = H - 60
    const car = { x: 120, y: ground, vy: 0, speed: 190, airborne: false }
    const ramps = []
    let cleared = 0
    let dead = false
    let lastRampCounted = -1

    const spawnRamp = (x) => ramps.push({ x, w: 70, counted: false })

    spawnRamp(360)
    spawnRamp(700)
    spawnRamp(1040)

    api.onKey((key, down) => {
      if (!down) return
      if (key === 'space' || key === 'up' || key === 'enter') {
        if (!car.airborne) {
          car.vy = -430
          car.airborne = true
        }
      }
    })
    api.onPointer((event) => {
      if (event.type === 'down' && !car.airborne) {
        car.vy = -430
        car.airborne = true
      }
    })

    return {
      update(dt) {
        if (dead) return
        car.x += car.speed * dt
        if (car.airborne) {
          car.vy += 900 * dt
          car.y += car.vy * dt
          if (car.y >= ground && car.vy > 0) {
            car.y = ground
            car.vy = 0
            car.airborne = false
          }
        }
        for (const ramp of ramps) {
          const overRamp = car.x > ramp.x && car.x < ramp.x + ramp.w
          if (overRamp && car.airborne && !ramp.counted && car.y < ground - 20) {
            ramp.counted = true
            cleared += 1
            api.progress(1)
            api.setStatus('ramps ' + cleared)
          }
          if (overRamp && !car.airborne && car.y >= ground - 4 && !ramp.counted && ramp.x > car.x - 10) {
            // Running straight into the ramp face without jumping.
            dead = true
            api.lose('hit the ramp')
          }
        }
        while (ramps.length > 0 && ramps[0].x + ramps[0].w < car.x - 200) ramps.shift()
        const furthest = ramps.reduce((max, ramp) => Math.max(max, ramp.x), 0)
        if (ramps.length < 4) spawnRamp(furthest + api.rnd(300, 360))
      },
      draw(g) {
        api.clear(api.colors.bg)
        api.rect(0, ground + 10, W, H - ground, '#182028')
        for (const ramp of ramps) {
          g.fillStyle = api.colors.panel
          g.beginPath()
          g.moveTo(ramp.x, ground + 10)
          g.lineTo(ramp.x + ramp.w, ground + 10)
          g.lineTo(ramp.x + ramp.w * 0.16, ground - 34)
          g.closePath()
          g.fill()
        }
        api.rect(car.x - 18, car.y - 14, 38, 16, api.colors.accent)
        api.circle(car.x - 8, car.y + 3, 5, api.colors.fg)
        api.circle(car.x + 12, car.y + 3, 5, api.colors.fg)
        api.text('SPACE to jump the ramps', 12, 26, { size: 12, color: api.colors.dim })
        api.text('cleared ' + cleared, W - 20, 26, { size: 12, color: api.colors.accent2, align: 'right' })
      },
    }
  },
})
