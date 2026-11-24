defineGame({
  id: 'digger',
  create(api) {
    const COLS = 15
    const ROWS = 11
    const C = 32
    const OX = (api.w - COLS * C) / 2
    const OY = (api.h - ROWS * C) / 2
    const DIRT = 0
    const ROCK = 1
    const HOLE = 2

    const grid = []
    for (let y = 0; y < ROWS; y += 1) {
      const row = []
      for (let x = 0; x < COLS; x += 1) row.push(DIRT)
      grid.push(row)
    }

    const rocks = []
    let px = 7
    let py = 0
    let dug = 0
    let cool = 0
    let dead = false
    let reason = ''
    let shake = 0
    let shx = 0
    let shy = 0
    let hop = 0
    const parts = []

    function spawnRocks() {
      let tries = 0
      while (rocks.length < 20 && tries < 400) {
        tries += 1
        const x = api.irnd(0, COLS - 1)
        const y = api.irnd(2, ROWS - 2)
        if (x === px && y === py) continue
        if (grid[y][x] === ROCK) continue
        grid[y][x] = ROCK
        rocks.push({ x, y, timer: 0, wob: 0 })
      }
    }

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 34; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.25, 0.55), max: 0.55,
          c: color, r: api.rnd(1.4, 3.4),
        })
      }
    }

    spawnRocks()
    grid[py][px] = HOLE
    api.setStatus('dug 0')

    function crash(why) {
      dead = true
      reason = why
      shake = 0.9
      burst(OX + px * C + C / 2, OY + py * C + C / 2, api.colors.warn, 16, 190)
      api.lose(why)
    }

    function digInto(nx, ny) {
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return
      if (grid[ny][nx] === ROCK) return
      px = nx
      py = ny
      if (grid[ny][nx] === DIRT) {
        grid[ny][nx] = HOLE
        dug += 1
        hop = 1
        burst(OX + nx * C + C / 2, OY + ny * C + C / 2, api.colors.accent2, 6, 130)
        api.progress(1)
        api.setStatus('dug ' + dug)
      }
    }

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'left') digInto(px - 1, py)
      else if (key === 'right') digInto(px + 1, py)
      else if (key === 'up') digInto(px, py - 1)
      else if (key === 'down') digInto(px, py + 1)
    })

    return {
      update(dt) {
        if (dead) return
        if (hop > 0) hop = Math.max(0, hop - dt * 4)
        if (shake > 0) {
          shake = Math.max(0, shake - dt)
          shx = api.rnd(-1, 1) * shake * 12
          shy = api.rnd(-1, 1) * shake * 12
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
          p.vy += 260 * dt
          p.vx *= 1 - 1.8 * dt
        }

        for (let i = 0; i < rocks.length; i += 1) {
          const r = rocks[i]
          const below = r.y + 1
          const canFall = below < ROWS && grid[below][r.x] === HOLE
          if (!canFall) { r.timer = 0; r.wob = 0; continue }
          if (r.timer <= 0) {
            r.timer = 0.34
            r.wob = 1
            continue
          }
          r.wob = Math.max(0, r.wob - dt * 3)
          r.timer -= dt
          if (r.timer > 0) continue
          grid[r.y][r.x] = HOLE
          r.y = below
          grid[r.y][r.x] = ROCK
          r.timer = 0
          r.wob = 0
          burst(OX + r.x * C + C / 2, OY + (r.y - 1) * C + C / 2, api.colors.dim, 5, 110)
          if (r.x === px && r.y === py) {
            crash('squashed')
            return
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        const t = api.now() / 1000
        for (let y = 0; y < ROWS; y += 1) {
          for (let x = 0; x < COLS; x += 1) {
            const sx = OX + x * C + shx
            const sy = OY + y * C + shy
            const cell = grid[y][x]
            if (cell === HOLE) {
              api.rect(sx + 1, sy + 1, C - 2, C - 2, api.colors.bg)
              continue
            }
            const deep = 1 - y / ROWS
            const shade = deep > 0.66 ? '#22303e' : deep > 0.33 ? '#1c2833' : '#182028'
            api.rect(sx + 1, sy + 1, C - 2, C - 2, shade)
          }
        }
        for (let i = 0; i < rocks.length; i += 1) {
          const r = rocks[i]
          const sx = OX + r.x * C + shx
          const sy = OY + r.y * C + shy
          const wob = Math.sin(t * 34) * 2.4 * r.wob
          api.circle(sx + C / 2 + wob, sy + C / 2, C * 0.36, api.colors.dim)
          api.circle(sx + C / 2 - 4 + wob, sy + C / 2 - 4, 3, api.colors.fg)
          if (r.wob > 0.12) api.rect(sx + 2, sy + C - 4, C - 4, 3, api.colors.warn)
        }
        if (!dead) {
          const grow = 1 + hop * 0.3
          const cx = OX + px * C + C / 2 + shx
          const cy = OY + py * C + C / 2 + shy
          api.circle(cx, cy, 11 * grow, api.colors.accent)
          api.circle(cx - 4, cy - 3, 2.6, api.colors.bg)
          api.circle(cx + 4, cy - 3, 2.6, api.colors.bg)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
        }
        api.text('dug ' + dug, 12, 16, { size: 13, color: api.colors.dim })
        api.text('rocks fall when you dig under them', api.w - 12, 16, {
          size: 11, color: api.colors.dim, align: 'right',
        })
        if (dead) {
          api.text(reason, api.w / 2, api.h / 2 - 18, {
            size: 15, color: api.colors.dim, align: 'center',
          })
          api.text('LOSE', api.w / 2, api.h / 2 + 16, {
            size: 38, color: api.colors.warn, align: 'center', weight: 'bold',
          })
        }
      },
      dispose() { rocks.length = 0; parts.length = 0 },
    }
  },
})
