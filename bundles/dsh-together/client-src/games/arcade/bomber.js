defineGame({
  id: 'bomber',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const CELL = 30
    const COLS = 16
    const ROWS = 12
    const R = 9
    const solid = (cx, cy) => cx <= 0 || cy <= 0 || cx >= COLS - 1 || cy >= ROWS - 1 || (cx % 2 === 0 && cy % 2 === 0)
    const free = (cx, cy) => !solid(cx, cy)
    const px = (cx) => cx * CELL + CELL / 2
    const cell = (v) => Math.floor(v / CELL)

    const player = { x: px(1), y: px(1), lives: 3, invuln: 0 }
    const bombs = []
    const blasts = []
    const foes = []
    const parts = []
    let kills = 0
    let shake = 0
    let flash = 0
    let cool = 0
    let spawnT = 0
    let over = false
    let t = 0

    function freeCell() {
      for (let i = 0; i < 40; i += 1) {
        const c = api.irnd(1, COLS - 2)
        const r = api.irnd(1, ROWS - 2)
        if (!free(c, r)) continue
        if (Math.abs(px(c) - player.x) + Math.abs(px(r) - player.y) < 96) continue
        return { x: px(c), y: px(r), dir: api.irnd(0, 3), turn: api.rnd(0.8, 1.8), wait: 0.7, live: true }
      }
      return null
    }
    foes.push({ x: px(3), y: px(1), dir: api.irnd(0, 3), turn: 1.6, wait: 3.4, live: true })
    for (let i = 0; i < 2; i += 1) {
      const f = freeCell()
      if (f) foes.push(f)
    }

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 40) parts.shift()
        parts.push({ x, y, vx: api.rnd(-110, 110), vy: api.rnd(-110, 110), life: api.rnd(0.2, 0.5), col })
      }
    }

    function blockedAt(x, y) {
      const c0 = cell(x - R)
      const c1 = cell(x + R)
      const r0 = cell(y - R)
      const r1 = cell(y + R)
      for (let cx = c0; cx <= c1; cx += 1) for (let cy = r0; cy <= r1; cy += 1) if (solid(cx, cy)) return true
      return false
    }

    function moveBox(box, dx, dy) {
      if (dx !== 0 && !blockedAt(box.x + dx, box.y)) box.x += dx
      if (dy !== 0 && !blockedAt(box.x, box.y + dy)) box.y += dy
    }

    function blastCells(cx, cy) {
      const out = [{ c: cx, r: cy }]
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      for (const d of dirs) {
        for (let i = 1; i <= 2; i += 1) {
          const c = cx + d[0] * i
          const r = cy + d[1] * i
          if (solid(c, r)) break
          out.push({ c, r })
        }
      }
      return out
    }

    function placeBomb() {
      if (over || cool > 0) return
      const cx = cell(player.x)
      const cy = cell(player.y)
      for (const b of bombs) if (b.cx === cx && b.cy === cy) return
      if (bombs.length >= 2) return
      cool = 0.22
      bombs.push({ cx, cy, t: 1.15 })
    }

    const offKey = api.onKey((key, isDown) => {
      if (key === 'space' && isDown) placeBomb()
    })

    function hurt() {
      if (player.invuln > 0) return
      player.lives -= 1
      player.invuln = 1.8
      shake = 1
      flash = 1
      burst(player.x, player.y, C.warn, 16)
      player.x = px(1)
      player.y = px(1)
      if (player.lives <= 0) {
        over = true
        api.lose('caught in the blast')
      }
    }

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.6)
      flash = Math.max(0, flash - dt * 5)
      if (over) return
      t += dt
      cool = Math.max(0, cool - dt)
      player.invuln = Math.max(0, player.invuln - dt)
      const sp = 118 * dt
      let dx = 0
      let dy = 0
      if (api.down('left')) dx = -sp
      else if (api.down('right')) dx = sp
      else if (api.down('up')) dy = -sp
      else if (api.down('down')) dy = sp
      moveBox(player, dx, dy)

      for (let i = bombs.length - 1; i >= 0; i -= 1) {
        const b = bombs[i]
        b.t -= dt
        if (b.t > 0) continue
        bombs.splice(i, 1)
        const cells = blastCells(b.cx, b.cy)
        blasts.push({ cells, t: 0.4 })
        shake = Math.min(1, shake + 0.5)
        flash = 1
        burst(px(b.cx), px(b.cy), C.accent2, 12)
      }

      for (let i = blasts.length - 1; i >= 0; i -= 1) {
        blasts[i].t -= dt
        if (blasts[i].t <= 0) blasts.splice(i, 1)
      }

      for (const f of foes) {
        if (!f.live) continue
        if (f.wait > 0) {
          f.wait -= dt
          continue
        }
        f.turn -= dt
        if (f.turn <= 0) {
          f.turn = api.rnd(0.7, 1.6)
          f.dir = api.irnd(0, 3)
        }
        const step = 42 * dt
        const mx = f.dir === 0 ? -step : f.dir === 1 ? step : 0
        const my = f.dir === 2 ? -step : f.dir === 3 ? step : 0
        const bx = f.x
        const by = f.y
        moveBox(f, mx, my)
        if (f.x === bx && f.y === by) f.dir = api.irnd(0, 3)
        const dc = Math.abs(f.x - player.x)
        const dr = Math.abs(f.y - player.y)
        if (dc < 20 && dr < 20) hurt()
      }

      for (const bl of blasts) {
        for (const c of bl.cells) {
          for (const f of foes) {
            if (!f.live) continue
            if (cell(f.x) === c.c && cell(f.y) === c.r) {
              f.live = false
              kills += 1
              burst(f.x, f.y, C.accent2, 14)
              api.progress(1)
              api.setStatus('BLAST ' + kills + '/3')
            }
          }
          if (cell(player.x) === c.c && cell(player.y) === c.r) hurt()
        }
      }

      let live = 0
      for (const f of foes) if (f.live) live += 1
      if (live < 3) {
        spawnT -= dt
        if (spawnT <= 0) {
          spawnT = 1.6
          const f = freeCell()
          if (f && foes.length < 12) foes.push(f)
        }
      }
      for (let i = foes.length - 1; i >= 0; i -= 1) if (!foes[i].live) foes.splice(i, 1)
      if (over) return
      if (player.lives <= 0) {
        over = true
        api.lose('caught in the blast')
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.07) * 3 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.09) * 3 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      Rr(CELL, CELL, W - CELL * 2, H - CELL * 2, 'rgba(24,32,40,0.75)')
      for (let c = 1; c < COLS; c += 1) Rr(c * CELL, CELL, 1, H - CELL * 2, 'rgba(143,160,180,0.07)')
      for (let r = 1; r < ROWS; r += 1) Rr(CELL, r * CELL, W - CELL * 2, 1, 'rgba(143,160,180,0.07)')
      Rr(0, 0, W, CELL, 'rgba(143,160,180,0.28)')
      Rr(0, H - CELL, W, CELL, 'rgba(143,160,180,0.28)')
      Rr(0, 0, CELL, H, 'rgba(143,160,180,0.28)')
      Rr(W - CELL, 0, CELL, H, 'rgba(143,160,180,0.28)')
      for (let c = 2; c < COLS - 1; c += 2) {
        for (let r = 2; r < ROWS - 1; r += 2) {
          Rr(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4, 'rgba(106,169,255,0.22)')
          Rr(c * CELL + 2, r * CELL + 2, CELL - 4, 3, 'rgba(232,238,246,0.12)')
        }
      }
      for (const b of bombs) {
        const k = 1 - Math.max(0, b.t) / 1.15
        Ci(px(b.cx), px(b.cy), 10, k > 0.66 ? C.warn : C.fg)
        Ci(px(b.cx), px(b.cy), 4 + Math.sin(t * 18) * 1.2, C.bg)
      }
      for (const bl of blasts) {
        for (const c of bl.cells) {
          const a = 0.55 + Math.sin(t * 30) * 0.2
          Rr(c.c * CELL + 1, c.r * CELL + 1, CELL - 2, CELL - 2, 'rgba(255,207,92,' + a.toFixed(2) + ')')
        }
      }
      for (const f of foes) {
        Ci(f.x, f.y, 13, 'rgba(255,122,122,0.14)')
        Ci(f.x, f.y, 9, C.warn)
        Rr(f.x - 4, f.y - 3, 3, 3, C.bg)
        Rr(f.x + 1, f.y - 3, 3, 3, C.bg)
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      if (player.invuln <= 0 || Math.floor(t * 14) % 2 === 0) {
        Ci(player.x, player.y, 13, 'rgba(139,220,122,0.16)')
        Ci(player.x, player.y, 9, C.good)
        Rr(player.x - 4, player.y - 4, 8, 3, C.bg)
      }
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.09).toFixed(3) + ')')
      api.text('BLAST ' + kills + '/3', 8, 12, { size: 12, color: C.dim })
      api.text('LIVES ' + player.lives, W - 8, 12, { size: 12, color: player.lives > 1 ? C.dim : C.warn, align: 'right' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.55)')
        api.text('BLASTED OUT', W / 2, 170, { size: 22, color: C.warn, align: 'center', weight: 'bold' })
      }
    }

    return {
      update,
      draw,
      dispose() {
        offKey()
      },
    }
  },
})
