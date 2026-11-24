defineGame({
  id: 'reversi',
  create(api) {
    const C = api.colors
    const N = 4
    const CELL = 62
    const BX = 116
    const BY = 74
    const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let grid = []
    let turn = 1
    let aiAt = 0
    let msg = 'CLICK A SPOT TO FLIP'
    let msgColor = C.dim
    let resetAt = 0
    let over = false
    let scored = false
    let wasAhead = false
    let lastMove = -1
    let anim = null
    let flip = null
    let pop = null
    const fx = []

    function newGame() {
      grid = []
      for (let i = 0; i < N * N; i += 1) grid.push(0)
      grid[1 * N + 1] = 1
      grid[2 * N + 2] = 1
      grid[1 * N + 2] = 2
      grid[2 * N + 1] = 2
      turn = 1
      aiAt = 0
      resetAt = 0
      over = false
      scored = false
      wasAhead = false
      lastMove = -1
      anim = null
      flip = null
      pop = null
      fx.length = 0
      msg = 'CLICK A SPOT TO FLIP'
      msgColor = C.dim
    }
    newGame()

    function inBoard(r, c) { return r >= 0 && r < N && c >= 0 && c < N }
    function px(i) { return BX + (i % N) * CELL + CELL / 2 }
    function py(i) { return BY + Math.floor(i / N) * CELL + CELL / 2 }

    function burst(i, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: px(i), y: py(i), vx: api.rnd(-80, 80), vy: api.rnd(-120, -30), t: 0, c: color })
      while (fx.length > 28) fx.shift()
    }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 250 * dt
        if (p.t > 0.75) fx.splice(k, 1)
      }
      if (anim) { anim.t += dt; if (anim.t > 0.34) anim = null }
      if (flip) { flip.t += dt; if (flip.t > 0.6) flip = null }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
    }

    function flips(r, c, me) {
      const out = []
      if (grid[r * N + c]) return out
      for (let d = 0; d < 8; d += 1) {
        const dr = DIRS[d][0]
        const dc = DIRS[d][1]
        let rr = r + dr
        let cc = c + dc
        const line = []
        while (inBoard(rr, cc) && grid[rr * N + cc] === 3 - me) {
          line.push(rr * N + cc)
          rr += dr
          cc += dc
        }
        if (line.length && inBoard(rr, cc) && grid[rr * N + cc] === me) {
          for (let k = 0; k < line.length; k += 1) out.push(line[k])
        }
      }
      return out
    }

    function movesFor(me) {
      const out = []
      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c < N; c += 1) {
          const f = flips(r, c, me)
          if (f.length) out.push({ i: r * N + c, n: f.length })
        }
      }
      return out
    }

    function counts() {
      let a = 0
      let b = 0
      for (let i = 0; i < N * N; i += 1) {
        if (grid[i] === 1) a += 1
        else if (grid[i] === 2) b += 1
      }
      return [a, b]
    }

    function leadCheck() {
      const cc = counts()
      if (cc[0] > cc[1] && !wasAhead) {
        pop = { text: 'LEAD!', color: C.good, t: 0 }
        for (let i = 0; i < N * N; i += 1) if (grid[i] === 1) burst(i, 1, C.good)
      }
      wasAhead = cc[0] > cc[1]
    }

    function finish() {
      over = true
      const cc = counts()
      if (cc[0] > cc[1]) {
        msg = 'YOU LEAD ' + cc[0] + ':' + cc[1]
        msgColor = C.good
        for (let i = 0; i < N * N; i += 1) if (grid[i] === 1) burst(i, 2, C.good)
        if (!scored) { scored = true; api.progress(1) }
      } else {
        msg = 'BEHIND ' + cc[0] + ':' + cc[1] + ' - NEW GAME'
        msgColor = C.warn
        resetAt = api.now() + 1500
      }
    }

    function endCheck() {
      if (movesFor(1).length || movesFor(2).length) return false
      finish()
      return true
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || turn !== 1 || over || resetAt) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      const c = Math.floor((ev.x - BX) / CELL)
      const r = Math.floor((ev.y - BY) / CELL)
      if (!inBoard(r, c)) return
      const f = flips(r, c, 1)
      if (!f.length) {
        msg = 'NO FLIP THERE'
        msgColor = C.warn
        return
      }
      const i = r * N + c
      grid[i] = 1
      for (let k = 0; k < f.length; k += 1) grid[f[k]] = 1
      lastMove = i
      anim = { i: i, t: 0 }
      flip = { cells: f, t: 0 }
      leadCheck()
      msg = 'AI TURN'
      msgColor = C.dim
      if (endCheck()) return
      if (!movesFor(2).length) {
        msg = 'AI PASSES'
        turn = 1
        return
      }
      turn = 2
      aiAt = api.now() + 450
    })

    // Weak AI: 70% random legal move, 30% greedy (most flips).
    function aiPlay() {
      const opts = movesFor(2)
      if (!opts.length) { turn = 1; return }
      let pickIdx = opts[0].i
      if (api.rng() >= 0.7) {
        let best = opts[0]
        for (let k = 0; k < opts.length; k += 1) if (opts[k].n > best.n) best = opts[k]
        pickIdx = best.i
      } else {
        pickIdx = api.pick(opts).i
      }
      const r = Math.floor(pickIdx / N)
      const c = pickIdx % N
      const f = flips(r, c, 2)
      grid[pickIdx] = 2
      for (let k = 0; k < f.length; k += 1) grid[f[k]] = 2
      lastMove = pickIdx
      anim = { i: pickIdx, t: 0 }
      flip = { cells: f, t: 0 }
      leadCheck()
      if (endCheck()) return
      if (!movesFor(1).length) {
        msg = 'YOU PASS - AI GOES'
        msgColor = C.accent
        turn = 2
        aiAt = api.now() + 450
        return
      }
      msg = 'YOUR TURN'
      msgColor = C.dim
      turn = 1
    }

    return {
      update(dt) {
        tick(dt)
        if (resetAt && api.now() >= resetAt) { newGame(); return }
        if (!over && !resetAt && turn === 2) {
          if (!aiAt) aiAt = api.now() + 260
          else if (api.now() >= aiAt) { aiAt = 0; aiPlay() }
        }
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        const cc = counts()
        api.text('REVERSI 4x4', 16, 24, { size: 15, color: C.dim, weight: 'bold' })
        api.text('YOU ' + cc[0] + '  AI ' + cc[1], 396, 24, { size: 15, color: C.fg, align: 'center', weight: 'bold' })
        api.rect(BX - 8, BY - 8, N * CELL + 16, N * CELL + 16, C.panel)
        for (let r = 0; r < N; r += 1) {
          for (let c = 0; c < N; c += 1) {
            api.rect(BX + c * CELL + 3, BY + r * CELL + 3, CELL - 6, CELL - 6, 'rgba(0,0,0,0.28)')
          }
        }
        if (lastMove >= 0) api.circle(px(lastMove), py(lastMove), 29, 'rgba(232,238,246,0.14)')
        for (let i = 0; i < N * N; i += 1) {
          const v = grid[i]
          if (!v) continue
          let rr = 24
          if (anim && anim.i === i) {
            const k = Math.min(1, anim.t / 0.34)
            rr = 24 * (0.55 + 0.45 * k)
          }
          if (flip) {
            for (let k = 0; k < flip.cells.length; k += 1) {
              if (flip.cells[k] !== i) continue
              const d = flip.t - k * 0.035
              if (d > 0 && d < 0.24) {
                const sq = Math.abs(Math.cos((d / 0.24) * Math.PI))
                rr = 24 * Math.max(0.12, sq)
              }
            }
          }
          api.circle(px(i), py(i), rr, v === 1 ? C.accent : C.accent2)
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        const total = Math.max(1, cc[0] + cc[1])
        const wYou = (N * CELL) * (cc[0] / total)
        api.rect(BX, 328, N * CELL, 7, 'rgba(143,160,180,0.18)')
        api.rect(BX, 328, wYou, 7, C.accent)
        api.rect(BX + wYou, 328, N * CELL - wYou, 7, C.accent2)
        api.text(String(cc[0]), BX - 12, 331, { size: 12, color: C.accent, align: 'center', weight: 'bold' })
        const yours = !over && !resetAt && turn === 1
        api.rect(340, 40, 124, 24, yours ? C.good : C.panel)
        if (yours) {
          api.text('YOUR TURN', 402, 52, { size: 12, color: C.bg, align: 'center', weight: 'bold' })
        } else {
          api.text('AI', 374, 52, { size: 11, color: C.dim, weight: 'bold' })
          for (let k = 0; k < 3; k += 1) {
            const on = Math.floor(api.now() / 200) % 3 === k
            api.circle(392 + k * 12, 52, on ? 4 : 2.5, on ? C.accent2 : C.dim)
          }
        }
        if (pop) api.text(pop.text, 240, 50 - pop.t * 12, { size: 20, color: pop.color, align: 'center', weight: 'bold' })
        api.text(msg, 240, 348, { size: 14, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
