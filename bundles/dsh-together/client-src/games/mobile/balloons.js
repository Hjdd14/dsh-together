defineGame({
  id: 'balloons',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const balloons = []
    const parts = []
    const pops = []
    let popped = 0
    let missed = 0
    let combo = 0
    let comboT = 0
    let spawnT = 0.35
    let best = 0
    let shake = 0
    let flash = 0
    let over = false
    let t = 0

    function spawn() {
      const gold = api.rng() < 0.16
      balloons.push({
        x: api.rnd(46, W - 46),
        y: H + 26,
        r: gold ? api.rnd(13, 16) : api.rnd(16, 23),
        vy: api.rnd(30, 52) + Math.min(22, popped * 1.1),
        amp: api.rnd(12, 30),
        ph: api.rnd(0, 6.28),
        gold,
        pop: 0,
      })
    }
    spawn()

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 44) parts.shift()
        parts.push({ x, y, vx: api.rnd(-130, 130), vy: api.rnd(-130, 130), life: api.rnd(0.2, 0.5), col })
      }
    }

    const offPointer = api.onPointer((p) => {
      if (over || p.type !== 'down') return
      let hit = null
      for (const b of balloons) {
        if (b.pop > 0) continue
        const dx = b.x - p.x
        const dy = b.y - p.y
        if (dx * dx + dy * dy < (b.r + 12) * (b.r + 12)) {
          hit = b
          break
        }
      }
      if (!hit) return
      hit.pop = 0.001
      popped += 1
      combo += 1
      comboT = 2.4
      best = Math.max(best, combo)
      shake = Math.min(1, shake + 0.4)
      flash = 1
      burst(hit.x, hit.y, hit.gold ? C.accent2 : C.accent, hit.gold ? 16 : 11)
      pops.push({ x: hit.x, y: hit.y, t: 0, txt: combo > 1 ? 'x' + combo : '+1' })
      if (pops.length > 6) pops.shift()
      api.progress(1)
      api.setStatus('POP ' + popped + '/12')
    })

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.6)
      flash = Math.max(0, flash - dt * 5)
      if (comboT > 0) {
        comboT -= dt
        if (comboT <= 0) combo = 0
      }
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - 1.6 * dt
        p.vy *= 1 - 1.6 * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
      for (let i = pops.length - 1; i >= 0; i -= 1) {
        pops[i].t += dt
        if (pops[i].t > 0.9) pops.splice(i, 1)
      }
      if (over) return
      t += dt
      spawnT -= dt
      if (spawnT <= 0) {
        spawnT = Math.max(0.55, 1.05 - popped * 0.03)
        if (balloons.length < 8) spawn()
      }

      for (let i = balloons.length - 1; i >= 0; i -= 1) {
        const b = balloons[i]
        if (b.pop > 0) {
          b.pop += dt * 7
          if (b.pop > 1) balloons.splice(i, 1)
          continue
        }
        b.y -= b.vy * dt
        b.x += Math.sin(t * 1.4 + b.ph) * b.amp * dt
        if (b.x < 20) b.x = 20
        if (b.x > W - 20) b.x = W - 20
        if (b.y < 8) {
          balloons.splice(i, 1)
          missed += 1
          combo = 0
          shake = 1
          api.setStatus('MISSED ' + missed + '/3')
          if (missed >= 3) {
            over = true
            api.lose('three balloons floated away')
            return
          }
        }
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.07) * 3 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.09) * 3 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < 9; i += 1) {
        const y = 32 + ((i * 40 + t * 9) % (H - 32))
        Rr(0, y, W, 1, 'rgba(143,160,180,0.06)')
      }
      Rr(0, H - 16, W, 2, 'rgba(143,160,180,0.2)')
      for (const b of balloons) {
        const k = b.pop > 0 ? 1 + b.pop * 0.6 : 1
        const alpha = b.pop > 0 ? Math.max(0, 1 - b.pop) : 1
        const col = b.gold ? C.accent2 : C.dim
        if (b.pop > 0) {
          Ci(b.x, b.y, b.r * k, 'rgba(255,207,92,' + (alpha * 0.5).toFixed(2) + ')')
          continue
        }
        Ci(b.x, b.y + b.r + 6, 1, 'rgba(232,238,246,0.3)')
        Rr(b.x - 1, b.y + b.r * 0.4, 1, b.r * 1.4, 'rgba(232,238,246,0.22)')
        Ci(b.x, b.y, b.r + 4, b.gold ? 'rgba(255,207,92,0.12)' : 'rgba(143,160,180,0.1)')
        Ci(b.x, b.y, b.r, col)
        Ci(b.x - b.r * 0.32, b.y - b.r * 0.32, b.r * 0.28, 'rgba(232,238,246,0.4)')
        Rr(b.x - 3, b.y + b.r - 2, 6, 4, col)
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      for (const p of pops) {
        const a = Math.max(0, 1 - p.t * 1.1)
        api.text(p.txt, p.x, p.y - p.t * 26, { size: 13, color: 'rgba(255,207,92,' + a.toFixed(2) + ')', align: 'center', weight: 'bold' })
      }
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.07).toFixed(3) + ')')
      api.text('POP ' + popped + '/12', 10, 16, { size: 12, color: C.dim })
      api.text('MISSED ' + missed + '/3', W - 10, 16, { size: 12, color: missed > 1 ? C.warn : C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, W / 2, 16, { size: 13, color: C.accent2, align: 'center', weight: 'bold' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.55)')
        api.text('SKY EMPTY', W / 2, 168, { size: 20, color: C.warn, align: 'center', weight: 'bold' })
        api.text('BEST COMBO ' + best, W / 2, 196, { size: 12, color: C.dim, align: 'center' })
      }
    }

    return {
      update,
      draw,
      dispose() {
        offPointer()
      },
    }
  },
})
