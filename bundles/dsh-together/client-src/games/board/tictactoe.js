defineGame({
  id: 'tictactoe',
  create(api) {
    const C = api.colors
    const CELL = 78
    const BX = 123
    const BY = 80
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    const WIN_A = ['rgba(139,220,122,0.50)', 'rgba(139,220,122,0.28)', 'rgba(139,220,122,0.12)']
    let board = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    let turn = 1
    let over = false
    let scored = false
    let msg = ''
    let msgColor = C.dim
    let aiAt = 0
    let resetAt = 0
    let lastMove = -1
    let lastMine = true
    let anim = null
    let pop = null
    let flash = null
    const fx = []

    function reset() {
      board = [0, 0, 0, 0, 0, 0, 0, 0, 0]
      turn = 1
      over = false
      scored = false
      msg = ''
      msgColor = C.dim
      aiAt = 0
      resetAt = 0
      lastMove = -1
      anim = null
      pop = null
      flash = null
      fx.length = 0
    }

    function burst(x, y, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-80, 80), vy: api.rnd(-120, -30), t: 0, c: color })
      while (fx.length > 26) fx.shift()
    }

    function cellX(i) { return BX + (i % 3) * CELL + CELL / 2 }
    function cellY(i) { return BY + Math.floor(i / 3) * CELL + CELL / 2 }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 240 * dt
        if (p.t > 0.75) fx.splice(k, 1)
      }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
      if (flash) { flash.t += dt; if (flash.t > 0.5) flash = null }
      if (anim) { anim.t += dt; if (anim.t > 0.4) anim = null }
    }

    function lineOf(b) {
      for (let k = 0; k < LINES.length; k += 1) {
        const L = LINES[k]
        const v = b[L[0]]
        if (v && v === b[L[1]] && v === b[L[2]]) return L
      }
      return null
    }

    function boardFull() {
      for (let i = 0; i < 9; i += 1) if (!board[i]) return false
      return true
    }

    function settle() {
      const L = lineOf(board)
      if (L) {
        over = true
        if (board[L[0]] === 1) {
          msg = 'YOU WIN - SAFE'
          msgColor = C.good
          flash = { cells: L, t: 0 }
          pop = { text: 'NICE!', color: C.good, t: 0 }
          for (let k = 0; k < 3; k += 1) burst(cellX(L[k]), cellY(L[k]), 5, C.good)
          if (!scored) { scored = true; api.progress(1) }
        } else {
          msg = 'AI LINE - RETRY'
          msgColor = C.warn
          flash = { cells: L, t: 0 }
          resetAt = api.now() + 1400
        }
        return
      }
      if (boardFull()) {
        over = true
        msg = 'DRAW - SAFE'
        msgColor = C.good
        pop = { text: 'SAFE DRAW', color: C.accent, t: 0 }
        if (!scored) { scored = true; api.progress(1) }
      }
    }

    // Weak AI: 30% single-step look (take own line, else block one line), 70% random.
    function aiPlay() {
      const free = []
      for (let i = 0; i < 9; i += 1) if (!board[i]) free.push(i)
      if (!free.length) { turn = 1; return }
      let pickIdx = -1
      if (api.rng() >= 0.7) {
        for (let mark = 2; mark >= 1 && pickIdx < 0; mark -= 1) {
          for (let k = 0; k < free.length && pickIdx < 0; k += 1) {
            const i = free[k]
            board[i] = mark
            if (lineOf(board)) pickIdx = i
            board[i] = 0
          }
        }
      }
      if (pickIdx < 0) pickIdx = api.pick(free)
      board[pickIdx] = 2
      lastMove = pickIdx
      lastMine = false
      anim = { i: pickIdx, t: 0 }
      settle()
      if (!over) turn = 1
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || over || resetAt || turn !== 1) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      const c = Math.floor((ev.x - BX) / CELL)
      const r = Math.floor((ev.y - BY) / CELL)
      if (c < 0 || c > 2 || r < 0 || r > 2) return
      const i = r * 3 + c
      if (board[i]) return
      board[i] = 1
      lastMove = i
      lastMine = true
      anim = { i: i, t: 0 }
      settle()
      if (!over) {
        turn = 2
        aiAt = api.now() + 430
      }
    })

    function mark(v, cx, cy) {
      if (v === 1) api.text('X', cx, cy, { size: 50, color: C.accent, align: 'center', weight: 'bold' })
      else if (v === 2) api.text('O', cx, cy, { size: 50, color: C.accent2, align: 'center', weight: 'bold' })
    }

    return {
      update(dt) {
        tick(dt)
        if (resetAt && api.now() >= resetAt) { reset(); return }
        if (!over && turn === 2) {
          if (!aiAt) aiAt = api.now() + 260
          else if (api.now() >= aiAt) { aiAt = 0; aiPlay() }
        }
      },
      draw() {
        api.clear(C.bg)
        const band = BANDS[Math.floor(api.now() / 800) % 4]
        api.rect(0, 0, api.w, 150, band)
        api.rect(0, 210, api.w, 150, BANDS[(Math.floor(api.now() / 800) + 2) % 4])
        api.text('TIC-TAC-TOE', 16, 24, { size: 16, color: C.dim, weight: 'bold' })
        api.rect(BX - 12, BY - 12, CELL * 3 + 24, CELL * 3 + 24, C.panel)
        for (let i = 1; i < 3; i += 1) {
          api.rect(BX + i * CELL - 2, BY, 4, CELL * 3, C.dim)
          api.rect(BX, BY + i * CELL - 2, CELL * 3, 4, C.dim)
        }
        if (flash) {
          const a = WIN_A[Math.min(2, Math.floor(flash.t / 0.17))]
          for (let k = 0; k < 3; k += 1) {
            const i = flash.cells[k]
            api.rect(BX + (i % 3) * CELL + 4, BY + Math.floor(i / 3) * CELL + 4, CELL - 8, CELL - 8, a)
          }
        }
        if (lastMove >= 0) {
          api.circle(cellX(lastMove), cellY(lastMove), 30, lastMine ? 'rgba(106,169,255,0.16)' : 'rgba(255,207,92,0.16)')
        }
        for (let i = 0; i < 9; i += 1) {
          const dy = anim && anim.i === i ? -30 * (1 - Math.min(1, anim.t / 0.34)) * (1 - Math.min(1, anim.t / 0.34)) : 0
          mark(board[i], cellX(i), cellY(i) + dy)
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        const yours = !over && turn === 1
        api.rect(340, 12, 124, 26, yours ? C.good : C.panel)
        if (yours) {
          api.text('YOUR TURN', 402, 25, { size: 12, color: C.bg, align: 'center', weight: 'bold' })
        } else if (!over) {
          api.text('AI', 372, 25, { size: 11, color: C.dim, weight: 'bold' })
          for (let k = 0; k < 3; k += 1) {
            const on = Math.floor(api.now() / 200) % 3 === k
            api.circle(390 + k * 12, 25, on ? 4 : 2.5, on ? C.accent2 : C.dim)
          }
        } else {
          api.text('GAME OVER', 402, 25, { size: 11, color: C.dim, align: 'center', weight: 'bold' })
        }
        if (pop) api.text(pop.text, 240, 40 - pop.t * 10, { size: 20, color: pop.color, align: 'center', weight: 'bold' })
        api.text(msg || 'you are X - click a cell', 240, 342, { size: 14, color: msg ? msgColor : C.dim, align: 'center', weight: 'bold' })
      },
    }
  },
})
