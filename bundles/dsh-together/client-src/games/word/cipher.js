defineGame({
  id: 'cipher',
  create(api) {
    const C = api.colors
    const SENTENCES = [
      'THE OLD MILL', 'CODE IS FUN', 'TAP THE KEY', 'STAY CALM',
      'PLAY THE GAME', 'MEET ME SOON', 'READ THE MAP', 'KEEP IT SHORT',
    ]
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let sentence = ''
    let cipher = ''
    let known = {}
    let wrong = {}
    let shift = 0
    let decoded = 0
    let combo = 0
    let best = 0
    let t = 0
    let slide = 1
    let shakeT = 0
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let timer = 0
    const parts = []

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(50, 190)
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
      popT = 0.75
    }

    function build() {
      let next = api.pick(SENTENCES)
      if (next === sentence) next = SENTENCES[(SENTENCES.indexOf(next) + 1) % SENTENCES.length]
      sentence = next
      shift = api.irnd(3, 23)
      cipher = ''
      for (let i = 0; i < sentence.length; i += 1) {
        const ch = sentence[i]
        cipher += ch === ' ' ? ' ' : ALPHA[(ALPHA.indexOf(ch) + shift) % 26]
      }
      known = {}
      wrong = {}
      const letters = []
      for (let i = 0; i < sentence.length; i += 1) {
        const ch = sentence[i]
        if (ch !== ' ' && letters.indexOf(ch) < 0) letters.push(ch)
      }
      let given = 0
      for (let i = 0; i < letters.length; i += 1) {
        if (api.rng() < 0.45) {
          known[letters[i]] = true
          given += 1
        }
      }
      for (let i = 0; i < letters.length && given < 2; i += 1) {
        if (!known[letters[i]]) {
          known[letters[i]] = true
          given += 1
        }
      }
      slide = 1
      timer = 0
    }

    build()

    function cursor() {
      for (let i = 0; i < sentence.length; i += 1) {
        const ch = sentence[i]
        if (ch !== ' ' && !known[ch]) return i
      }
      return -1
    }

    function lettersLeft() {
      let n = 0
      for (let i = 0; i < sentence.length; i += 1) {
        const ch = sentence[i]
        if (ch !== ' ' && !known[ch]) n += 1
      }
      return n
    }

    function finish() {
      decoded += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      okFlash = true
      flashT = 0.5
      pop('DECODED', C.good)
      burst(240, 120, 26)
      timer = 1.5
    }

    const heldKeys = {}

    api.onKey((key, isDown) => {
      if (!isDown) {
        heldKeys[key] = false
        return
      }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (timer > 0) return
      if (key.length !== 1 || key < 'a' || key > 'z') return
      const at = cursor()
      if (at < 0) return
      const ch = sentence[at]
      if (key.toUpperCase() === ch) {
        known[ch] = true
        okFlash = true
        flashT = 0.22
        burst(120 + (at % 13) * 27, 118, 9)
        pop('YES · ' + ch, C.good)
        if (cursor() < 0) finish()
      } else {
        wrong[ch] = (wrong[ch] || 0) + 1
        combo = 0
        okFlash = false
        flashT = 0.36
        shakeT = 0.36
        if (wrong[ch] >= 3) {
          known[ch] = true
          pop('IT WAS ' + ch, C.accent2)
          if (cursor() < 0) finish()
        } else {
          pop('NOT ' + key.toUpperCase(), C.warn)
        }
      }
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 8 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(255,207,92,0.04)')
      }
    }

    return {
      update(dt) {
        t += dt
        slide = Math.max(0, slide - dt * 5)
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 320 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
        if (timer > 0) {
          timer = Math.max(0, timer - dt)
          if (timer === 0) build()
        }
      },
      draw() {
        api.clear(C.bg)
        bands()
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('CIPHER', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('decoded ' + decoded, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        let total = 0
        for (let i = 0; i < sentence.length; i += 1) total += sentence[i] === ' ' ? 14 : 27
        let x = (api.w - total) / 2
        const at = cursor()
        const sx = shakeT > 0 ? Math.sin(shakeT * 76) * 6 * (shakeT / 0.36) : 0
        const y = 96
        for (let i = 0; i < sentence.length; i += 1) {
          const ch = sentence[i]
          if (ch === ' ') {
            x += 14
            continue
          }
          const isCur = i === at
          api.rect(x + sx, y, 25, 58, isCur ? 'rgba(255,207,92,0.16)' : C.panel)
          if (isCur) {
            api.rect(x + sx, y, 25, 3, C.accent2)
            api.rect(x + sx, y + 55, 25, 3, C.accent2)
          }
          api.text(cipher[i], x + 12.5 + sx, y + 15, { size: 14, color: C.dim, align: 'center' })
          const shown = known[ch]
          api.text(shown ? ch : '_', x + 12.5 + sx, y + 41, {
            size: 21,
            color: shown ? C.accent2 : C.dim,
            align: 'center',
            weight: 'bold',
          })
          x += 27
        }
        api.text('type the letter for the lit cell', api.w / 2, 190, { size: 13, color: C.dim, align: 'center' })
        const knownCount = Object.keys(known).length
        api.text('known ' + knownCount + ' · left ' + lettersLeft(), api.w / 2, 214, {
          size: 13, color: C.accent2, align: 'center',
        })
        const bad = at >= 0 ? wrong[sentence[at]] || 0 : 0
        if (bad > 0) {
          api.text('misses on this letter: ' + bad + '/3', api.w / 2, 238, {
            size: 12, color: C.warn, align: 'center',
          })
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 272, {
            size: 16 + popT * 10, color: popColor, align: 'center', weight: 'bold',
          })
        }
        api.rect(140, 300, 200, 6, C.panel)
        api.rect(140, 300, 200 * (1 - lettersLeft() / Math.max(1, sentence.replace(/ /g, '').length)), 6, C.accent)
        api.rect(0, api.h - 24, api.w, 24, C.panel)
        api.text('a-z · 3 misses reveal a letter · best x' + best, api.w / 2, api.h - 12, {
          size: 11, color: C.dim, align: 'center',
        })
      },
    }
  },
})
