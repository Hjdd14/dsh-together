defineGame({
  id: 'battleship',
  create(api) {
    const C = api.colors
    const N = 5
    const CELL = 52
    const BX = 128
    const BY = 78
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    const SINK_A = ['rgba(255,122,122,0.55)', 'rgba(255,122,122,0.30)', 'rgba(255,122,122,0.12)']
    const SONAR_A = ['rgba(106,169,255,0.10)', 'rgba(106,169,255,0.05)', 'rgba(106,169,255,0.025)']
    let ships = []
    let shot = []
    let shell = null
    let flash = null
    let pop = null
    let combo = 0
    let comboT = 0
    let sunk = 0
    let msg = 'CLICK A CELL TO FIRE'
    let msgColor = C.dim
    const fx = []

    function px(i) { return BX + (i % N) * CELL + CELL / 2 }
    function py(i) { return BY + Math.floor(i / N) * CELL + CELL / 2 }

    function freeRun(used) {
      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c + 2 < N; c += 1) {
          const cells = [r * N + c, r * N + c + 1, r * N + c + 2]
          let ok = true
          for (let k = 0; k < 3; k += 1) if (used[cells[k]]) ok = false
          if (ok) return cells
        }
      }
      for (let c = 0; c < N; c += 1) {
        for (let r = 0; r + 2 < N; r += 1) {
          const cells = [r * N + c, (r + 1) * N + c, (r + 2) * N + c]
          let ok = true
          for (let k = 0; k < 3; k += 1) if (used[cells[k]]) ok = false
          if (ok) return cells
        }
      }
      return null
    }

    function reset() {
      ships = []
      shot = []
      for (let i = 0; i < N * N; i += 1) shot.push(0)
      const used = []
      for (let i = 0; i < N * N; i += 1) used.push(false)
      let guard = 0
      while (ships.length < 2 && guard < 40) {
        guard += 1
        const horiz = api.rng() < 0.5
        const r0 = api.irnd(0, horiz ? N - 1 : N - 3)
        const c0 = api.irnd(0, horiz ? N - 3 : N - 1)
        const cells = []
        for (let k = 0; k < 3; k += 1) cells.push(horiz ? r0 * N + c0 + k : (r0 + k) * N + c0)
        let ok = true
        for (let k = 0; k < 3; k += 1) if (used[cells[k]]) ok = false
        if (ok) {
          for (let k = 0; k < 3; k += 1) used[cells[k]] = true
          ships.push({ cells: cells, hits: 0, sunk: false })
        }
      }
      while (ships.length < 2) {
        const run = freeRun(used)
        if (!run) break
        for (let k = 0; k < 3; k += 1) used[run[k]] = true
        ships.push({ cells: run, hits: 0, sunk: false })
      }
      shell = null
      flash = null
      pop = null
      combo = 0
      comboT = 0
      sunk = 0
      fx.length = 0
      msg = 'CLICK A CELL TO FIRE'
      msgColor = C.dim
    }
    reset()

    function burst(i, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: px(i), y: py(i), vx: api.rnd(-90, 90), vy: api.rnd(-130, -30), t: 0, c: color })
      while (fx.length > 28) fx.shift()
    }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 260 * dt
        if (p.t > 0.75) fx.splice(k, 1)
      }
      if (flash) { flash.t += dt; if (flash.t > 0.6) flash = null }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0 }
      if (shell) {
        shell.t += dt
        if (shell.t >= 0.3) {
          const i = shell.cell
          shell = null
          resolve(i)
        }
      }
    }

    function shipAt(i) {
      for (let s = 0; s < ships.length; s += 1) {
        if (ships[s].sunk) continue
        for (let k = 0; k < ships[s].cells.length; k += 1) if (ships[s].cells[k] === i) return ships[s]
      }
      return null
    }

    function resolve(i) {
      const s = shipAt(i)
      if (!s) {
        shot[i] = 1
        combo = 0
        comboT = 0
        burst(i, 5, C.accent)
        msg = 'MISS - KEEP FIRING'
        msgColor = C.dim
        pop = { text: 'MISS', color: C.dim, t: 0 }
        return
      }
      shot[i] = 2
      s.hits += 1
      combo += 1
      comboT = 3.5
      burst(i, 7, C.warn)
      if (s.hits >= s.cells.length) {
        s.sunk = true
        sunk += 1
        flash = { cells: s.cells, t: 0 }
        for (let k = 0; k < s.cells.length; k += 1) burst(s.cells[k], 4, C.good)
        pop = { text: 'SUNK!', color: C.good, t: 0 }
        msg = 'SHIP SUNK - ' + sunk + ' DOWN'
        msgColor = C.good
        api.progress(1)
        return
      }
      msg = 'HIT! ' + s.hits + '/3'
      msgColor = C.warn
      pop = { text: combo > 1 ? 'COMBO x' + combo : 'HIT', color: C.accent2, t: 0 }
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || shell) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      const c = Math.floor((ev.x - BX) / CELL)
      const r = Math.floor((ev.y - BY) / CELL)
      if (c < 0 || c >= N || r < 0 || r >= N) return
      const i = r * N + c
      if (shot[i]) {
        msg = 'ALREADY FIRED THERE'
        msgColor = C.dim
        return
      }
      shell = { cell: i, t: 0 }
      msg = 'FIRE!'
      msgColor = C.accent2
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
        api.text('BATTLESHIP - SINK 2', 16, 24, { size: 15, color: C.dim, weight: 'bold' })
        api.text('SUNK ' + sunk, 400, 24, { size: 15, color: sunk > 0 ? C.good : C.fg, align: 'center', weight: 'bold' })
        const sk = Math.floor((api.now() % 2400) / 800)
        api.circle(258, 208, 60 + sk * 54, SONAR_A[sk])
        api.rect(BX - 10, BY - 10, N * CELL + 20, N * CELL + 20, C.panel)
        for (let i = 0; i < N * N; i += 1) {
          const x = BX + (i % N) * CELL
          const y = BY + Math.floor(i / N) * CELL
          api.rect(x + 2, y + 2, CELL - 4, CELL - 4, shot[i] ? 'rgba(0,0,0,0.42)' : 'rgba(143,160,180,0.13)')
          if (shot[i] === 1) api.circle(px(i), py(i), 5, 'rgba(143,160,180,0.75)')
          if (shot[i] === 2) api.circle(px(i), py(i), 14, C.warn)
        }
        if (flash) {
          const a = SINK_A[Math.min(2, Math.floor(flash.t / 0.2))]
          for (let k = 0; k < flash.cells.length; k += 1) {
            const i = flash.cells[k]
            api.rect(BX + (i % N) * CELL + 2, BY + Math.floor(i / N) * CELL + 2, CELL - 4, CELL - 4, a)
          }
        }
        if (shell) {
          const k = Math.min(1, shell.t / 0.3)
          api.circle(px(shell.cell), py(shell.cell) - 80 * (1 - k) * (1 - k), 6, C.accent2)
          api.circle(px(shell.cell), py(shell.cell), 18 + 6 * k, 'rgba(255,207,92,0.35)')
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        if (pop) api.text(pop.text, 240, 46 - pop.t * 10, { size: 20, color: pop.color, align: 'center', weight: 'bold' })
        else if (combo > 1 && comboT > 0) api.text('COMBO x' + combo, 240, 46, { size: 14, color: C.accent2, align: 'center', weight: 'bold' })
        api.text(msg, 240, 350, { size: 13, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
