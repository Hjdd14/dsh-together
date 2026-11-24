defineGame({
  id: 'frogger',
  create(api) {
    const STEP_X = 44
    const STEP_Y = 25
    const START_X = 240
    const START_Y = 290
    const TOP_Y = 90
    const LANES = [
      { y: 215, h: 50, cy: 240, vx: 80, tint: 0 },
      { y: 165, h: 50, cy: 190, vx: -110, tint: 1 },
      { y: 115, h: 50, cy: 140, vx: 64, tint: 2 },
    ]
    const CARS = 5
    const SPACING = 108
    const CW = 46
    const CH = 30
    const TINTS = [api.colors.warn, api.colors.accent2, api.colors.accent]

    const cars = []
    for (let i = 0; i < LANES.length; i += 1) {
      const off = api.rnd(-40, SPACING - 40)
      for (let k = 0; k < CARS; k += 1) {
        cars.push({ x: off + k * SPACING, y: LANES[i].cy, vx: LANES[i].vx, tint: LANES[i].tint })
      }
    }

    const parts = []
    let fx = START_X
    let fy = START_Y
    let lives = 3
    let invuln = 0
    let cool = 0
    let queued = null
    let dead = false
    let reason = ''
    let curLane = -1
    let combo = 0
    let hop = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let splash = 0
    const counted = [false, false, false]

    function laneAt(y) {
      for (let i = 0; i < LANES.length; i += 1) {
        if (y <= LANES[i].y + LANES[i].h && y > LANES[i].y) return i
      }
      return -1
    }

    function doneCount() {
      let n = 0
      for (let i = 0; i < counted.length; i += 1) if (counted[i]) n += 1
      return n
    }

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 60; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.25, 0.55), max: 0.55,
          c: color, r: api.rnd(1.4, 3.2),
        })
      }
    }

    function resetFrog() {
      fx = START_X
      fy = START_Y
      curLane = -1
      invuln = 1.1
    }

    function doMove(key) {
      if (key === 'up') {
        if (fy > TOP_Y) fy -= STEP_Y
      } else if (key === 'down') {
        if (fy < START_Y) fy += STEP_Y
      } else if (key === 'left') {
        fx -= STEP_X
      } else if (key === 'right') {
        fx += STEP_X
      } else {
        return
      }
      cool = 0.16
      hop = 1
      if (fx < 22) fx = 22
      if (fx > api.w - 22) fx = api.w - 22
    }

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key !== 'up' && key !== 'down' && key !== 'left' && key !== 'right') return
      if (cool > 0) { queued = key; return }
      doMove(key)
    })

    api.setStatus('lane 0/3')

    function update(dt) {
      if (dead) return
      if (cool > 0) {
        cool -= dt
        if (cool <= 0 && queued) {
          const k = queued
          queued = null
          doMove(k)
        }
      }
      if (invuln > 0) invuln -= dt
      if (hop > 0) hop = Math.max(0, hop - dt * 4)
      if (splash > 0) splash = Math.max(0, splash - dt * 2)
      if (shake > 0) {
        shake = Math.max(0, shake - dt)
        shx = api.rnd(-1, 1) * shake * 12
        shy = api.rnd(-1, 1) * shake * 12
      } else {
        shx = 0
        shy = 0
      }
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        if (p.life <= 0) { parts.splice(i, 1); continue }
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - 2 * dt
        p.vy *= 1 - 2 * dt
      }

      for (let i = 0; i < cars.length; i += 1) {
        const c = cars[i]
        c.x += c.vx * dt
        if (c.vx > 0 && c.x > api.w + 60) c.x = -60
        if (c.vx < 0 && c.x < -60) c.x = api.w + 60
      }

      const lane = laneAt(fy)
      if (lane !== curLane) {
        if (curLane >= 0 && !counted[curLane] && fy <= LANES[curLane].y) {
          counted[curLane] = true
          combo += 1
          splash = 1
          burst(fx, fy, api.colors.good, 8, 140)
          api.progress(1)
          api.setStatus(combo > 1 ? 'lane ' + doneCount() + '/3 x' + combo : 'lane ' + doneCount() + '/3')
        }
        curLane = lane
      }

      if (invuln > 0) return
      for (let i = 0; i < cars.length; i += 1) {
        const c = cars[i]
        if (Math.abs(c.x - fx) > 34) continue
        if (Math.abs(c.y - fy) > 20) continue
        lives -= 1
        combo = 0
        shake = 0.75
        burst(fx, fy, api.colors.warn, 14, 190)
        if (lives <= 0) {
          dead = true
          reason = 'hit by car'
          api.lose(reason)
          return
        }
        api.setStatus('lane ' + doneCount() + '/3 hit')
        resetFrog()
        return
      }
    }

    function draw(g) {
      api.clear(api.colors.bg)
      const t = api.now() / 1000
      api.rect(0, 0, api.w, 65, api.colors.panel)
      const pulse = 0.7 + 0.3 * Math.sin(t * 4)
      api.text('HOME', api.w / 2, 32, {
        size: 15, color: splash > 0.4 ? api.colors.fg : api.colors.good,
        align: 'center', weight: 'bold',
      })
      api.rect(api.w / 2 - 46, 44, 92 * pulse, 2, api.colors.good)
      for (let i = 0; i < LANES.length; i += 1) {
        const lane = LANES[i]
        api.rect(0, lane.y, api.w, lane.h, api.colors.bg)
        const shift = (t * Math.abs(lane.vx) * 0.5 * Math.sign(lane.vx)) % 34
        for (let x = -34; x < api.w + 34; x += 34) {
          api.rect(x + shift, lane.cy - 1, 15, 2, api.colors.panel)
        }
        api.rect(0, lane.y, api.w, 1, api.colors.panel)
      }
      api.rect(0, 265, api.w, 95, api.colors.panel)
      for (let i = 0; i < cars.length; i += 1) {
        const c = cars[i]
        const x = c.x + shx
        const y = c.y + shy
        api.rect(x - CW / 2, y - CH / 2, CW, CH, TINTS[c.tint])
        api.rect(x - CW / 2 + 6, y - CH / 2 + 6, CW - 12, 7, api.colors.bg)
        const lx = c.vx > 0 ? x + CW / 2 - 3 : x - CW / 2 + 3
        api.circle(lx, y + CH / 2 - 4, 2.4, api.colors.accent2)
      }
      if (!dead && (invuln <= 0 || Math.floor(api.now() / 100) % 2 === 0)) {
        const grow = 1 + hop * 0.35
        const r = 11 * grow
        api.circle(fx + shx, fy + shy, r, api.colors.good)
        api.circle(fx - 4 + shx, fy - 4 + shy, 2.4, api.colors.bg)
        api.circle(fx + 4 + shx, fy - 4 + shy, 2.4, api.colors.bg)
        api.circle(fx + shx, fy + 4 + shy, r * 0.45, api.colors.accent2)
      }
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i]
        api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
      }
      api.text('life ' + (lives > 0 ? lives : 0), 12, 348, { size: 12, color: api.colors.dim })
      api.text(doneCount() + '/3', api.w - 12, 348, {
        size: 12, color: api.colors.dim, align: 'right',
      })
      if (combo >= 2 && !dead) {
        api.text('COMBO x' + combo, api.w / 2, 348, {
          size: 12 + Math.min(6, combo), color: api.colors.accent2,
          align: 'center', weight: 'bold',
        })
      }
      if (dead) {
        api.text(reason, api.w / 2, 164, { size: 14, color: api.colors.dim, align: 'center' })
        api.text('LOSE', api.w / 2, 190, {
          size: 36, color: api.colors.warn, align: 'center', weight: 'bold',
        })
      }
    }

    return { update, draw, dispose() { cars.length = 0; parts.length = 0 } }
  },
})
