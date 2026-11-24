defineGame({
  id: 'gravity',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const PW = 24
    const PH = 26
    const HOLE = 108
    const FLIP = 580

    const p = { x: 96, y: H - PH, up: false }
    const gates = []
    const fx = []
    let speed = 148
    let spawnIn = 1.5
    let dead = false
    let flips = 0
    let scroll = 0
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let streak = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 66) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: api.rnd(0.24, 0.55), color })
      }
    }

    function flip() {
      if (dead) return
      p.up = !p.up
      flips += 1
      shake = Math.max(shake, 3)
      spark(p.x + PW / 2, p.y + PH / 2, 6, C.accent2, 130)
      streak = 0.18
    }

    let keyHeld = false
    api.onKey((key, isDown) => {
      const hit = key === 'space' || key === 'up' || key === 'down'
      if (!isDown) {
        if (hit) keyHeld = false
        return
      }
      if (!hit || keyHeld || dead) return
      keyHeld = true
      flip()
    })
    api.onPointer((e) => {
      if (e.type === 'down') flip()
    })

    function spawn() {
      const topHole = api.rng() < 0.5
      gates.push({ x: W + 24, w: 22, topHole, done: false })
    }
    spawn()

    function update(dt) {
      if (dead) return
      const sdt = dt * (slow > 0 ? 0.45 : 1)
      if (slow > 0) slow -= dt
      if (flash > 0) flash -= dt * 2.4
      if (msgT > 0) msgT -= dt
      if (streak > 0) streak -= dt
      if (shake > 0) shake = Math.max(0, shake - dt * 32)
      shx = (api.rng() - 0.5) * shake
      shy = (api.rng() - 0.5) * shake

      const target = p.up ? 0 : H - PH
      const d = target - p.y
      const step = FLIP * sdt
      if (Math.abs(d) <= step) p.y = target
      else p.y += d > 0 ? step : -step

      spawnIn -= sdt
      if (spawnIn <= 0) {
        spawn()
        spawnIn = 2
        speed = Math.min(178, speed + 4)
      }

      scroll += speed * sdt
      for (let i = gates.length - 1; i >= 0; i -= 1) {
        const gt = gates[i]
        gt.x -= speed * sdt
        if (gt.x + gt.w < -30) {
          gates.splice(i, 1)
          continue
        }
        if (!gt.done && gt.x + gt.w < p.x) {
          gt.done = true
          api.progress(1)
          const m = gt.topHole ? HOLE - (p.y + PH) : p.y - (H - HOLE)
          if (m < 12) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.75
            flash = 1
            slow = 0.09
            shake = Math.max(shake, 5)
          } else if (m < 28) {
            combo += 1
            msg = 'CLOSE'
            msgT = 0.5
          } else {
            combo = 0
          }
        }
        const overlapX = p.x + PW > gt.x + 2 && p.x < gt.x + gt.w - 2
        if (overlapX) {
          const blocked = gt.topHole ? p.y + PH > HOLE - 2 : p.y < H - HOLE + 2
          if (blocked) {
            dead = true
            spark(p.x + PW / 2, p.y + PH / 2, 15, C.warn, 185)
            spark(p.x + PW / 2, p.y + PH / 2, 7, C.fg, 118)
            shake = 14
            api.lose('wall')
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
        q.vy += 220 * sdt
      }
      api.setStatus(p.up ? 'ceiling' : 'floor')
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 9; i += 1) api.rect(0, i * 40, W, 40, 'rgba(106,169,255,' + (0.04 - i * 0.004).toFixed(3) + ')')

      const off = (scroll * 0.3) % 70
      for (let x = -off; x < W; x += 70) api.rect(x, 0, 2, H, 'rgba(106,169,255,0.05)')
      const off2 = (scroll * 0.62) % 44
      for (let x = -off2; x < W; x += 44) api.rect(x, 0, 1, H, 'rgba(106,169,255,0.08)')

      if (speed > 166) {
        for (let i = 0; i < 6; i += 1) {
          const y = 30 + i * 54
          api.rect(W - 24 - ((scroll * 1.7 + i * 64) % 150), y, 36, 2, 'rgba(232,238,246,0.2)')
        }
      }

      api.rect(shx, shy, W, 2, C.panel)
      api.rect(shx, H - 2 + shy, W, 2, C.panel)
      for (let i = 0; i < gates.length; i += 1) {
        const gt = gates[i]
        if (gt.topHole) {
          api.rect(gt.x + shx, HOLE + shy, gt.w, H - HOLE, C.accent)
          api.rect(gt.x - 3 + shx, HOLE - 4 + shy, gt.w + 6, 4, C.accent2)
        } else {
          api.rect(gt.x + shx, shy, gt.w, H - HOLE, C.accent)
          api.rect(gt.x - 3 + shx, H - HOLE + shy, gt.w + 6, 4, C.accent2)
        }
      }

      if (streak > 0) {
        api.rect(p.x + shx, p.y + shy, PW, PH, 'rgba(139,220,122,0.28)')
        api.rect(p.x + shx, p.y + PH * 0.5 + shy, PW, PH, 'rgba(139,220,122,0.16)')
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      api.rect(p.x + shx, p.y + shy, PW, PH, dead ? C.dim : C.good)
      api.rect(p.x + 5 + shx, p.y + 7 + shy, 5, 5, C.bg)
      api.rect(p.x + 5 + shx, p.y + (p.up ? PH - 5 : 0) + shy, 14, 3, C.accent2)

      api.text('SPACE', 12, 18, { size: 12, color: C.dim })
      api.text('flips ' + flips, W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 60, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.2).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('FLAT', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
