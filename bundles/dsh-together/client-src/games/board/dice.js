defineGame({
  id: 'dice',
  create(api) {
    const C = api.colors
    const ROLL_RECT = { x: 74, y: 246, w: 150, h: 50 }
    const BANK_RECT = { x: 256, y: 246, w: 150, h: 50 }
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let dice = [2, 4, 6]
    let held = [false, false, false]
    let rolls = 0
    let rounds = 0
    let total = 0
    let msg = 'ROLL THE DICE'
    let msgColor = C.dim
    let rollT = 0
    let bankT = 0
    let totalT = 0
    let hot = 0
    let pop = null
    const shakes = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]
    const fx = []

    function inside(r, ev) {
      return ev.x > r.x && ev.x < r.x + r.w && ev.y > r.y && ev.y < r.y + r.h
    }

    function burst(x, y, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-90, 90), vy: api.rnd(-130, -30), t: 0, c: color })
      while (fx.length > 26) fx.shift()
    }

    function sum() {
      return dice[0] + dice[1] + dice[2]
    }

    function rollDice() {
      let changed = false
      for (let i = 0; i < 3; i += 1) {
        if (held[i]) continue
        dice[i] = api.irnd(1, 6)
        changed = true
      }
      if (!changed) {
        msg = 'ALL DICE HELD - BANK THEM'
        msgColor = C.warn
        return
      }
      rolls += 1
      rollT = 0.26
      msg = rolls < 2 ? 'HOLD DICE, THEN REROLL OR BANK' : 'BANK OR REROLL'
      msgColor = C.accent
    }

    function bank() {
      if (rolls === 0) {
        msg = 'ROLL FIRST'
        msgColor = C.warn
        return
      }
      const got = sum()
      total += got
      rounds += 1
      api.progress(1)
      bankT = 0.5
      totalT = 0.6
      hot = got >= 12 ? hot + 1 : 0
      pop = { text: '+' + got + (hot > 1 ? '  HOT x' + hot : ''), color: got >= 12 ? C.good : C.accent2, t: 0 }
      for (let i = 0; i < 3; i += 1) burst(128 + i * 112, 150, 4, C.good)
      dice = [api.irnd(1, 6), api.irnd(1, 6), api.irnd(1, 6)]
      held = [false, false, false]
      rolls = 0
      msg = 'ROUND ' + (rounds + 1) + ' - ROLL'
      msgColor = C.dim
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down') return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      for (let i = 0; i < 3; i += 1) {
        if (Math.abs(ev.x - (128 + i * 112)) < 46 && Math.abs(ev.y - 150) < 46) {
          if (rolls === 0) {
            msg = 'ROLL FIRST'
            msgColor = C.warn
            return
          }
          held[i] = !held[i]
          msg = held[i] ? 'DIE ' + (i + 1) + ' HELD' : 'DIE ' + (i + 1) + ' FREE'
          msgColor = C.dim
          return
        }
      }
      if (inside(ROLL_RECT, ev)) {
        if (rolls >= 2) {
          msg = 'NO REROLL LEFT - BANK'
          msgColor = C.warn
          return
        }
        rollDice()
        return
      }
      if (inside(BANK_RECT, ev)) bank()
    })

    return {
      update(dt) {
        for (let k = fx.length - 1; k >= 0; k -= 1) {
          const p = fx[k]
          p.t += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 260 * dt
          if (p.t > 0.7) fx.splice(k, 1)
        }
        if (rollT > 0) {
          rollT -= dt
          for (let i = 0; i < 3; i += 1) {
            if (held[i]) {
              shakes[i].x = 0
              shakes[i].y = 0
            } else {
              shakes[i].x = api.rnd(-4, 4)
              shakes[i].y = api.rnd(-5, 5)
            }
          }
          if (rollT <= 0) {
            for (let i = 0; i < 3; i += 1) {
              shakes[i].x = 0
              shakes[i].y = 0
            }
          }
        }
        if (bankT > 0) bankT -= dt
        if (totalT > 0) totalT -= dt
        if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('DICE - 3 ROUNDS', 16, 22, { size: 14, color: C.dim, weight: 'bold' })
        api.text('ROUND ' + (rounds + 1) + '   TOTAL ' + total, 400, 22, { size: 13, color: totalT > 0 ? C.good : C.fg, align: 'center', weight: 'bold' })
        const pulse = 0.5 + 0.5 * Math.sin(api.now() / 200)
        for (let i = 0; i < 3; i += 1) {
          const x = 128 + i * 112 - 40 + shakes[i].x
          const y = 110 + shakes[i].y
          api.rect(x, y, 80, 80, held[i] ? C.accent2 : C.panel)
          if (held[i]) api.rect(x - 4 - 3 * pulse, y - 4 - 3 * pulse, 88 + 6 * pulse, 88 + 6 * pulse, 'rgba(255,207,92,0.22)')
          api.text(String(dice[i]), x + 40, y + 40, { size: 38, color: held[i] ? C.bg : C.fg, align: 'center', weight: 'bold' })
          if (held[i]) api.text('HOLD', x + 40, y + 94, { size: 12, color: C.accent2, align: 'center', weight: 'bold' })
        }
        if (bankT > 0) {
          const a = bankT > 0.3 ? 'rgba(139,220,122,0.18)' : 'rgba(139,220,122,0.07)'
          api.rect(60, 100, 360, 100, a)
        }
        api.text('SUM ' + sum(), 240, 226, { size: 15, color: rollT > 0 ? C.accent2 : C.fg, align: 'center', weight: 'bold' })
        api.rect(ROLL_RECT.x, ROLL_RECT.y, ROLL_RECT.w, ROLL_RECT.h, rolls >= 2 ? C.panel : C.accent)
        api.text(rolls === 0 ? 'ROLL' : 'REROLL', ROLL_RECT.x + 75, ROLL_RECT.y + 25, { size: 18, color: rolls >= 2 ? C.dim : C.bg, align: 'center', weight: 'bold' })
        api.rect(BANK_RECT.x, BANK_RECT.y, BANK_RECT.w, BANK_RECT.h, C.good)
        api.text('BANK', BANK_RECT.x + 75, BANK_RECT.y + 25, { size: 18, color: C.bg, align: 'center', weight: 'bold' })
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.7), fx[k].c)
        if (pop) api.text(pop.text, 240, 78 - pop.t * 14, { size: 22, color: pop.color, align: 'center', weight: 'bold' })
        api.text(msg, 240, 330, { size: 14, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
