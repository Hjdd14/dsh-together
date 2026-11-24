defineGame({
  id: 'walljump',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const WALL = 95
    const HW = 11
    const GRAV = 1300
    const JUMP = 600
    const KICK = 310
    const FLOORH = 100

    const p = { x: -70, y: 0, vx: 300, vy: JUMP }
    const fx = []
    let camY = 340
    let maxFloor = 0
    let onWall = false
    let cool = 0
    let dead = false
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let time = 0
    let scarf = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 64) fx.shift()
        fx.push({
          x, y,
          vx: api.rnd(-spd, spd),
          vy: api.rnd(-spd, spd),
          life: api.rnd(0.2, 0.5),
          color,
        })
      }
    }

    function kick(side) {
      p.vx = -side * KICK
      p.vy = JUMP
      cool = 0.12
      onWall = false
      combo += 1
      shake = Math.max(shake, 3)
      spark(p.x + side * HW, camY - p.y, 5, C.accent2, 130)
      if (combo % 4 === 0) {
        msg = 'COMBO x' + combo
        msgT = 0.45
        flash = Math.max(flash, 0.5)
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
      if (!onWall) {
        if (cool <= 0) {
          msg = 'WALL FIRST'
          msgT = 0.35
        }
        return
      }
      if (cool <= 0) kick(p.x < 0 ? -1 : 1)
    })
    api.onPointer((e) => {
      if (e.type === 'down' && onWall && cool <= 0 && !dead) kick(p.x < 0 ? -1 : 1)
    })

    function update(dt) {
      if (dead) return
      const sdt = dt * (slow > 0 ? 0.45 : 1)
      if (slow > 0) slow -= dt
      if (flash > 0) flash -= dt * 2.4
      if (msgT > 0) msgT -= dt
      if (shake > 0) shake = Math.max(0, shake - dt * 30)
      if (cool > 0) cool -= sdt
      shx = (api.rng() - 0.5) * shake
      shy = (api.rng() - 0.5) * shake
      time += sdt

      p.vy -= GRAV * sdt
      if (p.vy < -620) p.vy = -620
      p.y += p.vy * sdt
      p.x += p.vx * sdt

      const lim = WALL - HW
      if (p.x > lim) {
        p.x = lim
        if (p.vx > 0) p.vx = 0
      }
      if (p.x < -lim) {
        p.x = -lim
        if (p.vx < 0) p.vx = 0
      }
      onWall = Math.abs(p.x) > lim - 1.5

      if (camY < p.y + 200) camY = p.y + 200
      const sy = camY - p.y

      scarf -= sdt
      if (scarf <= 0) {
        scarf = 0.06
        spark(p.x, sy + 6, 1, 'rgba(255,207,92,0.5)', 24)
      }

      const fl = Math.floor(p.y / FLOORH)
      if (fl > maxFloor) {
        for (let i = maxFloor + 1; i <= fl; i += 1) api.progress(1)
        maxFloor = fl
        combo += 1
        flash = 1
        slow = 0.05
        msg = 'FLOOR ' + fl
        msgT = 0.5
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
        q.vy += 180 * sdt
      }

      if (sy > H + 30) {
        dead = true
        spark(p.x, H - 20, 14, C.warn, 180)
        shake = 13
        api.lose('fall')
      }
      api.setStatus('floor ' + maxFloor)
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.04 - i * 0.004).toFixed(3) + ')')

      const camTop = camY
      const tick = Math.floor(camTop / FLOORH)
      for (let i = -1; i < 6; i += 1) {
        const line = (tick + i) * FLOORH
        const y = camTop - line
        if (y < -20 || y > H + 20) continue
        api.rect(W / 2 - WALL, y, WALL * 2, 1, 'rgba(106,169,255,0.12)')
        api.text('' + (tick + i), W / 2, y - 8, { size: 10, color: 'rgba(143,160,180,0.6)', align: 'center' })
      }

      api.rect(0, 0, W / 2 - WALL, H, C.panel)
      api.rect(W / 2 + WALL, 0, W / 2 - WALL, H, C.panel)
      api.rect(W / 2 - WALL - 3 + shx, 0, 3, H, C.dim)
      api.rect(W / 2 + WALL + shx, 0, 3, H, C.dim)

      const sy = camY - p.y
      if (p.vy > 300) {
        for (let i = 0; i < 5; i += 1) {
          api.rect(W / 2 - 60 + i * 30, sy + 20 + ((time * 300 + i * 50) % 120), 2, 20, 'rgba(232,238,246,0.18)')
        }
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x + shx, q.y + shy, s, s, q.color)
      }

      const px = W / 2 + p.x
      api.rect(px - HW + shx, sy + shy, HW * 2, 26, dead ? C.dim : C.good)
      api.rect(px - 5 + shx, sy + 5 + shy, 4, 4, C.bg)
      api.rect(px - 4 + shx, sy - 4 + shy, 8, 5, C.accent2)
      if (onWall) api.rect(px + (p.x < 0 ? -HW - 3 : HW) + shx, sy + 4 + shy, 3, 14, C.accent2)

      api.text('SPACE (tap on wall)', 12, 18, { size: 12, color: C.dim })
      api.text('floor ' + maxFloor, W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 62, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.12).toFixed(3) + ')')
      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('FELL', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
