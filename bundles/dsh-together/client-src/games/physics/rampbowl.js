defineGame({
  id: 'rampbowl',
  create(api) {
    const W = api.w
    const H = api.h
    const rampY = H - 150
    const pins = []
    const ball = { x: 80, y: H - 40, vx: 0, vy: 0, live: false, r: 9 }
    let aim = null
    let down = 0
    let spark = []
    let flash = 0
    let shake = 0

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col <= row; col += 1) {
        pins.push({ x: 348 + row * 18, y: H - 48 - col * 16, alive: true, fade: 0 })
      }
    }

    const pop = (x, y, amount) => {
      for (let index = 0; index < amount; index += 1) {
        spark.push({ x, y, vx: api.rnd(-120, 120), vy: api.rnd(-160, -20), life: api.rnd(0.25, 0.5), max: 0.5 })
      }
      while (spark.length > 90) spark.shift()
    }

    api.onPointer((event) => {
      if (event.type === 'down' && !ball.live) aim = { x: event.x, y: event.y }
      if (event.type === 'move' && aim) aim = { x: event.x, y: event.y }
      if (event.type === 'up' && aim && !ball.live) {
        const dx = Math.max(40, aim.x - ball.x)
        const dy = aim.y - ball.y
        const length = Math.max(1, Math.hypot(dx, dy))
        ball.vx = (dx / length) * 420
        ball.vy = (dy / length) * 420
        ball.live = true
        aim = null
      }
    })

    return {
      update(dt) {
        flash = Math.max(0, flash - dt * 3)
        shake = Math.max(0, shake - dt * 12)
        for (let index = spark.length - 1; index >= 0; index -= 1) {
          const mote = spark[index]
          mote.vy += 520 * dt
          mote.x += mote.vx * dt
          mote.y += mote.vy * dt
          mote.life -= dt
          if (mote.life <= 0) spark.splice(index, 1)
        }
        for (const pin of pins) if (pin.fade > 0) pin.fade = Math.max(0, pin.fade - dt * 2.2)
        if (!ball.live) return
        ball.vy += 700 * dt
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        // The ramp is a line from the left floor up to the pin deck: bounce along it.
        if (ball.x > 150 && ball.x < 300 && ball.y > rampY - 10 && ball.y < rampY + 12 && ball.vy > 0) {
          ball.y = rampY - 10
          ball.vy = -Math.abs(ball.vy) * 0.56
          ball.vx *= 1.04
          flash = 0.6
        }
        if (ball.y > H + 30 || ball.x > W + 40) {
          ball.live = false
          ball.x = 80
          ball.y = H - 40
          ball.vx = 0
          ball.vy = 0
          if (pins.every((pin) => !pin.alive)) api.win()
        }
        for (const pin of pins) {
          if (!pin.alive) continue
          if (Math.hypot(pin.x - ball.x, pin.y - ball.y) < ball.r + 9) {
            pin.alive = false
            pin.fade = 1
            down += 1
            shake = Math.min(4, shake + 1.1)
            pop(pin.x, pin.y, 7)
            api.progress(1)
            api.setStatus(`pins ${down}`)
            ball.vx *= 0.95
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        g.save()
        if (shake > 0.05) g.translate(Math.sin(api.now() / 21) * shake, Math.cos(api.now() / 17) * shake * 0.4)
        api.rect(0, H - 26, W, 26, api.colors.panel)
        // ramp
        g.fillStyle = flash > 0.02 ? 'rgba(255,255,255,.35)' : api.colors.panel
        g.beginPath()
        g.moveTo(150, H - 26)
        g.lineTo(300, rampY)
        g.lineTo(300, rampY + 16)
        g.lineTo(150, H - 8)
        g.closePath()
        g.fill()
        for (const pin of pins) {
          if (pin.fade > 0) api.circle(pin.x, pin.y - (1 - pin.fade) * 8, 8 * pin.fade + 2, `rgba(255,255,255,${0.32 * pin.fade})`)
          if (!pin.alive) continue
          api.circle(pin.x, pin.y, 8, api.colors.fg)
          api.circle(pin.x, pin.y, 4, api.colors.warn)
        }
        if (ball.live) {
          api.circle(ball.x, ball.y, ball.r, api.colors.accent)
          api.circle(ball.x - 3, ball.y - 3, 3, 'rgba(255,255,255,.5)')
        }
        for (const mote of spark) {
          const alpha = Math.max(0, mote.life / mote.max)
          api.circle(mote.x, mote.y, 2.4 * alpha + 0.6, `rgba(255,207,92,${alpha})`)
        }
        if (aim && !ball.live) {
          g.strokeStyle = api.colors.accent2
          g.lineWidth = 2
          g.setLineDash([6, 6])
          g.beginPath()
          g.moveTo(ball.x, ball.y)
          g.lineTo(aim.x, aim.y)
          g.stroke()
          g.setLineDash([])
        }
        g.restore()
        api.text('DRAG from the ball to launch it up the ramp', 12, 26, { size: 12, color: api.colors.dim })
      },
    }
  },
})
