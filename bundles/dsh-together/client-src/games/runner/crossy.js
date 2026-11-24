defineGame({
  id: 'crossy',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const ROWH = 46
    const COLW = 46
    const BASE = 288
    const PW = 22
    const PH = 24
    const XMAX = COLW * 2

    const lanes = []
    const fx = []
    const p = { x: 0, y: 0, tx: 0, ty: 0, hop: 0 }
    let maxLane = 0
    let hearts = 3
    let dead = false
    let time = 0
    let combo = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let flash = 0
    let slow = 0
    let msg = ''
    let msgT = 0
    let scroll = 0
    let hurt = 0

    function spark(x, y, n, color, spd) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 64) fx.shift()
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: api.rnd(0.22, 0.5), color })
      }
    }

    function makeLane(i) {
      const lane = { i, cars: [] }
      if (i < 2) return lane
      if (api.rng() < 0.22) return lane
      const dir = api.rng() < 0.5 ? -1 : 1
      const n = 2 + api.irnd(0, 1)
      const sp = api.rnd(100, 196)
      const off = api.rnd(-450, 450)
      for (let k = 0; k < n; k += 1) {
        lane.cars.push({ x: off + (900 / n) * k, w: api.irnd(38, 52), v: dir * sp, gz: false })
      }
      return lane
    }

    for (let i = 0; i < 10; i += 1) lanes.push(makeLane(i))
    let topLane = 9

    function laneIndex(i) {
      for (let k = 0; k < lanes.length; k += 1) if (lanes[k].i === i) return k
      return -1
    }

    function hopUp() {
      if (dead || Math.abs(p.ty - p.y) > 4) return
      p.ty += ROWH
      p.hop = 0.16
      spark(p.x, BASE - 4, 3, C.dim, 70)
    }

    function hopSide(dir) {
      if (dead || Math.abs(p.tx - p.x) > 4) return
      const nx = p.tx + dir * COLW
      if (nx < -XMAX || nx > XMAX) return
      p.tx = nx
      p.hop = 0.16
      spark(p.x, BASE - 4, 2, C.dim, 60)
    }

    let keyHeld = false
    api.onKey((key, isDown) => {
      const hit = key === 'space' || key === 'up' || key === 'left' || key === 'right'
      if (!isDown) {
        if (hit) keyHeld = false
        return
      }
      if (!hit || keyHeld || dead) return
      keyHeld = true
      if (key === 'left') hopSide(-1)
      else if (key === 'right') hopSide(1)
      else hopUp()
    })
    api.onPointer((e) => {
      if (e.type === 'down') hopUp()
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
      if (p.hop > 0) p.hop -= sdt
      if (hurt > 0) hurt -= sdt
      time += sdt
      scroll += sdt * 60

      const stp = 300 * sdt
      if (Math.abs(p.tx - p.x) <= stp) p.x = p.tx
      else p.x += stp * (p.tx > p.x ? 1 : -1)
      if (Math.abs(p.ty - p.y) <= stp) p.y = p.ty
      else p.y += stp * (p.ty > p.y ? 1 : -1)

      const lane = Math.round(p.y / ROWH)
      if (lane > maxLane) {
        for (let g = maxLane + 1; g <= lane; g += 1) api.progress(1)
        maxLane = lane
        combo += 1
        if (combo > 3) {
          msg = 'COMBO x' + combo
          msgT = 0.5
        }
      }

      while (topLane < lane + 8) {
        topLane += 1
        lanes.push(makeLane(topLane))
      }
      while (lanes.length && lanes[0].i < lane - 5) lanes.shift()

      for (let i = 0; i < lanes.length; i += 1) {
        const ln = lanes[i]
        const wy = ln.i * ROWH
        for (let k = 0; k < ln.cars.length; k += 1) {
          const car = ln.cars[k]
          car.x += car.v * sdt
          if (car.x > 450) car.x = -450
          if (car.x < -450) car.x = 450
          const dxx = Math.abs(p.x - car.x)
          const dyy = Math.abs(p.y - wy)
          if (hurt <= 0 && dxx < (PW + car.w) / 2 - 3 && dyy < (PH + 30) / 2 - 3) {
            hurt = 0.9
            hearts -= 1
            combo = 0
            shake = 12
            flash = 1
            slow = 0.14
            msg = 'HIT'
            msgT = 0.6
            spark(p.x, BASE - 12, 12, C.warn, 170)
            p.ty = Math.max(0, (Math.round(p.y / ROWH) - 1) * ROWH)
            p.tx = Math.max(-XMAX, Math.min(XMAX, p.tx * 0.4))
            if (hearts <= 0) {
              dead = true
              api.lose('car')
            }
          } else if (dxx < (PW + car.w) / 2 + 14 && dyy < (PH + 30) / 2) {
            if (!car.gz) {
              car.gz = true
              combo += 1
              msg = 'CLOSE'
              msgT = 0.4
              shake = Math.max(shake, 2)
            }
          } else if (dxx > 60) {
            car.gz = false
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
        q.vy += 240 * sdt
      }
      api.setStatus('lanes ' + maxLane)
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.035 - i * 0.0035).toFixed(3) + ')')

      const far = (scroll * 0.25) % 80
      for (let x = -far; x < W; x += 80) api.rect(x, 0, 30, 120, 'rgba(106,169,255,0.07)')

      const px = W / 2 + p.x
      const camY = p.y
      const left = W / 2 - XMAX - 44
      const right = W / 2 + XMAX + 44
      api.rect(left + shx, 0, right - left, H, 'rgba(24,32,40,0.85)')

      for (let i = lanes.length - 1; i >= 0; i -= 1) {
        const ln = lanes[i]
        const sy = BASE - (ln.i * ROWH - camY)
        if (sy < -60 || sy > H + 60) continue
        if (ln.i % 2 === 0) api.rect(left + shx, sy + shy, right - left, ROWH, 'rgba(16,20,24,0.55)')
        api.rect(left + shx, sy + ROWH - 1 + shy, right - left, 1, 'rgba(106,169,255,0.14)')
        for (let k = 0; k < ln.cars.length; k += 1) {
          const car = ln.cars[k]
          const cxp = W / 2 + car.x
          const body = car.v < 0 ? C.warn : C.accent
          api.rect(cxp - car.w / 2 + shx, sy + 8 + shy, car.w, ROWH - 18, body)
          api.rect(cxp - car.w / 2 + 4 + shx, sy + 12 + shy, car.w - 8, 6, 'rgba(232,238,246,0.55)')
          api.rect(cxp - 3 + shx, sy + ROWH - 16 + shy, 6, 4, C.accent2)
        }
      }

      if (maxLane === 0) {
        api.rect(left + shx, BASE + ROWH - 6 + shy, right - left, 6, 'rgba(139,220,122,0.35)')
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const s = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x + W / 2, q.y, s, s, q.color)
      }

      const lift = p.hop > 0 ? Math.sin((1 - p.hop / 0.16) * Math.PI) * 8 : 0
      const blink = hurt > 0 && Math.floor(time * 18) % 2 === 0
      api.rect(px - PW / 2 + shx, BASE - PH - lift + shy, PW, PH, dead ? C.dim : blink ? C.dim : C.good)
      api.rect(px + PW / 2 - 7 + shx, BASE - PH - lift + 4 + shy, 5, 5, C.bg)
      api.rect(px - 4 + shx, BASE - PH - lift - 4 + shy, 8, 4, C.accent2)

      for (let i = 0; i < 3; i += 1) {
        api.rect(12 + i * 16, 30, 11, 11, i < hearts ? C.warn : C.panel)
      }
      api.text('SPACE / ARROWS', 12, 18, { size: 12, color: C.dim })
      api.text('lane ' + maxLane, W - 14, 18, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, 12, 50, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 62, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,122,122,' + (flash * 0.22).toFixed(3) + ')')
      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('FLATTENED', W / 2, 158, { size: 24, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
