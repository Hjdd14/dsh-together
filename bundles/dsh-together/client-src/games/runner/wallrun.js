defineGame({
  id: 'wallrun',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GROUND = 300
    const GRAV = 1650
    const JUMP = -570
    const JUMP2 = -470
    const PW = 22
    const PH = 30

    const p = { x: 104, y: GROUND - PH, w: PW, h: PH, vy: 0, ground: true, air: 0 }
    const walls = []
    const fx = []
    let speed = 178
    let spawnIn = 1.4
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

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 66) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v - 40, vy: Math.sin(a) * v, life: api.rnd(0.24, 0.55), color })
      }
    }

    function jump() {
      if (dead) return
      if (p.ground) {
        p.vy = JUMP
        p.ground = false
        p.air = 1
        spark(p.x + PW / 2, GROUND - 2, 4, C.dim, 96)
      } else if (p.air > 0) {
        p.air = 0
        p.vy = JUMP2
        shake = Math.max(shake, 3)
        spark(p.x + PW / 2, p.y + PH, 5, C.accent2, 128)
      }
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

      speed = Math.min(228, speed + sdt * 6)
      scroll += speed * sdt

      spawnIn -= sdt
      if (spawnIn <= 0) {
        walls.push({ x: W + 24, w: 20, h: api.irnd(30, 42), done: false, clr: 999 })
        spawnIn = 1.32
      }

      p.vy += GRAV * sdt
      p.y += p.vy * sdt
      if (p.y >= GROUND - PH) {
        if (!p.ground) spark(p.x + PW / 2, GROUND - 2, 4, C.dim, 88)
        p.y = GROUND - PH
        p.vy = 0
        p.ground = true
        p.air = 1
      }

      dust -= sdt
      if (p.ground && dust <= 0) {
        dust = 0.05
        spark(p.x + 2, GROUND - 2, 1, 'rgba(143,160,180,0.55)', 44)
      }

      for (let i = walls.length - 1; i >= 0; i -= 1) {
        const wl = walls[i]
        wl.x -= speed * sdt
        if (wl.x + wl.w < -30) {
          walls.splice(i, 1)
          continue
        }
        const top = GROUND - wl.h
        if (p.x + PW > wl.x + 2 && p.x < wl.x + wl.w - 2) {
          const clear = top - (p.y + PH)
          if (clear < wl.clr) wl.clr = clear
          if (clear < 2) {
            dead = true
            spark(p.x + PW / 2, p.y + PH / 2, 15, C.warn, 190)
            spark(p.x + PW / 2, p.y + PH / 2, 7, C.fg, 118)
            shake = 14
            api.lose('wall')
          }
        }
        if (!wl.done && wl.x + wl.w < p.x) {
          wl.done = true
          cleared += 1
          api.progress(1)
          if (wl.clr < 10) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.75
            flash = 1
            slow = 0.08
            shake = Math.max(shake, 5)
          } else if (wl.clr < 24) {
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
      api.setStatus('walls ' + cleared)
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.04 - i * 0.004).toFixed(3) + ')')

      const far = (scroll * 0.2) % 116
      for (let x = -far; x < W; x += 116) api.rect(x, 210, 64, 90, 'rgba(106,169,255,0.05)')
      const mid = (scroll * 0.44) % 74
      for (let x = -mid; x < W; x += 74) api.rect(x, 252, 40, 48, 'rgba(106,169,255,0.09)')

      if (speed > 206) {
        for (let i = 0; i < 6; i += 1) {
          const y = 40 + i * 46
          api.rect(W - 18 - ((scroll * 1.7 + i * 70) % 140), y, 34, 2, 'rgba(232,238,246,0.2)')
        }
      }

      api.rect(shx, GROUND + shy, W, 3, C.dim)
      const gs = scroll % 34
      for (let x = -gs; x < W; x += 34) api.rect(x + shx, GROUND + 10 + shy, 14, 2, C.panel)

      for (let i = 0; i < walls.length; i += 1) {
        const wl = walls[i]
        const top = GROUND - wl.h
        api.rect(wl.x + shx, top + shy, wl.w, wl.h, C.accent)
        api.rect(wl.x + shx, top + shy, wl.w, 4, C.accent2)
        api.rect(wl.x + wl.w - 3 + shx, top + shy, 3, wl.h, C.dim)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      api.rect(p.x + shx, p.y + shy, PW, PH, dead ? C.dim : C.good)
      api.rect(p.x + PW - 8 + shx, p.y + 7 + shy, 4, 4, C.bg)
      api.rect(p.x - 5 + shx, p.y + PH - 12 + shy, 5, 8, dead ? C.dim : C.good)
      if (!p.ground && p.air > 0) api.circle(p.x + PW / 2, p.y + PH + 6, 3, C.accent2)

      api.text('SPACE x2', 12, 18, { size: 12, color: C.dim })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 58, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.18).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('WIPEOUT', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
