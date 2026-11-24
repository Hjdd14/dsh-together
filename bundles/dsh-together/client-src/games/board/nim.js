defineGame({
  id: 'nim',
  create(api) {
    const C = api.colors
    const PILE_X = [130, 240, 350]
    const BASE_Y = 308
    const MAXH = 6
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let piles = [4, 5, 6]
    let turn = 1
    let msg = 'CLICK A PILE TO TAKE 1'
    let msgColor = C.dim
    let aiAt = 0
    let resetAt = 0
    let lastPile = -1
    let pop = null
    let scored = false
    const fx = []

    function total() {
      let n = 0
      for (let i = 0; i < piles.length; i += 1) n += piles[i]
      return n
    }

    function burst(x, y, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-80, 80), vy: api.rnd(-140, -40), t: 0, c: color })
      while (fx.length > 30) fx.shift()
    }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 260 * dt
        if (p.t > 0.8) fx.splice(k, 1)
      }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
    }

    function reset(soft) {
      piles = [4, 5, 6]
      turn = 1
      aiAt = 0
      resetAt = 0
      lastPile = -1
      pop = null
      scored = false
      fx.length = 0
      msg = soft ? 'NEW GAME - YOUR TURN' : 'CLICK A PILE TO TAKE 1'
      msgColor = soft ? C.good : C.dim
    }

    function take(i, n) {
      for (let k = 0; k < n; k += 1) burst(PILE_X[i], BASE_Y - (piles[i] - k) * 26, 4, C.accent2)
      piles[i] = Math.max(0, piles[i] - n)
      lastPile = i
    }

    function playerTake(i) {
      if (resetAt || turn !== 1 || piles[i] <= 0) return
      take(i, 1)
      pop = { text: piles[i] === 0 ? 'PILE CLEARED' : '-1', color: C.accent2, t: 0 }
      if (total() === 0) {
        msg = 'YOU TOOK THE LAST STONE'
        msgColor = C.good
        for (let k = 0; k < 3; k += 1) burst(PILE_X[k], BASE_Y - 40, 8, C.good)
        if (!scored) { scored = true; api.progress(1) }
        return
      }
      turn = 2
      aiAt = api.now() + 400
    }

    // Weak AI: 70% random pile taking 1 stone, 30% greedy (close out a small pile).
    function aiTake() {
      const live = []
      for (let i = 0; i < piles.length; i += 1) if (piles[i] > 0) live.push(i)
      if (!live.length) { turn = 1; return }
      let i = -1
      let n = 1
      if (api.rng() >= 0.7) {
        for (let k = 0; k < live.length; k += 1) {
          if (i < 0 && piles[live[k]] <= 3) { i = live[k]; n = piles[live[k]] }
        }
        if (i < 0) {
          let big = live[0]
          for (let k = 0; k < live.length; k += 1) if (piles[live[k]] > piles[big]) big = live[k]
          i = big
          n = 1
        }
      } else {
        i = api.pick(live)
      }
      take(i, n)
      pop = { text: 'AI -' + n, color: C.warn, t: 0 }
      if (total() === 0) {
        msg = 'AI TOOK THE LAST STONE - NEW GAME'
        msgColor = C.warn
        resetAt = api.now() + 1200
        return
      }
      turn = 1
      msg = 'YOUR TURN'
      msgColor = C.dim
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || resetAt) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      for (let i = 0; i < 3; i += 1) {
        if (Math.abs(ev.x - PILE_X[i]) < 48 && ev.y > BASE_Y - MAXH * 26 - 34 && ev.y < BASE_Y + 30) {
          playerTake(i)
          return
        }
      }
    })

    return {
      update(dt) {
        tick(dt)
        if (resetAt && api.now() >= resetAt) { reset(true); return }
        if (!resetAt && turn === 2) {
          if (!aiAt) aiAt = api.now() + 240
          else if (api.now() >= aiAt) { aiAt = 0; aiTake() }
        }
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('NIM - TAKE 1 PER CLICK', 16, 24, { size: 15, color: C.dim, weight: 'bold' })
        api.text('last stone wins', 240, 50, { size: 12, color: C.dim, align: 'center' })
        api.text(msg, 240, 74, { size: 15, color: msgColor, align: 'center', weight: 'bold' })
        const mine = turn === 1 && !resetAt
        const pulse = 0.5 + 0.5 * Math.sin(api.now() / 260)
        for (let i = 0; i < 3; i += 1) {
          api.rect(PILE_X[i] - 46, BASE_Y + 12, 92, 8, C.panel)
          if (lastPile === i) api.rect(PILE_X[i] - 48, BASE_Y + 10, 96, 12, 'rgba(255,207,92,0.5)')
          for (let k = 0; k < piles[i]; k += 1) {
            const y = BASE_Y - k * 26
            const r = mine ? 9.4 + pulse * 1.4 : 10
            api.circle(PILE_X[i], y, r, mine ? C.accent2 : C.dim)
          }
          api.text(String(piles[i]), PILE_X[i], BASE_Y + 34, { size: 14, color: C.fg, align: 'center', weight: 'bold' })
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.6 * (1 - fx[k].t / 0.8), fx[k].c)
        api.rect(340, 12, 124, 26, mine ? C.good : C.panel)
        if (mine) {
          api.text('YOUR TURN', 402, 25, { size: 12, color: C.bg, align: 'center', weight: 'bold' })
        } else {
          api.text('AI', 372, 25, { size: 11, color: C.dim, weight: 'bold' })
          for (let k = 0; k < 3; k += 1) {
            const on = Math.floor(api.now() / 200) % 3 === k
            api.circle(390 + k * 12, 25, on ? 4 : 2.5, on ? C.accent2 : C.dim)
          }
        }
        if (pop) api.text(pop.text, 240, 108 - pop.t * 12, { size: 18, color: pop.color, align: 'center', weight: 'bold' })
      },
    }
  },
})
