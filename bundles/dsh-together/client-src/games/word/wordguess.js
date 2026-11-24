defineGame({
  id: 'wordguess',
  create(api) {
    const C = api.colors
    const WORDS = [
      'apple', 'beach', 'candy', 'dream', 'eagle', 'flame', 'grape', 'honey', 'juice', 'knife',
      'lemon', 'music', 'north', 'ocean', 'piano', 'queen', 'river', 'stone', 'tiger', 'water',
      'youth', 'zebra', 'charm', 'draft', 'ember', 'frost', 'giant', 'light', 'maple', 'noble',
      'pearl', 'rapid', 'shark', 'solar', 'toast', 'vivid', 'wheat', 'brisk', 'climb', 'fable',
    ]
    const LEN = 5
    const MAX = 5
    let secret = api.pick(WORDS)
    let rows = []
    let cur = ''
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
    let delT = 0
    let cleared = 0
    const parts = []

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(60, 220)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70,
          life: api.rnd(0.5, 1), age: 0, r: api.rnd(1.5, 3.4),
        })
      }
      while (parts.length > 80) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.8
    }

    function newWord() {
      let n = api.pick(WORDS)
      if (n === secret) n = WORDS[(WORDS.indexOf(n) + 1) % WORDS.length]
      secret = n
      rows = []
      cur = ''
      solved = false
      timer = 0
      slide = 1
      popT = 0
    }

    function mark(guess) {
      const marks = [0, 0, 0, 0, 0]
      const used = [false, false, false, false, false]
      for (let i = 0; i < LEN; i += 1) {
        if (guess[i] === secret[i]) {
          marks[i] = 2
          used[i] = true
        }
      }
      for (let i = 0; i < LEN; i += 1) {
        if (marks[i] === 2) continue
        for (let j = 0; j < LEN; j += 1) {
          if (!used[j] && secret[j] === guess[i]) {
            marks[i] = 1
            used[j] = true
            break
          }
        }
      }
      return marks
    }

    function submit() {
      if (cur.length !== LEN) {
        flashT = 0.34
        okFlash = false
        shakeT = 0.3
        pop('NEED 5 LETTERS', C.warn)
        return
      }
      const marks = mark(cur)
      const won = cur === secret
      rows.push({ guess: cur, marks, age: 0 })
      cur = ''
      flashT = 0.24
      okFlash = true
      if (won) {
        solved = true
        cleared += 1
        api.progress(1)
        timer = 1.6
        slide = 1
        pop(rows.length <= 3 ? 'PERFECT' : 'CLEARED', C.good)
        burst(240, 92 + (rows.length - 1) * 49, 22)
      } else if (rows.length >= MAX) {
        timer = 1.9
        flashT = 0.45
        okFlash = false
        pop('WAS ' + secret.toUpperCase(), C.warn)
      } else {
        const hot = marks.filter((m) => m === 2).length
        if (hot >= 3) pop(hot + ' IN PLACE', C.accent2)
        else pop('TRY AGAIN', C.dim)
      }
    }

    const heldKeys = {}

    api.onKey((key, isDown) => {
      if (!isDown) {
        heldKeys[key] = false
        return
      }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (solved || timer > 0 || rows.length >= MAX) return
      if (key === 'enter') {
        submit()
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
        }
        return
      }
      if (key.length === 1 && key >= 'a' && key <= 'z' && cur.length < LEN) cur += key
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 9 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(106,169,255,0.045)')
      }
    }

    return {
      update(dt) {
        t += dt
        slide = Math.max(0, slide - dt * 4.5)
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        if (delT > 0) delT = Math.max(0, delT - dt)
        for (let i = 0; i < rows.length; i += 1) rows[i].age += dt
        if (timer > 0) {
          timer = Math.max(0, timer - dt)
          if (timer === 0) newWord()
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
        api.text('GUESS', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('cleared ' + cleared, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        for (let i = 0; i < MAX; i += 1) {
          const x = 96 + i * 14
          api.circle(x, 27, 4, i < MAX - rows.length ? C.good : C.panel)
        }
        const cell = 44
        const gap = 5
        const x0 = (api.w - (LEN * cell + (LEN - 1) * gap)) / 2
        const y0 = 62
        const sx = shakeT > 0 ? Math.sin(shakeT * 78) * 8 * (shakeT / 0.3) : 0
        for (let r = 0; r < MAX; r += 1) {
          const row = rows[r]
          const y = y0 + r * (cell + gap) + (row ? -(1 - Math.min(1, row.age * 6)) * 8 : slide * 20)
          for (let c = 0; c < LEN; c += 1) {
            const x = x0 + c * (cell + gap) + sx
            let fill = C.panel
            let ink = C.dim
            let ch = ''
            let rev = 1
            if (row) {
              ch = row.guess[c]
              const raw = row.age * 6 - c * 0.25
              rev = raw < 0 ? 0 : Math.min(1, raw)
              fill = row.marks[c] === 2 ? C.good : row.marks[c] === 1 ? C.accent2 : C.panel
              if (rev < 0.35) fill = C.panel
              ink = row.marks[c] === 0 ? C.dim : '#0d1218'
            } else if (r === rows.length && !solved) {
              ch = cur[c] || ''
              fill = ch ? C.accent : C.panel
              ink = '#0d1218'
            }
            api.rect(x, y, cell, cell, fill)
            if (ch) {
              api.text(ch.toUpperCase(), x + cell / 2, y + cell / 2 + 1, {
                size: 12 + 12 * rev, color: ink, align: 'center', weight: 'bold',
              })
            }
          }
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 316, {
            size: 15 + popT * 10, color: popColor, align: 'center', weight: 'bold',
          })
        }
        api.rect(0, api.h - 40, api.w, 40, C.panel)
        let hint = 'enter · space del · esc clear'
        let col = C.dim
        if (solved) {
          hint = 'SOLVED'
          col = C.good
        } else if (rows.length >= MAX) {
          hint = 'NEW WORD'
          col = C.warn
        } else if (delT > 0) {
          hint = 'DEL'
          col = C.warn
        }
        api.text(hint, api.w / 2, api.h - 20, { size: 13, color: col, align: 'center', weight: 'bold' })
      },
    }
  },
})
