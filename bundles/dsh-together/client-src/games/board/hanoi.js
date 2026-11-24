defineGame({
  id: 'hanoi',
  create(api) {
    const C = api.colors
    const PEG_X = [120, 240, 360]
    const BASE_Y = 300
    const DISC_H = 22
    const PEG_H = 3 * DISC_H + 18
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let pegs = [[3, 2, 1], [], []]
    let sel = -1
    let moves = 0
    let msg = 'CLICK A PEG TO PICK UP A DISC'
    let msgColor = C.dim
    let anim = null
    let pop = null
    const fx = []

    function topOf(pi) {
      return pegs[pi].length ? pegs[pi][pegs[pi].length - 1] : 0
    }

    function widthOf(size) { return 44 + size * 28 }
    function colorOf(size) { return size === 1 ? C.good : size === 2 ? C.accent2 : C.accent }

    function burst(x, y, n) {
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-90, 90), vy: api.rnd(-130, -40), t: 0, c: C.accent })
      while (fx.length > 24) fx.shift()
    }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 260 * dt
        if (p.t > 0.7) fx.splice(k, 1)
      }
      if (anim) { anim.t += dt; if (anim.t > 0.3) anim = null }
      if (pop) { pop.t += dt; if (pop.t > 0.8) pop = null }
    }

    function pick(pi) {
      if (sel < 0) {
        if (!pegs[pi].length) {
          msg = 'EMPTY PEG'
          msgColor = C.warn
          return
        }
        sel = pi
        msg = 'SELECTED - NOW CLICK A TARGET PEG'
        msgColor = C.accent
        return
      }
      if (sel === pi) {
        sel = -1
        msg = 'CANCELLED'
        msgColor = C.dim
        return
      }
      const disc = topOf(sel)
      const landing = topOf(pi)
      if (landing && landing < disc) {
        msg = 'BIG ON SMALL - NOT ALLOWED'
        msgColor = C.warn
        return
      }
      const fromY = BASE_Y - pegs[sel].length * DISC_H + 2
      pegs[sel].pop()
      pegs[pi].push(disc)
      const toY = BASE_Y - pegs[pi].length * DISC_H + 2
      anim = { size: disc, x0: PEG_X[sel] - widthOf(disc) / 2, y0: fromY, peg: pi, t: 0 }
      burst(PEG_X[pi], toY + 8, 6)
      pop = { text: 'MOVE ' + (moves + 1), color: C.good, t: 0 }
      sel = -1
      moves += 1
      api.progress(1)
      msg = 'GOOD MOVE - ' + moves + ' DONE'
      msgColor = C.good
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down') return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      for (let i = 0; i < 3; i += 1) {
        if (Math.abs(ev.x - PEG_X[i]) < 58 && ev.y > 70 && ev.y < BASE_Y + 30) {
          pick(i)
          return
        }
      }
    })

    function disc(size, left, top) {
      api.rect(left, top, widthOf(size), DISC_H - 4, colorOf(size))
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
        api.rect(28, 56, 424, 262, 'rgba(24,32,40,0.6)')
        api.text('HANOI - MOVE 3 DISCS', 16, 24, { size: 15, color: C.dim, weight: 'bold' })
        api.text('MOVES ' + moves, 400, 24, { size: 15, color: anim ? C.good : C.fg, align: 'center', weight: 'bold' })
        api.rect(40, BASE_Y + 2, 400, 10, C.panel)
        const pulse = 0.5 + 0.5 * Math.sin(api.now() / 240)
        for (let i = 0; i < 3; i += 1) {
          if (sel === i) {
            api.rect(PEG_X[i] - 58, BASE_Y + 14, 116, 6, C.accent)
            api.rect(PEG_X[i] - 30 - 26 * pulse, BASE_Y + 26, 60 + 52 * pulse, 4, 'rgba(106,169,255,0.45)')
          }
          api.rect(PEG_X[i] - 5, BASE_Y - PEG_H, 10, PEG_H, C.dim)
          for (let k = 0; k < pegs[i].length; k += 1) {
            if (anim && anim.peg === i && k === pegs[i].length - 1 && anim.t < 0.3) continue
            disc(pegs[i][k], PEG_X[i] - widthOf(pegs[i][k]) / 2, BASE_Y - (k + 1) * DISC_H + 2)
          }
        }
        if (anim && anim.t < 0.3) {
          const k = Math.min(1, anim.t / 0.3)
          const e = k * k * (3 - 2 * k)
          const x = anim.x0 + (PEG_X[anim.peg] - widthOf(anim.size) / 2 - anim.x0) * e
          const y = anim.y0 + (BASE_Y - pegs[anim.peg].length * DISC_H + 2 - anim.y0) * e - Math.sin(e * Math.PI) * 26
          disc(anim.size, x, y)
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.7), fx[k].c)
        if (pop) api.text(pop.text, 240, 120 - pop.t * 14, { size: 22, color: pop.color, align: 'center', weight: 'bold' })
        api.text(msg, 240, 342, { size: 14, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
