defineGame({
  id: 'balance',
  create(api) {
    const C = api.colors
    let q = null
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
      if (api.irnd(0, 1) === 0) {
        const a = api.irnd(1, 10)
        const b = api.irnd(1, 10)
        const d = api.irnd(1, a + b - 1)
        q = { text: a + ' + ' + b + ' = ? + ' + d, ans: a + b - d, left: a + b, right: d }
      } else {
        const a = api.irnd(2, 4)
        const b = api.irnd(2, 4)
        const d = api.irnd(1, a * b - 1)
        q = { text: a + ' x ' + b + ' = ? + ' + d, ans: a * b - d, left: a * b, right: d }
      }
      input = ''
      slide = 1
    }

    make()

    function succeed() {
      done += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      pace = 0
      okFlash = true
      flashT = 0.28
      burst(240, 250, 12 + Math.min(14, combo * 2))
      pop(combo >= 10 ? 'PERFECT' : combo >= 4 ? 'STREAK x' + combo : 'BALANCED', C.good)
      make()
    }

    function fail() {
      combo = 0
      okFlash = false
      flashT = 0.4
      shakeT = 0.4
      pace = 0
      pop('NOPE', C.warn)
      input = ''
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
      else fail()
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
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 330 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw(g) {
        api.clear(C.bg)
        bands()
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('BALANCE', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('ok ' + done, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 76, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        const sx = shakeT > 0 ? Math.sin(shakeT * 76) * 9 * (shakeT / 0.4) : 0
        api.text(q.text, api.w / 2 + sx + slide * 50, 92 - slide * 6, {
          size: 32, color: C.fg, align: 'center', weight: 'bold',
        })
        const bw = 120
        const bh = 56
        const bx = (api.w - bw) / 2 + sx
        const by = 126
        api.rect(bx - 3, by - 3, bw + 6, bh + 6, flashT > 0 ? (okFlash ? C.good : C.warn) : C.dim)
        api.rect(bx, by, bw, bh, C.panel)
        api.text(input.length ? input : '?', bx + bw / 2, by + bh / 2 + 1, {
          size: 28, color: input.length ? C.fg : C.dim, align: 'center', weight: 'bold',
        })
        if (delT > 0) api.text('DEL', bx + bw / 2, by - 18, { size: 12, color: C.warn, align: 'center', weight: 'bold' })
        const diff = input.length ? Number(input) - q.ans : 0
        const ang = Math.max(-0.24, Math.min(0.24, diff * 0.05))
        const cx = 240 + sx
        const cy = 250
        const half = 80
        const ex1 = cx - Math.cos(ang) * half
        const ey1 = cy - Math.sin(ang) * half
        const ex2 = cx + Math.cos(ang) * half
        const ey2 = cy + Math.sin(ang) * half
        g.strokeStyle = flashT > 0 && !okFlash ? C.warn : C.dim
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(ex1, ey1)
        g.lineTo(ex2, ey2)
        g.moveTo(ex1, ey1)
        g.lineTo(ex1, ey1 + 20)
        g.moveTo(ex2, ey2)
        g.lineTo(ex2, ey2 + 20)
        g.moveTo(cx - 14, cy + 34)
        g.lineTo(cx + 14, cy + 34)
        g.stroke()
        api.circle(ex1, ey1 + 28, 11, flashT > 0 && !okFlash ? C.warn : C.accent)
        api.circle(ex2, ey2 + 28, 11, flashT > 0 && !okFlash ? C.warn : C.accent2)
        api.rect(cx - 6, cy, 12, 34, C.panel)
        api.text(String(q.left), ex1, ey1 + 46, { size: 13, color: C.dim, align: 'center', weight: 'bold' })
        const balanced = input.length > 0 && Number(input) + q.right === q.left
        const rv = input.length ? String(Number(input) + q.right) : '?'
        api.text(rv, ex2, ey2 + 46, {
          size: 13,
          color: !input.length ? C.dim : balanced ? C.good : C.warn,
          align: 'center',
          weight: 'bold',
        })
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
        api.rect(140, 330, 200, 6, C.panel)
        api.rect(140, 330, 200 * Math.min(1, pace / paceMax()), 6, pace / paceMax() > 0.7 ? C.warn : C.accent)
        api.rect(0, api.h - 22, api.w, 22, C.panel)
        let foot = 'digits · enter · space del'
        let col = C.dim
        if (flashT > 0 && delT > 0) {
          foot = 'DEL'
          col = C.warn
        }
        api.text(foot, api.w / 2, api.h - 11, { size: 11, color: col, align: 'center', weight: 'bold' })
      },
    }
  },
})
