defineGame({
  id: 'qbert',
  create(api) {
    const SIZE = 6
    const TW = 56
    const TH = 40
    const BASE_X = api.w / 2
    const BASE_Y = 88
    const HOP = 0.17

    const tiles = []
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        tiles.push({ r, c, lit: false })
      }
    }

    let pr = SIZE - 1
    let pc = SIZE - 1
    let fromR = pr
    let fromC = pc
    let hopT = 1
    let flipped = 0
    let dead = false
    let reason = ''
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let enemyTimer = 0.9
    const enemy = { r: 0, c: 0 }
    const parts = []

    function posOf(r, c) {
      return { x: BASE_X + (c - r) * (TW / 2), y: BASE_Y + (c + r) * (TH / 2) }
    }

    function tileAt(r, c) {
      for (let i = 0; i < tiles.length; i += 1) {
        if (tiles[i].r === r && tiles[i].c === c) return tiles[i]
      }
      return null
    }

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 56; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.22, 0.5), max: 0.5,
          c: color, r: api.rnd(1.4, 3.2),
        })
      }
    }

    function hop(dr, dc) {
      if (hopT < 1 || dead) return
      const nr = pr + dr
      const nc = pc + dc
      if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) {
        shake = 0.35
        return
      }
      fromR = pr
      fromC = pc
      pr = nr
      pc = nc
      hopT = 0
      const tile = tileAt(pr, pc)
      const p = posOf(pr, pc)
      if (tile && !tile.lit) {
        tile.lit = true
        flipped += 1
        flash = 1
        burst(p.x, p.y, api.colors.accent2, 7, 140)
        api.progress(1)
        api.setStatus('tiles ' + flipped)
      }
    }

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'up') hop(-1, 0)
      else if (key === 'down') hop(1, 0)
      else if (key === 'left') hop(0, -1)
      else if (key === 'right') hop(0, 1)
    })

    api.setStatus('tiles 0')

    function moveEnemy() {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      const ok = []
      for (let i = 0; i < dirs.length; i += 1) {
        const nr = enemy.r + dirs[i][0]
        const nc = enemy.c + dirs[i][1]
        if (nr >= 0 && nc >= 0 && nr < SIZE && nc < SIZE) ok.push(dirs[i])
      }
      if (!ok.length) return
      const pick = ok[api.irnd(0, ok.length - 1)]
      enemy.r += pick[0]
      enemy.c += pick[1]
    }

    return {
      update(dt) {
        if (dead) return
        if (hopT < 1) hopT = Math.min(1, hopT + dt / HOP)
        if (flash > 0) flash = Math.max(0, flash - dt * 3)
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
          p.vy += 180 * dt
          p.vx *= 1 - 2 * dt
        }

        enemyTimer -= dt
        if (enemyTimer <= 0) {
          enemyTimer = 1.0
          moveEnemy()
          if (enemy.r === pr && enemy.c === pc && hopT >= 1) {
            dead = true
            reason = 'caught by the bouncer'
            shake = 0.9
            const p = posOf(pr, pc)
            burst(p.x, p.y, api.colors.warn, 16, 190)
            api.lose(reason)
            return
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        const t = api.now() / 1000
        for (let i = 0; i < tiles.length; i += 1) {
          const tile = tiles[i]
          const p = posOf(tile.r, tile.c)
          const x = p.x + shx
          const y = p.y + shy
          const base = tile.lit ? api.colors.accent : api.colors.panel
          g.fillStyle = base
          g.beginPath()
          g.moveTo(x, y - TH / 2)
          g.lineTo(x + TW / 2, y)
          g.lineTo(x, y + TH / 2)
          g.lineTo(x - TW / 2, y)
          g.closePath()
          g.fill()
          g.strokeStyle = tile.lit ? api.colors.fg : api.colors.dim
          g.lineWidth = 1
          g.stroke()
          if (tile.lit) {
            const pulse = 0.5 + 0.5 * Math.sin(t * 6 + tile.r + tile.c)
            api.circle(x, y, 3 + pulse * 2, api.colors.accent2)
          }
        }
        const ep = posOf(enemy.r, enemy.c)
        api.circle(ep.x + shx, ep.y + shy - 12, 11, api.colors.warn)
        api.circle(ep.x - 4 + shx, ep.y - 15 + shy, 2.4, api.colors.bg)
        api.circle(ep.x + 4 + shx, ep.y - 15 + shy, 2.4, api.colors.bg)
        if (!dead) {
          const a = posOf(fromR, fromC)
          const b = posOf(pr, pc)
          const k = hopT
          const arc = Math.sin(k * Math.PI) * 22
          const px = a.x + (b.x - a.x) * k + shx
          const py = a.y + (b.y - a.y) * k - arc + shy
          api.circle(px, py - 10, 12, api.colors.good)
          api.circle(px - 4, py - 13, 2.6, api.colors.bg)
          api.circle(px + 4, py - 13, 2.6, api.colors.bg)
          api.rect(px - 4, py - 6, 8, 2, api.colors.bg)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
        }
        api.text('tiles ' + flipped, 12, 16, { size: 13, color: api.colors.dim })
        api.text('hop diagonally · dodging the ball', api.w - 12, 16, {
          size: 11, color: api.colors.dim, align: 'right',
        })
        if (flash > 0.5) api.rect(0, 0, api.w, 3, api.colors.accent2)
        if (dead) {
          api.text(reason, api.w / 2, api.h / 2 - 18, {
            size: 14, color: api.colors.dim, align: 'center',
          })
          api.text('LOSE', api.w / 2, api.h / 2 + 16, {
            size: 38, color: api.colors.warn, align: 'center', weight: 'bold',
          })
        }
      },
      dispose() { tiles.length = 0; parts.length = 0 },
    }
  },
})
