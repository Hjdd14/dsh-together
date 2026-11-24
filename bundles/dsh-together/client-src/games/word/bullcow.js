defineGame({
  id: 'bullcow',
  create(api) {
    const C = api.colors
    const LEN = 4
    const MAX = 8
    let secret = ''
    let cur = ''
    let rows = []
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
    let combo = 0
    let best = 0
    let hot = -1
    let cracked = 0
    const parts = []

    function makeSecret() {
      const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      let out = ''
      for (let i = 0; i < LEN; i += 1) {
        const k = api.irnd(0, pool.length - 1)
        out += String(pool[k])
        pool.splice(k, 1)
      }
      return out
    }

    secret = makeSecret()

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(55, 200)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
          life: api.rnd(0.45, 0.95), age: 0, r: api.rnd(1.5, 3.2),
        })
      }
      while (parts.length > 72) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.8
    }

    function reset() {
      secret = makeSecret()
      cur = ''
      rows = []
      solved = false
      timer = 0
      slide = 1
      hot = -1
      combo = 0
    }

    function score(guess) {
      let bulls = 0
      let cows = 0
      const used = [false, false, false, false]
      for (let i = 0; i < LEN; i += 1) {
        if (guess[i] === secret[i]) {
          bulls += 1
          used[i] = true
        }
      }
      for (let i = 0; i < LEN; i += 1) {
        if (guess[i] === secret[i]) continue
        for (let j = 0; j < LEN; j += 1) {
          if (!used[j] && secret[j] === guess[i]) {
            used[j] = true
            cows += 1
            break
          }
        }
      }
      return { bulls, cows }
    }

    function dupes(guess) {
      for (let i = 0; i < LEN; i += 1) {
        if (guess.indexOf(guess[i]) !== i) return true
      }
      return false
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
      if (key.length === 1 && key >= '0' && key <= '9') {
        if (cur.length < LEN) cur += key
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
      if (key !== 'enter' || cur.length !== LEN) return
      const s = score(cur)
      const won = cur === secret
      const dupe = dupes(cur)
      rows.push({ guess: cur, bulls: s.bulls, cows: s.cows, age: 0 })
      cur = ''
      flashT = 0.26
      okFlash = true
      if (won) {
        solved = true
        cracked += 1
        api.progress(1)
        timer = 2
        pop('CRACKED', C.good)
        burst(240, 100, 26)
      } else if (rows.length >= MAX) {
        timer = 2.2
        flashT = 0.45
        okFlash = false
        pop('WAS ' + secret, C.warn)
      } else {
        const sum = s.bulls + s.cows
        if (s.bulls === 3) {
          combo = 0
          pop('SO CLOSE', C.accent2)
        } else if (sum >= hot) {
          if (hot >= 0) {
            combo += 1
            best = Math.max(best, combo)
          }
          hot = sum
          pop(combo >= 3 ? 'STREAK x' + combo : 'CLOSER', C.good)
        } else {
          combo = 0
          pop('COLDER', C.dim)
        }
      }
      if (dupe) {
        shakeT = 0.3
        pop('DISTINCT DIGITS', C.warn)
      }
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
        slide = Math.max(0, slide - dt * 4.5)
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        if (delT > 0) delT = Math.max(0, delT - dt)
        for (let i = 0; i < rows.length; i += 1) rows[i].age += dt
        if (timer > 0) {
          timer = Math.max(0, timer - dt)
          if (timer === 0) reset()
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
        api.text('BULL & COW', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        for (let i = 0; i < MAX; i += 1) {
          api.circle(122 + i * 13, 27, 3.6, i < MAX - rows.length ? C.good : C.panel)
        }
        api.text('cracked ' + cracked, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        const sx = shakeT > 0 ? Math.sin(shakeT * 76) * 9 * (shakeT / 0.3) : 0
        const bw = 50
        const bh = 58
        const gap = 12
        const x0 = (api.w - (LEN * bw + (LEN - 1) * gap)) / 2
        for (let i = 0; i < LEN; i += 1) {
          const x = x0 + i * (bw + gap) + sx + slide * 14
          const ch = cur[i] || ''
          api.rect(x, 70, bw, bh, ch ? C.accent : C.panel)
          if (ch) {
            api.text(ch, x + bw / 2, 70 + bh / 2 + 1, { size: 28, color: '#0d1218', align: 'center', weight: 'bold' })
          } else {
            api.rect(x + 12, 70 + bh - 14, bw - 24, 3, delT > 0 ? C.warn : C.dim)
          }
        }
        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i]
          const y = 152 + i * 22
          const k = Math.min(1, row.age * 5)
          const off = (1 - k) * 40
          api.text(row.guess.split('').join(' '), api.w / 2 - 34 + off, y, {
            size: 15, color: C.fg, align: 'right', weight: 'bold',
          })
          api.text(row.bulls + 'B', api.w / 2 + 4 + off, y, {
            size: 15, color: row.bulls > 0 ? C.good : C.dim, align: 'left', weight: 'bold',
          })
          api.text(row.cows + 'C', api.w / 2 + 44 + off, y, {
            size: 15, color: row.cows > 0 ? C.accent2 : C.dim, align: 'left',
          })
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 322, { size: 15 + popT * 10, color: popColor, align: 'center', weight: 'bold' })
        }
        api.rect(0, api.h - 34, api.w, 34, C.panel)
        let hint = '0-9 · enter · space del'
        let col = C.dim
        if (solved) {
          hint = 'CRACKED'
          col = C.good
        } else if (timer > 0) {
          hint = 'NEW CODE'
          col = C.warn
        } else if (delT > 0) {
          hint = 'DEL'
          col = C.warn
        }
        api.text(hint, api.w / 2, api.h - 17, { size: 12, color: col, align: 'center', weight: 'bold' })
      },
    }
  },
})
