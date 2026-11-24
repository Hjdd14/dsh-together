defineGame({
  id: 'bouncering',
  create(api) {
    const GRAV = 340
    const R = 9
    const RINGS = 12
    const SPIKES = 4
    const W = api.w
    const H = api.h
    const PX = 16

    const ball = { x: 110, y: 150, vx: 95, vy: 0 }
    const rings = []
    const spikes = []
    let passed = 0
    let dead = false
    let reason = ''
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let bouncePop = 0
    let tick = 0
    const parts = []

    function freeSpot(minGap, others, pad) {
      for (let i = 0; i < 60; i += 1) {
        const x = api.rnd(PX + pad, W - PX - pad)
        const y = api.rnd(PX + pad, H - PX - pad)
        let ok = true
        for (let j = 0; j < others.length; j += 1) {
          const o = others[j]
          if (Math.hypot(o.x - x, o.y - y) < minGap) { ok = false; break }
        }
        if (ok) return { x, y }
      }
      return { x: api.rnd(PX + pad, W - PX - pad), y: api.rnd(PX + pad, H - PX - pad) }
    }

    const spikeCorners = [
      { x: 54, y: 54 }, { x: W - 54, y: 54 }, { x: 54, y: H - 54 }, { x: W - 54, y: H - 54 },
    ]
    for (let i = 0; i < SPIKES; i += 1) {
      spikes.push({ x: spikeCorners[i].x, y: spikeCorners[i].y, spin: api.rnd(-2, 2) })
    }
    for (let i = 0; i < RINGS; i += 1) {
      const spot = freeSpot(62, spikes, 92)
      rings.push({ x: spot.x, y: spot.y, alive: true, pulse: api.rnd(0, 6.28) })
    }

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 48; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.24, 0.5), max: 0.5,
          c: color, r: api.rnd(1.2, 2.8),
        })
      }
    }

    api.setStatus('rings 0')

    return {
      update(dt) {
        tick += dt
        if (flash > 0) flash = Math.max(0, flash - dt * 3)
        if (bouncePop > 0) bouncePop = Math.max(0, bouncePop - dt * 5)
        if (shake > 0) {
          shake = Math.max(0, shake - dt)
          shx = api.rnd(-1, 1) * shake * 9
          shy = api.rnd(-1, 1) * shake * 9
        } else {
          shx = 0
          shy = 0
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.life -= dt
          if (p.life <= 0) { parts.splice(i, 1); continue }
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 200 * dt
        }
        if (dead) return

        const dir = (api.down('right') ? 1 : 0) - (api.down('left') ? 1 : 0)
        ball.vx += dir * 560 * dt
        if (api.down('up')) ball.vy -= 700 * dt

        ball.vy += GRAV * dt
        if (ball.vx > 330) ball.vx = 330
        if (ball.vx < -330) ball.vx = -330
        if (ball.vy > 420) ball.vy = 420
        if (ball.vy < -420) ball.vy = -420

        ball.x += ball.vx * dt
        ball.y += ball.vy * dt

        if (ball.x < PX + R) { ball.x = PX + R; ball.vx = Math.abs(ball.vx) * 0.92; bouncePop = 1 }
        if (ball.x > W - PX - R) { ball.x = W - PX - R; ball.vx = -Math.abs(ball.vx) * 0.92; bouncePop = 1 }
        if (ball.y < PX + R) { ball.y = PX + R; ball.vy = Math.abs(ball.vy) * 0.92; bouncePop = 1 }
        if (ball.y > H - PX - R) {
          ball.y = H - PX - R
          ball.vy = -Math.abs(ball.vy) * 0.88
          bouncePop = 1
          if (Math.abs(ball.vy) < 70) ball.vy = -110
        }

        for (let i = 0; i < rings.length; i += 1) {
          const ring = rings[i]
          if (!ring.alive) continue
          if (Math.hypot(ball.x - ring.x, ball.y - ring.y) > 26) continue
          ring.alive = false
          passed += 1
          flash = 1
          shake = Math.max(shake, 0.22)
          burst(ring.x, ring.y, api.colors.accent2, 8, 150)
          api.progress(1)
          api.setStatus('rings ' + passed)
        }

        for (let i = 0; i < spikes.length; i += 1) {
          const s = spikes[i]
          if (Math.hypot(ball.x - s.x, ball.y - s.y) > 17) continue
          dead = true
          reason = 'spiked'
          shake = 0.9
          burst(ball.x, ball.y, api.colors.warn, 16, 190)
          api.lose(reason)
          return
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        const t = api.now() / 1000
        for (let y = PX; y < H - PX; y += 40) {
          for (let x = PX; x < W - PX; x += 40) {
            api.rect(x + shx, y + shy, 2, 2, api.colors.panel)
          }
        }
        api.rect(PX, PX, W - PX * 2, 2, api.colors.dim)
        api.rect(PX, H - PX - 2, W - PX * 2, 2, api.colors.dim)
        api.rect(PX, PX, 2, H - PX * 2, api.colors.dim)
        api.rect(W - PX - 2, PX, 2, H - PX * 2, api.colors.dim)

        for (let i = 0; i < rings.length; i += 1) {
          const ring = rings[i]
          const cx = ring.x + shx
          const cy = ring.y + shy
          if (!ring.alive) {
            api.rect(cx - 12, cy - 12, 24, 2, api.colors.panel)
            api.rect(cx - 12, cy + 10, 24, 2, api.colors.panel)
            api.rect(cx - 12, cy - 12, 2, 24, api.colors.panel)
            api.rect(cx + 10, cy - 12, 2, 24, api.colors.panel)
            continue
          }
          const pulse = 1 + Math.sin(t * 4 + ring.pulse) * 0.12
          const s = 12 * pulse
          const col = flash > 0.5 ? api.colors.fg : api.colors.accent2
          api.rect(cx - s, cy - s, s * 2, 3, col)
          api.rect(cx - s, cy + s - 3, s * 2, 3, col)
          api.rect(cx - s, cy - s, 3, s * 2, col)
          api.rect(cx + s - 3, cy - s, 3, s * 2, col)
        }

        for (let i = 0; i < spikes.length; i += 1) {
          const sp = spikes[i]
          const cx = sp.x + shx
          const cy = sp.y + shy
          const wob = Math.sin(t * 3 + sp.spin) * 2
          api.rect(cx - 3, cy - 10 + wob, 6, 20, api.colors.warn)
          api.rect(cx - 10 + wob, cy - 3, 20, 6, api.colors.warn)
          api.rect(cx - 5, cy - 5, 10, 10, api.colors.bg)
        }

        if (!dead) {
          const pop = 1 + bouncePop * 0.35
          const s = R * 2 * pop
          api.rect(ball.x - s / 2 + shx, ball.y - s / 2 + shy, s, s, api.colors.fg)
          api.rect(ball.x - s / 2 + 2 + shx, ball.y - s / 2 + 2 + shy, s - 4, 3, api.colors.good)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.rect(p.x + shx, p.y + shy, p.r * 2, p.r * 2, p.c)
        }

        api.text('RINGS ' + passed + '/' + RINGS, 12, 12, { size: 11, color: api.colors.good })
        if (dead) {
          api.text('SPIKED', W / 2, H / 2 - 14, { size: 14, color: api.colors.dim, align: 'center' })
          api.text('LOSE', W / 2, H / 2 + 18, {
            size: 34, color: api.colors.warn, align: 'center', weight: 'bold',
          })
        }
      },
      dispose() { rings.length = 0; spikes.length = 0; parts.length = 0 },
    }
  },
})
