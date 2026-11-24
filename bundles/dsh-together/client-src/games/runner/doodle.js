defineGame({
  id: 'doodle',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GRAV = 1450
    const JUMP = -580
    const TOP = 140

    const p = { x: W / 2 - 10, y: H - 66, w: 20, h: 20, vx: 0, vy: JUMP }
    const plats = []
    const fx = []
    const stars = []
    let climbAcc = 0
    let dead = false
    let time = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let combo = 0
    let dust = 0

    for (let i = 0; i < 26; i += 1) stars.push({ x: api.rnd(0, W), y: api.rnd(0, H), s: api.rnd(1, 2.4) })

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 68) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: api.rnd(0.25, 0.55), color })
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

    let keyHeld = false
    api.onKey((key, isDown) => {
      const hit = key === 'space' || key === 'up'
      if (!isDown) {
        if (hit) keyHeld = false
        return
      }
      if (!hit || keyHeld || dead) return
      keyHeld = true
      if (p.vy > 0) {
        p.vy = JUMP * 0.72
        spark(p.x + p.w / 2, p.y + p.h, 4, C.accent2, 110)
      }
    })

    function update(dt) {
      if (dead) return
      const sdt = dt * (slow > 0 ? 0.45 : 1)
      if (slow > 0) slow -= dt
      if (flash > 0) flash -= dt * 2.4
      if (msgT > 0) msgT -= dt
      if (shake > 0) shake = Math.max(0, shake - dt * 34)
      shx = (api.rng() - 0.5) * shake
      shy = (api.rng() - 0.5) * shake
      time += sdt

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
            shake = Math.max(shake, 3)
            spark(p.x + p.w / 2, pl.y, 4, C.accent, 96)
            if (edge > 26) combo = 0
            if (edge < 9) {
              combo += 2
              msg = 'PERFECT'
              msgT = 0.75
              flash = 1
              slow = 0.08
              shake = Math.max(shake, 6)
              spark(p.x + p.w / 2, pl.y, 7, C.accent2, 150)
            }
            break
          }
        }
      }

      dust -= sdt
      if (dust <= 0) {
        dust = 0.09
        spark(p.x + p.w / 2, p.y + p.h, 1, 'rgba(139,220,122,0.5)', 30)
      }

      if (p.y < TOP) {
        const d = TOP - p.y
        p.y = TOP
        climbAcc += d
        for (let i = 0; i < plats.length; i += 1) plats[i].y += d
        for (let i = 0; i < stars.length; i += 1) {
          stars[i].y += d * 0.45
          if (stars[i].y > H) {
            stars[i].y -= H + 20
            stars[i].x = api.rnd(0, W)
          }
        }
        while (climbAcc >= 6) {
          climbAcc -= 6
          api.score(1)
        }
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

      if (p.y > H + 40) {
        dead = true
        spark(p.x + p.w / 2, H - 10, 14, C.warn, 180)
        shake = 12
        api.lose('fall')
      }
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.045 - i * 0.005).toFixed(3) + ')')
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i]
        api.rect(s.x, s.y, s.s, s.s, 'rgba(232,238,246,0.35)')
      }
      if (p.vy < -420) {
        for (let i = 0; i < 5; i += 1) {
          const y = 60 + i * 58
          api.rect(20 + ((time * 420 + i * 61) % 60), y, 2, 26, 'rgba(232,238,246,0.18)')
        }
      }

      for (let i = 0; i < plats.length; i += 1) {
        const pl = plats[i]
        api.rect(pl.x + shx, pl.y + shy, pl.w, 9, C.accent)
        api.rect(pl.x + 4 + shx, pl.y + 9 + shy, pl.w - 8, 4, C.panel)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      api.rect(p.x + shx, p.y + shy, p.w, p.h, dead ? C.dim : C.good)
      api.circle(p.x + p.w / 2 + shx, p.y + 6 + shy, 3, C.bg)
      api.rect(p.x + 3 + shx, p.y + p.h - 5 + shy, 5, 3, C.accent2)
      api.rect(p.x + p.w - 8 + shx, p.y + p.h - 5 + shy, 5, 3, C.accent2)

      api.text('LEFT / RIGHT', 12, 18, { size: 12, color: C.dim })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 74, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.2).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('FALL', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
