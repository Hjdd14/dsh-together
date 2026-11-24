defineGame({
  id: 'synonym',
  create(api) {
    const C = api.colors
    const PAIRS = [
      ['big', 'large'], ['fast', 'quick'], ['tiny', 'small'], ['smart', 'clever'],
      ['brave', 'bold'], ['calm', 'quiet'], ['angry', 'mad'], ['easy', 'simple'],
      ['hard', 'tough'], ['begin', 'start'], ['odd', 'strange'], ['happy', 'glad'],
      ['wide', 'broad'], ['rich', 'wealthy'], ['tired', 'sleepy'], ['cold', 'chilly'],
    ]
    const PER = 3
    const CW = 132
    const CH = 62
    const GX = 10
    const GY = 14
    const X0 = 32
    const Y0 = 96
    let cards = []
    let sel = -1
    let lockT = 0
    let matched = 0
    let combo = 0
    let best = 0
    let t = 0
    let slide = 1
    let shakeT = 0
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let used = []
    const parts = []

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(55, 200)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 55,
          life: api.rnd(0.45, 0.9), age: 0, r: api.rnd(1.5, 3.2),
        })
      }
      while (parts.length > 72) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.7
    }

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = api.irnd(0, i)
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
      }
      return arr
    }

    function newRound() {
      const pool = []
      for (let i = 0; i < PAIRS.length; i += 1) {
        if (used.indexOf(i) < 0) pool.push(i)
      }
      if (pool.length < PER) {
        used = []
        for (let i = 0; i < PAIRS.length; i += 1) pool.push(i)
      }
      const pick = shuffle(pool.slice()).slice(0, PER)
      for (let i = 0; i < pick.length; i += 1) used.push(pick[i])
      cards = []
      for (let i = 0; i < pick.length; i += 1) {
        cards.push({ word: PAIRS[pick[i]][0], pair: pick[i], matched: false, shake: 0 })
        cards.push({ word: PAIRS[pick[i]][1], pair: pick[i], matched: false, shake: 0 })
      }
      shuffle(cards)
      sel = -1
      lockT = 0
      slide = 1
    }

    newRound()

    function rectOf(i) {
      const row = Math.floor(i / 3)
      const col = i % 3
      return { x: X0 + col * (CW + GX), y: Y0 + row * (CH + GY) }
    }

    function hit(px, py) {
      for (let i = 0; i < cards.length; i += 1) {
        const r = rectOf(i)
        if (px >= r.x && px <= r.x + CW && py >= r.y && py <= r.y + CH) return i
      }
      return -1
    }

    api.onPointer((ev) => {
      if (ev.type !== 'down' || lockT > 0) return
      const idx = hit(ev.x, ev.y)
      if (idx < 0) return
      if (cards[idx].matched) return
      if (sel === idx) {
        sel = -1
        return
      }
      if (sel < 0) {
        sel = idx
        return
      }
      const a = cards[sel]
      const b = cards[idx]
      if (a.pair === b.pair) {
        a.matched = true
        b.matched = true
        api.progress(1)
        matched += 1
        combo += 1
        best = Math.max(best, combo)
        const r = rectOf(idx)
        burst(r.x + CW / 2, r.y + CH / 2, 14 + Math.min(12, combo * 2))
        pop(combo >= 5 ? 'STREAK x' + combo : 'PAIR', C.good)
        sel = -1
        let rest = 0
        for (let i = 0; i < cards.length; i += 1) if (!cards[i].matched) rest += 1
        if (rest === 0) {
          pop('ROUND CLEAR', C.accent2)
          newRound()
        }
      } else {
        a.shake = 1
        b.shake = 1
        combo = 0
        lockT = 0.4
        shakeT = 0.3
        pop('NOT A PAIR', C.warn)
        sel = -1
      }
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 9 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(139,220,122,0.04)')
      }
    }

    return {
      update(dt) {
        t += dt
        slide = Math.max(0, slide - dt * 5)
        if (lockT > 0) lockT = Math.max(0, lockT - dt)
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        for (let i = 0; i < cards.length; i += 1) {
          if (cards[i].shake > 0) cards[i].shake = Math.max(0, cards[i].shake - dt * 3)
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 320 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        bands()
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('SYNONYM', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('pairs ' + matched, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 88, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        for (let i = 0; i < cards.length; i += 1) {
          const card = cards[i]
          const r = rectOf(i)
          const sx = card.shake > 0 ? Math.sin(card.shake * 40) * 7 * card.shake : 0
          const x = r.x + sx + slide * 10
          const y = r.y
          const isSel = i === sel
          let fill = C.panel
          let ink = C.fg
          if (card.matched) {
            fill = 'rgba(139,220,122,0.25)'
            ink = C.good
          } else if (isSel) {
            fill = 'rgba(106,169,255,0.22)'
            ink = C.accent2
          }
          api.rect(x, y, CW, CH, fill)
          api.rect(x, y, CW, 3, card.matched ? C.good : isSel ? C.accent2 : C.dim)
          api.text(card.word.toUpperCase(), x + CW / 2, y + CH / 2 + 1, {
            size: 19, color: ink, align: 'center', weight: 'bold',
          })
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 266, {
            size: 15 + popT * 10, color: popColor, align: 'center', weight: 'bold',
          })
        }
        api.text('tap two cards with the same meaning', api.w / 2, 296, { size: 12, color: C.dim, align: 'center' })
        api.rect(140, 316, 200, 6, C.panel)
        api.rect(140, 316, 200 * Math.min(1, matched / 8), 6, C.accent)
        let rest = 0
        for (let i = 0; i < cards.length; i += 1) if (!cards[i].matched) rest += 1
        api.rect(0, api.h - 24, api.w, 24, C.panel)
        api.text('click · best x' + best + ' · ' + rest / 2 + ' pairs left', api.w / 2, api.h - 12, {
          size: 11, color: C.dim, align: 'center',
        })
      },
    }
  },
})
