defineGame({
  id: 'fruitninja',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GRAV = 880
    const R = 19

    const items = []
    const fx = []
    const trail = []
    let spawnIn = 0.55
    let dead = false
    let sliced = 0
    let combo = 0
    let best = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let time = 0
    let drag = false
    let last = null

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 70) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: api.rnd(0.25, 0.6), color })
      }
    }

    function spawn() {
      const bomb = api.rng() < 0.24
      const n = !bomb && api.rng() < 0.32 ? 2 : 1
      for (let k = 0; k < n; k += 1) {
        const x = api.rnd(70, W - 70) + k * 26
        items.push({
          x: Math.max(30, Math.min(W - 30, x)),
          y: H + 30,
          vx: api.rnd(-60, 60),
          vy: -api.rnd(520, 660),
          bomb: bomb && k === 0,
          r: bomb ? 16 : R,
          dead: false,
        })
      }
    }

    function cutAt(ax, ay, bx, by) {
      if (dead) return
      const dx = bx - ax
      const dy = by - ay
      const len2 = dx * dx + dy * dy
      let hits = 0
      for (let i = 0; i < items.length; i += 1) {
        const it = items[i]
        if (it.dead) continue
        let t = 0
        if (len2 > 1) t = Math.max(0, Math.min(1, ((it.x - ax) * dx + (it.y - ay) * dy) / len2))
        const px2 = ax + dx * t
        const py2 = ay + dy * t
        const dd = (it.x - px2) * (it.x - px2) + (it.y - py2) * (it.y - py2)
        const rr = it.r + 8
        if (dd > rr * rr) continue
        it.dead = true
        if (it.bomb) {
          flash = 1
          shake = 16
          spark(it.x, it.y, 18, C.warn, 220)
          spark(it.x, it.y, 9, C.fg, 140)
          dead = true
          api.lose('bomb')
          return
        }
        hits += 1
        sliced += 1
        api.progress(1)
        spark(it.x, it.y, 8, C.good, 150)
        spark(it.x, it.y, 5, C.accent2, 110)
        shake = Math.max(shake, 3)
      }
      if (hits > 0) {
        combo += hits
        best = Math.max(best, combo)
        if (hits > 1) {
          msg = hits > 2 ? 'TRIPLE' : 'DOUBLE'
          msgT = 0.6
          flash = 1
          slow = 0.06
        }
      }
    }

    api.onPointer((e) => {
      if (e.type === 'down') {
        drag = true
        last = { x: e.x, y: e.y }
        trail.push({ x: e.x, y: e.y, life: 0.18 })
      } else if (e.type === 'up') {
        if (last) cutAt(last.x, last.y, e.x, e.y)
        drag = false
        last = null
      } else if (e.type === 'move' && drag && last) {
        cutAt(last.x, last.y, e.x, e.y)
        last = { x: e.x, y: e.y }
        trail.push({ x: e.x, y: e.y, life: 0.18 })
      }
    })

    spawn()

    function update(dt) {
      if (dead) return
      const sdt = dt * (slow > 0 ? 0.45 : 1)
      if (slow > 0) slow -= dt
      if (flash > 0) flash -= dt * 2.4
      if (msgT > 0) msgT -= dt
      if (shake > 0) shake = Math.max(0, shake - dt * 30)
      shx = (api.rng() - 0.5) * shake
      shy = (api.rng() - 0.5) * shake
      time += sdt

      spawnIn -= sdt
      if (spawnIn <= 0) {
        spawn()
        spawnIn = Math.max(0.42, 0.78 - time * 0.012)
      }

      for (let i = items.length - 1; i >= 0; i -= 1) {
        const it = items[i]
        it.vy += GRAV * sdt
        it.x += it.vx * sdt
        it.y += it.vy * sdt
        if (it.x < 20 || it.x > W - 20) it.vx = -it.vx
        if (it.y > H + 60) {
          if (!it.bomb) combo = 0
          items.splice(i, 1)
        }
      }

      for (let i = trail.length - 1; i >= 0; i -= 1) {
        trail[i].life -= sdt
        if (trail[i].life <= 0) trail.splice(i, 1)
      }
      if (trail.length > 26) trail.shift()

      for (let i = fx.length - 1; i >= 0; i -= 1) {
        const q = fx[i]
        q.life -= sdt
        if (q.life <= 0) {
          fx.splice(i, 1)
          continue
        }
        q.x += q.vx * sdt
        q.y += q.vy * sdt
        q.vy += 420 * sdt
      }
      api.setStatus('fruit ' + sliced)
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.035 - i * 0.0035).toFixed(3) + ')')

      const far = (time * 10) % 120
      for (let x = -far; x < W; x += 120) api.rect(x, 0, 40, 120, 'rgba(106,169,255,0.05)')

      for (let i = 0; i < items.length; i += 1) {
        const it = items[i]
        if (it.dead) continue
        if (it.bomb) {
          api.circle(it.x + shx, it.y + shy, it.r, C.panel)
          api.circle(it.x + shx, it.y + shy, it.r - 4, C.bg)
          api.rect(it.x - 2 + shx, it.y - it.r - 7 + shy, 4, 8, C.dim)
          api.circle(it.x + 2 + shx, it.y - it.r - 8 + shy, 2.6, C.warn)
        } else {
          api.circle(it.x + shx, it.y + shy, it.r, C.good)
          api.circle(it.x - 5 + shx, it.y - 5 + shy, it.r * 0.35, 'rgba(232,238,246,0.45)')
          api.rect(it.x - 3 + shx, it.y - it.r - 4 + shy, 6, 5, C.accent2)
        }
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 9))
        api.rect(q.x, q.y, s, s, q.color)
      }

      for (let i = 1; i < trail.length; i += 1) {
        const a = trail[i - 1]
        const b = trail[i]
        const steps = 4
        for (let k = 0; k < steps; k += 1) {
          const t = k / steps
          api.circle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2.6 * a.life * 6, 'rgba(232,238,246,0.5)')
        }
      }
      if (drag && last) api.circle(last.x, last.y, 4, C.accent2)

      api.text('DRAG TO SLICE', 12, 18, { size: 12, color: C.dim })
      api.text('fruit ' + sliced, W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 62, { size: 22, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.2).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('BOOM', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('you sliced a bomb', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
