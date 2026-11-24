defineGame({
  id: 'stairs',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const RUN = 46
    const RISE = 12
    const TOPY = 60
    const PX = 112
    const PW = 18
    const PH = 24
    const SCROLL = 46

    const steps = []
    const fx = []
    let cur = null
    let hopT = 9
    let dead = false
    let climbed = 0
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let scroll = 0
    let dust = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 64) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v - 40, vy: Math.sin(a) * v, life: api.rnd(0.24, 0.55), color })
      }
    }

    let sx = 20
    let sy = 300
    for (let i = 0; i < 12; i += 1) {
      steps.push({ x: sx, y: sy })
      sx += RUN
      sy = Math.max(TOPY, sy - RISE)
    }
    cur = steps[2]

    function doHop() {
      if (dead || !cur) return
      const idx = steps.indexOf(cur)
      if (idx < 0) return
      const next = steps[idx + 1]
      if (!next) return
      if (next.x > PX + 14) return
      const late = PX - next.x
      cur = next
      hopT = 0
      climbed += 1
      api.progress(1)
      shake = Math.max(shake, 2.5)
      spark(PX + PW / 2, next.y, 4, C.dim, 92)
      if (late > 8) {
        combo += 2
        msg = 'PERFECT'
        msgT = 0.7
        flash = 1
        slow = 0.07
        spark(PX + PW / 2, next.y, 6, C.accent2, 140)
      } else if (late > 4) {
        combo += 1
        msg = 'CLOSE'
        msgT = 0.45
      } else {
        combo = 0
      }
    }

    let keyHeld = false
    api.onKey((key, isDown) => {
      const hit = key === 'space' || key === 'up' || key === 'right'
      if (!isDown) {
        if (hit) keyHeld = false
        return
      }
      if (!hit || keyHeld || dead) return
      keyHeld = true
      doHop()
    })
    api.onPointer((e) => {
      if (e.type === 'down') doHop()
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

      hopT += sdt
      scroll += SCROLL * sdt
      for (let i = 0; i < steps.length; i += 1) steps[i].x -= SCROLL * sdt
      while (steps.length && steps[0] !== cur && steps[0].x + RUN < -30) steps.shift()

      let last = steps[steps.length - 1]
      while (last && last.x < W + RUN * 2) {
        const ns = { x: last.x + RUN, y: Math.max(TOPY, last.y - RISE) }
        steps.push(ns)
        last = ns
      }

      dust -= sdt
      if (dust <= 0 && cur) {
        dust = 0.11
        spark(PX + 4, cur.y - 1, 1, 'rgba(143,160,180,0.7)', 28)
      }

      if (!cur) {
        dead = true
        api.lose('lost')
        return
      }
      const idx = steps.indexOf(cur)
      const next = idx >= 0 ? steps[idx + 1] : null
      if (next && next.x < PX - 20) {
        dead = true
        spark(PX + PW / 2, cur.y, 14, C.warn, 170)
        spark(PX + PW / 2, cur.y, 6, C.fg, 110)
        shake = 13
        api.lose('crushed')
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
        q.vy += 260 * sdt
      }
      api.setStatus('steps ' + climbed)
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.035 - i * 0.004).toFixed(3) + ')')

      const off = (scroll * 0.22) % 76
      for (let x = -off; x < W; x += 76) api.rect(x, 0, 3, H, 'rgba(106,169,255,0.05)')
      const off2 = (scroll * 0.5) % 38
      for (let x = -off2; x < W; x += 38) api.rect(x, 0, 1, H, 'rgba(106,169,255,0.07)')

      if (combo > 6) {
        for (let i = 0; i < 5; i += 1) {
          const y = 40 + i * 56
          api.rect(W - 16 - ((scroll * 1.4 + i * 58) % 130), y, 30, 2, 'rgba(232,238,246,0.16)')
        }
      }

      for (let i = 0; i < steps.length; i += 1) {
        const s = steps[i]
        if (s.x > W + 4 || s.x + RUN < -4) continue
        api.rect(s.x + shx, s.y + shy, RUN, H - s.y, C.panel)
        api.rect(s.x + shx, s.y + shy, RUN, 5, C.accent)
        api.rect(s.x + RUN - 3 + shx, s.y + shy, 3, H - s.y, C.dim)
      }

      const idx = steps.indexOf(cur)
      const next = idx >= 0 ? steps[idx + 1] : null
      if (next && next.x < PX + 70) api.rect(next.x - 2 + shx, Math.max(0, next.y - 60) + shy, 3, 60, C.warn)

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      const bounce = hopT < 0.2 ? Math.sin((hopT / 0.2) * Math.PI) * 10 : 0
      const py = (cur ? cur.y : 300) - PH - bounce
      api.rect(PX + shx, py + shy, PW, PH, dead ? C.dim : C.good)
      api.rect(PX + 5 + shx, py + 6 + shy, 4, 4, C.bg)
      api.rect(PX + 2 + shx, py + PH - 4 + shy, 6, 4, C.accent2)

      api.text('SPACE / UP', 12, 18, { size: 12, color: C.dim })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 60, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.18).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('CRUSHED', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
