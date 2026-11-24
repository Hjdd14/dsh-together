defineGame({
  id: 'cutrope',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GRAV = 900
    const MOUTH = 30

    const candy = { x: W / 2, y: 110, vx: 0, vy: 0, free: false, r: 14 }
    const monster = { x: W / 2, y: 300, wob: 0 }
    const ropes = []
    const fx = []
    let level = 0
    let fed = 0
    let misses = 0
    let dead = false
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let time = 0
    let pending = 0
    let drag = false
    let last = null
    let cool = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 60) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: api.rnd(0.2, 0.5), color })
      }
    }

    function layout() {
      level += 1
      candy.x = api.rnd(160, 320)
      candy.y = api.rnd(96, 128)
      candy.vx = 0
      candy.vy = 0
      candy.free = false
      pending = 0
      ropes.length = 0
      if (api.rng() < 0.72) {
        ropes.push({ ax: candy.x - 72, ay: 44, bx: candy.x, by: candy.y - 6 })
        ropes.push({ ax: candy.x + 72, ay: 44, bx: candy.x, by: candy.y - 6 })
        const side = api.rng() < 0.5 ? -1 : 1
        monster.x = Math.max(56, Math.min(W - 56, candy.x + side * api.rnd(88, 104)))
      } else {
        ropes.push({ ax: candy.x, ay: 44, bx: candy.x, by: candy.y - 6 })
        monster.x = candy.x
      }
    }
    layout()

    function segHit(ax, ay, bx, by, cx, cy, dx, dy) {
      const r1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
      const r2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax)
      const r3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)
      const r4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx)
      return r1 * r2 < 0 && r3 * r4 < 0
    }

    function swipe(x0, y0, x1, y1) {
      if (dead || cool > 0) return
      for (let i = ropes.length - 1; i >= 0; i -= 1) {
        const r = ropes[i]
        if (!segHit(x0, y0, x1, y1, r.ax, r.ay, r.bx, r.by)) continue
        ropes.splice(i, 1)
        spark((r.ax + r.bx) / 2, (r.ay + r.by) / 2, 6, C.accent2, 110)
        shake = Math.max(shake, 3)
        const off = r.ax - candy.x
        if (ropes.length === 0) {
          candy.free = true
          candy.vx = off < -5 ? 150 : off > 5 ? -150 : 0
          candy.vy = 40
          cool = 0.15
        }
      }
    }

    api.onPointer((e) => {
      if (e.type === 'down') {
        drag = true
        last = { x: e.x, y: e.y }
      } else if (e.type === 'move' && drag && last) {
        swipe(last.x, last.y, e.x, e.y)
        last = { x: e.x, y: e.y }
      } else if (e.type === 'up') {
        if (last) swipe(last.x, last.y, e.x, e.y)
        drag = false
        last = null
      }
    })

    function update(dt) {
      if (dead) return
      const sdt = dt * (slow > 0 ? 0.45 : 1)
      if (slow > 0) slow -= dt
      if (flash > 0) flash -= dt * 2.4
      if (msgT > 0) msgT -= dt
      if (shake > 0) shake = Math.max(0, shake - dt * 30)
      if (cool > 0) cool -= sdt
      shx = (api.rng() - 0.5) * shake
      shy = (api.rng() - 0.5) * shake
      time += sdt
      monster.wob = Math.sin(time * 5) * 3

      if (candy.free) {
        candy.vy += GRAV * sdt
        candy.x += candy.vx * sdt
        candy.y += candy.vy * sdt
        const dxm = candy.x - monster.x
        const dym = candy.y - (monster.y + monster.wob)
        if (dxm * dxm + dym * dym < (MOUTH + candy.r) * (MOUTH + candy.r)) {
          fed += 1
          api.progress(1)
          combo += 1
          flash = 1
          slow = 0.05
          shake = Math.max(shake, 5)
          msg = 'YUM'
          msgT = 0.6
          spark(monster.x, monster.y, 10, C.good, 150)
          layout()
        } else if (candy.y > H + 40 || candy.x < -40 || candy.x > W + 40) {
          misses += 1
          combo = 0
          shake = Math.max(shake, 4)
          msg = 'MISS'
          msgT = 0.6
          if (misses >= 3) {
            dead = true
            spark(monster.x, monster.y, 12, C.warn, 170)
            api.lose('missed')
          } else {
            layout()
          }
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
        q.vy += 320 * sdt
      }
      api.setStatus('candy ' + fed)
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.04 - i * 0.004).toFixed(3) + ')')

      const far = (time * 12) % 110
      for (let x = -far; x < W; x += 110) api.rect(x, 0, 36, 60, 'rgba(106,169,255,0.05)')

      for (let i = 0; i < ropes.length; i += 1) {
        const r = ropes[i]
        const steps = 14
        for (let k = 0; k < steps; k += 1) {
          const t0 = k / steps
          const t1 = (k + 1) / steps
          const x0 = r.ax + (r.bx - r.ax) * t0
          const y0 = r.ay + (r.by - r.ay) * t0
          const x1 = r.ax + (r.bx - r.ax) * t1
          const y1 = r.ay + (r.by - r.ay) * t1
          api.circle((x0 + x1) / 2 + shx, (y0 + y1) / 2 + shy, 2.2, C.dim)
        }
        api.circle(r.ax + shx, r.ay + shy, 4, C.accent)
      }

      api.circle(monster.x + shx, monster.y + monster.wob + shy, MOUTH, C.accent)
      api.circle(monster.x + shx, monster.y + monster.wob + shy, MOUTH - 9, C.bg)
      api.circle(monster.x - 9 + shx, monster.y - 8 + monster.wob + shy, 4, C.fg)
      api.circle(monster.x + 9 + shx, monster.y - 8 + monster.wob + shy, 4, C.fg)

      if (!candy.free) {
        api.rect(candy.x - 1 + shx, candy.y - 8 + shy, 2, 8, 'rgba(143,160,180,0.8)')
      }
      api.circle(candy.x + shx, candy.y + shy, candy.r, C.accent2)
      api.circle(candy.x - 5 + shx, candy.y - 5 + shy, candy.r * 0.32, 'rgba(232,238,246,0.6)')
      api.rect(candy.x - 4 + shx, candy.y - candy.r - 5 + shy, 8, 5, C.warn)

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      api.text('SLICE THE ROPES', 12, 18, { size: 12, color: C.dim })
      api.text('candy ' + fed, W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      for (let i = 0; i < 3; i += 1) api.rect(12 + i * 14, 30, 9, 9, i < misses ? C.warn : C.panel)
      if (combo > 1) api.text('COMBO x' + combo, 12, 48, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 70, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.16).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('TOO CLUMSY', W / 2, 158, { size: 24, color: C.warn, align: 'center', weight: 'bold' })
        api.text('drag to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
