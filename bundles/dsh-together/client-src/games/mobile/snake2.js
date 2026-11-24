defineGame({
  id: 'snake2',
  create(api) {
    const C = 24
    const COLS = 20
    const ROWS = 15
    const MIN_STEP = 0.1

    const WALLS = []
    function wall(x, y) { WALLS.push(x + ',' + y) }
    for (let y = 3; y <= 6; y += 1) wall(5, y)
    for (let y = 8; y <= 12; y += 1) wall(14, y)
    for (let x = 8; x <= 12; x += 1) wall(x, 4)
    for (let x = 2; x <= 6; x += 1) wall(x, 11)
    for (let x = 16; x <= 18; x += 1) wall(x, 9)

    const snake = [{ x: 9, y: 7 }, { x: 8, y: 7 }, { x: 7, y: 7 }]
    const egg = { x: 12, y: 7 }
    const parts = []
    let dir = { x: 1, y: 0 }
    let next = { x: 1, y: 0 }
    let acc = 0
    let eaten = 0
    let step = 0.17
    let dead = false
    let reason = ''
    let shake = 0
    let shx = 0
    let shy = 0
    let bite = 0

    function isWall(x, y) {
      return WALLS.indexOf(x + ',' + y) >= 0
    }

    function occupied(x, y) {
      if (isWall(x, y)) return true
      for (let i = 0; i < snake.length; i += 1) {
        if (snake[i].x === x && snake[i].y === y) return true
      }
      return false
    }

    function placeEgg() {
      for (let i = 0; i < 120; i += 1) {
        const x = api.irnd(0, COLS - 1)
        const y = api.irnd(0, ROWS - 1)
        if (!occupied(x, y)) {
          egg.x = x
          egg.y = y
          return
        }
      }
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          if (!occupied(x, y)) { egg.x = x; egg.y = y; return }
        }
      }
    }

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 40; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.22, 0.46), max: 0.46,
          c: color, r: api.rnd(1.2, 2.6),
        })
      }
    }

    placeEgg()
    api.setStatus('eggs 0')

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'left' && dir.x === 0) next = { x: -1, y: 0 }
      else if (key === 'right' && dir.x === 0) next = { x: 1, y: 0 }
      else if (key === 'up' && dir.y === 0) next = { x: 0, y: -1 }
      else if (key === 'down' && dir.y === 0) next = { x: 0, y: 1 }
    })

    function die(why) {
      dead = true
      reason = why
      shake = 0.85
      burst(snake[0].x * C + C / 2, snake[0].y * C + C / 2, api.colors.warn, 14, 180)
      api.lose(why)
    }

    function stepOnce() {
      dir = next
      const hx = snake[0].x + dir.x
      const hy = snake[0].y + dir.y
      if (hx < 0 || hy < 0 || hx >= COLS || hy >= ROWS) { die('edge'); return }
      if (isWall(hx, hy)) { die('wall'); return }
      const eat = hx === egg.x && hy === egg.y
      const last = snake.length - 1
      for (let i = 1; i <= last; i += 1) {
        if (!eat && i === last) continue
        if (snake[i].x === hx && snake[i].y === hy) { die('self'); return }
      }
      snake.unshift({ x: hx, y: hy })
      if (eat) {
        eaten += 1
        bite = 1
        step = Math.max(MIN_STEP, step - 0.006)
        burst(egg.x * C + C / 2, egg.y * C + C / 2, api.colors.accent2, 7, 130)
        api.progress(1)
        api.setStatus('eggs ' + eaten)
        placeEgg()
      } else {
        snake.pop()
      }
    }

    return {
      update(dt) {
        if (dead) return
        if (bite > 0) bite = Math.max(0, bite - dt * 4)
        if (shake > 0) {
          shake = Math.max(0, shake - dt)
          shx = api.rnd(-1, 1) * shake * 10
          shy = api.rnd(-1, 1) * shake * 10
        } else {
          shx = 0
          shy = 0
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.life -= dt
          if (p.life <= 0) { parts.splice(i, 1); continue }
          p.x += p.vx * dt
          p.y += p.vy * dt
        }
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
        for (let x = 0; x < COLS; x += 1) {
          for (let y = 0; y < ROWS; y += 1) {
            if ((x + y) % 2 !== 0) continue
            api.rect(x * C + shx, y * C + shy, C, C, api.colors.panel)
          }
        }
        for (let i = 0; i < WALLS.length; i += 1) {
          const key = WALLS[i]
          const cut = key.indexOf(',')
          const wx = Number(key.slice(0, cut))
          const wy = Number(key.slice(cut + 1))
          api.rect(wx * C + 1 + shx, wy * C + 1 + shy, C - 2, C - 2, api.colors.dim)
          api.rect(wx * C + 3 + shx, wy * C + 3 + shy, C - 6, 3, api.colors.fg)
        }
        const pulse = 0.85 + 0.15 * Math.sin(t * 6)
        api.circle(egg.x * C + C / 2 + shx, egg.y * C + C / 2 + shy, C * 0.26 * pulse, api.colors.accent2)
        api.circle(egg.x * C + C / 2 + shx, egg.y * C + C / 2 + shy, C * 0.12, api.colors.fg)
        for (let i = snake.length - 1; i >= 0; i -= 1) {
          const s = snake[i]
          const head = i === 0
          const pad = head ? 1 : 3
          const col = dead ? api.colors.dim : head ? api.colors.good : api.colors.accent
          api.rect(s.x * C + pad + shx, s.y * C + pad + shy, C - pad * 2, C - pad * 2, col)
          if (head && !dead) {
            const ex = s.x * C + C / 2 + shx
            const ey = s.y * C + C / 2 + shy
            api.rect(ex - 5 + dir.x * 4, ey - 5 + dir.y * 4, 3, 3, api.colors.bg)
            api.rect(ex + 2 + dir.x * 4, ey + 2 + dir.y * 4, 3, 3, api.colors.bg)
          }
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.rect(p.x + shx, p.y + shy, p.r * 2, p.r * 2, p.c)
        }
        api.text('EGGS ' + eaten, 10, 12, { size: 11, color: api.colors.good })
        api.text('SPD ' + Math.round(1 / step), api.w - 10, 12, {
          size: 11, color: api.colors.dim, align: 'right',
        })
        if (dead) {
          api.text(reason, api.w / 2, api.h / 2 - 14, { size: 13, color: api.colors.dim, align: 'center' })
          api.text('LOSE', api.w / 2, api.h / 2 + 18, {
            size: 34, color: api.colors.warn, align: 'center', weight: 'bold',
          })
        }
      },
      dispose() { parts.length = 0 },
    }
  },
})
