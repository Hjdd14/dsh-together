defineGame({
  id: 'countdots',
  create(api) {
    const C = api.colors
    let count = api.irnd(1, 9)
    let dots = []
    let solved = 0
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
    let picked = ''
    const parts = []

    function paceMax() {
      return Math.max(1.9, 5.6 - combo * 0.4)
    }

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(50, 185)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
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

    function makeDots(n) {
      const pts = []
      const cols = n <= 3 ? n : 3
      const rows = Math.ceil(n / cols)
      const cw = 128
      const ch = 62
      const ox = api.w / 2 - (cols * cw) / 2 + cw / 2
      const oy = 180 - (rows * ch) / 2 + ch / 2
      for (let i = 0; i < n; i += 1) {
        const c = i % cols
        const r = Math.floor(i / cols)
        pts.push({
          x: ox + c * cw + api.rnd(-9, 9),
          y: oy + r * ch + api.rnd(-7, 7),
          r: 11 + api.rnd(0, 4),
          age: -i * 0.07,
          seed: api.rnd(0, 6.28),
        })
      }
      return pts
    }

    dots = makeDots(count)

    function reroll() {
      count = api.irnd(1, 9)
      dots = makeDots(count)
    }

    function succeed() {
      solved += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      pace = 0
      okFlash = true
      flashT = 0.3
      let cx = 0
      let cy = 0
      for (let i = 0; i < dots.length; i += 1) {
        cx += dots[i].x
        cy += dots[i].y
      }
      burst(cx / dots.length, cy / dots.length, 10 + Math.min(16, combo * 2))
      pop(combo >= 10 ? 'PERFECT' : combo >= 4 ? 'STREAK x' + combo : 'NICE', C.good)
      reroll()
    }

    function fail() {
      combo = 0
      okFlash = false
      flashT = 0.4
      shakeT = 0.4
      pace = 0
      pop('IT WAS ' + count, C.warn)
    }

    const heldKeys = {}

    api.onKey((key, isDown) => {
      if (!isDown) {
        heldKeys[key] = false
        return
      }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (key.length !== 1 || key < '1' || key > '9') return
      picked = key
      if (Number(key) === count) succeed()
      else fail()
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 10 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(139,220,122,0.045)')
      }
    }

    return {
      update(dt) {
        t += dt
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        for (let i = 0; i < dots.length; i += 1) dots[i].age += dt
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
        api.text('COUNT', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('ok ' + solved, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 76, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        api.text('how many dots?', api.w / 2, 68, { size: 14, color: C.dim, align: 'center' })
        const sx = shakeT > 0 ? Math.sin(shakeT * 72) * 10 * (shakeT / 0.4) : 0
        for (let i = 0; i < dots.length; i += 1) {
          const d = dots[i]
          if (d.age <= 0) continue
          const grow = Math.min(1, d.age * 5)
          const ease = 1 - (1 - grow) * (1 - grow)
          const wob = Math.sin(t * 2.2 + d.seed) * 2
          api.circle(d.x + sx + wob, d.y, d.r * ease, flashT > 0 && !okFlash ? C.warn : C.accent2)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (solved > 0) {
          const pip = Math.min(10, combo)
          for (let i = 0; i < pip; i += 1) {
            api.rect(18 + i * 12, 44, 8, 4, C.good)
          }
        }
        for (let i = 1; i <= 9; i += 1) {
          const x = 74 + (i - 1) * 41
          const hit = flashT > 0 && picked === String(i)
          const col = hit ? (okFlash ? C.good : C.warn) : C.panel
          api.rect(x, 286, 34, 34, col)
          api.text(String(i), x + 17, 304, { size: 18, color: C.fg, align: 'center', weight: 'bold' })
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 342, {
            size: 14 + popT * 8, color: popColor, align: 'center', weight: 'bold',
          })
        }
        api.rect(74, 326, 362, 5, C.panel)
        api.rect(74, 326, 362 * Math.min(1, pace / paceMax()), 5, pace / paceMax() > 0.7 ? C.warn : C.accent)
      },
    }
  },
})
