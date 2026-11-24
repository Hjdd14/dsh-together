defineGame({
  id: 'drop7',
  create(api) {
    const C = api.colors
    const COLS = 7
    const ROWS = 6
    const CELL = 44
    const BX = 86
    const BY = 62
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let grid = []
    let next = 4
    let hover = -1
    let flashCells = null
    let pop = null
    let combo = 0
    let comboT = 0
    let msg = 'CLICK A COLUMN TO DROP'
    let msgColor = C.dim
    let dead = false
    const fx = []

    function cellX(c) { return BX + c * CELL + CELL / 2 }
    function cellY(r) { return BY + r * CELL + CELL / 2 }

    function burstAt(i, n, color) {
      const x = cellX(i % COLS)
      const y = cellY(Math.floor(i / COLS))
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-90, 90), vy: api.rnd(-130, -30), t: 0, c: color })
      while (fx.length > 28) fx.shift()
    }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 250 * dt
        if (p.t > 0.7) fx.splice(k, 1)
      }
      if (flashCells) { flashCells.t += dt; if (flashCells.t > 0.45) flashCells = null }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0 }
    }

    function clearBoard() {
      grid = []
      for (let i = 0; i < COLS * ROWS; i += 1) grid.push(0)
      next = api.irnd(1, 7)
      hover = -1
      flashCells = null
      pop = null
      combo = 0
      comboT = 0
      dead = false
      fx.length = 0
      msg = 'CLICK A COLUMN TO DROP'
      msgColor = C.dim
    }
    clearBoard()

    function resolve() {
      let chain = 0
      let cleared = 0
      for (let pass = 0; pass < 12; pass += 1) {
        const marks = []
        for (let r = 0; r < ROWS; r += 1) {
          for (let c = 0; c < COLS; c += 1) {
            const v = grid[r * COLS + c]
            if (!v) continue
            let colN = 0
            for (let rr = 0; rr < ROWS; rr += 1) if (grid[rr * COLS + c]) colN += 1
            let rowN = 0
            for (let cc = 0; cc < COLS; cc += 1) if (grid[r * COLS + cc]) rowN += 1
            if (v === colN || v === rowN) marks.push(r * COLS + c)
          }
        }
        if (!marks.length) break
        chain += 1
        for (let k = 0; k < marks.length; k += 1) {
          burstAt(marks[k], 4, chain > 1 ? C.accent2 : C.good)
          grid[marks[k]] = 0
        }
        cleared += marks.length
        api.score(marks.length * 20 * chain)
        flashCells = { cells: marks, t: 0 }
        combo = chain
        comboT = 2.5
        pop = { text: chain > 1 ? 'CHAIN x' + chain : marks.length + ' CLEAR', color: chain > 1 ? C.accent2 : C.good, t: 0 }
      }
      if (cleared > 0) {
        msg = 'CLEARED ' + cleared
        msgColor = C.good
      }
      let empty = 0
      for (let i = 0; i < grid.length; i += 1) if (!grid[i]) empty += 1
      if (empty === 0) {
        dead = true
        api.lose('stack overflow')
      }
    }

    function dropIn(c) {
      if (dead) return
      let target = -1
      for (let r = ROWS - 1; r >= 0; r -= 1) {
        if (!grid[r * COLS + c]) { target = r; break }
      }
      if (target < 0) {
        msg = 'COLUMN FULL'
        msgColor = C.warn
        return
      }
      grid[target * COLS + c] = next
      burstAt(target * COLS + c, 3, C.accent)
      next = api.irnd(1, 7)
      resolve()
      if (empty() === 0) return
      if (grid[c] !== 0) {
        msg = 'WATCH THE TOP ROW'
        msgColor = C.warn
      }
    }

    function empty() {
      let n = 0
      for (let i = 0; i < grid.length; i += 1) if (!grid[i]) n += 1
      return n
    }

    api.onPointer(function (ev) {
      if (dead) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) { hover = -1; return }
      const c = Math.floor((ev.x - BX) / CELL)
      const inside = c >= 0 && c < COLS && ev.y > BY - 20 && ev.y < BY + ROWS * CELL
      if (ev.type === 'move') {
        hover = inside ? c : -1
        return
      }
      if (ev.type !== 'down' || !inside) return
      dropIn(c)
    })

    return {
      update(dt) {
        tick(dt)
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('DROP7 - MATCH THE COUNT', 16, 24, { size: 14, color: C.dim, weight: 'bold' })
        api.text('NEXT ' + next, 400, 24, { size: 14, color: C.accent2, align: 'center', weight: 'bold' })
        if (hover >= 0) api.rect(BX + hover * CELL, BY - 16, CELL, ROWS * CELL + 16, 'rgba(106,169,255,0.14)')
        api.rect(BX - 8, BY - 8, COLS * CELL + 16, ROWS * CELL + 16, C.panel)
        for (let r = 0; r < ROWS; r += 1) {
          for (let c = 0; c < COLS; c += 1) {
            const i = r * COLS + c
            const v = grid[i]
            const x = BX + c * CELL + 2
            const y = BY + r * CELL + 2
            api.rect(x, y, CELL - 4, CELL - 4, 'rgba(0,0,0,0.28)')
            if (!v) continue
            const top = r === 0
            api.circle(cellX(c), cellY(r), 17, top ? C.warn : v % 2 === 0 ? C.accent : C.accent2)
            api.text(String(v), cellX(c), cellY(r) + 1, { size: 20, color: C.bg, align: 'center', weight: 'bold' })
          }
        }
        if (hover >= 0) {
          const gy = BY + 10
          api.circle(cellX(hover), gy - 26, 15, 'rgba(232,238,246,0.35)')
          api.text(String(next), cellX(hover), gy - 25, { size: 17, color: C.bg, align: 'center', weight: 'bold' })
        }
        if (flashCells) {
          for (let k = 0; k < flashCells.cells.length; k += 1) {
            const i = flashCells.cells[k]
            api.rect(BX + (i % COLS) * CELL + 2, BY + Math.floor(i / COLS) * CELL + 2, CELL - 4, CELL - 4, flashCells.t < 0.2 ? 'rgba(232,238,246,0.5)' : 'rgba(232,238,246,0.18)')
          }
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.7), fx[k].c)
        if (pop) api.text(pop.text, 240, 46 - pop.t * 8, { size: 20, color: pop.color, align: 'center', weight: 'bold' })
        else if (combo > 1 && comboT > 0) api.text('CHAIN x' + combo, 240, 46, { size: 14, color: C.accent2, align: 'center', weight: 'bold' })
        api.text(msg, 240, 348, { size: 12, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
