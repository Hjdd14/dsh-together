defineGame({
  id: 'jetpack',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GRAV = 580
    const LIFT = 1250
    const GAPH = 156
    const HALF = GAPH / 2
    const R = 11

    const p = { x: 108, y: H * 0.5, vy: 0 }
    const bars = []
    const fx = []
    let dist = 0
    let acc = 0
    let speed = 132
    let spawnIn = 1.15
    let tap = 0
    let flame = 0
    let dead = false
    let scroll = 0
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 70) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v - 70, vy: Math.sin(a) * v, life: api.rnd(0.2, 0.5), color })
      }
    }

    let lastGy = H * 0.5
    function spawn() {
      const lo = HALF + 22
      const hi = H - HALF - 22
      lastGy = Math.max(lo, Math.min(hi, lastGy + api.rnd(-58, 58)))
      bars.push({ x: W + 30, gy: lastGy, w: 30, done: false })
    }
    spawn()

    function hit(cx, cy, rx, ry, rw, rh) {
      const nx = Math.max(rx, Math.min(cx, rx + rw))
      const ny = Math.max(ry, Math.min(cy, ry + rh))
      const dx = cx - nx
      const dy = cy - ny
      return dx * dx + dy * dy < R * R
    }

    let keyHeld = false
    api.onKey((key, isDown) => {
      const hit = key === 'space' || key === 'up'
      if (!isDown) {
        if (hit) keyHeld = false
        return
      }
      if (!hit || keyHeld || dead) return
      keyHeld = true
      tap = 0.2
      spark(p.x, p.y + 12, 3, C.accent2, 120)
    })
    api.onPointer((e) => {
      if (e.type === 'down' && !dead) {
        tap = 0.2
        spark(p.x, p.y + 12, 3, C.accent2, 120)
      }
    })

    function update(dt) {
      if (dead) return
      const sdt = dt * (slow > 0 ? 0.45 : 1)
      if (slow > 0) slow -= dt
      if (flash > 0) flash -= dt * 2.4
      if (msgT > 0) msgT -= dt
      if (shake > 0) shake = Math.max(0, shake - dt * 30)
      shx = (api.rng() - 0.5) * shake
      shy = (api.rng() - 0.5) * shake

      if (tap > 0) tap -= sdt
      const lift = api.down('space') || api.down('up') || tap > 0
      if (lift) {
        flame = 0.1
        p.vy -= LIFT * sdt
        if (fx.length < 62) spark(p.x, p.y + 13, 1, 'rgba(255,207,92,0.7)', 60)
      } else if (flame > 0) {
        flame -= sdt
      }
      p.vy += GRAV * sdt
      if (p.vy < -210) p.vy = -210
      if (p.vy > 210) p.vy = 210
      p.y += p.vy * sdt
      if (p.y < R) {
        p.y = R
        if (p.vy < 0) p.vy = 0
      }
      if (p.y > H - R) {
        p.y = H - R
        if (p.vy > 0) p.vy = 0
      }

      const step = speed * sdt
      dist += step
      scroll += step
      acc += step
      while (acc >= 15) {
        acc -= 15
        api.score(1)
      }

      spawnIn -= sdt
      if (spawnIn <= 0) {
        spawn()
        spawnIn = 1.45
        speed = Math.min(186, speed + 5)
      }

      for (let i = bars.length - 1; i >= 0; i -= 1) {
        const b = bars[i]
        b.x -= step
        if (b.x + b.w < -30) {
          bars.splice(i, 1)
          continue
        }
        if (!b.done && b.x + b.w < p.x) {
          b.done = true
          const off = Math.abs(p.y - b.gy)
          if (off < 20) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.75
            flash = 1
            slow = 0.08
            shake = Math.max(shake, 5)
          } else if (off < 40) {
            combo += 1
            msg = 'CLOSE'
            msgT = 0.45
          } else {
            combo = 0
          }
        }
        const topEnd = b.gy - HALF
        const botStart = b.gy + HALF
        if (hit(p.x, p.y, b.x, 0, b.w, topEnd) || hit(p.x, p.y, b.x, botStart, b.w, H - botStart)) {
          dead = true
          spark(p.x, p.y, 15, C.warn, 190)
          spark(p.x, p.y, 7, C.fg, 120)
          shake = 14
          api.lose('bar')
        }
      }

      for (let i = fx.length - 1; i >= 0; i -= 1) {
        const q = fx[i]
        q.life -= sdt
        if (q.life <= 0) {
          fx.splice(i, 1)
          continue
        }
        q.x += q.vx * sdt
        q.y += q.vy * sdt
        q.vy += 160 * sdt
      }
      api.setStatus('dist ' + Math.floor(dist / 15))
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.045 - i * 0.005).toFixed(3) + ')')

      const f1 = (scroll * 0.18) % 150
      for (let x = -f1; x < W; x += 150) api.rect(x, 70, 62, 18, 'rgba(232,238,246,0.07)')
      const f2 = (scroll * 0.36) % 104
      for (let x = -f2; x < W; x += 104) api.rect(x, 286, 46, 14, 'rgba(232,238,246,0.05)')

      if (speed > 158) {
        for (let i = 0; i < 6; i += 1) {
          const y = 34 + i * 50
          api.rect(W - 16 - ((scroll * 1.5 + i * 66) % 140), y, 32, 2, 'rgba(232,238,246,0.2)')
        }
      }

      for (let i = 0; i < bars.length; i += 1) {
        const b = bars[i]
        const topEnd = b.gy - HALF
        const botStart = b.gy + HALF
        api.rect(b.x + shx, shy, b.w, topEnd, C.accent)
        api.rect(b.x + shx, botStart + shy, b.w, H - botStart, C.accent)
        api.rect(b.x - 3 + shx, topEnd - 10 + shy, b.w + 6, 10, C.accent2)
        api.rect(b.x - 3 + shx, botStart + shy, b.w + 6, 10, C.accent2)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 9))
        api.rect(q.x, q.y, s, s, q.color)
      }

      const tilt = Math.max(-4, Math.min(4, p.vy / 40))
      api.rect(p.x - 7 + shx, p.y - 9 + tilt + shy, 14, 18, dead ? C.dim : C.good)
      api.circle(p.x + shx, p.y - 12 + tilt + shy, 5, C.fg)
      if (flame > 0) {
        api.rect(p.x - 3 + shx, p.y + 12 + tilt + shy, 6, 7, C.accent2)
        api.rect(p.x - 1 + shx, p.y + 19 + tilt + shy, 2, 5, C.warn)
      }

      api.text('SPACE', 12, 18, { size: 12, color: C.dim })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 58, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.2).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('BOOM', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
