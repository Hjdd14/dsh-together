defineGame({
  id: 'chariot',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GROUND = 292
    const GRAV = 1650
    const JUMP = -570
    const PW = 34
    const PH = 28

    const p = { x: 104, y: GROUND - PH, vy: 0, ground: true }
    const carts = []
    const fx = []
    let speed = 208
    let spawnIn = 1.35
    let dead = false
    let cleared = 0
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
    let spin = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 66) fx.shift()
        fx.push({
          x, y,
          vx: api.rnd(-spd, spd) - 40,
          vy: api.rnd(-spd, spd * 0.5),
          life: api.rnd(0.2, 0.5),
          color,
        })
      }
    }

    function jump() {
      if (dead || !p.ground) return
      p.vy = JUMP
      p.ground = false
      spark(p.x + PW / 2, GROUND - 2, 5, C.dim, 110)
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

      speed = Math.min(246, speed + sdt * 6)
      scroll += speed * sdt
      spin += speed * sdt * 0.18

      spawnIn -= sdt
      if (spawnIn <= 0) {
        carts.push({
          x: W + 30,
          w: api.irnd(30, 40),
          h: api.irnd(30, 44),
          v: api.rnd(60, 112),
          done: false,
          clr: 999,
        })
        spawnIn = 1.35
      }

      p.vy += GRAV * sdt
      p.y += p.vy * sdt
      if (p.y >= GROUND - PH) {
        if (!p.ground) spark(p.x + PW / 2, GROUND - 2, 4, C.dim, 88)
        p.y = GROUND - PH
        p.vy = 0
        p.ground = true
      }

      dust -= sdt
      if (p.ground && dust <= 0) {
        dust = 0.05
        spark(p.x - 12, GROUND - 3, 1, 'rgba(143,160,180,0.55)', 46)
      }

      for (let i = carts.length - 1; i >= 0; i -= 1) {
        const c = carts[i]
        c.x -= (speed + c.v) * sdt
        if (c.x + c.w < -40) {
          carts.splice(i, 1)
          continue
        }
        const top = GROUND - c.h
        if (p.x + PW > c.x + 3 && p.x < c.x + c.w - 3) {
          const clear = top - (p.y + PH)
          if (clear < c.clr) c.clr = clear
          if (clear < 3) {
            dead = true
            spark(p.x + PW / 2, p.y + PH / 2, 16, C.warn, 195)
            spark(p.x + PW / 2, p.y + PH / 2, 8, C.fg, 120)
            shake = 15
            api.lose('cart')
          }
        }
        if (!c.done && c.x + c.w < p.x) {
          c.done = true
          cleared += 1
          api.progress(1)
          if (c.clr < 12) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.7
            flash = 1
            slow = 0.08
            shake = Math.max(shake, 5)
          } else if (c.clr < 26) {
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
        q.vy += 300 * sdt
      }
      api.setStatus('carts ' + cleared)
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.04 - i * 0.004).toFixed(3) + ')')

      const far = (scroll * 0.16) % 128
      for (let x = -far; x < W; x += 128) api.rect(x, 208, 72, 88, 'rgba(106,169,255,0.05)')
      const mid = (scroll * 0.38) % 84
      for (let x = -mid; x < W; x += 84) api.rect(x, 246, 44, 50, 'rgba(106,169,255,0.09)')

      if (speed > 232) {
        for (let i = 0; i < 6; i += 1) {
          const y = 40 + i * 44
          api.rect(W - 18 - ((scroll * 1.7 + i * 66) % 140), y, 34, 2, 'rgba(232,238,246,0.2)')
        }
      }

      api.rect(shx, GROUND + shy, W, H - GROUND, C.panel)
      api.rect(shx, GROUND + shy, W, 2, C.dim)
      const gs = scroll % 54
      for (let x = -gs; x < W; x += 54) api.rect(x + shx, GROUND + 12 + shy, 28, 2, C.bg)

      for (let i = 0; i < carts.length; i += 1) {
        const c = carts[i]
        const top = GROUND - c.h
        api.rect(c.x + shx, top + shy, c.w, c.h, C.warn)
        api.rect(c.x + 4 + shx, top + 6 + shy, c.w - 8, 7, 'rgba(232,238,246,0.4)')
        api.circle(c.x + 7 + shx, GROUND - 5 + shy, 6, C.dim)
        api.circle(c.x + c.w - 7 + shx, GROUND - 5 + shy, 6, C.dim)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      const py = p.y
      const wob = Math.sin(spin) * 2
      api.rect(p.x + shx, py + 6 + shy, PW, PH - 8, dead ? C.dim : C.good)
      api.rect(p.x - 4 + shx, py + 12 + shy, 8, 4, C.accent)
      api.rect(p.x + PW - 6 + shx, py + 2 + shy, 10, 4, C.fg)
      api.circle(p.x + 8 + shx, GROUND - 6 + wob + shy, 7, dead ? C.dim : C.fg)
      api.circle(p.x + PW - 8 + shx, GROUND - 6 - wob + shy, 7, dead ? C.dim : C.fg)
      api.circle(p.x + 8 + shx, GROUND - 6 + wob + shy, 3, C.bg)
      api.circle(p.x + PW - 8 + shx, GROUND - 6 - wob + shy, 3, C.bg)

      api.text('SPACE', 12, 18, { size: 12, color: C.dim })
      api.text('carts ' + cleared, W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 60, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.18).toFixed(3) + ')')
      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('SMASHED', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
