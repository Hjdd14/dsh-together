defineGame({
  id: 'flappy',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GRAV = 900
    const FLAP = -310
    const GAP = 150
    const PIPE_W = 54
    const FLOOR = H - 14

    const bird = { x: 118, y: H * 0.44, r: 11, vy: 0, tilt: 0 }
    const pipes = []
    const fx = []
    let spawnIn = 0.85
    let speed = 120
    let dead = false
    let passed = 0
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let trail = 0
    let scroll = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 70) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v - 40, vy: Math.sin(a) * v, life: api.rnd(0.25, 0.55), color })
      }
    }

    function flap() {
      if (dead) return
      bird.vy = FLAP
      spark(bird.x - 6, bird.y + 4, 3, C.accent2, 90)
    }

    let keyHeld = false
    api.onKey((key, isDown) => {
      const hit = key === 'space' || key === 'up'
      if (!isDown) {
        if (hit) keyHeld = false
        return
      }
      if (!hit || keyHeld || dead) return
      keyHeld = true
      flap()
    })
    api.onPointer((e) => {
      if (e.type === 'down') flap()
    })

    let lastGy = H * 0.5
    function spawnPipe() {
      const lo = GAP / 2 + 16
      const hi = FLOOR - GAP / 2 - 16
      lastGy = Math.max(lo, Math.min(hi, lastGy + api.rnd(-58, 58)))
      pipes.push({ x: W + 34, gy: lastGy, w: PIPE_W, done: false })
    }

    function update(dt) {
      if (dead) return
      const sdt = dt * (slow > 0 ? 0.45 : 1)
      if (slow > 0) slow -= dt
      if (flash > 0) flash -= dt * 2.4
      if (msgT > 0) msgT -= dt
      if (shake > 0) shake = Math.max(0, shake - dt * 30)
      shx = (api.rng() - 0.5) * shake
      shy = (api.rng() - 0.5) * shake

      scroll += speed * sdt
      bird.vy += GRAV * sdt
      bird.y += bird.vy * sdt
      bird.tilt = Math.max(-0.5, Math.min(0.75, bird.vy / 500))
      if (bird.y < bird.r) {
        bird.y = bird.r
        bird.vy = 0
      }

      trail -= sdt
      if (trail <= 0) {
        trail = 0.07
        spark(bird.x - 10, bird.y + 2, 1, 'rgba(139,220,122,0.55)', 26)
      }

      spawnIn -= sdt
      if (spawnIn <= 0) {
        spawnPipe()
        spawnIn = 1.5
        speed = Math.min(160, speed + 6)
      }

      for (let i = pipes.length - 1; i >= 0; i -= 1) {
        const p = pipes[i]
        p.x -= speed * sdt
        if (p.x + p.w < -20) {
          pipes.splice(i, 1)
          continue
        }
        if (!p.done && p.x + p.w < bird.x) {
          p.done = true
          passed += 1
          api.progress(1)
          const off = Math.abs(bird.y - p.gy)
          if (off < 17) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.8
            flash = 1
            slow = 0.09
            shake = Math.max(shake, 4)
            spark(bird.x + 8, bird.y, 7, C.accent2, 140)
          } else if (off < 34) {
            combo += 1
            msg = 'CLOSE'
            msgT = 0.5
          } else {
            combo = 0
          }
        }
        const top = p.gy - GAP / 2
        const bot = p.gy + GAP / 2
        const nearX = bird.x + bird.r > p.x + 2 && bird.x - bird.r < p.x + p.w - 2
        if (nearX && (bird.y - bird.r < top || bird.y + bird.r > bot)) {
          dead = true
          spark(bird.x, bird.y, 14, C.warn, 190)
          spark(bird.x, bird.y, 6, C.fg, 120)
          shake = 14
          api.lose('pipe')
        }
      }

      if (bird.y + bird.r > FLOOR) {
        dead = true
        spark(bird.x, FLOOR, 12, C.warn, 160)
        shake = 12
        api.lose('floor')
      }

      for (let i = fx.length - 1; i >= 0; i -= 1) {
        const p = fx[i]
        p.life -= sdt
        if (p.life <= 0) {
          fx.splice(i, 1)
          continue
        }
        p.x += p.vx * sdt
        p.y += p.vy * sdt
        p.vy += 320 * sdt
      }
      api.setStatus('pipes ' + passed)
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 26, W, 26, 'rgba(106,169,255,' + (0.055 - i * 0.006).toFixed(3) + ')')

      const off1 = (scroll * 0.22) % 168
      for (let x = -off1; x < W; x += 168) api.rect(x, 92, 56, 16, 'rgba(232,238,246,0.10)')
      const off2 = (scroll * 0.42) % 124
      for (let x = -off2; x < W; x += 124) api.rect(x, 58, 36, 11, 'rgba(232,238,246,0.06)')

      if (speed > 140) {
        for (let i = 0; i < 5; i += 1) {
          const y = 40 + i * 44
          api.rect(W - 30 - ((scroll * 1.6 + i * 74) % 130), y, 30, 2, 'rgba(232,238,246,0.2)')
        }
      }

      api.rect(0, FLOOR, W, H - FLOOR, C.panel)
      api.rect(0, FLOOR, W, 2, C.dim)
      const gs = scroll % 26
      for (let x = -gs; x < W; x += 26) api.rect(x, FLOOR + 8, 12, 2, C.bg)

      for (let i = 0; i < pipes.length; i += 1) {
        const p = pipes[i]
        const top = p.gy - GAP / 2
        const bot = p.gy + GAP / 2
        api.rect(p.x + shx, shy, p.w, top, C.accent)
        api.rect(p.x - 4 + shx, top - 12 + shy, p.w + 8, 12, C.accent2)
        api.rect(p.x + shx, bot + shy, p.w, H - bot, C.accent)
        api.rect(p.x - 4 + shx, bot + shy, p.w + 8, 12, C.accent2)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        const s = Math.max(1, Math.min(4, p.life * 8))
        api.rect(p.x, p.y, s, s, p.color)
      }

      api.circle(bird.x + shx, bird.y + shy, bird.r, dead ? C.dim : C.good)
      api.circle(bird.x + 4 + shx, bird.y - 3 + shy, 2.4, C.bg)
      api.rect(bird.x - 9 + shx, bird.y + bird.tilt * 6 - 2 + shy, 7, 4, C.accent2)

      api.text('SPACE', 12, 18, { size: 12, color: C.dim })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 66, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.22).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('SPLAT', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
