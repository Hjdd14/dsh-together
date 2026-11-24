defineGame({
  id: 'gomoku',
  create(api) {
    const C = api.colors
    const N = 7
    const CELL = 40
    const BX = 100
    const BY = 56
    const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]]
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let grid = []
    let turn = 1
    let aiAt = 0
    let msg = 'CLICK TO PLACE A STONE'
    let msgColor = C.dim
    let over = false
    let resetAt = 0
    let scored = false
    let lastMove = -1
    let lastMine = true
    let anim = null
    let flash = null
    let pop = null
    let hints = []
    const fx = []

    function newBoard() {
      grid = []
      for (let i = 0; i < N * N; i += 1) grid.push(0)
      turn = 1
      aiAt = 0
      over = false
      resetAt = 0
      scored = false
      lastMove = -1
      anim = null
      flash = null
      pop = null
      hints = []
      fx.length = 0
      msg = 'CLICK TO PLACE A STONE'
      msgColor = C.dim
    }
    newBoard()

    function px(i) { return BX + (i % N) * CELL + CELL / 2 }
    function py(i) { return BY + Math.floor(i / N) * CELL + CELL / 2 }

    function burst(i, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: px(i), y: py(i), vx: api.rnd(-90, 90), vy: api.rnd(-130, -30), t: 0, c: color })
      while (fx.length > 30) fx.shift()
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
      if (anim) { anim.t += dt; if (anim.t > 0.34) anim = null }
      if (flash) { flash.t += dt; if (flash.t > 0.6) flash = null }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
    }

    function fiveLine(r, c, m) {
      for (let d = 0; d < 4; d += 1) {
        const dr = DIRS[d][0]
        const dc = DIRS[d][1]
        const line = [r * N + c]
        for (let s = 1; s < 5; s += 1) {
          const rr = r + dr * s
          const cc = c + dc * s
          if (rr < 0 || rr >= N || cc < 0 || cc >= N || grid[rr * N + cc] !== m) break
          line.push(rr * N + cc)
        }
        for (let s = 1; s < 5; s += 1) {
          const rr = r - dr * s
          const cc = c - dc * s
          if (rr < 0 || rr >= N || cc < 0 || cc >= N || grid[rr * N + cc] !== m) break
          line.unshift(rr * N + cc)
        }
        if (line.length >= 5) return line
      }
      return null
    }

    function freeCells() {
      const out = []
      for (let i = 0; i < N * N; i += 1) if (!grid[i]) out.push(i)
      return out
    }

    function place(i, me) {
      grid[i] = me
      const r = Math.floor(i / N)
      const c = i % N
      return fiveLine(r, c, me)
    }

    function refreshHints(i) {
      hints = []
      const r = Math.floor(i / N)
      const c = i % N
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue
          const j = rr * N + cc
          if (!grid[j]) hints.push(j)
        }
      }
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || over || resetAt || turn !== 1) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      const c = Math.floor((ev.x - BX) / CELL)
      const r = Math.floor((ev.y - BY) / CELL)
      if (r < 0 || r >= N || c < 0 || c >= N) return
      const i = r * N + c
      if (grid[i]) return
      const line = place(i, 1)
      lastMove = i
      lastMine = true
      anim = { i: i, t: 0 }
      hints = []
      if (line) {
        over = true
        flash = { cells: line, t: 0 }
        pop = { text: 'FIVE!', color: C.good, t: 0 }
        for (let k = 0; k < line.length; k += 1) burst(line[k], 5, C.good)
        msg = 'FIVE IN A ROW'
        msgColor = C.good
        if (!scored) { scored = true; api.progress(5) }
        return
      }
      turn = 2
      aiAt = api.now() + 380
    })

    // Weak AI: 70% random empty cell, 30% blocks the busiest spot next to your stones.
    function aiPlay() {
      const free = freeCells()
      if (!free.length) { newBoard(); return }
      let idx = -1
      if (api.rng() >= 0.7) {
        let bestScore = -1
        for (let k = 0; k < free.length; k += 1) {
          const i = free[k]
          const r = Math.floor(i / N)
          const c = i % N
          let sc = 0
          for (let dr = -1; dr <= 1; dr += 1) {
            for (let dc = -1; dc <= 1; dc += 1) {
              const rr = r + dr
              const cc = c + dc
              if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue
              const v = grid[rr * N + cc]
              if (v === 1) sc += 3
              else if (v === 2) sc += 1
            }
          }
          sc += api.rng()
          if (sc > bestScore) {
            bestScore = sc
            idx = i
          }
        }
      } else {
        idx = api.pick(free)
      }
      if (idx < 0) idx = free[0]
      const line = place(idx, 2)
      lastMove = idx
      lastMine = false
      anim = { i: idx, t: 0 }
      if (line) {
        over = true
        flash = { cells: line, t: 0 }
        msg = 'AI GOT FIVE - NEW BOARD'
        msgColor = C.warn
        resetAt = api.now() + 1500
        return
      }
      msg = 'YOUR TURN'
      msgColor = C.dim
      turn = 1
    }

    return {
      update(dt) {
        tick(dt)
        if (resetAt && api.now() >= resetAt) { newBoard(); return }
        if (!over && !resetAt && turn === 2) {
          if (!aiAt) aiAt = api.now() + 220
          else if (api.now() >= aiAt) { aiAt = 0; aiPlay() }
        }
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('GOMOKU 7x7', 16, 22, { size: 14, color: C.dim, weight: 'bold' })
        const yours = !over && !resetAt && turn === 1
        api.rect(340, 10, 124, 24, yours ? C.good : C.panel)
        if (yours) {
          api.text('YOUR TURN', 402, 22, { size: 12, color: C.bg, align: 'center', weight: 'bold' })
        } else {
          api.text('AI', 374, 22, { size: 11, color: C.dim, weight: 'bold' })
          for (let k = 0; k < 3; k += 1) {
            const on = Math.floor(api.now() / 200) % 3 === k
            api.circle(392 + k * 12, 22, on ? 4 : 2.5, on ? C.accent2 : C.dim)
          }
        }
        api.rect(BX, BY, N * CELL, N * CELL, C.panel)
        for (let i = 1; i < N; i += 1) {
          api.rect(BX + i * CELL - 1, BY, 2, N * CELL, 'rgba(143,160,180,0.22)')
          api.rect(BX, BY + i * CELL - 1, N * CELL, 2, 'rgba(143,160,180,0.22)')
        }
        if (lastMove >= 0) api.circle(px(lastMove), py(lastMove), 20, lastMine ? 'rgba(106,169,255,0.20)' : 'rgba(255,122,122,0.20)')
        if (yours) {
          for (let k = 0; k < hints.length; k += 1) api.circle(px(hints[k]), py(hints[k]), 4, 'rgba(139,220,122,0.45)')
        }
        if (flash) {
          for (let k = 0; k < flash.cells.length; k += 1) {
            const i = flash.cells[k]
            const a = flash.t < 0.2 ? 'rgba(139,220,122,0.45)' : flash.t < 0.4 ? 'rgba(139,220,122,0.24)' : 'rgba(139,220,122,0.10)'
            api.rect(BX + (i % N) * CELL + 2, BY + Math.floor(i / N) * CELL + 2, CELL - 4, CELL - 4, a)
          }
        }
        for (let i = 0; i < N * N; i += 1) {
          const v = grid[i]
          if (!v) continue
          let dy = 0
          if (anim && anim.i === i) {
            const k = Math.min(1, anim.t / 0.3)
            dy = -26 * (1 - k) * (1 - k)
          }
          api.circle(px(i), py(i) + dy, 15, v === 1 ? C.accent : C.warn)
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        if (pop) api.text(pop.text, 240, 40 - pop.t * 10, { size: 20, color: pop.color, align: 'center', weight: 'bold' })
        api.text(msg, 240, 350, { size: 12, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
