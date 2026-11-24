defineGame({
  id: 'tunneldash',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const D = api.depth
    const XL = 210
    const PW = 26

    const p = { x: 0 }
    const objs = []
    const fx = []
    let spawnIn = 0.9
    let speed = 3
    let dead = false
    let time = 0
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let scroll = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 64) fx.shift()
        fx.push({
          x, y,
          vx: api.rnd(-spd, spd),
          vy: api.rnd(-spd, spd),
          life: api.rnd(0.2, 0.5),
          color,
        })
      }
    }

    function spawn() {
      objs.push({ x: api.rnd(-132, 132), z: 6, w: 62, h: 92, done: false, near: 999 })
    }
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
      scroll += sdt

      const dx = (api.down('right') ? 1 : 0) - (api.down('left') ? 1 : 0)
      p.x += dx * 372 * sdt
      if (p.x < -150) p.x = -150
      if (p.x > 150) p.x = 150

      speed = Math.min(4, 3 + time * 0.06)
      spawnIn -= sdt
      if (spawnIn <= 0) {
        spawn()
        spawnIn = Math.max(0.9, 1.05 - time * 0.012)
      }

      for (let i = objs.length - 1; i >= 0; i -= 1) {
        const o = objs[i]
        o.z -= speed * sdt
        if (o.z < -0.3) {
          objs.splice(i, 1)
          continue
        }
        const gap = Math.abs(o.x - p.x)
        if (gap < (o.w + PW) / 2 - 4 && o.z < 0.3 && o.z > -0.25) {
          dead = true
          spark(W / 2, H * 0.72, 16, C.warn, 200)
          spark(W / 2, H * 0.72, 8, C.fg, 130)
          shake = 15
          api.lose('block')
        }
        if (o.z < o.near) o.near = o.z
      }

      for (let i = objs.length - 1; i >= 0; i -= 1) {
        const o = objs[i]
        if (!o.done && o.z < 0.25) {
          o.done = true
          const gap = Math.abs(o.x - p.x)
          if (gap < 34) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.65
            flash = 1
            slow = 0.06
            shake = Math.max(shake, 5)
            spark(W / 2 + (o.x > 0 ? -30 : 30), H * 0.74, 5, C.accent2, 140)
          } else if (gap < 62) {
            combo += 1
            msg = 'CLOSE'
            msgT = 0.4
          } else {
            combo = 0
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
      }
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.05 - i * 0.005).toFixed(3) + ')')

      for (let i = 14; i >= 0; i -= 1) {
        const z = 0.06 + i * 0.62 - (scroll * 0.9) % 0.62
        if (z < 0.06) continue
        const a = D.project(-XL, 0, z)
        const b = D.project(XL, 0, z)
        const t = D.project(0, 132, z)
        const u = 0.1 + 0.5 * (1 - a.scale)
        api.rect(a.x, a.y, b.x - a.x, 2, 'rgba(106,169,255,' + u.toFixed(3) + ')')
        api.rect(a.x, t.y, b.x - a.x, 2, 'rgba(106,169,255,' + (u * 0.6).toFixed(3) + ')')
        api.rect(a.x, t.y, 2, a.y - t.y, 'rgba(106,169,255,' + (u * 0.75).toFixed(3) + ')')
        api.rect(b.x, t.y, 2, a.y - t.y, 'rgba(106,169,255,' + (u * 0.75).toFixed(3) + ')')
      }

      if (speed > 3.7) {
        for (let i = 0; i < 6; i += 1) {
          const z = 0.4 + i * 0.9
          const a = D.project(-XL, 0, z)
          const b = D.project(XL, 0, z)
          api.rect(a.x, a.y - 4, (b.x - a.x) * 0.25, 2, 'rgba(232,238,246,' + (0.12 * a.scale).toFixed(3) + ')')
        }
      }

      const sorted = []
      for (let i = 0; i < objs.length; i += 1) sorted.push(objs[i])
      for (let i = 0; i < sorted.length - 1; i += 1) {
        for (let k = 0; k < sorted.length - 1 - i; k += 1) {
          if (sorted[k].z < sorted[k + 1].z) {
            const tmp = sorted[k]
            sorted[k] = sorted[k + 1]
            sorted[k + 1] = tmp
          }
        }
      }

      for (let i = 0; i < sorted.length; i += 1) {
        const o = sorted[i]
        if (o.z <= 0.02) continue
        const gp = D.project(o.x, 0, o.z)
        const w = o.w * gp.scale
        const h = o.h * gp.scale
        api.rect(gp.x - w / 2 + shx, gp.y - h + shy, w, h, C.warn)
        api.rect(gp.x - w / 2 + 3 + shx, gp.y - h + 4 + shy, w - 6, Math.max(2, h * 0.16), 'rgba(232,238,246,0.35)')
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      const gp = D.project(p.x, 0, 0.12)
      const pw = PW * gp.scale
      const ph = 34 * gp.scale
      api.rect(gp.x - pw / 2 + shx, gp.y - ph + shy, pw, ph, dead ? C.dim : C.good)
      api.rect(gp.x - pw / 2 + 3 + shx, gp.y - ph + 4 + shy, pw - 6, Math.max(2, ph * 0.28), 'rgba(16,20,24,0.72)')
      api.rect(gp.x - 3 + shx, gp.y - ph - 5 + shy, 6, 5, C.accent2)

      api.text('LEFT / RIGHT', 12, 18, { size: 12, color: C.dim })
      api.text(time.toFixed(1), W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 58, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.18).toFixed(3) + ')')
      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('WALL SLAM', W / 2, 158, { size: 24, color: C.warn, align: 'center', weight: 'bold' })
        api.text('arrows to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
