defineGame({
  id: 'skisafari',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const GROUND = 292
    const GRAV = 1650
    const JUMP = -570
    const PW = 26
    const PH = 30

    const p = { x: 110, y: GROUND - PH, w: PW, h: PH, vy: 0, ground: true }
    const obs = []
    const fx = []
    let speed = 238
    let spawnIn = 1.5
    let dodged = 0
    let dead = false
    let scroll = 0
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let powder = 0
    let time = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 64) fx.shift()
        fx.push({
          x, y,
          vx: api.rnd(-spd, spd * 0.4) - 40,
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
      spark(p.x, GROUND - 2, 6, C.fg, 110)
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

      speed = Math.min(312, speed + sdt * 8)
      scroll += speed * sdt

      spawnIn -= sdt
      if (spawnIn <= 0) {
        const tree = api.rng() < 0.55
        obs.push({
          x: W + 30,
          w: tree ? api.irnd(22, 30) : api.irnd(30, 40),
          h: tree ? api.irnd(44, 62) : api.irnd(26, 36),
          tree,
          done: false,
          clr: 999,
          warn: false,
        })
        spawnIn = 1.45
      }

      p.vy += GRAV * sdt
      p.y += p.vy * sdt
      if (p.y >= GROUND - PH) {
        if (!p.ground) spark(p.x + PW / 2, GROUND - 2, 5, C.fg, 96)
        p.y = GROUND - PH
        p.vy = 0
        p.ground = true
      }

      powder -= sdt
      if (p.ground && powder <= 0) {
        powder = 0.045
        spark(p.x - 8, GROUND - 3, 1, 'rgba(232,238,246,0.6)', 52)
      }

      for (let i = obs.length - 1; i >= 0; i -= 1) {
        const o = obs[i]
        o.x -= speed * sdt
        if (o.x + o.w < -40) {
          obs.splice(i, 1)
          continue
        }
        const eta = (o.x - (p.x + PW)) / speed
        o.warn = eta < 0.4 && eta > 0
        const top = GROUND - o.h
        if (p.x + PW > o.x + 3 && p.x < o.x + o.w - 3) {
          const clear = top - (p.y + PH)
          if (clear < o.clr) o.clr = clear
          if (clear < 3) {
            dead = true
            spark(p.x + PW / 2, p.y + PH / 2, 16, C.warn, 195)
            spark(p.x + PW / 2, p.y + PH / 2, 8, C.fg, 120)
            shake = 15
            api.lose('crash')
          }
        }
        if (!o.done && o.x + o.w < p.x) {
          o.done = true
          dodged += 1
          api.progress(1)
          if (o.clr < 12) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.65
            flash = 1
            slow = 0.07
            shake = Math.max(shake, 5)
          } else if (o.clr < 28) {
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
        q.vy += 320 * sdt
      }
      api.setStatus('cleared ' + dodged)
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.05 - i * 0.005).toFixed(3) + ')')

      const far = (scroll * 0.14) % 132
      for (let x = -far; x < W; x += 132) api.rect(x, 176, 74, 56, 'rgba(106,169,255,0.06)')
      const mid = (scroll * 0.34) % 88
      for (let x = -mid; x < W; x += 88) api.rect(x, 214, 46, 34, 'rgba(106,169,255,0.1)')

      if (speed > 288) {
        for (let i = 0; i < 6; i += 1) {
          const y = 40 + i * 42
          api.rect(W - 18 - ((scroll * 1.5 + i * 68) % 140), y, 32, 2, 'rgba(232,238,246,0.2)')
        }
      }

      api.rect(shx, GROUND + shy, W, H - GROUND, 'rgba(232,238,246,0.13)')
      api.rect(shx, GROUND + shy, W, 3, C.fg)
      const gs = scroll % 48
      for (let x = -gs; x < W; x += 48) api.rect(x + shx, GROUND + 13 + shy, 22, 2, 'rgba(24,32,40,0.5)')

      for (let i = 0; i < obs.length; i += 1) {
        const o = obs[i]
        const top = GROUND - o.h
        const blink = o.warn && Math.floor(time * 20) % 2 === 0
        const body = blink ? C.fg : o.tree ? C.accent : C.warn
        api.rect(o.x + shx, top + shy, o.w, o.h, body)
        if (o.tree) {
          api.rect(o.x + o.w / 2 - 3 + shx, top + o.h - 6 + shy, 6, 8, 'rgba(24,32,40,0.7)')
          api.rect(o.x - 3 + shx, top + 10 + shy, o.w + 6, 8, body)
        } else {
          api.rect(o.x + 4 + shx, top + 4 + shy, o.w - 8, 5, 'rgba(24,32,40,0.6)')
        }
        if (o.warn) api.rect(o.x + shx, top - 12 + shy, o.w, 3, C.accent2)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      api.rect(p.x + shx, p.y + shy, PW, PH, dead ? C.dim : C.good)
      api.rect(p.x + 5 + shx, p.y + 5 + shy, PW - 10, 6, C.fg)
      api.rect(p.x + PW - 8 + shx, p.y + 5 + shy, 5, 5, C.bg)
      api.rect(p.x - 6 + shx, p.y + PH - 4 + shy, PW + 12, 4, C.warn)

      api.text('SPACE', 12, 18, { size: 12, color: C.dim })
      api.text('cleared ' + dodged, W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 60, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
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
