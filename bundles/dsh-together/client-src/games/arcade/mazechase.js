defineGame({
  id: 'mazechase',
  create(api) {
    const MAZE = [
      '###############',
      '#.............#',
      '#.###.###.###.#',
      '#.............#',
      '#.#.###.###.#.#',
      '#.............#',
      '#.###.###.###.#',
      '#.............#',
      '#.###.###.###.#',
      '#.............#',
      '###############',
    ]
    const ROWS = MAZE.length
    const COLS = MAZE[0].length
    const C = 32
    const OX = (api.w - COLS * C) / 2
    const OY = (api.h - ROWS * C) / 2
    const STEP = 0.16
    const GHOST_STEP = 0.8

    const dots = []
    const parts = []
    let px = 1
    let py = 1
    let want = { x: 1, y: 0 }
    let acc = 0
    let ghostAcc = 0
    let eaten = 0
    let dead = false
    let shake = 0
    let shx = 0
    let shy = 0
    let danger = 0
    let hop = 0

    const ghosts = [
      { x: 13, y: 9, dir: { x: -1, y: 0 }, tint: api.colors.warn },
      { x: 13, y: 1, dir: { x: -1, y: 0 }, tint: api.colors.accent2 },
    ]

    function isWall(x, y) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true
      return MAZE[y][x] === '#'
    }

    function placeDots() {
      const spots = []
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          if (MAZE[y][x] !== '.') continue
          if (x === 1 && y === 1) continue
          spots.push({ x, y })
        }
      }
      for (let i = spots.length - 1; i > 0; i -= 1) {
        const j = api.irnd(0, i)
        const tmp = spots[i]
        spots[i] = spots[j]
        spots[j] = tmp
      }
      const take = Math.min(26, spots.length)
      for (let i = 0; i < take; i += 1) dots.push({ x: spots[i].x, y: spots[i].y, alive: true })
    }

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 56; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.25, 0.5), max: 0.5,
          c: color, r: api.rnd(1.4, 3.2),
        })
      }
    }

    placeDots()
    api.setStatus('0')

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'left') want = { x: -1, y: 0 }
      else if (key === 'right') want = { x: 1, y: 0 }
      else if (key === 'up') want = { x: 0, y: -1 }
      else if (key === 'down') want = { x: 0, y: 1 }
    })

    function eatAt(x, y) {
      for (let i = 0; i < dots.length; i += 1) {
        const d = dots[i]
        if (!d.alive || d.x !== x || d.y !== y) continue
        d.alive = false
        eaten += 1
        hop = 1
        burst(OX + x * C + C / 2, OY + y * C + C / 2, api.colors.accent2, 6, 130)
        api.progress(1)
        api.setStatus('dots ' + eaten)
        return
      }
    }

    function moveGhost(ghost) {
      const dx = px - ghost.x
      const dy = py - ghost.y
      const chase = Math.abs(dx) + Math.abs(dy) <= 6
      const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
      const legal = []
      for (let i = 0; i < dirs.length; i += 1) {
        const d = dirs[i]
        if (isWall(ghost.x + d.x, ghost.y + d.y)) continue
        if (d.x === -ghost.dir.x && d.y === -ghost.dir.y) continue
        legal.push(d)
      }
      if (!legal.length) return
      if (!chase) {
        const pickW = legal[api.irnd(0, legal.length - 1)]
        ghost.dir = pickW
        ghost.x += pickW.x
        ghost.y += pickW.y
        return
      }
      legal.sort((a, b) => (Math.abs(ghost.x + a.x - px) + Math.abs(ghost.y + a.y - py))
        - (Math.abs(ghost.x + b.x - px) + Math.abs(ghost.y + b.y - py)))
      const pick = legal[0]
      ghost.dir = pick
      ghost.x += pick.x
      ghost.y += pick.y
    }

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
          p.vx *= 1 - 2 * dt
          p.vy *= 1 - 2 * dt
        }

        let near = Infinity
        for (let i = 0; i < ghosts.length; i += 1) {
          const d = Math.abs(ghosts[i].x - px) + Math.abs(ghosts[i].y - py)
          if (d < near) near = d
        }
        danger = near <= 2 ? Math.min(1, danger + dt * 3) : Math.max(0, danger - dt * 2)

        acc += dt
        let guard = 0
        while (acc >= STEP && guard < 3 && !dead) {
          acc -= STEP
          guard += 1
          if (!isWall(px + want.x, py + want.y)) {
            px += want.x
            py += want.y
            eatAt(px, py)
          }
          for (let i = 0; i < ghosts.length; i += 1) {
            if (ghosts[i].x === px && ghosts[i].y === py) {
              dead = true
              shake = 0.9
              burst(OX + px * C + C / 2, OY + py * C + C / 2, api.colors.warn, 16, 190)
              api.lose('caught')
              return
            }
          }
        }

        ghostAcc += dt
        if (ghostAcc >= GHOST_STEP) {
          ghostAcc = 0
          for (let i = 0; i < ghosts.length; i += 1) moveGhost(ghosts[i])
          for (let i = 0; i < ghosts.length; i += 1) {
            if (ghosts[i].x === px && ghosts[i].y === py) {
              dead = true
              shake = 0.9
              burst(OX + px * C + C / 2, OY + py * C + C / 2, api.colors.warn, 16, 190)
              api.lose('caught')
              return
            }
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
            if (MAZE[y][x] === '#') {
              api.rect(sx + 1, sy + 1, C - 2, C - 2, api.colors.panel)
              api.rect(sx + 3, sy + 3, C - 6, 2, api.colors.dim)
            } else {
              api.rect(sx, sy, C, C, api.colors.bg)
            }
          }
        }
        for (let i = 0; i < dots.length; i += 1) {
          const d = dots[i]
          if (!d.alive) continue
          const pulse = 0.75 + 0.25 * Math.sin(t * 5 + d.x + d.y)
          api.circle(OX + d.x * C + C / 2 + shx, OY + d.y * C + C / 2 + shy, 3.2 * pulse, api.colors.accent2)
        }
        for (let i = 0; i < ghosts.length; i += 1) {
          const gh = ghosts[i]
          const gx = OX + gh.x * C + C / 2 + shx
          const gy = OY + gh.y * C + C / 2 + shy
          api.circle(gx, gy, 11, gh.tint)
          api.circle(gx - 4, gy - 2, 2.4, api.colors.bg)
          api.circle(gx + 4, gy - 2, 2.4, api.colors.bg)
          api.rect(gx - 6, gy + 5, 12, 2, api.colors.bg)
        }
        if (!dead) {
          const grow = 1 + hop * 0.3
          const cx = OX + px * C + C / 2 + shx
          const cy = OY + py * C + C / 2 + shy
          api.circle(cx, cy, 11 * grow, api.colors.accent)
          api.circle(cx - 4, cy - 3, 2.6, api.colors.bg)
          api.circle(cx + 4, cy - 3, 2.6, api.colors.bg)
          api.rect(cx - 5, cy + 4, 10, 2, api.colors.bg)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
        }
        if (danger > 0.35 && !dead) {
          api.rect(0, 0, api.w, 4, api.colors.warn)
          api.rect(0, api.h - 4, api.w, 4, api.colors.warn)
        }
        api.text('dots ' + eaten, 12, 16, { size: 13, color: api.colors.dim })
        api.text('dodge the ghosts', api.w - 12, 16, {
          size: 12, color: danger > 0.5 ? api.colors.warn : api.colors.dim, align: 'right',
        })
        if (dead) {
          api.text('CAUGHT', api.w / 2, api.h / 2 - 18, {
            size: 15, color: api.colors.dim, align: 'center',
          })
          api.text('LOSE', api.w / 2, api.h / 2 + 16, {
            size: 38, color: api.colors.warn, align: 'center', weight: 'bold',
          })
        }
      },
      dispose() { dots.length = 0; parts.length = 0 },
    }
  },
})
