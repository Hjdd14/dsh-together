defineGame({
  id: 'dodge',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const PY = 234
    const PW = 26
    const PH = 34
    const INVULN = 0.5
    const COOL = 0.6

    const player = { x: 128, y: PY }
    const hazards = []
    const fx = []
    let speed = 205
    let spawnIn = 1.2
    let inv = 0
    let cool = 0
    let dead = false
    let phases = 0
    let time = 0
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
        if (fx.length > 64) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v - 60, vy: Math.sin(a) * v, life: api.rnd(0.2, 0.5), color })
      }
    }

    function phase() {
      if (!dead && cool <= 0) {
        cool = COOL
        inv = INVULN
        phases += 1
        shake = Math.max(shake, 3)
        spark(player.x + PW / 2, player.y + PH / 2, 6, C.good, 130)
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
      phase()
    })
    api.onPointer((e) => {
      if (e.type === 'down') phase()
    })

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
      if (inv > 0) inv -= sdt
      if (cool > 0) cool -= sdt
      speed = Math.min(262, speed + sdt * 5)
      scroll += speed * sdt

      spawnIn -= sdt
      if (spawnIn <= 0) {
        hazards.push({ x: W + 22, w: api.irnd(14, 20), h: PH, done: false, risk: 9 })
        spawnIn = Math.max(0.72, 1.1 - time / 42)
      }

      for (let i = hazards.length - 1; i >= 0; i -= 1) {
        const hz = hazards[i]
        hz.x -= speed * sdt
        if (hz.x + hz.w < -30) {
          hazards.splice(i, 1)
          continue
        }
        const hitX = player.x < hz.x + hz.w - 2 && player.x + PW > hz.x + 2
        if (hitX && inv <= 0) {
          dead = true
          spark(player.x + PW / 2, PY + PH / 2, 15, C.warn, 185)
          spark(player.x + PW / 2, PY + PH / 2, 7, C.fg, 118)
          shake = 14
          api.lose('hit')
        }
        if (hitX && inv > 0 && inv < hz.risk) hz.risk = inv
        if (!hz.done && hz.x + hz.w < player.x) {
          hz.done = true
          if (hz.risk < 0.1) {
            combo += 2
            msg = 'PERFECT'
            msgT = 0.7
            flash = 1
            slow = 0.07
            shake = Math.max(shake, 5)
          } else if (hz.risk < 0.22) {
            combo += 1
            msg = 'CLOSE'
            msgT = 0.45
          } else {
            combo = 0
          }
        }
      }

      dust -= sdt
      if (dust <= 0) {
        dust = 0.06
        spark(player.x - 4, PY + PH - 2, 1, 'rgba(143,160,180,0.5)', 40)
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
        q.vy += 200 * sdt
      }
      api.setStatus(cool > 0 ? 'recharge' : 'ready')
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, 40 + i * 34, W, 34, 'rgba(106,169,255,' + (0.035 - i * 0.0035).toFixed(3) + ')')

      const far = (scroll * 0.2) % 96
      for (let x = -far; x < W; x += 96) api.rect(x, 150, 46, 90, 'rgba(106,169,255,0.05)')

      if (speed > 244) {
        for (let i = 0; i < 6; i += 1) {
          const y = 50 + i * 40
          api.rect(W - 20 - ((scroll * 1.6 + i * 66) % 140), y, 32, 2, 'rgba(232,238,246,0.2)')
        }
      }

      api.rect(shx, 302 + shy, W, 2, C.dim)
      const gs = scroll % 60
      for (let x = -gs; x < W; x += 60) api.rect(x + shx, 312 + shy, 30, 2, C.panel)

      for (let i = 0; i < hazards.length; i += 1) {
        const hz = hazards[i]
        api.rect(hz.x + shx, PY + 2 + shy, hz.w, hz.h - 4, C.warn)
        api.rect(hz.x + 3 + shx, PY + 8 + shy, hz.w - 6, 4, C.bg)
        api.rect(hz.x + 3 + shx, PY + hz.h - 14 + shy, hz.w - 6, 4, C.bg)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      const ghost = inv > 0
      if (ghost) {
        api.rect(player.x - 14 + shx, player.y + shy, PW, PH, 'rgba(139,220,122,0.16)')
        api.rect(player.x - 26 + shx, player.y + shy, PW, PH, 'rgba(139,220,122,0.08)')
      }
      api.rect(player.x + shx, player.y + shy, PW, PH, ghost ? C.dim : dead ? C.dim : C.good)
      api.rect(player.x + PW - 9 + shx, player.y + 9 + shy, 5, 5, ghost ? C.panel : C.bg)
      api.rect(player.x - 6 + shx, player.y + PH - 10 + shy, 6, 6, ghost ? C.panel : C.good)

      const barW = 90
      api.rect(12, 30, barW, 5, C.panel)
      api.rect(12, 30, barW * Math.max(0, 1 - cool / COOL), 5, cool > 0 ? C.warn : C.accent)
      api.text('SPACE', 12, 18, { size: 12, color: C.dim })
      api.text('phases ' + phases, W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 44, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 66, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.18).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('MISS', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
