defineGame({
  id: 'hangman',
  create(api) {
    const C = api.colors
    const WORDS = [
      'star', 'moon', 'rain', 'salt', 'leaf', 'kite', 'wave', 'iron', 'drum', 'fern',
      'glow', 'jump', 'lamp', 'mist', 'nest', 'opal', 'pine', 'quiz', 'rope', 'silk',
      'tide', 'vine', 'wind', 'yarn', 'zinc', 'amber', 'brick', 'cloud', 'delta', 'frost',
      'grape', 'honey', 'ivory', 'joker', 'knife', 'lemon', 'maple', 'noble', 'pearl', 'river',
      'solar', 'tiger', 'vivid', 'wheat',
    ]
    const MAX = 6
    let word = api.pick(WORDS)
    let guessed = ''
    let wrong = 0
    let solved = false
    let timer = 0
    let t = 0
    let slide = 1
    let shakeT = 0
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let combo = 0
    let best = 0
    let pace = 0
    let solvedCount = 0
    const parts = []

    function paceMax() {
      return Math.max(3, 8 - combo * 0.5)
    }

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(45, 170)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
          life: api.rnd(0.4, 0.85), age: 0, r: api.rnd(1.4, 3),
        })
      }
      while (parts.length > 64) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.7
    }

    function newWord() {
      let n = api.pick(WORDS)
      if (n === word) n = WORDS[(WORDS.indexOf(n) + 1) % WORDS.length]
      word = n
      guessed = ''
      wrong = 0
      solved = false
      timer = 0
      slide = 1
      popT = 0
      pace = 0
    }

    function wordDone() {
      for (let i = 0; i < word.length; i += 1) {
        if (guessed.indexOf(word[i]) < 0) return false
      }
      return true
    }

    const heldKeys = {}

    api.onKey((key, isDown) => {
      if (!isDown) {
        heldKeys[key] = false
        return
      }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (solved || timer > 0) return
      if (key.length !== 1 || key < 'a' || key > 'z') return
      if (guessed.indexOf(key) >= 0) {
        pop('ALREADY USED', C.dim)
        return
      }
      guessed += key
      if (word.indexOf(key) >= 0) {
        combo += 1
        best = Math.max(best, combo)
        pace = 0
        okFlash = true
        flashT = 0.2
        let x = 0
        let n = 0
        for (let i = 0; i < word.length; i += 1) {
          if (word[i] === key) {
            x += 250 + 22 + i * 44
            n += 1
          }
        }
        burst(x / n, 200, 10 + Math.min(12, combo * 2))
        pop(combo >= 6 ? 'STREAK x' + combo : 'NICE', C.good)
        if (wordDone()) {
          solved = true
          solvedCount += 1
          api.progress(1)
          timer = 1.4
          pop('SOLVED', C.good)
          burst(355, 200, 26)
        }
      } else {
        wrong += 1
        combo = 0
        okFlash = false
        flashT = 0.4
        shakeT = 0.4
        pace = 0
        pop('MISS ' + key.toUpperCase(), C.warn)
        if (wrong >= MAX) timer = 1.8
      }
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 8 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(255,122,122,0.035)')
      }
    }

    return {
      update(dt) {
        t += dt
        slide = Math.max(0, slide - dt * 4.5)
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        pace += dt
        if (pace > paceMax()) {
          pace = 0
          combo = 0
          pop('TOO SLOW', C.dim)
        }
        if (timer > 0) {
          timer = Math.max(0, timer - dt)
          if (timer === 0) newWord()
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 300 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw(g) {
        api.clear(C.bg)
        bands()
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('HANGMAN', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        const lives = Math.max(0, MAX - wrong)
        for (let i = 0; i < MAX; i += 1) {
          api.circle(96 + i * 14, 27, 4, i < lives ? (lives <= 2 ? C.warn : C.good) : C.panel)
        }
        api.text('cleared ' + solvedCount, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 110, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        const gx = shakeT > 0 ? Math.sin(shakeT * 70) * 9 * (shakeT / 0.4) : 0
        g.strokeStyle = C.dim
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(64 + gx, 302)
        g.lineTo(196 + gx, 302)
        g.moveTo(112 + gx, 302)
        g.lineTo(112 + gx, 82)
        g.moveTo(112 + gx, 82)
        g.lineTo(188 + gx, 82)
        g.moveTo(188 + gx, 82)
        g.lineTo(188 + gx, 100)
        g.stroke()
        const px = 188 + gx
        const py = 100
        const ink = wrong >= MAX && !solved ? C.warn : flashT > 0 && !okFlash ? C.warn : C.fg
        if (wrong > 0) api.circle(px, py + 22, 20, ink)
        g.strokeStyle = ink
        g.lineWidth = 5
        if (wrong > 1) {
          g.beginPath()
          g.moveTo(px, py + 44)
          g.lineTo(px, py + 104)
          g.stroke()
        }
        if (wrong > 2) {
          g.beginPath()
          g.moveTo(px, py + 60)
          g.lineTo(px - 28, py + 86)
          g.stroke()
        }
        if (wrong > 3) {
          g.beginPath()
          g.moveTo(px, py + 60)
          g.lineTo(px + 28, py + 86)
          g.stroke()
        }
        if (wrong > 4) {
          g.beginPath()
          g.moveTo(px, py + 104)
          g.lineTo(px - 26, py + 148)
          g.stroke()
        }
        if (wrong > 5) {
          g.beginPath()
          g.moveTo(px, py + 104)
          g.lineTo(px + 26, py + 148)
          g.stroke()
        }
        const bw = 36
        const gap = 8
        const total = word.length * bw + (word.length - 1) * gap
        const x0 = 250 + (210 - total) / 2
        for (let i = 0; i < word.length; i += 1) {
          const x = x0 + i * (bw + gap) + slide * (16 + i * 8)
          const known = guessed.indexOf(word[i]) >= 0
          api.rect(x, 178, bw, 46, C.panel)
          api.rect(x, 224, bw, 3, known ? C.good : C.dim)
          if (known) {
            api.text(word[i].toUpperCase(), x + bw / 2, 202, {
              size: 24, color: solved ? C.good : C.fg, align: 'center', weight: 'bold',
            })
          }
        }
        let miss = ''
        for (let i = 0; i < guessed.length; i += 1) {
          if (word.indexOf(guessed[i]) < 0) miss += guessed[i].toUpperCase() + ' '
        }
        api.text(miss ? 'miss ' + miss : 'a-z', 355, 264, {
          size: 14, color: miss ? C.warn : C.dim, align: 'center',
        })
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, 355, 302 - (0.7 - popT) * 14, {
            size: 16 + popT * 10, color: popColor, align: 'center', weight: 'bold',
          })
        } else if (timer > 0 && !solved) {
          api.text('WAS ' + word.toUpperCase(), 355, 302, { size: 17, color: C.warn, align: 'center', weight: 'bold' })
        }
        api.rect(250, 330, 200, 6, C.panel)
        const pw = 200
        api.rect(250, 330, pw * Math.min(1, pace / paceMax()), 6, pace / paceMax() > 0.7 ? C.warn : C.accent)
        api.text('pace · combo ' + combo + ' · best ' + best, 355, 344, { size: 11, color: C.dim, align: 'center' })
      },
    }
  },
})
