defineGame({
  id: 'pairs2',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const COLS = 4
    const ROWS = 3
    const CW = 88
    const CH = 72
    const GAP = 14
    const X0 = (W - (COLS * CW + (COLS - 1) * GAP)) / 2
    const Y0 = 64
    const KINDS = 6
    const cards = []
    const parts = []
    let picks = []
    let pairs = 0
    let combo = 0
    let comboT = 0
    let shake = 0
    let flash = 0
    let flips = 0
    let limit = 26
    let lock = 0
    let over = false
    let t = 0

    const deck = []
    for (let k = 0; k < KINDS; k += 1) {
      deck.push(k)
      deck.push(k)
    }
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = api.irnd(0, i)
      const tmp = deck[i]
      deck[i] = deck[j]
      deck[j] = tmp
    }
    for (let i = 0; i < deck.length; i += 1) {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      cards.push({
        x: X0 + col * (CW + GAP),
        y: Y0 + row * (CH + GAP),
        kind: deck[i],
        up: false,
        done: false,
        flip: 0,
        bad: 0,
      })
    }

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 36) parts.shift()
        parts.push({ x, y, vx: api.rnd(-110, 110), vy: api.rnd(-110, 110), life: api.rnd(0.2, 0.5), col })
      }
    }

    function symbol(cx, cy, kind, col) {
      const s = 15
      if (kind === 0) api.circle(cx, cy, s, col)
      else if (kind === 1) api.rect(cx - s, cy - s, s * 2, s * 2, col)
      else if (kind === 2) {
        api.rect(cx - s, cy + 2, s * 2, 9, col)
        api.rect(cx - s * 0.5, cy - 8, s, 8, col)
      } else if (kind === 3) {
        api.rect(cx - 4, cy - s, 8, s * 2, col)
        api.rect(cx - s, cy - 4, s * 2, 8, col)
      } else if (kind === 4) {
        api.circle(cx, cy, s, col)
        api.circle(cx, cy, s * 0.45, C.bg)
      } else {
        api.rect(cx - s, cy - 5, s * 2, 10, col)
        api.rect(cx - 5, cy - s, 10, s * 2, col)
      }
    }

    const offPointer = api.onPointer((p) => {
      if (over || lock > 0 || p.type !== 'down') return
      for (const card of cards) {
        if (card.done || card.up) continue
        if (p.x < card.x || p.x > card.x + CW || p.y < card.y || p.y > card.y + CH) continue
        card.up = true
        card.flip = 0
        picks.push(card)
        flips += 1
        if (picks.length === 2) lock = 0.62
        return
      }
    })

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.8)
      flash = Math.max(0, flash - dt * 5)
      if (comboT > 0) {
        comboT -= dt
        if (comboT <= 0) combo = 0
      }
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - 2.2 * dt
        p.vy *= 1 - 2.2 * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
      if (over) return
      t += dt
      for (const card of cards) {
        card.flip = Math.min(1, card.flip + dt * 4)
        if (card.bad > 0) card.bad = Math.max(0, card.bad - dt * 2)
      }
      if (lock > 0) {
        lock -= dt
        if (lock <= 0) {
          const a = picks[0]
          const b = picks[1]
          if (a && b) {
            if (a.kind === b.kind) {
              a.done = true
              b.done = true
              pairs += 1
              combo += 1
              comboT = 3
              flash = 1
              shake = Math.min(1, shake + 0.25)
              burst(a.x + CW / 2, a.y + CH / 2, C.good, 10)
              burst(b.x + CW / 2, b.y + CH / 2, C.good, 10)
              api.progress(1)
              api.setStatus('PAIRS ' + pairs + '/6')
            } else {
              a.up = false
              b.up = false
              a.bad = 1
              b.bad = 1
              combo = 0
              shake = Math.min(1, shake + 0.3)
            }
          }
          picks = []
        }
      }
      if (flips >= limit && pairs < 6 && lock <= 0) {
        over = true
        api.lose('out of flips')
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.08) * 3 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.11) * 3 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < 8; i += 1) {
        const y = 30 + ((i * 42 + t * 7) % (H - 30))
        Rr(0, y, W, 1, 'rgba(143,160,180,0.05)')
      }
      for (const card of cards) {
        const grow = card.up ? 1 - (1 - card.flip) * 0.14 : 1
        const w = CW * grow
        const h = CH * grow
        const x = card.x + (CW - w) / 2
        const y = card.y + (CH - h) / 2
        if (card.done) {
          Rr(x, y, w, h, 'rgba(139,220,122,0.16)')
          Rr(x, y, w, 2, 'rgba(139,220,122,0.5)')
          symbol(x + w / 2, y + h / 2, card.kind, 'rgba(139,220,122,0.65)')
          continue
        }
        const bad = card.bad > 0
        Rr(x, y, w, h, bad ? 'rgba(255,122,122,0.18)' : card.up ? 'rgba(232,238,246,0.12)' : 'rgba(24,32,40,0.95)')
        Rr(x + 1, y + 1, w - 2, h - 2, bad ? 'rgba(255,122,122,0.1)' : card.up ? 'rgba(232,238,246,0.1)' : 'rgba(24,32,40,0.95)')
        Rr(x, y, w, 1, card.up ? 'rgba(232,238,246,0.3)' : 'rgba(143,160,180,0.22)')
        Rr(x, y + h - 1, w, 1, card.up ? 'rgba(16,20,24,0.4)' : 'rgba(143,160,180,0.14)')
        if (card.up) symbol(x + w / 2, y + h / 2, card.kind, bad ? C.warn : C.accent2)
        else Rr(x + w / 2 - 7, y + h / 2 - 2, 14, 4, 'rgba(143,160,180,0.35)')
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      for (const card of cards) {
        if (card.bad <= 0) continue
        Ci(card.x + CW / 2, card.y + CH / 2, 8 + (1 - card.bad) * 12, 'rgba(255,122,122,0.12)')
      }
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.07).toFixed(3) + ')')
      api.text('PAIRS ' + pairs + '/6', 10, 20, { size: 12, color: C.dim })
      api.text('FLIPS ' + flips + '/' + limit, W - 10, 20, { size: 12, color: flips > limit - 6 ? C.warn : C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, W / 2, 20, { size: 13, color: C.accent2, align: 'center', weight: 'bold' })
      api.text('TAP TWO CARDS', W / 2, 40, { size: 10, color: 'rgba(143,160,180,0.6)', align: 'center' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.55)')
        api.text('OUT OF FLIPS', W / 2, 170, { size: 20, color: C.warn, align: 'center', weight: 'bold' })
      }
    }

    return {
      update,
      draw,
      dispose() {
        offPointer()
      },
    }
  },
})
