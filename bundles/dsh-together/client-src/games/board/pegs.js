defineGame({
  id: 'pegs',
  create(api) {
    const C = api.colors
    const N = 3
    const CELL = 70
    const BX = 135
    const BY = 88
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let cells = [1, 1, 1, 1, 1, 1, 0, 0, 0]
    let sel = -1
    let removed = 0
    let msg = 'JUMP A PEG TO CLEAR IT'
    let msgColor = C.dim
    let resetAt = 0
    let anim = null
    let trail = null
    let pop = null
    const fx = []

    function pegCount() {
      let n = 0
      for (let i = 0; i < 9; i += 1) n += cells[i]
      return n
    }

    function rowOf(i) { return Math.floor(i / N) }
    function colOf(i) { return i % N }
    function px(i) { return BX + colOf(i) * CELL + CELL / 2 }
    function py(i) { return BY + rowOf(i) * CELL + CELL / 2 }

    function burst(x, y, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-90, 90), vy: api.rnd(-140, -40), t: 0, c: color })
      while (fx.length > 28) fx.shift()
    }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 270 * dt
        if (p.t > 0.75) fx.splice(k, 1)
      }
      if (anim) { anim.t += dt; if (anim.t > 0.32) anim = null }
      if (trail) { trail.t += dt; if (trail.t > 0.7) trail = null }
      if (pop) { pop.t += dt; if (pop.t > 0.8) pop = null }
    }

    function isJump(a, b) {
      if (a === b || cells[a] !== 1 || cells[b] !== 0) return false
      const dr = rowOf(b) - rowOf(a)
      const dc = colOf(b) - colOf(a)
      const straight = (Math.abs(dr) === 2 && dc === 0) || (dr === 0 && Math.abs(dc) === 2)
      const diag = Math.abs(dr) === 2 && Math.abs(dc) === 2
      if (!straight && !diag) return false
      const mid = (a + b) / 2
      return Math.floor(mid) === mid && cells[mid] === 1
    }

    function hasJump() {
      for (let a = 0; a < 9; a += 1) {
        for (let b = 0; b < 9; b += 1) if (isJump(a, b)) return true
      }
      return false
    }

    function resetBoard() {
      cells = [1, 1, 1, 1, 1, 1, 0, 0, 0]
      sel = -1
      resetAt = 0
      anim = null
      trail = null
      pop = null
      fx.length = 0
      msg = 'BOARD RESET - KEEP GOING'
      msgColor = C.accent
    }

    function click(i) {
      if (resetAt) return
      if (cells[i] === 1) {
        sel = sel === i ? -1 : i
        msg = sel < 0 ? 'PICK A PEG' : 'NOW CLICK AN EMPTY HOLE 2 AWAY'
        msgColor = sel < 0 ? C.dim : C.accent
        return
      }
      if (sel < 0) {
        msg = 'PICK A PEG FIRST'
        msgColor = C.warn
        return
      }
      if (!isJump(sel, i)) {
        msg = 'NOT A JUMP'
        msgColor = C.warn
        return
      }
      const from = sel
      const mid = (sel + i) / 2
      cells[from] = 0
      cells[mid] = 0
      cells[i] = 1
      sel = -1
      removed += 1
      api.progress(1)
      burst(px(mid), py(mid), 8, C.accent2)
      anim = { a: from, b: i, t: 0 }
      trail = { a: from, b: i, t: 0 }
      pop = { text: removed > 1 ? 'NICE x' + removed : 'NICE!', color: C.good, t: 0 }
      msg = 'JUMP! ' + removed + ' PEGS CLEARED'
      msgColor = C.good
      if (pegCount() > 3 && !hasJump()) {
        msg = 'NO MOVES LEFT - NEW BOARD'
        msgColor = C.warn
        resetAt = api.now() + 1200
      }
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down') return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      const c = Math.floor((ev.x - BX) / CELL)
      const r = Math.floor((ev.y - BY) / CELL)
      if (c < 0 || c > 2 || r < 0 || r > 2) return
      click(r * N + c)
    })

    return {
      update(dt) {
        tick(dt)
        if (resetAt && api.now() >= resetAt) resetBoard()
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('PEG SOLITAIRE - DOWN TO 3', 16, 24, { size: 15, color: C.dim, weight: 'bold' })
        api.text('PEGS ' + pegCount(), 400, 24, { size: 15, color: anim ? C.good : C.fg, align: 'center', weight: 'bold' })
        api.rect(BX - 30, BY - 30, CELL * 3 + 60, CELL * 3 + 60, C.panel)
        if (resetAt) {
          const k = Math.floor(api.now() / 160) % 2
          api.rect(BX - 30, BY - 30, CELL * 3 + 60, CELL * 3 + 60, k ? 'rgba(255,122,122,0.16)' : 'rgba(255,122,122,0.05)')
        }
        if (trail) {
          for (let k = 0; k < 5; k += 1) {
            const e = k / 4
            const x = px(trail.a) + (px(trail.b) - px(trail.a)) * e
            const y = py(trail.a) + (py(trail.b) - py(trail.a)) * e - Math.sin(e * Math.PI) * 16
            api.circle(x, y, Math.max(1, 5 - trail.t * 6), 'rgba(139,220,122,0.35)')
          }
        }
        for (let i = 0; i < 9; i += 1) {
          const cx = px(i)
          const cy = py(i)
          api.circle(cx, cy, 24, 'rgba(0,0,0,0.35)')
          if (cells[i] !== 1) continue
          if (anim && anim.b === i && anim.t < 0.32) continue
          api.circle(cx, cy, 19, sel === i ? C.accent : C.accent2)
        }
        if (anim && anim.t < 0.32) {
          const k = Math.min(1, anim.t / 0.32)
          const e = k * k * (3 - 2 * k)
          const x = px(anim.a) + (px(anim.b) - px(anim.a)) * e
          const y = py(anim.a) + (py(anim.b) - py(anim.a)) * e - Math.sin(e * Math.PI) * 34
          api.circle(x, y, 19, C.good)
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        if (pop) api.text(pop.text, 240, 50 - pop.t * 12, { size: 20, color: pop.color, align: 'center', weight: 'bold' })
        api.text(msg, 240, 342, { size: 14, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
