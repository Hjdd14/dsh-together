defineGame({
  id: 'missing',
  create(api) {
    const C = api.colors
    const LEN = 5
    let seq = []
    let blank = 0
    let step = 0
    let input = ''
    let done = 0
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
    let tries = 0
    const parts = []

    function paceMax() {
      return Math.max(2.4, 6.5 - combo * 0.45)
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
      seq = []
      blank = api.irnd(1, LEN - 1)
      input = ''
      tries = 0
      slide = 1
      if (api.irnd(0, 3) === 0) {
        const start = api.irnd(16, 20)
        step = -api.irnd(2, 3)
        for (let i = 0; i < LEN; i += 1) seq.push(start + step * i)
      } else {
        const start = api.irnd(1, 6)
        step = api.irnd(1, 3)
        for (let i = 0; i < LEN; i += 1) seq.push(start + step * i)
      }
    }

    make()

    function succeed() {
      done += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      pace = 0
      okFlash = true
      flashT = 0.3
      burst(240, 144, 12 + Math.min(14, combo * 2))
      pop(combo >= 10 ? 'PERFECT' : combo >= 4 ? 'STREAK x' + combo : 'CORRECT', C.good)
      make()
    }

    function fail() {
      tries += 1
      combo = 0
      okFlash = false
      flashT = 0.4
      shakeT = 0.4
      pace = 0
      input = ''
      pop(tries >= 2 ? 'STEP IS ' + step : 'TRY AGAIN', C.warn)
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
        if (input.length < 2) input += key
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
      if (key !== 'enter') return
      if (input.length === 0) {
        pop('TYPE A NUMBER', C.dim)
        return
      }
      if (Number(input) === seq[blank]) succeed()
      else fail()
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
          p.vy += 320 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        bands()
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('MISSING', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('ok ' + done, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 76, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        const tw = 66
        const gap = 12
        const x0 = (api.w - (LEN * tw + (LEN - 1) * gap)) / 2
        const sx = shakeT > 0 ? Math.sin(shakeT * 74) * 9 * (shakeT / 0.4) : 0
        for (let i = 0; i < LEN; i += 1) {
          const x = x0 + i * (tw + gap) + slide * (16 + i * 8) + (i === blank ? sx : 0)
          const y = 106 - slide * 8
          const isBlank = i === blank
          const shown = isBlank ? input : String(seq[i])
          let fill = C.panel
          if (isBlank) fill = flashT > 0 && !okFlash ? C.warn : C.accent
          api.rect(x, y, tw, 76, fill)
          api.text(shown.length ? shown : '?', x + tw / 2, y + 39, {
            size: 30, color: isBlank ? '#0d1218' : C.fg, align: 'center', weight: 'bold',
          })
        }
        api.text('what comes next?', api.w / 2, 210, { size: 14, color: C.dim, align: 'center' })
        if (tries >= 2) {
          api.text('step ' + step, api.w / 2, 238, { size: 17, color: C.accent2, align: 'center', weight: 'bold' })
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 278, {
            size: 15 + popT * 11, color: popColor, align: 'center', weight: 'bold',
          })
        }
        if (delT > 0) api.text('DEL', 240, 300, { size: 12, color: C.warn, align: 'center', weight: 'bold' })
        api.rect(140, 312, 200, 6, C.panel)
        api.rect(140, 312, 200 * Math.min(1, pace / paceMax()), 6, pace / paceMax() > 0.7 ? C.warn : C.accent)
        api.rect(0, api.h - 24, api.w, 24, C.panel)
        api.text('digits · enter · space del · esc clear', api.w / 2, api.h - 12, {
          size: 11, color: C.dim, align: 'center',
        })
      },
    }
  },
})
