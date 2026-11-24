defineGame({
  id: 'typing',
  create(api) {
    const C = api.colors
    const WORDS = [
      'code', 'game', 'tap', 'key', 'word', 'type', 'fast', 'play', 'jump', 'ring',
      'note', 'line', 'bold', 'care', 'dash', 'fire', 'glow', 'hero', 'jazz', 'kind',
      'lamp', 'mint', 'node', 'open', 'pink', 'quiz', 'rose', 'star', 'tune', 'vine',
      'wave', 'yarn', 'zest', 'beam', 'chip', 'drum', 'echo', 'fern', 'grid', 'hint',
    ]
    let word = api.pick(WORDS)
    let at = 0
    let hits = 0
    let combo = 0
    let best = 0
    let pace = 0
    let t = 0
    let slide = 1
    let shakeT = 0
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    const parts = []

    function paceMax() {
      return Math.max(2.4, 6.5 - combo * 0.45)
    }

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(60, 215)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
          life: api.rnd(0.45, 0.9), age: 0, r: api.rnd(1.5, 3.2),
        })
      }
      while (parts.length > 72) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.75
    }

    function nextWord() {
      const next = api.pick(WORDS)
      word = next === word ? WORDS[(WORDS.indexOf(next) + 1) % WORDS.length] : next
      at = 0
      slide = 1
    }

    function succeed() {
      hits += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      pace = 0
      okFlash = true
      flashT = 0.2
      burst(240, 140, 8 + Math.min(14, combo * 2))
      pop(combo >= 10 ? 'PERFECT' : combo >= 4 ? 'STREAK x' + combo : 'NICE', C.good)
      at += 1
      if (at >= word.length) nextWord()
    }

    function fail() {
      combo = 0
      okFlash = false
      flashT = 0.34
      shakeT = 0.34
      pace = 0
      pop('MISS', C.warn)
    }

    const heldKeys = {}

    api.onKey((key, isDown) => {
      if (!isDown) {
        heldKeys[key] = false
        return
      }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (key.length !== 1 || key < 'a' || key > 'z') return
      if (key === word[at]) succeed()
      else fail()
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 13 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(106,169,255,0.05)')
      }
    }

    return {
      update(dt) {
        t += dt
        slide = Math.max(0, slide - dt * 5.5)
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        pace += dt
        if (pace > paceMax()) {
          pace = 0
          combo = 0
          pop('TOO SLOW', C.dim)
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 330 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        bands()
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('TYPE', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('hits ' + hits, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) {
          api.text('x' + combo, api.w - 92, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        }
        const sx = shakeT > 0 ? Math.sin(shakeT * 74) * 11 * (shakeT / 0.34) : 0
        const n = word.length
        const bw = 54
        const gap = 10
        const total = n * bw + (n - 1) * gap
        const drop = slide * 46
        const x0 = (api.w - total) / 2 + sx
        const y = 132 + drop
        for (let i = 0; i < n; i += 1) {
          const x = x0 + i * (bw + gap) + slide * (12 + i * 9)
          const done = i < at
          const cur = i === at
          if (cur) {
            const pulse = 0.5 + 0.5 * Math.sin(t * 7)
            api.rect(x - 4 - pulse * 3, y - 4 - pulse * 3, bw + 8 + pulse * 6, bw + 8 + pulse * 6, C.accent2)
          }
          let fill = C.panel
          if (done) fill = C.good
          else if (cur) fill = flashT > 0 && !okFlash ? C.warn : C.accent
          api.rect(x, y, bw, bw, fill)
          api.text(word[i].toUpperCase(), x + bw / 2, y + bw / 2 + 1, {
            size: 28, color: done || cur ? '#0d1218' : C.dim, align: 'center', weight: 'bold',
          })
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 232 - (0.75 - popT) * 26, {
            size: 17 + popT * 14, color: popColor, align: 'center', weight: 'bold',
          })
        }
        const pw = 200
        const px = (api.w - pw) / 2
        api.rect(px, 268, pw, 10, C.panel)
        api.rect(px, 268, pw * Math.min(1, pace / paceMax()), 10, pace / paceMax() > 0.7 ? C.warn : C.accent)
        api.text('pace · combo ' + combo + ' · best ' + best, api.w / 2, 292, {
          size: 12, color: C.dim, align: 'center',
        })
        api.rect(0, api.h - 34, api.w, 34, C.panel)
        api.text('a-z · wrong key keeps the word', api.w / 2, api.h - 17, { size: 12, color: C.dim, align: 'center' })
      },
    }
  },
})
