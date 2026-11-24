defineGame({
  id: 'anagram',
  create(api) {
    const C = api.colors
    const WORDS = [
      'star', 'moon', 'rain', 'salt', 'leaf', 'kite', 'wave', 'iron', 'drum', 'fern',
      'glow', 'jump', 'lamp', 'mist', 'nest', 'opal', 'pine', 'rope', 'silk', 'tide',
      'vine', 'wind', 'yarn', 'zinc', 'amber', 'brick', 'cloud', 'delta', 'frost', 'grape',
      'honey', 'maple', 'noble', 'pearl', 'river', 'solar', 'tiger', 'vivid', 'wheat', 'charm',
    ]
    let word = api.pick(WORDS)
    let scramble = ''
    let cur = ''
    let done = 0
    let combo = 0
    let best = 0
    let misses = 0
    let pace = 0
    let t = 0
    let slide = 1
    let shakeT = 0
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let delT = 0
    let timer = 0
    let letters = []
    const parts = []

    function paceMax() {
      return Math.max(2.6, 7 - combo * 0.45)
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

    function scrambleWord(w) {
      const arr = w.split('')
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = api.irnd(0, i)
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
      }
      const out = arr.join('')
      return out === w && w.length > 1 ? w.slice(1) + w[0] : out
    }

    function next() {
      let n = api.pick(WORDS)
      if (n === word) n = WORDS[(WORDS.indexOf(n) + 1) % WORDS.length]
      word = n
      scramble = scrambleWord(n)
      letters = scramble.split('')
      cur = ''
      misses = 0
      timer = 0
      slide = 1
      pace = 0
    }

    next()

    const heldKeys = {}

    api.onKey((key, isDown) => {
      if (!isDown) {
        heldKeys[key] = false
        return
      }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (timer > 0) return
      if (key.length === 1 && key >= 'a' && key <= 'z') {
        if (cur.length < word.length + 1) cur += key
        return
      }
      if (key === 'space') {
        if (cur.length) {
          cur = cur.slice(0, -1)
          delT = 0.3
        }
        return
      }
      if (key === 'escape') {
        if (cur.length) {
          cur = ''
          delT = 0.3
          pop('CLEAR', C.dim)
        }
        return
      }
      if (key !== 'enter' || cur.length === 0) return
      if (cur === word) {
        done += 1
        api.progress(1)
        combo += 1
        best = Math.max(best, combo)
        pace = 0
        okFlash = true
        flashT = 0.4
        timer = 0.55
        pop(combo >= 8 ? 'PERFECT' : combo >= 3 ? 'STREAK x' + combo : 'NICE', C.good)
        burst(240, 115, 12 + Math.min(16, combo * 2))
      } else {
        misses += 1
        combo = 0
        okFlash = false
        flashT = 0.4
        shakeT = 0.36
        pace = 0
        cur = ''
        pop(misses >= 2 ? 'ALMOST · ' + word[0].toUpperCase() + '...' : 'NOT THAT WORD', C.warn)
      }
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 10 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(139,220,122,0.04)')
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
        pace += dt
        if (pace > paceMax()) {
          pace = 0
          combo = 0
          pop('TOO SLOW', C.dim)
        }
        if (timer > 0) {
          timer = Math.max(0, timer - dt)
          if (timer === 0) next()
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
        api.text('ANAGRAM', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('solved ' + done, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 92, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        const tw = 52
        const gap = 10
        const total = letters.length * tw + (letters.length - 1) * gap
        const x0 = (api.w - total) / 2
        for (let i = 0; i < letters.length; i += 1) {
          const x = x0 + i * (tw + gap) + slide * (18 + i * 7)
          const y = 84 - slide * 10
          api.rect(x, y, tw, 62, C.panel)
          api.rect(x, y, tw, 4, C.accent)
          api.text(letters[i].toUpperCase(), x + tw / 2, y + 33, {
            size: 28, color: C.fg, align: 'center', weight: 'bold',
          })
        }
        const bw = 300
        const bx = (api.w - bw) / 2
        const by = 186
        const sx = shakeT > 0 ? Math.sin(shakeT * 74) * 10 * (shakeT / 0.36) : 0
        api.rect(bx - 3 + sx, by - 3, bw + 6, 62, flashT > 0 ? (okFlash ? C.good : C.warn) : C.dim)
        api.rect(bx + sx, by, bw, 56, C.panel)
        api.text(cur.length ? cur.toUpperCase() : '?', api.w / 2 + sx, by + 29, {
          size: 28, color: cur.length ? C.fg : C.dim, align: 'center', weight: 'bold',
        })
        if (delT > 0) {
          api.text('DEL', api.w / 2 + sx, by - 20, { size: 13, color: C.warn, align: 'center', weight: 'bold' })
        }
        let hint = 'starts with ' + word[0].toUpperCase() + ' · ' + word.length + ' letters'
        if (misses >= 2) hint += ' · ends ' + word[word.length - 1].toUpperCase()
        api.text(hint, api.w / 2, 272, { size: 14, color: C.accent2, align: 'center' })
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 296, {
            size: 15 + popT * 11, color: popColor, align: 'center', weight: 'bold',
          })
        }
        api.rect(140, 320, 200, 6, C.panel)
        api.rect(140, 320, 200 * Math.min(1, pace / paceMax()), 6, pace / paceMax() > 0.7 ? C.warn : C.accent)
        api.rect(0, api.h - 24, api.w, 24, C.panel)
        let foot = 'a-z · enter · space del'
        let col = C.dim
        if (timer > 0) {
          foot = 'SOLVED'
          col = C.good
        }
        api.text(foot, api.w / 2, api.h - 12, { size: 11, color: col, align: 'center', weight: 'bold' })
      },
    }
  },
})
