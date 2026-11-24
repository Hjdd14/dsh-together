defineGame({
  id: 'connect4',
  create(api) {
    const C = api.colors
    const COLS = 5
    const ROWS = 4
    const CELL = 58
    const BX = 95
    const BY = 96
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    const FLASH_A = ['rgba(255,255,255,0.42)', 'rgba(232,238,246,0.24)', 'rgba(232,238,246,0.10)']
    let grid = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    let turn = 1
    let aiAt = 0
    let msg = 'DROP A DISC IN A COLUMN'
    let msgColor = C.dim
    let hover = -1
    let resetAt = 0
    let lastMove = -1
    let lastMine = true
    let anim = null
    let flash = null
    let pop = null
    let combo = 0
    let comboT = 0
    const fx = []

    function clearAll() {
      for (let i = 0; i < grid.length; i += 1) grid[i] = 0
      turn = 1
      hover = -1
      resetAt = 0
      aiAt = 0
      lastMove = -1
      anim = null
      flash = null
      pop = null
      combo = 0
      comboT = 0
      fx.length = 0
      msg = 'DROP A DISC IN A COLUMN'
      msgColor = C.dim
    }

    function cx(i) { return BX + (i % COLS) * CELL + CELL / 2 }
    function cy(i) { return BY + Math.floor(i / COLS) * CELL + CELL / 2 }

    function burst(i, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: cx(i), y: cy(i), vx: api.rnd(-90, 90), vy: api.rnd(-130, -30), t: 0, c: color })
      while (fx.length > 30) fx.shift()
    }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 250 * dt
        if (p.t > 0.8) fx.splice(k, 1)
      }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
      if (flash) { flash.t += dt; if (flash.t > 0.5) flash = null }
      if (anim) { anim.t += dt; if (anim.t > 0.34) anim = null }
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0 }
    }

    function dropRow(b, c) {
      for (let r = ROWS - 1; r >= 0; r -= 1) if (!b[r * COLS + c]) return r
      return -1
    }

    function lineOf(b, m) {
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          if (b[r * COLS + c] !== m) continue
          for (let d = 0; d < 4; d += 1) {
            const dr = dirs[d][0]
            const dc = dirs[d][1]
            const r2 = r + dr * 2
            const c2 = c + dc * 2
            if (r2 < 0 || r2 >= ROWS || c2 < 0 || c2 >= COLS) continue
            if (b[(r + dr) * COLS + (c + dc)] !== m) continue
            if (b[r2 * COLS + c2] !== m) continue
            return [r * COLS + c, (r + dr) * COLS + (c + dc), r2 * COLS + c2]
          }
        }
      }
      return null
    }

    // A completed 3-line clears off the board so the goal can be scored repeatedly (once per line).
    function scoreLine(m) {
      const L = lineOf(grid, m)
      if (!L) return false
      for (let k = 0; k < 3; k += 1) {
        burst(L[k], 6, m === 1 ? C.good : C.warn)
        grid[L[k]] = 0
      }
      flash = { cells: [L[0], L[1], L[2]], t: 0 }
      return true
    }

    function hasRoom() {
      for (let i = 0; i < grid.length; i += 1) if (!grid[i]) return true
      return false
    }

    function afterMove() {
      if (!hasRoom()) {
        msg = 'BOARD RESET'
        msgColor = C.dim
        resetAt = api.now() + 900
      }
    }

    api.onPointer(function (ev) {
      if (resetAt) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) { hover = -1; return }
      const c = Math.floor((ev.x - BX) / CELL)
      const onBoard = ev.y > BY - 30 && ev.y < BY + ROWS * CELL && c >= 0 && c < COLS
      if (ev.type === 'move') {
        hover = onBoard ? c : -1
        return
      }
      if (ev.type !== 'down' || turn !== 1 || !onBoard) return
      const r = dropRow(grid, c)
      if (r < 0) {
        msg = 'COLUMN FULL'
        msgColor = C.warn
        return
      }
      const i = r * COLS + c
      grid[i] = 1
      lastMove = i
      lastMine = true
      anim = { i: i, t: 0 }
      if (scoreLine(1)) {
        api.progress(1)
        combo += 1
        comboT = 4
        msg = combo > 1 ? 'COMBO x' + combo + ' - LINE CLEARED' : 'THREE! LINE CLEARED'
        msgColor = C.good
        pop = { text: combo > 1 ? 'COMBO x' + combo : 'NICE +1', color: C.good, t: 0 }
      } else {
        msg = 'AI THINKS...'
        msgColor = C.dim
      }
      if (hasRoom()) {
        turn = 2
        aiAt = api.now() + 420
      } else afterMove()
    })

    // Weak AI: 30% one-step check for its own 3 or to block yours, else random column.
    function aiDrop() {
      const cols = []
      for (let c = 0; c < COLS; c += 1) if (dropRow(grid, c) >= 0) cols.push(c)
      if (!cols.length) { turn = 1; return }
      let choice = -1
      if (api.rng() >= 0.7) {
        for (let k = 0; k < cols.length && choice < 0; k += 1) {
          const c = cols[k]
          const r = dropRow(grid, c)
          grid[r * COLS + c] = 2
          if (lineOf(grid, 2)) choice = c
          grid[r * COLS + c] = 0
        }
        for (let k = 0; k < cols.length && choice < 0; k += 1) {
          const c = cols[k]
          const r = dropRow(grid, c)
          grid[r * COLS + c] = 1
          if (lineOf(grid, 1)) choice = c
          grid[r * COLS + c] = 0
        }
      }
      if (choice < 0) choice = api.pick(cols)
      const row = dropRow(grid, choice)
      const i = row * COLS + choice
      grid[i] = 2
      lastMove = i
      lastMine = false
      anim = { i: i, t: 0 }
      if (scoreLine(2)) {
        msg = 'AI LINE CLEARED'
        msgColor = C.warn
        combo = 0
        comboT = 0
      } else {
        msg = 'YOUR TURN'
        msgColor = C.dim
      }
      if (hasRoom()) turn = 1
      else afterMove()
    }

    return {
      update(dt) {
        tick(dt)
        if (resetAt && api.now() >= resetAt) { clearAll(); return }
        if (!resetAt && turn === 2) {
          if (!aiAt) aiAt = api.now() + 260
          else if (api.now() >= aiAt) { aiAt = 0; aiDrop() }
        }
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('CONNECT 3', 16, 24, { size: 16, color: C.dim, weight: 'bold' })
        if (hover >= 0 && !resetAt) api.rect(BX + hover * CELL, BY - 26, CELL, ROWS * CELL + 26, 'rgba(106,169,255,0.16)')
        api.rect(BX - 8, BY - 8, COLS * CELL + 16, ROWS * CELL + 16, C.panel)
        for (let r = 0; r < ROWS; r += 1) {
          for (let c = 0; c < COLS; c += 1) {
            api.circle(BX + c * CELL + CELL / 2, BY + r * CELL + CELL / 2, 22, 'rgba(0,0,0,0.4)')
          }
        }
        if (flash) {
          const a = FLASH_A[Math.min(2, Math.floor(flash.t / 0.17))]
          for (let k = 0; k < 3; k += 1) {
            const i = flash.cells[k]
            api.circle(cx(i), cy(i), 26, a)
          }
        }
        if (lastMove >= 0) api.circle(cx(lastMove), cy(lastMove), 26, lastMine ? 'rgba(106,169,255,0.22)' : 'rgba(255,207,92,0.22)')
        for (let i = 0; i < grid.length; i += 1) {
          const v = grid[i]
          if (!v) continue
          let dy = 0
          if (anim && anim.i === i) {
            const k = Math.min(1, anim.t / 0.3)
            dy = -(Math.floor(i / COLS) + 1) * CELL * (1 - k) * (1 - k)
          }
          api.circle(cx(i), cy(i) + dy, 22, v === 1 ? C.accent : C.warn)
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.6 * (1 - fx[k].t / 0.8), fx[k].c)
        const yours = !resetAt && turn === 1
        api.rect(340, 12, 124, 26, yours ? C.good : C.panel)
        if (yours) {
          api.text('YOUR TURN', 402, 25, { size: 12, color: C.bg, align: 'center', weight: 'bold' })
        } else {
          api.text('AI', 372, 25, { size: 11, color: C.dim, weight: 'bold' })
          for (let k = 0; k < 3; k += 1) {
            const on = Math.floor(api.now() / 200) % 3 === k
            api.circle(390 + k * 12, 25, on ? 4 : 2.5, on ? C.accent2 : C.dim)
          }
        }
        if (pop) api.text(pop.text, 240, 52 - pop.t * 12, { size: 22, color: pop.color, align: 'center', weight: 'bold' })
        else if (combo > 1 && comboT > 0) api.text('COMBO x' + combo, 240, 52, { size: 15, color: C.accent2, align: 'center', weight: 'bold' })
        api.text(msg, 240, 342, { size: 14, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
