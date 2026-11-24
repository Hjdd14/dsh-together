defineGame({
  id: 'caveride',
  create(api) {
    const C = api.colors
    const W = api.w
    const H = api.h
    const SEG = 30
    const CARW = 26
    const CARH = 18
    const GRAV = 1500
    const JUMP = -520

    const car = { x: 108, y: 0, vy: 0, ground: true }
    const segs = []
    const fx = []
    let speed = 172
    let tap = 0
    let dead = false
    let bump = 0
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
        fx.push({ x, y, vx: Math.cos(a) * v - 50, vy: Math.sin(a) * v, life: api.rnd(0.24, 0.55), color })
      }
    }

    let hazX = -9999
    let gen = 0
    function addSeg() {
      const last = segs[segs.length - 1]
      const ny = Math.max(212, Math.min(296, last.y + api.rnd(-12, 12)))
      const nx = last.x + SEG
      const r = api.rng()
      gen += 1
      if (gen > 12 && nx - hazX > 250 && !last.gap && last.rock === 0) {
        if (r < 0.2) {
          hazX = nx + SEG * 2
          segs.push({ x: nx, y: ny, gap: true, rock: 0, done: false, clr: 999 })
          segs.push({ x: nx + SEG, y: ny, gap: true, rock: 0, done: false, clr: 999 })
          return
        }
        if (r < 0.62) {
          hazX = nx
          segs.push({ x: nx, y: ny, gap: false, rock: api.irnd(24, 32), done: false, clr: 999 })
          return
        }
      }
      segs.push({ x: nx, y: ny, gap: false, rock: 0, done: false, clr: 999 })
    }

    let gx = -SEG
    let gy = 278
    segs.push({ x: gx, y: gy, gap: false, rock: 0, done: false, clr: 999 })
    while (segs.length < 26) addSeg()
    car.y = segs[0].y - CARH

    function jump() {
      if (car.ground && !dead) {
        car.vy = JUMP
        car.ground = false
        bump = 0.18
        spark(car.x + 6, car.y + CARH, 5, C.dim, 100)
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
      tap = 0.14
    })
    api.onPointer((e) => {
      if (e.type === 'down') tap = 0.14
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
      if (bump > 0) bump -= sdt

      speed = Math.min(202, speed + sdt * 3)
      scroll += speed * sdt
      for (let i = 0; i < segs.length; i += 1) segs[i].x -= speed * sdt
      while (segs.length && segs[0].x + SEG < -60) segs.shift()
      let last = segs[segs.length - 1]
      while (last && last.x < W + SEG * 3) {
        addSeg()
        last = segs[segs.length - 1]
      }

      if (tap > 0) {
        tap -= sdt
        jump()
      }

      car.vy += GRAV * sdt
      car.y += car.vy * sdt

      const cx = car.x + CARW / 2
      let under = null
      for (let i = 0; i < segs.length; i += 1) {
        const s = segs[i]
        if (cx >= s.x && cx < s.x + SEG) {
          under = s
          break
        }
      }

      if (under && !under.gap) {
        if (car.y + CARH >= under.y) {
          if (car.y + CARH > under.y + 34) {
            dead = true
            spark(cx, car.y + CARH, 14, C.warn, 180)
            shake = 13
            api.lose('pit')
          } else {
            if (!car.ground) {
              spark(cx, under.y, 4, C.dim, 90)
              shake = Math.max(shake, 2)
            }
            car.y = under.y - CARH
            car.vy = 0
            car.ground = true
          }
        }
      } else {
        car.ground = false
      }

      for (let i = 0; i < segs.length; i += 1) {
        const s = segs[i]
        if (s.rock > 0 && car.x + CARW > s.x + 6 && car.x < s.x + SEG - 6) {
          const clear = s.y - s.rock - (car.y + CARH)
          if (clear < s.clr) s.clr = clear
          if (clear < 2 && car.ground) {
            dead = true
            spark(cx, car.y + CARH, 15, C.warn, 190)
            spark(cx, car.y + CARH, 7, C.fg, 120)
            shake = 14
            api.lose('rock')
          }
        }
        if (!s.done && s.x + SEG < car.x) {
          s.done = true
          if (s.rock > 0 || s.gap) {
            if (s.rock > 0 && s.clr < 12) {
              combo += 2
              msg = 'PERFECT'
              msgT = 0.7
              flash = 1
              slow = 0.07
              shake = Math.max(shake, 5)
            } else if (s.rock > 0 && s.clr < 28) {
              combo += 1
              msg = 'CLOSE'
              msgT = 0.45
            } else if (s.gap) {
              combo += 1
            } else {
              combo = 0
            }
          }
        }
      }

      dust -= sdt
      if (car.ground && dust <= 0) {
        dust = 0.05
        spark(car.x + 2, car.y + CARH - 1, 1, 'rgba(143,160,180,0.6)', 40)
      }

      if (car.y > H + 40) {
        dead = true
        spark(cx, H - 12, 12, C.warn, 160)
        shake = 12
        api.lose('pit')
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
    }

    function draw(g) {
      api.clear(C.bg)
      for (let i = 0; i < 8; i += 1) api.rect(0, i * 45, W, 45, 'rgba(106,169,255,' + (0.035 - i * 0.004).toFixed(3) + ')')

      const far = (scroll * 0.24) % 84
      for (let x = -far; x < W; x += 84) {
        api.rect(x, 0, 26, 30, 'rgba(24,32,40,1)')
        api.rect(x + 10, 0, 8, 46, 'rgba(24,32,40,1)')
      }
      const mid = (scroll * 0.5) % 56
      for (let x = -mid; x < W; x += 56) api.rect(x, 0, 12, 18, 'rgba(24,32,40,1)')

      if (speed > 190) {
        for (let i = 0; i < 6; i += 1) {
          const y = 60 + i * 46
          api.rect(W - 20 - ((scroll * 1.8 + i * 62) % 150), y, 34, 2, 'rgba(232,238,246,0.2)')
        }
      }

      for (let i = 0; i < segs.length; i += 1) {
        const s = segs[i]
        if (s.gap) continue
        api.rect(s.x + shx, s.y + shy, SEG, H - s.y + 40, C.panel)
        api.rect(s.x + shx, s.y + shy, SEG, 4, C.dim)
        if (s.rock > 0) {
          api.rect(s.x + 6 + shx, s.y - s.rock + shy, SEG - 12, s.rock, C.warn)
          api.rect(s.x + 10 + shx, s.y - s.rock - 4 + shy, SEG - 20, 4, C.warn)
        }
      }

      for (let i = 0; i < fx.length; i += 1) {
        const q = fx[i]
        const sz = Math.max(1, Math.min(4, q.life * 8))
        api.rect(q.x, q.y, sz, sz, q.color)
      }

      const lift = bump > 0 ? 2 : 0
      api.rect(car.x + shx, car.y - lift + shy, CARW, CARH, dead ? C.dim : C.accent2)
      api.rect(car.x + 6 + shx, car.y - lift - 5 + shy, 16, 5, C.accent)
      api.circle(car.x + 9 + shx, car.y + CARH - 3 + shy, 4, C.fg)
      api.circle(car.x + CARW - 9 + shx, car.y + CARH - 3 + shy, 4, C.fg)
      api.rect(car.x - 6 + shx, car.y + 4 + shy, 6, 3, C.good)

      api.text('SPACE', 12, 18, { size: 12, color: C.dim })
      if (combo > 1) api.text('COMBO x' + combo, 12, 36, { size: 13, color: C.accent2 })
      if (msgT > 0) api.text(msg, W / 2, 58, { size: 20, color: C.accent2, align: 'center', weight: 'bold' })
      if (flash > 0) api.rect(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.18).toFixed(3) + ')')

      if (dead) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.6)')
        api.text('SMASH', W / 2, 158, { size: 26, color: C.warn, align: 'center', weight: 'bold' })
        api.text('space to retry', W / 2, 188, { size: 13, color: C.dim, align: 'center' })
      }
    }

    return { update, draw }
  },
})
