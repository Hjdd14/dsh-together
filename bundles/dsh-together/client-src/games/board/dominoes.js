defineGame({
  id: 'dominoes',
  create(api) {
    const C = api.colors
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    const PIPS = [
      [],
      [[0.5, 0.5]],
      [[0.3, 0.3], [0.7, 0.7]],
      [[0.3, 0.3], [0.5, 0.5], [0.7, 0.7]],
      [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
      [[0.3, 0.3], [0.7, 0.3], [0.5, 0.5], [0.3, 0.7], [0.7, 0.7]],
      [[0.3, 0.24], [0.7, 0.24], [0.3, 0.5], [0.7, 0.5], [0.3, 0.76], [0.7, 0.76]],
    ]
    const HAND_Y = 296
    const TW = 52
    const TH = 26
    let deck = []
    let hand = []
    let chain = []
    let left = 0
    let right = 0
    let played = 0
    let anim = null
    let glow = null
    let pop = null
    let combo = 0
    let comboT = 0
    let msg = 'PLAY A TILE THAT MATCHES AN END'
    let msgColor = C.dim
    const fx = []

    function makeDeck() {
      const out = []
      for (let a = 0; a <= 6; a += 1) for (let b = a; b <= 6; b += 1) out.push({ a: a, b: b })
      return out
    }

    function draw() {
      if (!deck.length) return null
      const k = api.irnd(0, deck.length - 1)
      return deck.splice(k, 1)[0]
    }

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
      if (anim) { anim.t += dt; if (anim.t > 0.3) anim = null }
      if (glow) { glow.t += dt; if (glow.t > 0.5) glow = null }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0 }
    }

    function reset() {
      deck = makeDeck()
      chain = []
      hand = []
      played = 0
      anim = null
      glow = null
      pop = null
      combo = 0
      comboT = 0
      fx.length = 0
      const start = draw()
      chain.push({ a: start.a, b: start.b })
      left = start.a
      right = start.b
      for (let k = 0; k < 5; k += 1) {
        const t = draw()
        if (t) hand.push(t)
      }
      ensurePlayable()
      msg = 'PLAY A TILE THAT MATCHES AN END'
      msgColor = C.dim
    }

    function playable(t) {
      return t.a === left || t.b === left || t.a === right || t.b === right
    }

    function ensurePlayable() {
      let any = false
      for (let k = 0; k < hand.length; k += 1) if (playable(hand[k])) any = true
      if (any) return
      for (let k = 0; k < deck.length; k += 1) {
        if (deck[k].a === left || deck[k].b === left || deck[k].a === right || deck[k].b === right) {
          const got = deck.splice(k, 1)[0]
          if (hand.length) hand[api.irnd(0, hand.length - 1)] = got
          else hand.push(got)
          return
        }
      }
      if (hand.length) {
        const side = api.rng() < 0.5 ? left : right
        hand[api.irnd(0, hand.length - 1)] = { a: side, b: api.irnd(0, 6) }
      }
    }

    function playTile(hi) {
      if (anim) return
      const t = hand[hi]
      if (!t) return
      const mL = t.a === left || t.b === left
      const mR = t.a === right || t.b === right
      if (!mL && !mR) {
        msg = 'NEEDS ' + left + ' OR ' + right
        msgColor = C.warn
        return
      }
      let shown = null
      if (mL) {
        shown = t.b === left ? { a: t.a, b: t.b } : { a: t.b, b: t.a }
        chain.unshift(shown)
        left = shown.a
        glow = { side: 'left', t: 0 }
      } else {
        shown = t.a === right ? { a: t.a, b: t.b } : { a: t.b, b: t.a }
        chain.push(shown)
        right = shown.b
        glow = { side: 'right', t: 0 }
      }
      hand.splice(hi, 1)
      const refill = draw()
      if (refill) hand.push(refill)
      ensurePlayable()
      played += 1
      api.progress(1)
      anim = { side: mL ? 'left' : 'right', t: 0 }
      combo = mL && mR ? combo + 1 : 0
      comboT = 3
      burst(240, 150, 7, mL && mR ? C.good : C.accent2)
      pop = { text: mL && mR ? 'DOUBLE!' : '+1', color: mL && mR ? C.good : C.accent2, t: 0 }
      msg = 'TILE ' + played + ' PLACED'
      msgColor = C.good
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || anim) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      const n = hand.length
      if (!n) return
      if (ev.y < HAND_Y - 26 || ev.y > HAND_Y + 40) return
      const total = n * 62 - 8
      const x0 = 240 - total / 2
      for (let i = 0; i < n; i += 1) {
        if (ev.x > x0 + i * 62 && ev.x < x0 + i * 62 + 58) {
          playTile(i)
          return
        }
      }
    })
    reset()

    function half(x, y, w, h, v, color) {
      const list = PIPS[v]
      for (let k = 0; k < list.length; k += 1) api.circle(x + list[k][0] * w, y + list[k][1] * h, 2.6, color)
    }

    function tile(x, y, w, h, t, color, dim) {
      api.rect(x, y, w, h, dim ? 'rgba(232,238,246,0.05)' : 'rgba(232,238,246,0.12)')
      api.rect(x + 1, y + 1, w - 2, 2, 'rgba(143,160,180,0.30)')
      api.rect(x + 1, y + h - 3, w - 2, 2, 'rgba(143,160,180,0.30)')
      api.rect(x + w / 2 - 1, y + 3, 2, h - 6, 'rgba(143,160,180,0.55)')
      half(x, y, w / 2, h, t.a, color)
      half(x + w / 2, y, w / 2, h, t.b, color)
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
        api.text('DOMINOES - PLAY 5 TILES', 16, 24, { size: 14, color: C.dim, weight: 'bold' })
        api.text('TILES ' + played, 400, 24, { size: 14, color: anim ? C.good : C.fg, align: 'center', weight: 'bold' })
        const n = chain.length
        const total = n * TW
        const x0 = 240 - total / 2
        api.rect(96, 132, 288, 46, 'rgba(24,32,40,0.7)')
        for (let i = 0; i < n; i += 1) {
          const isAnim = anim && ((anim.side === 'left' && i === 0) || (anim.side === 'right' && i === n - 1))
          const y = isAnim ? 132 + 40 * (1 - Math.min(1, anim.t / 0.3)) : 132
          tile(x0 + i * TW, y, TW - 2, 26, chain[i], C.fg, false)
        }
        if (anim) {
          const x = anim.side === 'left' ? x0 : x0 + (n - 1) * TW
          api.rect(x - 2, 130, TW + 2, 30, 'rgba(139,220,122,0.28)')
        }
        const pulse = 0.5 + 0.5 * Math.sin(api.now() / 220)
        api.rect(x0 - 12 - pulse * 3, 136, 10 + pulse * 3, 18, glow && glow.side === 'left' ? C.good : C.accent)
        api.rect(x0 + total + 2, 136, 10 + pulse * 3, 18, glow && glow.side === 'right' ? C.good : C.accent)
        api.text(String(left), x0 - 24, 160, { size: 15, color: C.accent, align: 'center', weight: 'bold' })
        api.text(String(right), x0 + total + 24, 160, { size: 15, color: C.accent, align: 'center', weight: 'bold' })
        const hn = hand.length
        const htotal = hn * 62 - 8
        const hx = 240 - htotal / 2
        for (let i = 0; i < hn; i += 1) {
          const ok = playable(hand[i])
          const x = hx + i * 62
          if (ok) api.rect(x - 3, HAND_Y - 3, 64, 40, 'rgba(139,220,122,0.22)')
          tile(x, HAND_Y, 58, 34, hand[i], ok ? C.fg : C.dim, !ok)
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        if (pop) api.text(pop.text, 240, 66 - pop.t * 10, { size: 22, color: pop.color, align: 'center', weight: 'bold' })
        else if (combo > 0 && comboT > 0) api.text('DOUBLE x' + combo, 240, 66, { size: 14, color: C.accent2, align: 'center', weight: 'bold' })
        api.text('ends ' + left + ' | ' + right, 240, 250, { size: 12, color: C.dim, align: 'center' })
        api.text(msg, 240, 348, { size: 13, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
