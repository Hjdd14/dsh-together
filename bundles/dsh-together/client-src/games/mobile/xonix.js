defineGame({
  id: 'xonix',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const COLS = 40
    const ROWS = 28
    const CELL = 12
    const OY = 24
    const EMPTY = 0
    const LAND = 1
    const TRAIL = 2
    const N = COLS * ROWS
    const grid = new Uint8Array(N)
    const seen = new Uint8Array(N)
    const AT = (c, r) => r * COLS + c
    const player = { c: 0, r: 14, dx: 0, dy: 0, step: 0 }
    const foes = []
    const parts = []
    let claims = 0
    let tiles = 0
    let combo = 0
    let comboT = 0
    let shake = 0
    let flash = 0
    let over = false
    let t = 0
    let lastKey = 'right'
    let started = false

    for (let c = 0; c < COLS; c += 1) {
      grid[AT(c, 0)] = LAND
      grid[AT(c, ROWS - 1)] = LAND
    }
    for (let r = 0; r < ROWS; r += 1) {
      grid[AT(0, r)] = LAND
      grid[AT(COLS - 1, r)] = LAND
    }

    function addFoe() {
      foes.push({
        c: api.irnd(6, COLS - 7),
        r: api.irnd(4, ROWS - 5),
        dx: api.rng() < 0.5 ? -1 : 1,
        dy: api.rng() < 0.5 ? -1 : 1,
        step: 0,
      })
    }
    addFoe()
    addFoe()

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 40) parts.shift()
        parts.push({ x, y, vx: api.rnd(-95, 95), vy: api.rnd(-95, 95), life: api.rnd(0.2, 0.5), col })
      }
    }

    function closeLoop() {
      for (let i = 0; i < N; i += 1) if (grid[i] === TRAIL) grid[i] = LAND
      seen.fill(0)
      const stack = []
      for (const f of foes) {
        const i = AT(f.c, f.r)
        if (grid[i] === EMPTY && !seen[i]) {
          seen[i] = 1
          stack.push(i)
        }
      }
      while (stack.length > 0) {
        const i = stack.pop()
        const c = i % COLS
        const r = (i - c) / COLS
        if (c > 0) { const j = i - 1; if (grid[j] === EMPTY && !seen[j]) { seen[j] = 1; stack.push(j) } }
        if (c < COLS - 1) { const j = i + 1; if (grid[j] === EMPTY && !seen[j]) { seen[j] = 1; stack.push(j) } }
        if (r > 0) { const j = i - COLS; if (grid[j] === EMPTY && !seen[j]) { seen[j] = 1; stack.push(j) } }
        if (r < ROWS - 1) { const j = i + COLS; if (grid[j] === EMPTY && !seen[j]) { seen[j] = 1; stack.push(j) } }
      }
      let gained = 0
      for (let i = 0; i < N; i += 1) {
        if (grid[i] === EMPTY && !seen[i]) {
          grid[i] = LAND
          gained += 1
        }
      }
      if (gained > 0) {
        claims += 1
        tiles += gained
        combo += 1
        comboT = 2.4
        shake = Math.min(1, shake + 0.45)
        flash = 1
        burst(player.c * CELL + 6, OY + player.r * CELL + 6, C.good, 14)
        api.progress(1)
        api.setStatus('CLAIM ' + claims + '/12  TILES ' + tiles)
      }
    }

    function stepTo(c, r) {
      const i = AT(c, r)
      if (grid[i] === TRAIL) {
        over = true
        shake = 1
        flash = 1
        burst(player.c * CELL + 6, OY + player.r * CELL + 6, C.warn, 20)
        api.lose('crossed your own trail')
        return
      }
      const wasLand = grid[AT(player.c, player.r)] === LAND
      player.c = c
      player.r = r
      if (grid[i] === LAND) {
        if (!wasLand) closeLoop()
        grid[i] = LAND
      } else {
        grid[i] = TRAIL
      }
    }

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.6)
      flash = Math.max(0, flash - dt * 5)
      if (comboT > 0) {
        comboT -= dt
        if (comboT <= 0) combo = 0
      }
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
      if (over) return
      t += dt
      if (api.down('left')) { lastKey = 'left'; started = true }
      else if (api.down('right')) { lastKey = 'right'; started = true }
      else if (api.down('up')) { lastKey = 'up'; started = true }
      else if (api.down('down')) { lastKey = 'down'; started = true }
      player.step -= dt
      if (started && player.step <= 0) {
        player.step = 0.075
        let nc = player.c
        let nr = player.r
        if (lastKey === 'left') nc -= 1
        if (lastKey === 'right') nc += 1
        if (lastKey === 'up') nr -= 1
        if (lastKey === 'down') nr += 1
        if (nc < 0) nc = 0
        if (nc > COLS - 1) nc = COLS - 1
        if (nr < 0) nr = 0
        if (nr > ROWS - 1) nr = ROWS - 1
        if (nc !== player.c || nr !== player.r) stepTo(nc, nr)
        if (over) return
      }

      for (const f of foes) {
        f.step -= dt
        if (f.step > 0) continue
        f.step = 0.16
        let nc = f.c + f.dx
        let nr = f.r + f.dy
        if (nc <= 0 || nc >= COLS - 1 || grid[AT(nc, f.r)] === LAND) {
          f.dx = -f.dx
          nc = f.c + f.dx
        }
        if (nr <= 0 || nr >= ROWS - 1 || grid[AT(f.c, nr)] === LAND) {
          f.dy = -f.dy
          nr = f.r + f.dy
        }
        if (nc < 1) nc = 1
        if (nc > COLS - 2) nc = COLS - 2
        if (nr < 1) nr = 1
        if (nr > ROWS - 2) nr = ROWS - 2
        f.c = nc
        f.r = nr
        if (grid[AT(nc, nr)] === TRAIL || (nc === player.c && nr === player.r)) {
          over = true
          shake = 1
          flash = 1
          burst(nc * CELL, OY + nr * CELL, C.warn, 22)
          api.lose('a ball caught you')
          return
        }
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.07) * 3 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.09) * 3 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      for (let r = 0; r < ROWS; r += 1) {
        let run = -1
        for (let c = 0; c <= COLS; c += 1) {
          const land = c < COLS && grid[AT(c, r)] === LAND
          if (land && run < 0) run = c
          if (!land && run >= 0) {
            Rr(run * CELL, OY + r * CELL, (c - run) * CELL, CELL, 'rgba(143,160,180,0.34)')
            run = -1
          }
        }
      }
      for (let i = 0; i < N; i += 1) {
        if (grid[i] !== TRAIL) continue
        const c = i % COLS
        const r = (i - c) / COLS
        Rr(c * CELL + 2, OY + r * CELL + 2, CELL - 4, CELL - 4, combo >= 3 ? C.accent2 : C.accent)
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      for (const f of foes) {
        const fx = f.c * CELL + 6
        const fy = OY + f.r * CELL + 6
        api.circle(fx + ox, fy + oy, 8, 'rgba(255,122,122,0.16)')
        api.circle(fx + ox, fy + oy, 5, C.warn)
      }
      const px = player.c * CELL + 6
      const py = OY + player.r * CELL + 6
      api.rect(px + ox - 4, py + oy - 4, 8, 8, flash > 0.4 ? C.fg : C.good)
      api.rect(px + ox - 6, py + oy - 6, 12, 1, 'rgba(139,220,122,0.35)')
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.08).toFixed(3) + ')')
      api.rect(0, 0, W, OY - 4, 'rgba(24,32,40,0.9)')
      api.text('CLAIM ' + claims + '/12', 8, 10, { size: 12, color: C.dim })
      api.text('TILES ' + tiles, W / 2, 10, { size: 12, color: C.dim, align: 'center' })
      if (combo > 1) api.text('COMBO x' + combo, W - 8, 10, { size: 12, color: C.accent2, align: 'right', weight: 'bold' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.55)')
        api.text('CLAIM FAILED', W / 2, 170, { size: 20, color: C.warn, align: 'center', weight: 'bold' })
      }
    }

    return { update, draw }
  },
})
