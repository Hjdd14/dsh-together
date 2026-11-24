defineGame({
  id: 'mastermind',
  create(api) {
    const C = api.colors
    const PALETTE = [api.colors.accent, api.colors.accent2, api.colors.good, api.colors.warn]
    const LEN = 3
    const TRIES = 6
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let code = [0, 0, 0]
    let slots = [-1, -1, -1]
    let rows = []
    let msg = 'CLICK A SLOT TO CYCLE ITS COLOR'
    let msgColor = C.dim
    let resetAt = 0
    let rowAnim = null
    let slotPop = null
    let won = false
    let scored = false
    let pop = null
    const fx = []

    function newCode() {
      code = [api.irnd(0, 3), api.irnd(0, 3), api.irnd(0, 3)]
      slots = [-1, -1, -1]
      rows = []
      resetAt = 0
      rowAnim = null
      slotPop = null
      won = false
      scored = false
      pop = null
      fx.length = 0
      msg = 'CLICK A SLOT TO CYCLE ITS COLOR'
      msgColor = C.dim
    }
    newCode()

    function burst(x, y, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-90, 90), vy: api.rnd(-130, -30), t: 0, c: color })
      while (fx.length > 26) fx.shift()
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
      if (rowAnim) { rowAnim.t += dt; if (rowAnim.t > 0.9) rowAnim = null }
      if (slotPop) { slotPop.t += dt; if (slotPop.t > 0.22) slotPop = null }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
    }

    function readyToSend() {
      for (let i = 0; i < LEN; i += 1) if (slots[i] < 0) return false
      return true
    }

    function submit() {
      if (!readyToSend()) {
        msg = 'FILL ALL 3 SLOTS FIRST'
        msgColor = C.warn
        return
      }
      const used = [false, false, false]
      let exact = 0
      for (let i = 0; i < LEN; i += 1) {
        if (slots[i] === code[i]) {
          exact += 1
          used[i] = true
        }
      }
      let partial = 0
      for (let i = 0; i < LEN; i += 1) {
        if (slots[i] === code[i]) continue
        for (let j = 0; j < LEN; j += 1) {
          if (used[j] || code[j] !== slots[i]) continue
          used[j] = true
          partial += 1
          break
        }
      }
      rows.push({ g: [slots[0], slots[1], slots[2]], e: exact, p: partial })
      rowAnim = { r: rows.length - 1, t: 0 }
      slots = [-1, -1, -1]
      if (exact === LEN) {
        won = true
        msg = 'CODE CRACKED'
        msgColor = C.good
        pop = { text: 'CRACKED!', color: C.good, t: 0 }
        for (let k = 0; k < 3; k += 1) burst(104 + k * 30, 62 + (rows.length - 1) * 28, 6, C.good)
        if (!scored) { scored = true; api.progress(1) }
        return
      }
      if (rows.length >= TRIES) {
        msg = 'NO TRIES LEFT - NEW CODE'
        msgColor = C.warn
        resetAt = api.now() + 1400
        return
      }
      msg = 'EXACT ' + exact + ' / WRONG SPOT ' + partial
      msgColor = C.accent
      pop = { text: exact > 0 ? 'EXACT ' + exact : 'CLOSE', color: exact > 0 ? C.good : C.accent2, t: 0 }
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || resetAt) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      for (let i = 0; i < LEN; i += 1) {
        if (Math.abs(ev.x - (132 + i * 40)) < 21 && Math.abs(ev.y - 292) < 21) {
          slots[i] = slots[i] >= 3 ? -1 : slots[i] + 1
          slotPop = { i: i, t: 0 }
          msg = 'SLOT ' + (i + 1) + ' SET'
          msgColor = C.dim
          return
        }
      }
      if (ev.x > 268 && ev.x < 392 && ev.y > 268 && ev.y < 316) submit()
    })

    return {
      update(dt) {
        tick(dt)
        if (resetAt && api.now() >= resetAt) newCode()
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('MASTERMIND - 4 COLORS, 3 SLOTS', 16, 22, { size: 14, color: C.dim, weight: 'bold' })
        api.text('TRIES ' + rows.length + '/' + TRIES, 402, 22, { size: 14, color: C.fg, align: 'center', weight: 'bold' })
        if (won) {
          api.text('CODE', 196, 42, { size: 11, color: C.good, weight: 'bold' })
          for (let i = 0; i < LEN; i += 1) api.circle(250 + i * 18, 42, 6, PALETTE[code[i]])
        }
        for (let r = 0; r < TRIES; r += 1) {
          const y = 62 + r * 28
          const live = r === rows.length && !won
          api.rect(80, y - 13, 330, 26, live ? 'rgba(106,169,255,0.14)' : 'rgba(143,160,180,0.10)')
          const row = rows[r]
          if (!row) continue
          let slide = 0
          if (rowAnim && rowAnim.r === r) slide = (1 - Math.min(1, rowAnim.t / 0.25)) * 40
          for (let i = 0; i < LEN; i += 1) api.circle(104 + i * 30 + slide, y, 11, PALETTE[row.g[i]])
          for (let k = 0; k < row.e; k += 1) {
            const grow = rowAnim && rowAnim.r === r ? Math.min(1, Math.max(0, (rowAnim.t - 0.1 - k * 0.05) / 0.12)) : 1
            api.circle(226 + k * 16, y, 5 * grow, C.good)
          }
          for (let k = 0; k < row.p; k += 1) {
            const idx = row.e + k
            const grow = rowAnim && rowAnim.r === r ? Math.min(1, Math.max(0, (rowAnim.t - 0.1 - idx * 0.05) / 0.12)) : 1
            api.circle(226 + idx * 16, y, 5 * grow, C.accent2)
          }
          api.text(String(row.e) + ':' + String(row.p), 360, y, { size: 12, color: C.dim, align: 'center' })
        }
        api.text('YOUR GUESS', 16, 292, { size: 13, color: C.dim, weight: 'bold' })
        for (let i = 0; i < LEN; i += 1) {
          const cx = 132 + i * 40
          const r = slotPop && slotPop.i === i ? 16 + 5 * (1 - slotPop.t / 0.22) : 16
          api.circle(cx, 292, r, slots[i] < 0 ? 'rgba(0,0,0,0.4)' : PALETTE[slots[i]])
        }
        const ready = readyToSend()
        if (ready) {
          const p = 0.5 + 0.5 * Math.sin(api.now() / 180)
          api.rect(264 - 4 * p, 264 - 4 * p, 132 + 8 * p, 56 + 8 * p, 'rgba(106,169,255,0.22)')
        }
        api.rect(268, 268, 124, 48, ready ? C.accent : 'rgba(106,169,255,0.45)')
        api.text('SEND', 330, 292, { size: 18, color: C.bg, align: 'center', weight: 'bold' })
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        if (pop) api.text(pop.text, 240, 244 - pop.t * 10, { size: 16, color: pop.color, align: 'center', weight: 'bold' })
        api.text(msg, 240, 342, { size: 14, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
