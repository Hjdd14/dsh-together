defineGame({
  id: 'chessonce',
  create(api) {
    const C = api.colors
    const N = 5
    const CELL = 52
    const BX = 110
    const BY = 62
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    const MATES = [
      [['K', 1, 2, 1], ['Q', 1, 1, 4], ['K', 2, 0, 0]],
      [['K', 1, 1, 2], ['R', 1, 4, 0], ['K', 2, 0, 4]],
      [['K', 1, 2, 0], ['Q', 1, 4, 1], ['K', 2, 0, 0]],
    ]
    let pieces = []
    let sel = -1
    let moves = []
    let anim = null
    let flash = null
    let pop = null
    let won = false
    let tries = 0
    let sol = null
    let msg = 'CLICK A PIECE, THEN A SQUARE'
    let msgColor = C.dim
    const fx = []

    function cellX(c) { return BX + c * CELL + CELL / 2 }
    function cellY(r) { return BY + r * CELL + CELL / 2 }

    function burst(r, c, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: cellX(c), y: cellY(r), vx: api.rnd(-90, 90), vy: api.rnd(-130, -30), t: 0, c: color })
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
      if (anim) { anim.t += dt; if (anim.t > 0.26) anim = null }
      if (flash) { flash.t += dt; if (flash.t > 0.7) flash = null }
      if (pop) { pop.t += dt; if (pop.t > 0.9) pop = null }
    }

    function at(r, c) {
      for (let i = 0; i < pieces.length; i += 1) if (pieces[i].r === r && pieces[i].c === c) return i
      return -1
    }

    function kingOf(side) {
      for (let i = 0; i < pieces.length; i += 1) if (pieces[i].s === side && pieces[i].t === 'K') return i
      return -1
    }

    function blocked(r, c, skip) {
      const j = at(r, c)
      return j >= 0 && j !== skip
    }

    function attacks(p, r, c, skip) {
      const dr = r - p.r
      const dc = c - p.c
      if (p.t === 'K') return Math.max(Math.abs(dr), Math.abs(dc)) === 1
      const straight = (dr === 0 && dc !== 0) || (dc === 0 && dr !== 0)
      const diag = Math.abs(dr) === Math.abs(dc) && dr !== 0
      const can = p.t === 'Q' ? straight || diag : straight
      if (!can) return false
      const sr = Math.sign(dr)
      const sc = Math.sign(dc)
      let rr = p.r + sr
      let cc = p.c + sc
      let guard = 0
      while ((rr !== r || cc !== c) && guard < 12) {
        guard += 1
        if (blocked(rr, cc, skip)) return false
        rr += sr
        cc += sc
      }
      return guard < 12
    }

    function attackedBy(r, c, side, skip) {
      for (let i = 0; i < pieces.length; i += 1) {
        if (pieces[i].s !== side || i === skip) continue
        if (attacks(pieces[i], r, c, skip)) return true
      }
      return false
    }

    function mated(skip) {
      const bk = kingOf(2)
      if (bk < 0) return true
      const kp = pieces[bk]
      if (!attackedBy(kp.r, kp.c, 1, skip)) return false
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (!dr && !dc) continue
          const r = kp.r + dr
          const c = kp.c + dc
          if (r < 0 || r >= N || c < 0 || c >= N) continue
          const j = at(r, c)
          if (j >= 0 && pieces[j].s === 2) continue
          if (j >= 0) {
            if (!attackedBy(r, c, 1, j)) return false
          } else if (!attackedBy(r, c, 1, skip)) return false
        }
      }
      return true
    }

    function movesFor(pi) {
      const p = pieces[pi]
      const out = []
      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c < N; c += 1) {
          if (r === p.r && c === p.c) continue
          const j = at(r, c)
          if (j >= 0) {
            if (pieces[j].s === p.s) continue
            if (pieces[j].t === 'K') continue
          }
          if (attacks(p, r, c, -1)) out.push({ r: r, c: c })
        }
      }
      return out
    }

    function findSolution() {
      for (let i = 0; i < pieces.length; i += 1) {
        if (pieces[i].s !== 1) continue
        const list = movesFor(i)
        for (let k = 0; k < list.length; k += 1) {
          const p = pieces[i]
          const fr = p.r
          const fc = p.c
          p.r = list[k].r
          p.c = list[k].c
          const isMate = mated(-1)
          p.r = fr
          p.c = fc
          if (isMate) return { pi: i, r: list[k].r, c: list[k].c }
        }
      }
      return null
    }

    function setup() {
      const pick = MATES[api.irnd(0, MATES.length - 1)]
      pieces = []
      for (let k = 0; k < pick.length; k += 1) {
        pieces.push({ t: pick[k][0], s: pick[k][1], r: pick[k][2], c: pick[k][3] })
      }
      sel = -1
      moves = []
      anim = null
      flash = null
      pop = null
      won = false
      tries = 0
      fx.length = 0
      msg = 'CLICK A PIECE, THEN A SQUARE'
      msgColor = C.dim
      sol = findSolution()
    }
    setup()

    function attempt(r, c) {
      const p = pieces[sel]
      let ok = false
      for (let k = 0; k < moves.length; k += 1) if (moves[k].r === r && moves[k].c === c) ok = true
      if (!ok) {
        msg = 'ILLEGAL MOVE'
        msgColor = C.warn
        return
      }
      const fr = p.r
      const fc = p.c
      p.r = r
      p.c = c
      tries += 1
      anim = { pi: sel, fromR: fr, fromC: fc, t: 0 }
      if (mated(-1)) {
        won = true
        // Capturing the king removes it, so kingOf(2) can be -1 here; treat that as
        // "the mate lands on the captured square" instead of reading pieces[-1].
        const kingIndex = kingOf(2)
        const bk = kingIndex >= 0 ? pieces[kingIndex] : undefined
        pop = { text: 'MATE!', color: C.good, t: 0 }
        flash = { cells: bk ? [{ r: r, c: c }, { r: bk.r, c: bk.c }] : [{ r: r, c: c }], t: 0 }
        burst(r, c, 9, C.good)
        if (bk) burst(bk.r, bk.c, 9, C.good)
        msg = 'MATE IN ONE - SOLVED'
        msgColor = C.good
        api.progress(1)
        return
      }
      const blackKing = kingOf(2)
      const check = blackKing >= 0 ? attackedBy(pieces[blackKing].r, pieces[blackKing].c, 1, -1) : false
      p.r = fr
      p.c = fc
      anim = null
      sel = -1
      moves = []
      msg = check ? 'CHECK - BUT NOT MATE' : 'NOT MATE - TRY AGAIN'
      msgColor = C.warn
      pop = { text: check ? 'CHECK!' : 'NOT MATE', color: check ? C.accent2 : C.warn, t: 0 }
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || won) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      const c = Math.floor((ev.x - BX) / CELL)
      const r = Math.floor((ev.y - BY) / CELL)
      if (r < 0 || r >= N || c < 0 || c >= N) return
      const j = at(r, c)
      if (j >= 0 && pieces[j].s === 1) {
        sel = j
        moves = movesFor(j)
        msg = moves.length ? 'PICK A DESTINATION' : 'NO MOVES FOR THAT PIECE'
        msgColor = moves.length ? C.accent : C.warn
        return
      }
      if (sel >= 0 && !anim) attempt(r, c)
    })

    function glyph(p) {
      return p.t === 'K' ? 'K' : p.t === 'Q' ? 'Q' : 'R'
    }

    return {
      update(dt) {
        tick(dt)
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('MATE IN ONE - SOLVE IT', 16, 22, { size: 14, color: C.dim, weight: 'bold' })
        api.text('TRIES ' + tries, 402, 22, { size: 13, color: C.fg, align: 'center', weight: 'bold' })
        api.rect(BX - 8, BY - 8, N * CELL + 16, N * CELL + 16, C.panel)
        for (let r = 0; r < N; r += 1) {
          for (let c = 0; c < N; c += 1) {
            api.rect(BX + c * CELL + 2, BY + r * CELL + 2, CELL - 4, CELL - 4, 'rgba(0,0,0,0.26)')
          }
        }
        if (sel >= 0) api.circle(cellX(pieces[sel].c), cellY(pieces[sel].r), 23, 'rgba(232,238,246,0.20)')
        for (let k = 0; k < moves.length; k += 1) {
          const mv = moves[k]
          api.circle(cellX(mv.c), cellY(mv.r), 6, 'rgba(139,220,122,0.55)')
        }
        if (tries >= 3 && sol && !won) {
          const pulse = 0.5 + 0.5 * Math.sin(api.now() / 220)
          const hp = pieces[sol.pi]
          api.circle(cellX(hp.c), cellY(hp.r), 24 + pulse * 4, 'rgba(255,207,92,0.28)')
        }
        if (flash) {
          const a = flash.t < 0.3 ? 'rgba(139,220,122,0.45)' : 'rgba(139,220,122,0.16)'
          for (let k = 0; k < flash.cells.length; k += 1) {
            const f = flash.cells[k]
            api.rect(BX + f.c * CELL + 2, BY + f.r * CELL + 2, CELL - 4, CELL - 4, a)
          }
        }
        for (let i = 0; i < pieces.length; i += 1) {
          const p = pieces[i]
          if (anim && anim.pi === i && anim.t < 0.26) continue
          api.circle(cellX(p.c), cellY(p.r), 18, p.s === 1 ? C.accent : C.warn)
          api.text(glyph(p), cellX(p.c), cellY(p.r) + 1, { size: 18, color: C.bg, align: 'center', weight: 'bold' })
        }
        if (anim && anim.t < 0.26) {
          const p = pieces[anim.pi]
          const e = Math.min(1, anim.t / 0.26)
          const x = cellX(anim.fromC) + (cellX(p.c) - cellX(anim.fromC)) * e
          const y = cellY(anim.fromR) + (cellY(p.r) - cellY(anim.fromR)) * e
          api.circle(x, y, 18, C.accent)
          api.text(glyph(p), x, y + 1, { size: 18, color: C.bg, align: 'center', weight: 'bold' })
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        if (pop) api.text(pop.text, 240, 44 - pop.t * 10, { size: 22, color: pop.color, align: 'center', weight: 'bold' })
        api.text('white K/Q/R vs black K', 240, 336, { size: 11, color: C.dim, align: 'center' })
        api.text(msg, 240, 352, { size: 13, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
