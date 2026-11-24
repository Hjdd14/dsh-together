defineGame({
  id: 'snake',
  create(api) {
    const C = 24
    const COLS = 20
    const ROWS = 15
    const MIN_STEP = 0.1
    const snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }]
    const apple = { x: 12, y: 7 }
    const parts = []
    let dir = { x: 1, y: 0 }
    let next = { x: 1, y: 0 }
    let acc = 0
    let eaten = 0
    let dead = false
    let reason = ''
    let step = 0.14
    let combo = 0
    let comboTimer = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let biteFlash = 0

    function occupied(x, y) {
      for (let i = 0; i < snake.length; i += 1) {
        if (snake[i].x === x && snake[i].y === y) return true
      }
      return false
    }

    function placeApple() {
      for (let i = 0; i < 80; i += 1) {
        const x = api.irnd(0, COLS - 1)
        const y = api.irnd(0, ROWS - 1)
        if (!occupied(x, y)) {
          apple.x = x
          apple.y = y
          return
        }
      }
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          if (!occupied(x, y)) {
            apple.x = x
            apple.y = y
            return
          }
        }
      }
    }

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 64; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.35, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.28, 0.55), max: 0.55,
          c: color, r: api.rnd(1.4, 3.4),
        })
      }
    }

    function updateParts(dt) {
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        if (p.life <= 0) { parts.splice(i, 1); continue }
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - 2.6 * dt
        p.vy *= 1 - 2.6 * dt
      }
    }

    function hitBody(hx, hy, eat) {
      const last = snake.length - 1
      for (let i = 1; i <= last; i += 1) {
        if (!eat && i === last) continue
        if (snake[i].x === hx && snake[i].y === hy) return true
      }
      return false
    }

    function die(why) {
      dead = true
      reason = why
      shake = 0.85
      const head = snake[0]
      burst(head.x * C + C / 2, head.y * C + C / 2, api.colors.warn, 16, 190)
      api.lose(why)
    }

    placeApple()
    api.setStatus('0')

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'left' && dir.x === 0) next = { x: -1, y: 0 }
      else if (key === 'right' && dir.x === 0) next = { x: 1, y: 0 }
      else if (key === 'up' && dir.y === 0) next = { x: 0, y: -1 }
      else if (key === 'down' && dir.y === 0) next = { x: 0, y: 1 }
    })

    function stepOnce() {
      dir = next
      const hx = snake[0].x + dir.x
      const hy = snake[0].y + dir.y
      if (hx < 0 || hy < 0 || hx >= COLS || hy >= ROWS) { die('wall'); return }
      const eat = hx === apple.x && hy === apple.y
      if (hitBody(hx, hy, eat)) { die('self'); return }
      snake.unshift({ x: hx, y: hy })
      if (eat) {
        eaten += 1
        combo = comboTimer > 0 ? combo + 1 : 1
        comboTimer = 2.4
        shake = Math.max(shake, 0.3)
        biteFlash = 1
        burst(apple.x * C + C / 2, apple.y * C + C / 2, api.colors.warn, 8, 150)
        api.progress(1)
        api.setStatus(combo > 1 ? 'len ' + snake.length + ' x' + combo : 'len ' + snake.length)
        placeApple()
        step = Math.max(MIN_STEP, step - 0.006)
      } else {
        snake.pop()
      }
    }

    return {
      update(dt) {
        if (dead) return
        if (comboTimer > 0) {
          comboTimer -= dt
          if (comboTimer <= 0) combo = 0
        }
        if (biteFlash > 0) biteFlash = Math.max(0, biteFlash - dt * 3.5)
        if (shake > 0) {
          shake = Math.max(0, shake - dt)
          shx = api.rnd(-1, 1) * shake * 13
          shy = api.rnd(-1, 1) * shake * 13
        } else {
          shx = 0
          shy = 0
        }
        updateParts(dt)
        acc += dt
        let guard = 0
        while (acc >= step && guard < 4 && !dead) {
          acc -= step
          guard += 1
          stepOnce()
        }
        if (acc > step * 4) acc = 0
      },
      draw(g) {
        api.clear(api.colors.bg)
        const t = api.now() / 1000
        const drift = (t * 14) % C
        const grid = dead ? api.colors.warn : biteFlash > 0.45 ? api.colors.accent : api.colors.panel
        for (let x = 0; x <= COLS; x += 1) {
          api.rect(x * C - 0.5 + shx, drift - C + shy, 1, ROWS * C, grid)
        }
        for (let y = 0; y <= ROWS; y += 1) {
          api.rect(shx, y * C - 0.5 + drift * 0.5 + shy, COLS * C, 1, grid)
        }
        const apx = apple.x * C + C / 2
        const apy = apple.y * C + C / 2
        const pulse = 0.85 + 0.15 * Math.sin(t * 7)
        api.circle(apx, apy, C * 0.46 * pulse, api.colors.panel)
        api.circle(apx, apy, C * 0.3 * pulse, api.colors.warn)
        api.rect(apx - 1.5, apy - C * 0.42, 3, 5, api.colors.good)
        for (let i = snake.length - 1; i >= 0; i -= 1) {
          const s = snake[i]
          const pad = i === 0 ? 1 : 3
          const col = dead ? api.colors.dim : i === 0 ? api.colors.accent : api.colors.good
          api.rect(s.x * C + pad + shx, s.y * C + pad + shy, C - pad * 2, C - pad * 2, col)
        }
        if (!dead) {
          const head = snake[0]
          const cx = head.x * C + C / 2 + shx
          const cy = head.y * C + C / 2 + shy
          const px = -dir.y * 4
          const py = dir.x * 4
          api.circle(cx + dir.x * 6 + px, cy + dir.y * 6 + py, 2.3, api.colors.bg)
          api.circle(cx + dir.x * 6 - px, cy + dir.y * 6 - py, 2.3, api.colors.bg)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
        }
        api.text('len ' + snake.length, api.w - 10, api.h - 12, {
          size: 12, color: api.colors.dim, align: 'right',
        })
        if (combo >= 2 && !dead) {
          const grow = 1 + 0.12 * Math.min(3, combo)
          api.text('COMBO x' + combo, api.w / 2, 20, {
            size: Math.round(14 * grow), color: api.colors.accent2,
            align: 'center', weight: 'bold',
          })
        }
        if (dead) {
          api.text('CRASH · ' + reason, api.w / 2, api.h / 2 - 20, {
            size: 16, color: api.colors.dim, align: 'center',
          })
          api.text('LOSE', api.w / 2, api.h / 2 + 12, {
            size: 40, color: api.colors.warn, align: 'center', weight: 'bold',
          })
        }
      },
      dispose() { parts.length = 0 },
    }
  },
})
