defineGame({
  id: 'bulletdodge',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const R = 8
    const SPD = 240
    const M = 14

    const p = { x: W / 2, y: H / 2, r: R }
    const shots = []
    const fx = []
    let rate = 1.15
    let spawnIn = 0.85
    let dead = false
    let dodged = 0
    let time = 0
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let dust = 0
    let scroll = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 64) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: api.rnd(0.2, 0.5), color })
      }
    }

    function edgePoint(edge) {
      if (edge === 0) return { x: api.rnd(10, W - 10), y: -9 }
      if (edge === 1) return { x: W + 9, y: api.rnd(10, H - 10) }
      if (edge === 2) return { x: api.rnd(10, W - 10), y: H + 9 }
      return { x: -9, y: api.rnd(10, H - 10) }
    }

    function spawn() {
      let pt = edgePoint(api.irnd(0, 3))
      for (let i = 0; i < 4; i += 1) {
        const ddx = pt.x - p.x
        const ddy = pt.y - p.y
        if (ddx * ddx + ddy * ddy > 150 * 150) break
        pt = edgePoint(api.irnd(0, 3))
      }
      const dx = p.x - pt.x
      const dy = p.y - pt.y
      const ang = Math.atan2(dy, dx) + api.rnd(-0.11, 0.11)
      const spd = api.rnd(110, 145)
      shots.push({ x: pt.x, y: pt.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 4, md: 999 })
    }

    function update(dt) {
      if (dead) return
      const sdt = dt * (slow > 0 ? 0.45 : 1)
      if (slow > 0) slow -= dt
      if (flash > 0) flash -= dt * 2.4
      if (msgT > 0) msgT -= dt
      if (shake > 0) shake = Math.max(0, shake - dt * 32)
      shx = (api.rng() - 0.5) * shake
      shy = (api.rng() - 0.5) * shake
      time += sdt
      scroll += sdt * 60

      const dx = (api.down('right') ? 1 : 0) - (api.down('left') ? 1 : 0)
      const dy = (api.down('down') ? 1 : 0) - (api.down('up') ? 1 : 0)
      p.x += dx * SPD * sdt
      p.y += dy * SPD * sdt
      if (p.x < M) p.x = M
      if (p.x > W - M) p.x = W - M
      if (p.y < M) p.y = M
      if (p.y > H - M) p.y = H - M

      dust -= sdt
      if ((dx !== 0 || dy !== 0) && dust <= 0) {
        dust = 0.04
        spark(p.x, p.y, 1, 'rgba(139,220,122,0.45)', 30)
      }

      rate = Math.max(0.68, 1.15 - time / 22)
      spawnIn -= sdt
      if (spawnIn <= 0) {
        if (shots.length < 70) spawn()
        spawnIn = rate
      }

      for (let i = shots.length - 1; i >= 0; i -= 1) {
        const s = shots[i]
        s.x += s.vx * sdt
        s.y += s.vy * sdt
        const ex = s.x - p.x
        const ey = s.y - p.y
        const d2 = ex * ex + ey * ey
        const md = Math.sqrt(d2)
        if (md < s.md) s.md = md
        const rr = s.r + p.r
        if (d2 < rr * rr) {
          dead = true
          spark(p.x, p.y, 16, C.warn, 190)
          spark(p.x, p.y, 7, C.fg, 120)
          shake = 14
          api.lose('hit')
        }
        if (s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) {
          dodged += 1
          if (s.md < 26 && s.md > rr) {
            if (s.md < 18) {
              combo += 2
              msg = 'PERFECT'
              msgT = 0.7
              flash = 1
              slow = 0.06
              shake = Math.max(shake, 5)
            } else {
              combo += 1
              msg = 'CLOSE'
              msgT = 0.4
            }
          } else {
            combo = 0
          }
          shots.splice(i, 1)
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
        q.vy += 60 * sdt
      }
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.045 - i * 0.005).toFixed(3) + ')')

      const go = (time * 26) % 40
      for (let x = -go; x < W; x += 40) api.rect(x, 0, 1, H, 'rgba(106,169,255,0.05)')
      for (let y = -go; y < H; y += 40) api.rect(0, y, W, 1, 'rgba(106,169,255,0.05)')

      api.rect(2 + shx, 2 + shy, W - 4, 2, C.panel)
      api.rect(2 + shx, H - 4 + shy, W - 4, 2, C.panel)
      api.rect(2 + shx, 2 + shy, 2, H - 4, C.panel)
      api.rect(W - 4 + shx, 2 + shy, 2, H - 4, C.panel)

      for (let i = 0; i < shots.length; i += 1) {
        const s = shots[i]
        api.circle(s.x - s.vx * 0.012, s.y - s.vy * 0.012, s.r * 0.8, C.panel)
        api.circle(s.x, s.y, s.r, C.warn)
        api.circle(s.x, s.y, s.r * 0.45, C.accent2)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const sz = Math.max(1, Math.min(3, q.life * 7))
        api.rect(q.x, q.y, sz, sz, q.color)
      }

      api.circle(p.x + shx, p.y + shy, p.r + 4, C.panel)
      api.circle(p.x + shx, p.y + shy, p.r, dead ? C.dim : C.good)
      api.circle(p.x + shx, p.y + shy, 3, C.bg)

      api.text('ARROWS', 12, 18, { size: 12, color: C.dim })
      api.text('miss ' + dodged, W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 54, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.18).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('HIT', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('arrows to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
