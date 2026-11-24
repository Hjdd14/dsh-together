defineGame({
  id: 'dino',
  create(api) {
    const C = api.colors
    const W = api.w
    const GROUND = 296
    const GRAV = 1650
    const JUMP = -570
    const PW = 22
    const PH = 30

    const player = { x: 74, y: GROUND - PH, w: PW, h: PH, vy: 0, ground: true }
    const rocks = []
    const fx = []
    let time = 0
    let spawnIn = 1.1
    let speed = 190
    let dead = false
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let combo = 0
    let dust = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 72) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.35, spd)
        fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.35, life: api.rnd(0.28, 0.6), color })
      }
    }

    function jump() {
      if (dead || !player.ground) return
      player.vy = JUMP
      player.ground = false
      spark(player.x + PW / 2, GROUND - 2, 4, C.dim, 108)
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

      time += sdt
      speed = 190 + Math.min(75, time * 6)

      spawnIn -= sdt
      if (spawnIn <= 0) {
        rocks.push({ x: W + 26, w: api.irnd(12, 18), h: api.irnd(22, 34), done: false, gap: 999 })
        spawnIn = Math.max(0.62, 1.05 - time * 0.02) + api.rnd(0, 0.26)
      }

      player.vy += GRAV * sdt
      player.y += player.vy * sdt
      if (player.y >= GROUND - PH) {
        if (!player.ground) spark(player.x + PW / 2, GROUND - 2, 5, C.dim, 92)
        player.y = GROUND - PH
        player.vy = 0
        player.ground = true
      }

      dust -= sdt
      if (player.ground && dust <= 0) {
        dust = 0.055
        spark(player.x + 2, GROUND - 2, 1, C.dim, 46)
      }

      for (let i = rocks.length - 1; i >= 0; i -= 1) {
        const r = rocks[i]
        r.x -= speed * sdt
        if (r.x + r.w < -30) {
          rocks.splice(i, 1)
          continue
        }
        const hitX = player.x < r.x + r.w - 3 && player.x + PW > r.x + 3
        if (hitX) {
          const feel = GROUND - r.h - (player.y + PH)
          if (feel < r.gap) r.gap = feel
          if (feel < 3) {
            dead = true
            spark(player.x + PW / 2, player.y + PH / 2, 16, C.warn, 195)
            spark(player.x + PW / 2, player.y + PH / 2, 8, C.fg, 120)
            shake = 15
            api.lose('hit')
          }
        }
        if (!r.done && r.x + r.w < player.x) {
          r.done = true
          if (r.gap < 10) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.85
            flash = 1
            slow = 0.1
            shake = Math.max(shake, 5)
            spark(player.x + PW, player.y + 6, 6, C.accent2, 150)
          } else if (r.gap < 24) {
            combo += 1
            msg = 'CLOSE'
            msgT = 0.55
          } else {
            combo = 0
          }
        }
      }

      for (let i = fx.length - 1; i >= 0; i -= 1) {
        const p = fx[i]
        p.life -= sdt
        if (p.life <= 0) {
          fx.splice(i, 1)
          continue
        }
        p.x += p.vx * sdt
        p.y += p.vy * sdt
        p.vy += 420 * sdt
      }
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 7; i += 1) api.rect(0, 146 + i * 22, W, 22, 'rgba(106,169,255,' + (0.02 + i * 0.008).toFixed(3) + ')')

      const p1 = (time * speed * 0.16) % 130
      for (let x = -p1; x < W; x += 130) api.rect(x, 232, 78, 64, 'rgba(106,169,255,0.07)')
      const p2 = (time * speed * 0.34) % 96
      for (let x = -p2; x < W; x += 96) api.rect(x, 256, 52, 40, 'rgba(106,169,255,0.13)')

      if (speed > 220) {
        for (let i = 0; i < 6; i += 1) {
          const y = 62 + i * 36
          const lx = W - 40 - ((time * 300 + i * 96) % 150)
          api.rect(lx, y, 36, 2, 'rgba(232,238,246,0.22)')
        }
      }

      api.rect(shx, GROUND + shy, W, 2, C.dim)
      const shift = (time * speed) % 44
      for (let x = -shift; x < W; x += 44) api.rect(x + shx, GROUND + 9 + shy, 18, 2, C.panel)

      for (let i = 0; i < rocks.length; i += 1) {
        const r = rocks[i]
        api.rect(r.x + shx, GROUND - r.h + shy, r.w, r.h, C.warn)
        api.rect(r.x - 3 + shx, GROUND - r.h * 0.62 + shy, 3, 4, C.warn)
        api.rect(r.x + r.w + shx, GROUND - r.h * 0.44 + shy, 3, 4, C.warn)
      }

      api.rect(player.x + shx, player.y + shy, PW, PH, dead ? C.dim : C.good)
      api.rect(player.x + PW - 8 + shx, player.y + 7 + shy, 4, 4, C.bg)
      api.rect(player.x + 2 + shx, player.y + PH - 8 + shy, 5, 4, C.bg)
      if (!player.ground && !dead) api.rect(player.x - 4 + shx, player.y + 12 + shy, 4, 6, C.good)

      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        const s = Math.max(1, Math.min(4, p.life * 7))
        api.rect(p.x, p.y, s, s, p.color)
      }

      api.text('SPACE', 12, 18, { size: 12, color: C.dim })
      api.text(time.toFixed(1), W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 78, { size: 22, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, 360, 'rgba(255,255,255,' + (flash * 0.22).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, 360, 'rgba(16,20,24,0.6)')
        api.text('OUCH', W / 2, 160, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 190, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
