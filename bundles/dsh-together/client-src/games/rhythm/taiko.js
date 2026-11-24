defineGame({
  id: 'taiko',
  create(api) {
    const C = api.colors
    const HIT_X = 118
    const TRAVEL_Y = 200
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let notes = []
    let spawnAt = 1.2
    let hits = 0
    let combo = 0
    let comboBest = 0
    let drumFlash = 0
    let drumColor = C.accent
    let whiff = 0
    let pop = null
    let msg = 'SPACE ON THE BEAT - BLUE NEEDS TWO'
    let msgColor = C.dim
    const fx = []
    const rings = []

    function burst(x, y, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-110, 110), vy: api.rnd(-120, -20), t: 0, c: color })
      while (fx.length > 30) fx.shift()
    }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 240 * dt
        if (p.t > 0.7) fx.splice(k, 1)
      }
      for (let k = rings.length - 1; k >= 0; k -= 1) {
        rings[k].t += dt
        if (rings[k].t > 0.4) rings.splice(k, 1)
      }
      if (drumFlash > 0) drumFlash -= dt
      if (whiff > 0) whiff -= dt
      if (pop) { pop.t += dt; if (pop.t > 0.7) pop = null }
    }

    function markHit(n) {
      hits += 1
      combo += 1
      if (combo > comboBest) comboBest = combo
      api.progress(1)
      drumFlash = 0.18
      drumColor = n.kind === 'red' ? C.warn : C.accent
      burst(HIT_X, TRAVEL_Y, 8, n.kind === 'red' ? C.warn : C.accent)
      rings.push({ t: 0, color: n.kind === 'red' ? C.warn : C.accent })
      pop = { text: combo > 1 ? 'x' + combo + ' HIT' : 'HIT', color: C.good, t: 0 }
      msg = 'HITS ' + hits
      msgColor = C.good
    }

    function press() {
      let best = -1
      let bestD = 999
      for (let i = 0; i < notes.length; i += 1) {
        const d = Math.abs(notes[i].x - HIT_X)
        if (d < bestD) { bestD = d; best = i }
      }
      if (best < 0 || bestD > 36) {
        whiff = 0.2
        combo = 0
        return
      }
      const n = notes[best]
      if (n.kind === 'red' || n.half) {
        notes.splice(best, 1)
        markHit(n)
        return
      }
      n.half = true
      n.halfT = 0.3
      drumFlash = 0.1
      drumColor = C.accent
      msg = 'AGAIN FOR THE BLUE NOTE'
      msgColor = C.accent
    }

    api.onKey(function (key, down) {
      if (!down) return
      if (key === 'space' || key === 'enter') press()
    })

    return {
      update(dt) {
        tick(dt)
        spawnAt -= dt
        if (spawnAt <= 0) {
          notes.push({ x: 500, kind: api.rng() < 0.65 ? 'red' : 'blue', half: false, halfT: 0 })
          spawnAt = api.rnd(0.62, 1.05)
          while (notes.length > 10) notes.shift()
        }
        const speed = 205
        for (let i = notes.length - 1; i >= 0; i -= 1) {
          const n = notes[i]
          n.x -= speed * dt
          if (n.half) {
            n.halfT -= dt
            if (n.halfT <= 0) {
              notes.splice(i, 1)
              combo = 0
              msg = 'BLUE NEEDS TWO TAPS'
              msgColor = C.warn
              continue
            }
          }
          if (n.x < 44) {
            notes.splice(i, 1)
            combo = 0
          }
        }
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('TAIKO - HIT THE DRUM', 16, 24, { size: 14, color: C.dim, weight: 'bold' })
        api.text('HITS ' + hits, 402, 24, { size: 14, color: C.fg, align: 'center', weight: 'bold' })
        api.rect(24, 148, 432, 104, 'rgba(24,32,40,0.75)')
        api.rect(24, 148, 432, 4, 'rgba(143,160,180,0.30)')
        api.rect(24, 248, 432, 4, 'rgba(143,160,180,0.30)')
        const beat = 0.5 + 0.5 * Math.sin(api.now() / 210)
        api.rect(HIT_X - 2, 148, 4, 104, 'rgba(232,238,246,0.45)')
        api.circle(HIT_X - 4, TRAVEL_Y, 40 + beat * 2, C.panel)
        api.circle(HIT_X - 4, TRAVEL_Y, 33, drumFlash > 0 ? drumColor : 'rgba(143,160,180,0.30)')
        api.circle(HIT_X - 4, TRAVEL_Y, 24, 'rgba(16,20,24,0.85)')
        if (drumFlash > 0) api.circle(HIT_X - 4, TRAVEL_Y, 40 + (0.18 - drumFlash) * 90, 'rgba(232,238,246,0.22)')
        for (let k = 0; k < rings.length; k += 1) {
          api.circle(HIT_X - 4, TRAVEL_Y, 34 + rings[k].t * 90, rings[k].color)
        }
        for (let i = 0; i < notes.length; i += 1) {
          const n = notes[i]
          const y = TRAVEL_Y
          const near = Math.abs(n.x - HIT_X) < 36
          const r = n.kind === 'red' ? 17 : 15
          api.circle(n.x, y, r + (near ? 3 : 0), n.kind === 'red' ? C.warn : C.accent)
          api.circle(n.x, y, r - 6, n.kind === 'red' ? 'rgba(16,20,24,0.55)' : 'rgba(232,238,246,0.35)')
          if (n.half) api.circle(n.x, y, r + 8, 'rgba(232,238,246,0.35)')
        }
        if (whiff > 0) api.circle(HIT_X - 4, TRAVEL_Y, 42 + whiff * 40, 'rgba(255,122,122,0.20)')
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.6 * (1 - fx[k].t / 0.7), fx[k].c)
        if (pop) api.text(pop.text, 240, 74 - pop.t * 12, { size: 22, color: pop.color, align: 'center', weight: 'bold' })
        else if (combo > 1) api.text('COMBO x' + combo, 240, 74, { size: 15, color: C.accent2, align: 'center', weight: 'bold' })
        api.text('RED = 1 TAP   BLUE = 2 TAPS', 240, 300, { size: 11, color: C.dim, align: 'center' })
        api.text(msg, 240, 342, { size: 12, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
