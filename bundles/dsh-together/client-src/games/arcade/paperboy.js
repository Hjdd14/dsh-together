defineGame({
  id: 'paperboy',
  create(api) {
    const C = api.colors
    const ROAD = 214
    const BIKE_Y = 252
    let bikeX = 150
    let houses = []
    let bars = []
    let papers = []
    let delivered = 0
    let combo = 0
    let best = 0
    let t = 0
    let binT = 2.4
    let shakeT = 0
    let flashT = 0
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let cd = 0
    let crashes = 0
    let invuln = 0
    let lost = false
    const parts = []

    function house(x) {
      const w = api.irnd(74, 104)
      return { x, w, doorW: 34, tone: api.rnd(0, 1) }
    }

    houses.push(house(120))
    houses.push(house(320))
    houses.push(house(520))

    function burst(x, y, n, color) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(40, 170)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
          life: api.rnd(0.35, 0.8), age: 0, r: api.rnd(1.4, 3), c: color || C.good,
        })
      }
      while (parts.length > 80) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.7
    }

    function crash() {
      crashes += 1
      invuln = 1.3
      flashT = 0.55
      shakeT = 0.45
      combo = 0
      burst(bikeX, BIKE_Y, 18, C.warn)
      pop('CRASH ' + crashes + '/3', C.warn)
      if (crashes >= 3) die('crashed')
    }

    function die(why) {
      if (lost) return
      lost = true
      api.lose(why)
    }

    const held = {}
    api.onKey((key, isDown) => {
      if (!isDown) {
        held[key] = false
        return
      }
      if (held[key]) return
      held[key] = true
      if (key !== 'space' || lost) return
      if (cd > 0) return
      cd = 0.22
      papers.push({ x: bikeX + 8, y: BIKE_Y - 16, vy: -330 })
    })

    return {
      update(dt) {
        t += dt
        if (lost) return
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        if (cd > 0) cd = Math.max(0, cd - dt)
        if (invuln > 0) invuln = Math.max(0, invuln - dt)
        if (api.down('left')) bikeX -= 215 * dt
        if (api.down('right')) bikeX += 215 * dt
        if (bikeX < 48) bikeX = 48
        if (bikeX > 330) bikeX = 330
        const speed = 92 + Math.min(46, delivered * 6)
        for (let i = 0; i < houses.length; i += 1) houses[i].x -= speed * dt
        while (houses.length && houses[0].x < -140) houses.shift()
        const last = houses.length ? houses[houses.length - 1] : null
        if (!last || last.x < 520) houses.push(house(last ? last.x + last.w + api.irnd(26, 62) : 520))
        binT -= dt
        if (binT <= 0) {
          binT = Math.max(2.4, 3.6 - delivered * 0.12)
          bars.push({ x: 520, y: ROAD + 30, w: api.irnd(84, 128), h: 18 })
        }
        for (let i = bars.length - 1; i >= 0; i -= 1) {
          bars[i].x -= speed * dt
          const bar = bars[i]
          if (bar.x + bar.w < -20) {
            bars.splice(i, 1)
            continue
          }
          if (invuln <= 0 && bikeX + 10 > bar.x && bikeX - 10 < bar.x + bar.w && bar.y < BIKE_Y + 26) {
            crash()
            bars.splice(i, 1)
          }
        }
        for (let i = papers.length - 1; i >= 0; i -= 1) {
          const p = papers[i]
          p.y += p.vy * dt
          if (p.y > 205) continue
          let hit = false
          for (let k = 0; k < houses.length; k += 1) {
            const h = houses[k]
            const doorX = h.x + h.w * 0.34
            if (p.x >= doorX && p.x <= doorX + h.doorW) {
              hit = true
              delivered += 1
              api.progress(1)
              combo += 1
              best = Math.max(best, combo)
              burst(p.x, 178, 12)
              pop(combo >= 4 ? 'STREAK x' + combo : 'DELIVERED', C.good)
              break
            }
          }
          if (!hit) {
            combo = 0
            pop('MISSED', C.dim)
            burst(p.x, 178, 5, C.dim)
          }
          papers.splice(i, 1)
          if (papers.length > 4) papers.shift()
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 260 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        for (let i = 0; i < 3; i += 1) {
          api.rect(0, ((t * 8 + i * 150) % 460) - 70, api.w, 110, 'rgba(255,207,92,0.03)')
        }
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('PAPERBOY', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('delivered ' + delivered, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, 230, 27, { size: 14, color: C.good, weight: 'bold' })
        api.text('crashes ' + crashes + '/3', 300, 27, { size: 13, color: crashes >= 2 ? C.warn : C.dim, weight: 'bold' })
        api.rect(0, ROAD - 52, api.w, 60, '#131a12')
        for (let i = 0; i < houses.length; i += 1) {
          const h = houses[i]
          api.rect(h.x, 128, h.w, 62, h.tone > 0.5 ? '#2a2118' : '#241f2b')
          api.rect(h.x - 4, 122, h.w + 8, 8, '#3a2f22')
          api.rect(h.x + h.w * 0.34, 158, 34, 32, h.tone > 0.5 ? C.accent2 : C.accent)
          api.rect(h.x + 12, 140, 18, 16, 'rgba(255,207,92,0.35)')
          api.rect(h.x + h.w - 30, 140, 18, 16, 'rgba(255,207,92,0.35)')
        }
        api.rect(0, ROAD, api.w, 30, '#1a1f24')
        api.rect(0, 244, api.w, 84, '#20262c')
        for (let i = 0; i < 12; i += 1) {
          const x = ((i * 46 - t * 92) % 552) - 40
          api.rect(x, BIKE_Y + 30, 26, 3, 'rgba(255,255,255,0.16)')
        }
        for (let i = 0; i < bars.length; i += 1) {
          const bar = bars[i]
          api.rect(bar.x, bar.y, bar.w, bar.h, '#4c555c')
          for (let k = 0; k < bar.w - 8; k += 16) {
            api.rect(bar.x + 4 + k, bar.y + 2, 8, bar.h - 4, C.warn)
          }
          api.circle(bar.x + 6, bar.y - 6, 5, C.accent2)
          api.circle(bar.x + bar.w - 6, bar.y - 6, 5, C.accent2)
        }
        const sx = shakeT > 0 ? Math.sin(shakeT * 70) * 6 : 0
        api.circle(bikeX - 12 + sx, BIKE_Y + 14, 9, '#39424a')
        api.circle(bikeX + 12 + sx, BIKE_Y + 14, 9, '#39424a')
        api.rect(bikeX - 14 + sx, BIKE_Y, 28, 4, C.accent)
        api.rect(bikeX + sx, BIKE_Y - 18, 4, 18, C.accent)
        api.circle(bikeX + 2 + sx, BIKE_Y - 22, 7, C.accent2)
        for (let i = 0; i < papers.length; i += 1) {
          api.rect(papers[i].x - 4, papers[i].y - 5, 8, 10, C.fg)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? p.c : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 108, { size: 13 + popT * 9, color: popColor, align: 'center', weight: 'bold' })
        }
        api.rect(0, api.h - 20, api.w, 20, C.panel)
        api.text('left/right · space throws at the door · 3 crashes ends the run', api.w / 2, api.h - 10, {
          size: 10, color: C.dim, align: 'center',
        })
      },
    }
  },
})
