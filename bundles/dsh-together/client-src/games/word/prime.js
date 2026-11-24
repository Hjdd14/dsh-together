defineGame({
  id: 'prime',
  create(api) {
    const C = api.colors
    const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]
    const OTHERS = [
      1, 4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 34, 35, 36, 38, 39, 40,
    ]
    const COLS = 4
    const TW = 98
    const TH = 64
    const GX = 12
    const GY = 12
    let tiles = []
    let found = 0
    let combo = 0
    let best = 0
    let pace = 0
    let t = 0
    let wrongIdx = -1
    let wrongT = 0
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    const parts = []

    function paceMax() {
      return Math.max(2.4, 6.5 - combo * 0.4)
    }

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(55, 200)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
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

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = api.irnd(0, i)
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
      }
      return arr
    }

    function makeBoard() {
      const primes = shuffle(PRIMES.slice()).slice(0, 6)
      const rest = shuffle(OTHERS.slice()).slice(0, 6)
      const nums = shuffle(primes.concat(rest))
      tiles = nums.map((n, i) => ({
        n, prime: primes.indexOf(n) >= 0, taken: false, x: 0, y: 0, age: -i * 0.045, hot: 0,
      }))
      const x0 = (api.w - (COLS * TW + (COLS - 1) * GX)) / 2
      const y0 = 64
      for (let i = 0; i < tiles.length; i += 1) {
        tiles[i].x = x0 + (i % COLS) * (TW + GX)
        tiles[i].y = y0 + Math.floor(i / COLS) * (TH + GY)
      }
      wrongIdx = -1
      wrongT = 0
    }

    makeBoard()

    function primesLeft() {
      let left = 0
      for (let i = 0; i < tiles.length; i += 1) {
        if (!tiles[i].taken && tiles[i].prime) left += 1
      }
      return left
    }

    api.onPointer((ev) => {
      if (ev.type !== 'down') return
      for (let i = 0; i < tiles.length; i += 1) {
        const tl = tiles[i]
        if (tl.taken) continue
        if (ev.x < tl.x || ev.x > tl.x + TW || ev.y < tl.y || ev.y > tl.y + TH) continue
        if (tl.prime) {
          tl.taken = true
          tl.hot = 1
          found += 1
          api.progress(1)
          combo += 1
          best = Math.max(best, combo)
          pace = 0
          okFlash = true
          flashT = 0.3
          burst(tl.x + TW / 2, tl.y + TH / 2, 10 + Math.min(14, combo * 2))
          pop(combo >= 10 ? 'PERFECT' : combo >= 4 ? 'STREAK x' + combo : 'PRIME', C.good)
          if (primesLeft() === 0) makeBoard()
        } else {
          wrongIdx = i
          wrongT = 0.42
          combo = 0
          okFlash = false
          flashT = 0.4
          pace = 0
          pop('NOT PRIME', C.warn)
        }
        return
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
        if (wrongT > 0) wrongT = Math.max(0, wrongT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        for (let i = 0; i < tiles.length; i += 1) tiles[i].age += dt
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
        api.text('PRIME', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        const left = primesLeft()
        for (let i = 0; i < 6; i += 1) api.circle(96 + i * 13, 27, 3.6, i < left ? C.good : C.panel)
        api.text('found ' + found, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 96, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        for (let i = 0; i < tiles.length; i += 1) {
          const tl = tiles[i]
          const k = Math.max(0, Math.min(1, tl.age * 5))
          const lift = (1 - k) * 26
          const jx = wrongT > 0 && wrongIdx === i ? Math.sin(wrongT * 80) * 8 * (wrongT / 0.42) : 0
          let fill = C.panel
          let ink = C.fg
          if (tl.taken) {
            fill = C.good
            ink = '#0d1218'
          } else if (wrongT > 0 && wrongIdx === i) {
            fill = C.warn
            ink = '#0d1218'
          }
          api.rect(tl.x + jx, tl.y + lift, TW, TH, fill)
          api.rect(tl.x + jx, tl.y + lift, TW, 3, tl.taken ? C.good : wrongT > 0 && wrongIdx === i ? C.warn : C.accent)
          api.text(String(tl.n), tl.x + TW / 2 + jx, tl.y + TH / 2 + 2 + lift, {
            size: 26, color: ink, align: 'center', weight: 'bold',
          })
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 300, {
            size: 15 + popT * 11, color: popColor, align: 'center', weight: 'bold',
          })
        }
        api.rect(140, 320, 200, 6, C.panel)
        api.rect(140, 320, 200 * Math.min(1, pace / paceMax()), 6, pace / paceMax() > 0.7 ? C.warn : C.accent)
        api.rect(0, api.h - 22, api.w, 22, C.panel)
        api.text('tap every prime · combo ' + combo + ' · best ' + best, api.w / 2, api.h - 11, {
          size: 11, color: C.dim, align: 'center',
        })
      },
    }
  },
})
