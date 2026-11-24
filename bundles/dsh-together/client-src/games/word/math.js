defineGame({
  id: 'math',
  create(api) {
    const C = api.colors
    let q = null
    let input = ''
    let solved = 0
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
    let delT = 0
    const parts = []

    function paceMax() {
      return Math.max(2.2, 6 - combo * 0.42)
    }

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

    function make() {
      const kind = api.irnd(0, 2)
      let a = 0
      let b = 0
      let ans = 0
      let sign = '+'
      if (kind === 0) {
        a = api.irnd(1, 15)
        b = api.irnd(1, 20 - a)
        ans = a + b
      } else if (kind === 1) {
        a = api.irnd(6, 20)
        b = api.irnd(1, a - 1)
        ans = a - b
        sign = '-'
      } else {
        a = api.irnd(2, 5)
        b = api.irnd(2, 4)
        ans = a * b
        sign = 'x'
      }
      q = { text: a + ' ' + sign + ' ' + b + ' =', ans }
      input = ''
      slide = 1
    }

    make()

    function succeed() {
      solved += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      pace = 0
      okFlash = true
      flashT = 0.22
      burst(240, 210, 10 + Math.min(16, combo * 2))
      pop(combo >= 10 ? 'PERFECT' : combo >= 4 ? 'STREAK x' + combo : 'NICE', C.good)
      make()
    }

    function fail(msg) {
      combo = 0
      okFlash = false
      flashT = 0.36
      shakeT = 0.36
      pace = 0
      pop(msg || 'NOPE', C.warn)
    }

    const heldKeys = {}

    api.onKey((key, isDown) => {
      if (!isDown) {
        heldKeys[key] = false
        return
      }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (key.length === 1 && key >= '0' && key <= '9') {
        if (input.length < 3) input += key
        return
      }
      if (key === 'space') {
        if (input.length) {
          input = input.slice(0, -1)
          delT = 0.3
          pop('DEL', C.dim)
        }
        return
      }
      if (key === 'escape') {
        if (input.length) {
          input = ''
          delT = 0.3
          pop('CLEAR', C.dim)
        }
        return
      }
      if (key !== 'enter') return
      if (input.length === 0) {
        pop('TYPE A NUMBER', C.dim)
        return
      }
      if (Number(input) === q.ans) succeed()
      else {
        fail('NOPE · ' + input)
        input = ''
      }
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 11 + i * 150) % 460) - 70
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
        if (delT > 0) delT = Math.max(0, delT - dt)
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
        api.text('MATH', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('ok ' + solved, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 78, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        const sx = shakeT > 0 ? Math.sin(shakeT * 76) * 9 * (shakeT / 0.36) : 0
        api.text(q.text, api.w / 2 + sx + slide * 40, 112 + slide * 10, {
          size: 44, color: C.fg, align: 'center', weight: 'bold',
        })
        const bw = 150
        const bh = 64
        const bx = (api.w - bw) / 2 + sx
        const by = 172
        api.rect(bx - 4, by - 4, bw + 8, bh + 8, flashT > 0 ? (okFlash ? C.good : C.warn) : C.dim)
        api.rect(bx, by, bw, bh, C.panel)
        api.text(input.length ? input : '?', bx + bw / 2, by + bh / 2 + 1, {
          size: 34, color: input.length ? C.fg : C.dim, align: 'center', weight: 'bold',
        })
        if (delT > 0) {
          api.text('DEL', bx + bw / 2, by - 22, { size: 13, color: C.warn, align: 'center', weight: 'bold' })
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 268 - (0.7 - popT) * 24, {
            size: 18 + popT * 13, color: popColor, align: 'center', weight: 'bold',
          })
        }
        const pw = 200
        const px = (api.w - pw) / 2
        api.rect(px, 288, pw, 8, C.panel)
        api.rect(px, 288, pw * Math.min(1, pace / paceMax()), 8, pace / paceMax() > 0.7 ? C.warn : C.accent)
        api.text('pace · combo ' + combo + ' · best ' + best, api.w / 2, 310, { size: 12, color: C.dim, align: 'center' })
        api.rect(0, api.h - 26, api.w, 26, C.panel)
        api.text('digits · enter · space del · esc clear', api.w / 2, api.h - 13, { size: 11, color: C.dim, align: 'center' })
      },
    }
  },
})
