defineGame({
  id: 'hopper',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GROUND = 298
    const GRAV = 1650
    const JUMP = -570
    const PW = 20
    const PH = 28

    const p = { x: 96, y: GROUND - PH, w: PW, h: PH, vy: 0, ground: true }
    const blocks = []
    const fx = []
    let speed = 200
    let spawnIn = 1.25
    let dead = false
    let hopped = 0
    let land = 0
    let scroll = 0
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
        if (fx.length > 66) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v - 45, vy: Math.sin(a) * v, life: api.rnd(0.24, 0.55), color })
      }
    }

    function jump() {
      if (dead || !p.ground) return
      p.vy = JUMP
      p.ground = false
      land = 0
      spark(p.x + PW / 2, GROUND - 2, 4, C.dim, 100)
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
      jump()
    })
    api.onPointer((e) => {
      if (e.type === 'down') jump()
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
      if (land > 0) land -= sdt

      speed = Math.min(262, speed + sdt * 8)
      scroll += speed * sdt

      spawnIn -= sdt
      if (spawnIn <= 0) {
        blocks.push({ x: W + 22, w: api.irnd(18, 24), h: api.irnd(26, 34), done: false, clr: 999 })
        spawnIn = 1.25
      }

      p.vy += GRAV * sdt
      p.y += p.vy * sdt
      if (p.y >= GROUND - PH) {
        if (!p.ground) spark(p.x + PW / 2, GROUND - 2, 4, C.dim, 88)
        p.y = GROUND - PH
        p.vy = 0
        p.ground = true
        land = 0.12
      }

      dust -= sdt
      if (p.ground && dust <= 0) {
        dust = 0.05
        spark(p.x + 2, GROUND - 2, 1, 'rgba(143,160,180,0.55)', 44)
      }

      for (let i = blocks.length - 1; i >= 0; i -= 1) {
        const b = blocks[i]
        b.x -= speed * sdt
        if (b.x + b.w < -30) {
          blocks.splice(i, 1)
          continue
        }
        const top = GROUND - b.h
        if (p.x + PW > b.x + 2 && p.x < b.x + b.w - 2) {
          const clear = top - (p.y + PH)
          if (clear < b.clr) b.clr = clear
          if (clear < 2) {
            dead = true
            spark(p.x + PW / 2, p.y + PH / 2, 15, C.warn, 190)
            spark(p.x + PW / 2, p.y + PH / 2, 7, C.fg, 118)
            shake = 14
            api.lose('block')
          }
        }
        if (!b.done && b.x + b.w < p.x) {
          b.done = true
          hopped += 1
          api.progress(1)
          if (b.clr < 10) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.75
            flash = 1
            slow = 0.08
            shake = Math.max(shake, 5)
          } else if (b.clr < 24) {
            combo += 1
            msg = 'CLOSE'
            msgT = 0.45
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
        q.vy += 320 * sdt
      }
      api.setStatus('hops ' + hopped)
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.04 - i * 0.004).toFixed(3) + ')')

      const far = (scroll * 0.18) % 120
      for (let x = -far; x < W; x += 120) api.rect(x, 206, 68, 92, 'rgba(106,169,255,0.05)')
      const mid = (scroll * 0.4) % 78
      for (let x = -mid; x < W; x += 78) api.rect(x, 244, 42, 54, 'rgba(106,169,255,0.09)')

      if (speed > 240) {
        for (let i = 0; i < 6; i += 1) {
          const y = 40 + i * 46
          api.rect(W - 18 - ((scroll * 1.7 + i * 68) % 140), y, 34, 2, 'rgba(232,238,246,0.2)')
        }
      }

      api.rect(shx, GROUND + shy, W, H - GROUND, C.panel)
      api.rect(shx, GROUND + shy, W, 2, C.dim)
      const gs = scroll % 52
      for (let x = -gs; x < W; x += 52) api.rect(x + shx, GROUND + 10 + shy, 26, 2, C.bg)

      for (let i = 0; i < blocks.length; i += 1) {
        const b = blocks[i]
        const top = GROUND - b.h
        api.rect(b.x + shx, top + shy, b.w, b.h, C.accent)
        api.rect(b.x + shx, top + shy, b.w, 5, C.accent2)
        api.rect(b.x + 4 + shx, top + 12 + shy, b.w - 8, 3, C.panel)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      const squash = land > 0 ? 3 : 0
      api.rect(p.x + shx, p.y + squash + shy, PW, PH - squash, dead ? C.dim : C.good)
      api.rect(p.x + PW - 8 + shx, p.y + 6 + squash + shy, 4, 4, C.bg)
      api.rect(p.x - 5 + shx, p.y + PH - 10 + shy, 5, 7, dead ? C.dim : C.good)
      if (!p.ground) api.rect(p.x + 2 + shx, p.y + PH + shy, 4, 4, C.accent2)

      api.text('SPACE', 12, 18, { size: 12, color: C.dim })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 58, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.18).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('BUMP', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
