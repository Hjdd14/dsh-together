defineGame({
  id: 'typingdefense',
  create(api) {
    const C = api.colors
    const WORDS = [
      'cat', 'dog', 'sun', 'map', 'pen', 'key', 'run', 'fox', 'gum', 'hat', 'ice', 'jam', 'log',
      'mud', 'net', 'oak', 'pig', 'rat', 'sky', 'top', 'van', 'web', 'zip', 'bee', 'cup', 'dew',
      'tree', 'game', 'host', 'line', 'moon', 'note', 'open', 'play', 'rain', 'star', 'time',
      'wave', 'code', 'fast', 'gold', 'jump', 'lamp', 'mint', 'nest', 'rose', 'tide', 'vine',
      'wind', 'yarn', 'zoom', 'beach', 'crisp', 'drift', 'flame', 'giant', 'honey', 'ivory',
    ]
    const LANES = [76, 190, 304, 414]
    const FLOOR = 288
    let drops = []
    let buffer = ''
    let kills = 0
    let combo = 0
    let best = 0
    let missed = 0
    let t = 0
    let spawnT = 0.7
    let shakeT = 0
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    const parts = []

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

    function occupied(lane) {
      for (let i = 0; i < drops.length; i += 1) {
        if (drops[i].lane === lane && drops[i].y < 110) return true
      }
      return false
    }

    function spawn() {
      const free = []
      for (let i = 0; i < LANES.length; i += 1) if (!occupied(i)) free.push(i)
      if (!free.length) return
      const lane = free[api.irnd(0, free.length - 1)]
      let text = api.pick(WORDS)
      for (let i = 0; i < 8; i += 1) {
        let taken = false
        for (let k = 0; k < drops.length; k += 1) if (drops[k].text === text) taken = true
        if (!taken) break
        text = api.pick(WORDS)
      }
      let speed = 20 + kills * 1.7
      if (speed > 46) speed = 46
      drops.push({ text, lane, x: LANES[lane], y: 62, speed })
      if (drops.length > 6) drops.shift()
    }

    function kill(i) {
      const d = drops[i]
      burst(d.x, d.y, 14 + Math.min(14, combo * 2))
      drops.splice(i, 1)
      buffer = ''
      kills += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      okFlash = true
      flashT = 0.26
      pop(combo >= 8 ? 'PERFECT' : combo >= 4 ? 'STREAK x' + combo : 'BOOM', C.good)
    }

    const heldKeys = {}

    api.onKey((key, isDown) => {
      if (!isDown) {
        heldKeys[key] = false
        return
      }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (key.length !== 1 || key < 'a' || key > 'z') return
      const next = buffer + key
      for (let i = 0; i < drops.length; i += 1) {
        if (drops[i].text === next) {
          kill(i)
          return
        }
      }
      for (let i = 0; i < drops.length; i += 1) {
        if (drops[i].text.indexOf(next) === 0) {
          buffer = next
          return
        }
      }
      buffer = ''
      combo = 0
      shakeT = 0.24
      pop('NO MATCH', C.dim)
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 14 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(255,122,122,0.035)')
      }
    }

    return {
      update(dt) {
        t += dt
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        spawnT -= dt
        if (spawnT <= 0) {
          spawnT = Math.max(0.75, 1.9 - kills * 0.07)
          if (drops.length < 5) spawn()
        }
        const limit = FLOOR - 12
        for (let i = drops.length - 1; i >= 0; i -= 1) {
          const d = drops[i]
          d.y += d.speed * dt
          if (d.y > limit) {
            if (drops.length && buffer.length && d.text.indexOf(buffer) === 0) buffer = ''
            drops.splice(i, 1)
            combo = 0
            missed += 1
            shakeT = 0.3
            pop('LEAKED', C.warn)
          }
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 340 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        bands()
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('DEFEND', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('downed ' + kills, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 106, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        const sx = shakeT > 0 ? Math.sin(shakeT * 78) * 8 * (shakeT / 0.3) : 0
        api.rect(0, FLOOR - 6, api.w, 3, 'rgba(255,122,122,0.5)')
        for (let i = 0; i < drops.length; i += 1) {
          const d = drops[i]
          const size = d.text.length > 4 ? 18 : 21
          const cw = size * 0.62
          const totalW = d.text.length * cw
          const startX = d.x - totalW / 2 + sx
          const typed = d.text.indexOf(buffer) === 0 && buffer.length > 0 ? buffer.length : 0
          const danger = d.y > FLOOR - 70
          api.rect(startX - 8, d.y - 16, totalW + 16, 32, danger ? 'rgba(255,122,122,0.18)' : 'rgba(24,32,40,0.9)')
          if (typed > 0) {
            api.text(d.text.slice(0, typed).toUpperCase(), startX, d.y, {
              size, color: C.accent2, weight: 'bold',
            })
            api.text(d.text.slice(typed).toUpperCase(), startX + typed * cw, d.y, {
              size, color: C.fg, weight: 'bold',
            })
          } else {
            api.text(d.text.toUpperCase(), startX, d.y, {
              size, color: danger ? C.warn : C.fg, weight: 'bold',
            })
          }
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        const bw = 260
        const bx = (api.w - bw) / 2
        api.rect(bx, 300, bw, 34, flashT > 0 ? (okFlash ? C.good : C.warn) : C.dim)
        api.rect(bx + 2, 302, bw - 4, 30, C.panel)
        api.text(buffer.length ? buffer.toUpperCase() : 'type a word', bx + bw / 2, 317, {
          size: buffer.length ? 20 : 13,
          color: buffer.length ? C.accent2 : C.dim,
          align: 'center',
          weight: 'bold',
        })
        api.text('missed ' + missed, 18, 344, { size: 11, color: C.dim })
        api.text('best x' + best, api.w - 18, 344, { size: 11, color: C.dim, align: 'right' })
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 284 - (0.7 - popT) * 10, {
            size: 15 + popT * 10, color: popColor, align: 'center', weight: 'bold',
          })
        }
      },
    }
  },
})
