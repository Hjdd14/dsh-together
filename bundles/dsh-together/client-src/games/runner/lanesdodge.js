defineGame({
  id: 'lanesdodge',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const LANE = 96
    const LANEX = [-LANE, 0, LANE]
    const PY = 292
    const PW = 40
    const PH = 46

    const cars = []
    const fx = []
    const p = { lane: 1, x: 0, tx: 0 }
    let speed = 170
    let spawnIn = 0.9
    let dead = false
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
    let nearMiss = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 60) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 40, life: api.rnd(0.2, 0.45), color })
      }
    }

    function move(dir) {
      if (dead) return
      const nl = p.lane + dir
      if (nl < 0 || nl > 2) return
      p.lane = nl
      p.tx = LANEX[nl]
      spark(W / 2 + p.x, PY + PH, 3, C.dim, 70)
    }

    let keyHeld = false
    api.onKey((key, isDown) => {
      const hit = key === 'left' || key === 'right'
      if (!isDown) {
        if (hit) keyHeld = false
        return
      }
      if (!hit || keyHeld || dead) return
      keyHeld = true
      move(key === 'left' ? -1 : 1)
    })
    api.onPointer((e) => {
      if (e.type === 'down') move(e.x < W / 2 ? -1 : 1)
    })

    function laneBusy(idx) {
      for (let i = 0; i < cars.length; i += 1) {
        if (cars[i].laneIdx === idx && cars[i].y < 210) return true
      }
      return false
    }

    function spawn() {
      const roll = api.rng()
      const lanes = []
      let pick = api.irnd(0, 2)
      if (laneBusy(pick)) {
        const alt = [0, 1, 2].filter(function (v) { return !laneBusy(v) })
        if (alt.length === 0) return
        pick = alt[api.irnd(0, alt.length - 1)]
      }
      lanes.push(pick)
      if (roll < 0.42) {
        const free = [0, 1, 2].filter(function (v) { return v !== lanes[0] && !laneBusy(v) })
        if (free.length) lanes.push(free[api.irnd(0, free.length - 1)])
      }
      for (let i = 0; i < lanes.length; i += 1) {
        // Screen space, not lane offset: LANEX is an offset from the road centre, and
        // drawing it raw put two lanes off the left edge and made every collision
        // impossible (the player is drawn at `W / 2 + p.x`).
        cars.push({ x: W / 2 + LANEX[lanes[i]], laneIdx: lanes[i], y: -70 - i * 40, w: 54, h: 76, near: 99, done: false })
      }
    }

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
      speed = Math.min(255, 170 + time * 5)
      scroll += speed * sdt

      p.x += (p.tx - p.x) * Math.min(1, sdt * 18)

      spawnIn -= sdt
      if (spawnIn <= 0) {
        spawn()
        spawnIn = Math.max(0.6, 0.95 - time * 0.02)
      }

      for (let i = cars.length - 1; i >= 0; i -= 1) {
        const car = cars[i]
        car.y += speed * sdt
        if (car.y > H + 90) {
          cars.splice(i, 1)
          continue
        }
        const dxx = Math.abs(W / 2 + p.x - car.x)
        const dyy = Math.abs(PY + PH / 2 - car.y)
        if (dxx < (PW + car.w) / 2 - 6 && dyy < (PH + car.h) / 2 - 6) {
          dead = true
          spark(car.x, car.y, 16, C.warn, 190)
          spark(car.x, car.y, 7, C.fg, 120)
          shake = 15
          api.lose('car')
        }
        if (dyy < car.near) car.near = dyy
        if (!car.done && car.y > PY - 40) {
          car.done = true
          if (car.near < 62) {
            combo += 1
            msg = 'CLOSE'
            msgT = 0.4
            shake = Math.max(shake, 2)
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
      api.setStatus('lane ' + (p.lane + 1))
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.04 - i * 0.004).toFixed(3) + ')')

      const far = (scroll * 0.3) % 90
      for (let x = -far; x < W; x += 90) api.rect(x, 0, 34, 130, 'rgba(106,169,255,0.07)')

      const cx = W / 2
      const roadL = cx - LANE * 1.5 - 10
      const roadR = cx + LANE * 1.5 + 10
      api.rect(roadL + shx, 0, roadR - roadL, H, 'rgba(24,32,40,0.9)')
      api.rect(roadL + shx, 0, 3, H, C.dim)
      api.rect(roadR - 3 + shx, 0, 3, H, C.dim)
      const dash = scroll % 60
      for (let ly = -dash; ly < H; ly += 60) {
        api.rect(cx - LANE / 2 + shx, ly + shy, 2, 28, 'rgba(232,238,246,0.25)')
        api.rect(cx + LANE / 2 + shx, ly + shy, 2, 28, 'rgba(232,238,246,0.25)')
      }

      if (speed > 230) {
        for (let i = 0; i < 6; i += 1) {
          const y = 30 + i * 52
          api.rect(W - 16 - ((scroll * 1.5 + i * 64) % 130), y, 30, 2, 'rgba(232,238,246,0.18)')
        }
      }

      for (let i = 0; i < cars.length; i += 1) {
        const car = cars[i]
        api.rect(car.x - car.w / 2 + shx, car.y - car.h / 2 + shy, car.w, car.h, C.warn)
        api.rect(car.x - car.w / 2 + 6 + shx, car.y - car.h / 2 + 8 + shy, car.w - 12, 14, 'rgba(232,238,246,0.5)')
        api.rect(car.x - car.w / 2 + 6 + shx, car.y + car.h / 2 - 20 + shy, car.w - 12, 8, C.accent2)
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, s, s, q.color)
      }

      const px = cx + p.x
      api.rect(px - PW / 2 + shx, PY - 8 + shy, PW, PH, dead ? C.dim : C.good)
      api.rect(px - PW / 2 + 6 + shx, PY + 2 + shy, PW - 12, 12, 'rgba(16,20,24,0.7)')
      api.rect(px - 4 + shx, PY + PH - 14 + shy, 8, 6, C.accent2)

      api.text('LEFT / RIGHT', 12, 18, { size: 12, color: C.dim })
      api.text(time.toFixed(1), W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      api.text('COMBO x' + (combo > 1 ? combo : 1), 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 64, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.18).toFixed(3) + ')')
      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('CRASH', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('arrows to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
