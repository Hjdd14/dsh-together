defineGame({
  id: 'wordladder',
  create(api) {
    const C = api.colors
    const DICT = [
      'cat', 'cot', 'cut', 'dog', 'dig', 'fig', 'pig', 'pen', 'pan', 'ten', 'tan', 'tin', 'sun',
      'son', 'sin', 'run', 'cap', 'cup', 'cop', 'map', 'mop', 'top', 'tap', 'tip', 'hat', 'hit',
      'hot', 'hut', 'bed', 'bad', 'bid', 'bud', 'red', 'rid', 'rod', 'mad', 'mid', 'mud', 'man',
      'men', 'mat', 'met', 'net', 'pet', 'pot', 'put', 'pat', 'bet', 'bat', 'bit', 'but', 'fat',
      'fit', 'sit', 'sat', 'set', 'let', 'lot', 'log', 'leg', 'lag', 'bag', 'big', 'bug', 'bog',
      'cab', 'tab', 'tub', 'rub', 'rob', 'rib', 'lip', 'lap', 'lid', 'kid', 'kit', 'keg', 'egg',
      'arm', 'art', 'air', 'aim', 'aid', 'ill', 'ice', 'age', 'ace', 'ore', 'one', 'old', 'odd',
      'oil', 'out', 'own', 'oak', 'gag', 'gap', 'gas', 'gem', 'get', 'got', 'gum', 'gun', 'gut',
      'hen', 'her', 'him', 'hip', 'his', 'hoe', 'hog', 'hop', 'how', 'hug', 'hum', 'jam', 'jar',
      'jaw', 'jet', 'job', 'jog', 'joy', 'jug', 'key', 'kin', 'lab', 'lad', 'law', 'lay', 'led',
      'lie', 'lit', 'low', 'oar', 'oat', 'opt', 'owl', 'pay', 'pea', 'per', 'pin', 'pit', 'pop',
      'pub', 'pug', 'pun', 'rag', 'ram', 'rap', 'rat', 'raw', 'ray', 'rot', 'row', 'rug', 'sad',
      'sap', 'saw', 'say', 'sea', 'see', 'sew', 'sip', 'sir', 'six', 'ski', 'sky', 'sob', 'sod',
      'sow', 'soy', 'spa', 'spy', 'sum', 'tag', 'tar', 'tax', 'tea', 'tie', 'toe', 'ton', 'too',
      'tot', 'tow', 'toy', 'vat', 'vet', 'wag', 'war', 'wax', 'web', 'wed', 'wet', 'wig', 'win',
      'wit', 'wok', 'won', 'yak', 'yam', 'yap', 'yes', 'yet', 'you', 'zap', 'zip', 'zoo',
    ]
    const WORD = 3
    let cur = api.pick(DICT)
    let input = ''
    let steps = 0
    let combo = 0
    let best = 0
    let misses = 0
    let t = 0
    let slide = 1
    let shakeT = 0
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let delT = 0
    const trail = []
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

    function diff(a, b) {
      if (a.length !== b.length) return -1
      let n = 0
      for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) n += 1
      return n
    }

    function options(w) {
      const out = []
      for (let i = 0; i < DICT.length; i += 1) {
        const d = diff(w, DICT[i])
        if (d === 1) out.push(DICT[i])
      }
      return out
    }

    function jump() {
      for (let i = 0; i < 60; i += 1) {
        const next = api.pick(DICT)
        if (next === cur) continue
        if (options(next).length > 0) {
          cur = next
          input = ''
          slide = 1
          return
        }
      }
      cur = DICT[0]
      input = ''
      slide = 1
    }

    function accept() {
      steps += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      misses = 0
      okFlash = true
      flashT = 0.3
      burst(240, 130, 12 + Math.min(12, combo * 2))
      pop(combo >= 6 ? 'STREAK x' + combo : 'NICE', C.good)
      trail.push(cur)
      while (trail.length > 3) trail.shift()
      cur = input
      input = ''
      slide = 1
      if (options(cur).length === 0) {
        pop('NEW START', C.accent2)
        jump()
      }
    }

    function reject(msg) {
      misses += 1
      combo = 0
      okFlash = false
      flashT = 0.38
      shakeT = 0.38
      pop(msg, C.warn)
    }

    const heldKeys = {}

    api.onKey((key, isDown) => {
      if (!isDown) {
        heldKeys[key] = false
        return
      }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (key.length === 1 && key >= 'a' && key <= 'z') {
        if (input.length < WORD) input += key
        return
      }
      if (key === 'space') {
        if (input.length) {
          input = input.slice(0, -1)
          delT = 0.3
        }
        return
      }
      if (key === 'escape') {
        if (input.length) {
          input = ''
          delT = 0.3
        }
        return
      }
      if (key !== 'enter' || input.length !== WORD) return
      const d = diff(input, cur)
      if (DICT.indexOf(input) < 0) {
        reject('NOT A WORD')
        input = ''
        return
      }
      if (d !== 1) {
        reject(d === 0 ? 'SAME WORD' : 'ONE LETTER ONLY')
        input = ''
        return
      }
      accept()
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 9 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(106,169,255,0.04)')
      }
    }

    return {
      update(dt) {
        t += dt
        slide = Math.max(0, slide - dt * 5)
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        if (delT > 0) delT = Math.max(0, delT - dt)
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
        api.text('WORD LADDER', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('steps ' + steps, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 84, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        let tx = 24
        for (let i = 0; i < trail.length; i += 1) {
          api.text(trail[i].toUpperCase(), tx, 70, { size: 14, color: C.dim, weight: 'bold' })
          api.text('>', tx + 40, 70, { size: 13, color: C.dim })
          tx += 58
        }
        const sx = shakeT > 0 ? Math.sin(shakeT * 76) * 9 * (shakeT / 0.38) : 0
        api.text(cur.toUpperCase(), api.w / 2 + sx, 126 + slide * 8, {
          size: 52, color: C.fg, align: 'center', weight: 'bold',
        })
        const bw = 150
        const bh = 54
        const bx = (api.w - bw) / 2 + sx
        const by = 168
        api.rect(bx - 3, by - 3, bw + 6, bh + 6, flashT > 0 ? (okFlash ? C.good : C.warn) : C.dim)
        api.rect(bx, by, bw, bh, C.panel)
        api.text(input.length ? input.toUpperCase() : '?', bx + bw / 2, by + bh / 2 + 1, {
          size: 26, color: input.length ? C.fg : C.dim, align: 'center', weight: 'bold',
        })
        if (delT > 0) api.text('DEL', bx + bw / 2, by - 18, { size: 12, color: C.warn, align: 'center', weight: 'bold' })
        const opts = options(cur)
        let hint = 'change one letter · ' + opts.length + ' options'
        let hc = C.dim
        if (misses >= 2 && opts.length) {
          hint = 'try ' + opts[0].toUpperCase()
          hc = C.accent2
        }
        api.text(hint, api.w / 2, 244, { size: 13, color: hc, align: 'center' })
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 272, {
            size: 15 + popT * 10, color: popColor, align: 'center', weight: 'bold',
          })
        }
        api.text('a-z · enter · space del · esc clear', api.w / 2, 306, { size: 11, color: C.dim, align: 'center' })
        api.rect(140, 322, 200, 6, C.panel)
        api.rect(140, 322, 200 * Math.min(1, steps / 12), 6, C.accent)
        api.rect(0, api.h - 20, api.w, 20, C.panel)
        api.text('chain ' + (trail.length + 1) + ' words · best x' + best, api.w / 2, api.h - 10, {
          size: 11, color: C.dim, align: 'center',
        })
      },
    }
  },
})
