defineGame({
  id: 'checkers',
  create(api) {
    const C = api.colors
    const N = 6
    const CELL = 46
    const BX = 102
    const BY = 56
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let grid = []
    let sel = -1
    let turn = 1
    let aiAt = 0
    let taken = 0
    let msg = 'CLICK A DISC, THEN A TARGET'
    let msgColor = C.dim
    let resetAt = 0
    let over = false
    let combo = 0
    let comboT = 0
    let anim = null
    let trail = null
    let pop = null
    const fx = []

    function newBoard() {
      grid = []
      for (let i = 0; i < N * N; i += 1) grid.push(0)
      grid[4 * N + 0] = 1
      grid[4 * N + 2] = 1
      grid[4 * N + 4] = 1
      grid[5 * N + 1] = 1
      grid[5 * N + 3] = 1
      grid[5 * N + 5] = 1
      grid[0] = 2
      grid[2] = 2
      grid[4] = 2
      grid[1 * N + 1] = 2
      grid[1 * N + 3] = 2
      grid[1 * N + 5] = 2
      sel = -1
      turn = 1
      aiAt = 0
      taken = 0
      over = false
      resetAt = 0
      combo = 0
      comboT = 0
      anim = null
      trail = null
      pop = null
      fx.length = 0
      msg = 'CLICK A DISC, THEN A TARGET'
      msgColor = C.dim
    }
    newBoard()

    function inside(r, c) { return r >= 0 && r < N && c >= 0 && c < N }
    function dark(r, c) { return (r + c) % 2 === 0 }
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
      if (anim) { anim.t += dt; if (anim.t > 0.26) anim = null }
      if (trail) { trail.t += dt; if (trail.t > 0.7) trail = null }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0 }
    }

    function targets(i) {
      const r = Math.floor(i / N)
      const c = i % N
      const me = grid[i]
      const forward = me === 1 ? -1 : 1
      const out = []
      for (let dc = -1; dc <= 1; dc += 2) {
        const r1 = r + forward
        const c1 = c + dc
        if (inside(r1, c1) && grid[r1 * N + c1] === 0) out.push({ i: r1 * N + c1, over: -1 })
      }
      for (let dr = -1; dr <= 1; dr += 2) {
        for (let dc = -1; dc <= 1; dc += 2) {
          const r1 = r + dr
          const c1 = c + dc
          const r2 = r + dr * 2
          const c2 = c + dc * 2
          if (!inside(r2, c2)) continue
          const mid = grid[r1 * N + c1]
          if (mid && mid !== me && grid[r2 * N + c2] === 0) out.push({ i: r2 * N + c2, over: r1 * N + c1 })
        }
      }
      return out
    }

    function apply(from, mv) {
      const me = grid[from]
      grid[mv.i] = me
      grid[from] = 0
      anim = { from: from, to: mv.i, t: 0 }
      trail = { from: from, to: mv.i, t: 0 }
      if (mv.over >= 0) {
        grid[mv.over] = 0
        return true
      }
      return false
    }

    function countOf(v) {
      let n = 0
      for (let i = 0; i < N * N; i += 1) if (grid[i] === v) n += 1
      return n
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || over || resetAt || turn !== 1) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      const c = Math.floor((ev.x - BX) / CELL)
      const r = Math.floor((ev.y - BY) / CELL)
      if (!inside(r, c) || !dark(r, c)) return
      const i = r * N + c
      if (grid[i] === 1) {
        sel = sel === i ? -1 : i
        msg = sel < 0 ? 'CLICK A DISC' : 'NOW CLICK A TARGET'
        msgColor = sel < 0 ? C.dim : C.accent
        return
      }
      if (sel < 0) {
        msg = 'SELECT YOUR DISC FIRST'
        msgColor = C.warn
        return
      }
      const list = targets(sel)
      let mv = null
      for (let k = 0; k < list.length; k += 1) if (list[k].i === i) mv = list[k]
      if (!mv) {
        msg = 'ILLEGAL TARGET'
        msgColor = C.warn
        return
      }
      const captured = apply(sel, mv)
      sel = -1
      if (captured) {
        taken += 1
        combo += 1
        comboT = 5
        api.progress(1)
        burst(i, 8, C.good)
        pop = { text: combo > 1 ? 'COMBO x' + combo : 'NICE!', color: C.good, t: 0 }
        msg = 'CAPTURE! ' + taken + ' TAKEN'
        msgColor = C.good
        if (countOf(2) === 0) {
          msg = 'ALL AI DISCS GONE'
          over = true
          return
        }
      } else {
        combo = 0
        comboT = 0
        msg = 'AI MOVES'
        msgColor = C.dim
      }
      turn = 2
      aiAt = api.now() + 430
    })

    // Weak AI: 70% random legal action, 30% jump when possible.
    function aiPlay() {
      const acts = []
      for (let i = 0; i < N * N; i += 1) {
        if (grid[i] !== 2) continue
        const list = targets(i)
        for (let k = 0; k < list.length; k += 1) acts.push({ from: i, mv: list[k] })
      }
      if (!acts.length) {
        msg = 'AI STUCK - YOUR TURN'
        msgColor = C.accent
        turn = 1
        return
      }
      let act = api.pick(acts)
      if (api.rng() >= 0.7) {
        for (let k = 0; k < acts.length; k += 1) {
          if (acts[k].mv.over >= 0) {
            act = acts[k]
            break
          }
        }
      }
      const got = apply(act.from, act.mv)
      if (got) {
        burst(act.mv.i, 7, C.warn)
        msg = 'AI CAPTURED ONE'
        msgColor = C.warn
        combo = 0
        comboT = 0
      } else {
        msg = 'YOUR TURN'
        msgColor = C.dim
      }
      if (countOf(1) === 0) {
        msg = 'WIPED OUT - NEW BOARD'
        msgColor = C.warn
        resetAt = api.now() + 1300
        return
      }
      turn = 1
    }

    return {
      update(dt) {
        tick(dt)
        if (resetAt && api.now() >= resetAt) { newBoard(); return }
        if (!over && !resetAt && turn === 2) {
          if (!aiAt) aiAt = api.now() + 240
          else if (api.now() >= aiAt) { aiAt = 0; aiPlay() }
        }
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('CHECKERS - CAPTURE 2', 16, 22, { size: 14, color: C.dim, weight: 'bold' })
        api.text('TAKEN ' + taken, 16, 40, { size: 12, color: anim ? C.good : C.fg, weight: 'bold' })
        for (let r = 0; r < N; r += 1) {
          for (let c = 0; c < N; c += 1) {
            const x = BX + c * CELL
            const y = BY + r * CELL
            api.rect(x, y, CELL - 2, CELL - 2, dark(r, c) ? 'rgba(143,160,180,0.18)' : 'rgba(0,0,0,0.25)')
          }
        }
        if (trail) {
          for (let k = 0; k < 4; k += 1) {
            const e = k / 3
            const x = px(trail.from) + (px(trail.to) - px(trail.from)) * e
            const y = py(trail.from) + (py(trail.to) - py(trail.from)) * e
            api.circle(x, y, Math.max(1, 4 - trail.t * 5), 'rgba(139,220,122,0.30)')
          }
        }
        if (sel >= 0) {
          const list = targets(sel)
          for (let k = 0; k < list.length; k += 1) {
            api.circle(px(list[k].i), py(list[k].i), list[k].over >= 0 ? 9 : 6, list[k].over >= 0 ? C.good : 'rgba(139,220,122,0.55)')
          }
        }
        for (let i = 0; i < N * N; i += 1) {
          const v = grid[i]
          if (sel === i) api.circle(px(i), py(i), 21, C.fg)
          if (!v) continue
          if (anim && anim.to === i && anim.t < 0.26) continue
          api.circle(px(i), py(i), 17, v === 1 ? C.accent : C.warn)
        }
        if (anim && anim.t < 0.26) {
          const e = Math.min(1, anim.t / 0.26)
          const x = px(anim.from) + (px(anim.to) - px(anim.from)) * e
          const y = py(anim.from) + (py(anim.to) - py(anim.from)) * e
          api.circle(x, y, 17, grid[anim.to] === 1 ? C.accent : C.warn)
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        const yours = !over && !resetAt && turn === 1
        api.rect(340, 26, 124, 22, yours ? C.good : C.panel)
        if (yours) {
          api.text('YOUR TURN', 402, 37, { size: 11, color: C.bg, align: 'center', weight: 'bold' })
        } else {
          api.text('AI', 374, 37, { size: 11, color: C.dim, weight: 'bold' })
          for (let k = 0; k < 3; k += 1) {
            const on = Math.floor(api.now() / 200) % 3 === k
            api.circle(392 + k * 12, 37, on ? 4 : 2.5, on ? C.accent2 : C.dim)
          }
        }
        if (pop) api.text(pop.text, 240, 24 - pop.t * 8, { size: 16, color: pop.color, align: 'center', weight: 'bold' })
        else if (combo > 1 && comboT > 0) api.text('COMBO x' + combo, 240, 44, { size: 13, color: C.accent2, align: 'center', weight: 'bold' })
        api.text(msg, 240, 352, { size: 12, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
