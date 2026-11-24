defineGame({
  id: 'lavaclimb',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GRAV = 1450
    const JUMP = -580
    const TOP = 150
    const RISE = 15

    const p = { x: W / 2 - 10, y: H - 66, w: 20, h: 20, vx: 0, vy: JUMP }
    const plats = []
    const fx = []
    let lavaY = H + 34
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
    let dust = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 60) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: api.rnd(0.2, 0.5), color })
      }
    }

    let px = W / 2 - 41
    let py = H - 46
    plats.push({ x: px, y: py, w: 82 })
    while (py > -40) {
      py -= api.rnd(58, 76)
      px = Math.max(8, Math.min(W - 90, px + api.rnd(-95, 95)))
      plats.push({ x: px, y: py, w: 82 })
    }
    p.y = plats[0].y - p.h

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
      lavaY -= RISE * sdt

      const prevBottom = p.y + p.h
      p.vx = (api.down('right') ? 215 : 0) - (api.down('left') ? 215 : 0)
      p.vy += GRAV * sdt
      p.y += p.vy * sdt
      p.x += p.vx * sdt
      if (p.x + p.w < 0) p.x = W
      if (p.x > W) p.x = -p.w

      if (p.vy > 0) {
        const bottom = p.y + p.h
        for (let i = 0; i < plats.length; i += 1) {
          const pl = plats[i]
          if (prevBottom <= pl.y + 1 && bottom >= pl.y && p.x + p.w > pl.x + 2 && p.x < pl.x + pl.w - 2) {
            const edge = Math.min(p.x - pl.x, pl.x + pl.w - p.x - p.w)
            p.y = pl.y - p.h
            p.vy = JUMP
            combo += 1
            shake = Math.max(shake, 2)
            spark(p.x + p.w / 2, pl.y, 3, C.accent, 90)
            if (edge < 9) {
              combo += 2
              msg = 'PERFECT'
              msgT = 0.6
              flash = 1
              slow = 0.06
              spark(p.x + p.w / 2, pl.y, 6, C.accent2, 130)
            } else if (edge < 22) {
              msg = 'CLOSE'
              msgT = 0.35
            } else if (edge > 30) {
              combo = 1
            }
            break
          }
        }
      }

      dust -= sdt
      if (dust <= 0) {
        dust = 0.09
        spark(p.x + p.w / 2, p.y + p.h, 1, 'rgba(139,220,122,0.45)', 26)
      }

      if (p.y < TOP) {
        const d = TOP - p.y
        p.y = TOP
        for (let i = 0; i < plats.length; i += 1) plats[i].y += d
        lavaY += d
      }

      for (let i = plats.length - 1; i >= 0; i -= 1) {
        if (plats[i].y > H + 40) plats.splice(i, 1)
      }
      let top = plats[0]
      for (let i = 1; i < plats.length; i += 1) if (plats[i].y < top.y) top = plats[i]
      while (top && top.y > -40) {
        const nx = Math.max(8, Math.min(W - 90, top.x + api.rnd(-95, 95)))
        const np = { x: nx, y: top.y - api.rnd(58, 76), w: 82 }
        plats.push(np)
        top = np
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
        q.vy += 300 * sdt
      }

      if (p.y + p.h > lavaY || p.y > H + 40) {
        dead = true
        spark(p.x + p.w / 2, Math.min(p.y + p.h, H - 12), 16, C.warn, 190)
        spark(p.x + p.w / 2, Math.min(p.y + p.h, H - 12), 7, C.accent2, 130)
        shake = 15
        api.lose('lava')
      }
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.05 - i * 0.005).toFixed(3) + ')')

      const far = (time * 16) % 96
      for (let x = -far; x < W; x += 96) api.rect(x, 0, 32, H, 'rgba(106,169,255,0.05)')

      for (let i = 0; i < plats.length; i += 1) {
        const pl = plats[i]
        if (pl.y < -24 || pl.y > H + 24) continue
        api.rect(pl.x + shx, pl.y + shy, pl.w, 9, C.accent)
        api.rect(pl.x + 5 + shx, pl.y + 9 + shy, pl.w - 10, 4, C.panel)
        api.circle(pl.x + 8 + shx, pl.y + 6 + shy, 2, C.accent2)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      api.rect(p.x + shx, p.y + shy, p.w, p.h, dead ? C.dim : C.good)
      api.rect(p.x + p.w / 2 - 2 + shx, p.y + 5 + shy, 4, 4, C.bg)

      if (lavaY < H + 24) {
        api.rect(0, lavaY, W, H - lavaY + 30, 'rgba(255,122,122,0.32)')
        api.rect(0, lavaY, W, 4, C.warn)
        for (let x = 0; x < W; x += 24) {
          api.rect(x, lavaY - 4 + Math.sin(time * 5 + x * 0.06) * 3, 20, 4, 'rgba(255,207,92,0.8)')
        }
      }

      api.text('LEFT / RIGHT', 12, 18, { size: 12, color: C.dim })
      api.text(time.toFixed(1), W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 62, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.16).toFixed(3) + ')')
      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('BURNED', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('arrows to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
