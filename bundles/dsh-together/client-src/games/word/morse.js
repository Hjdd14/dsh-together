defineGame({
  id: 'morse',
  create(api) {
    const C = api.colors
    const MORSE = {
      e: '.', t: '-', i: '..', a: '.-', n: '-.', m: '--', s: '...', u: '..-',
      r: '.-.', w: '.--', d: '-..', k: '-.-', g: '--.', o: '---',
    }
    const LETTERS = ['e', 't', 'i', 'a', 'n', 'm', 's', 'u', 'r', 'w', 'd', 'k', 'g', 'o']
    const LONG_MS = 220
    let letter = api.pick(LETTERS)
    let pattern = MORSE[letter]
    let input = ''
    let done = 0
    let combo = 0
    let best = 0
    let pace = 0
    let t = 0
    let shakeT = 0
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let pressed = false
    let pressStart = 0
    let holdMs = 0
    const parts = []
    const rings = []

    function paceMax() {
      return Math.max(2.8, 7 - combo * 0.5)
    }

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(55, 200)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 55,
          life: api.rnd(0.45, 0.95), age: 0, r: api.rnd(1.5, 3.2),
        })
      }
      while (parts.length > 72) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.7
    }

    function next() {
      let n = api.pick(LETTERS)
      if (n === letter) n = LETTERS[(LETTERS.indexOf(n) + 1) % LETTERS.length]
      letter = n
      pattern = MORSE[n]
      input = ''
      pace = 0
    }

    function succeed() {
      done += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      pace = 0
      okFlash = true
      flashT = 0.35
      burst(108, 132, 12 + Math.min(14, combo * 2))
      pop(combo >= 8 ? 'PERFECT' : combo >= 3 ? 'STREAK x' + combo : 'NICE', C.good)
      next()
    }

    function tap(sym) {
      input += sym
      rings.push({ x: 240, y: 213, r: 10, age: 0 })
      while (rings.length > 10) rings.shift()
      flashT = 0.14
      okFlash = true
      if (input.length < pattern.length) return
      if (input === pattern) succeed()
      else {
        combo = 0
        okFlash = false
        flashT = 0.45
        shakeT = 0.4
        pace = 0
        pop('TRY AGAIN', C.warn)
        input = ''
      }
    }

    api.onKey((key, isDown) => {
      if (key !== 'space') return
      if (isDown) {
        if (pressed) return
        pressed = true
        pressStart = api.now()
        holdMs = 0
        return
      }
      if (!pressed) return
      const dur = api.now() - pressStart
      pressed = false
      tap(dur >= LONG_MS ? '-' : '.')
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 9 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(255,207,92,0.04)')
      }
    }

    return {
      update(dt) {
        t += dt
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        pace += dt
        if (pace > paceMax()) {
          pace = 0
          combo = 0
          pop('TOO SLOW', C.dim)
        }
        if (pressed) {
          holdMs = api.now() - pressStart
          if (!api.down('space') && holdMs >= 0) {
            pressed = false
            tap(holdMs >= LONG_MS ? '-' : '.')
          }
        }
        for (let i = rings.length - 1; i >= 0; i -= 1) {
          rings[i].age += dt
          if (rings[i].age > 0.4) rings.splice(i, 1)
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
        api.text('MORSE', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('done ' + done, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 86, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        const sx = shakeT > 0 ? Math.sin(shakeT * 74) * 10 * (shakeT / 0.4) : 0
        api.text(letter.toUpperCase(), 108 + sx, 130, { size: 86, color: C.fg, align: 'center', weight: 'bold' })
        const pw = pattern.length * 30
        for (let i = 0; i < pattern.length; i += 1) {
          const cx = 232 - pw / 2 + i * 30 + 10 + sx
          if (pattern[i] === '.') api.circle(cx, 118, 8, C.accent2)
          else api.rect(cx - 12, 111, 24, 14, C.accent2)
        }
        api.text('tap it', 320, 166, { size: 13, color: C.dim, align: 'center' })
        const slots = Math.max(3, pattern.length)
        for (let i = 0; i < slots; i += 1) {
          const cx = 240 - (slots * 30) / 2 + i * 30 + 10
          const got = input[i]
          const col = got ? (flashT > 0 && !okFlash ? C.warn : C.good) : C.panel
          if (got === '-') api.rect(cx - 12, 206, 24, 14, col)
          else if (got === '.') api.circle(cx, 213, 8, col)
          else api.rect(cx - 8, 205, 16, 16, C.panel)
        }
        for (let i = 0; i < rings.length; i += 1) {
          const rg = rings[i]
          const k = rg.age / 0.4
          api.circle(rg.x, rg.y, 8 + k * 26, 'rgba(106,169,255,0.16)')
        }
        const bar = Math.min(1, holdMs / (LONG_MS * 2))
        api.rect(150, 250, 180, 12, C.panel)
        api.rect(150, 250, 180 * (pressed ? bar : 0), 12, holdMs >= LONG_MS ? C.accent2 : C.accent)
        api.rect(150 + 90, 246, 2, 20, C.dim)
        api.text(pressed ? (holdMs >= LONG_MS ? '-' : '.') : '', 340, 256, {
          size: 20, color: C.fg, align: 'center', weight: 'bold',
        })
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 292, {
            size: 15 + popT * 11, color: popColor, align: 'center', weight: 'bold',
          })
        }
        api.rect(140, 316, 200, 6, C.panel)
        api.rect(140, 316, 200 * Math.min(1, pace / paceMax()), 6, pace / paceMax() > 0.7 ? C.warn : C.accent)
        api.text('short = dot · hold = dash', api.w / 2, 336, { size: 12, color: C.dim, align: 'center' })
      },
    }
  },
})
