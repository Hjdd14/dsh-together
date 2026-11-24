defineGame({
  id: 'tempest',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const LANES = 9
    const TOP_Y = 58
    const BOT_Y = H - 16
    const player = { lane: 4, y: TOP_Y }
    const shots = []
    const foes = []
    const parts = []
    let wave = 1
    let cleared = 0
    let lives = 4
    let cool = 0
    let invuln = 0
    let combo = 0
    let comboT = 0
    let shake = 0
    let flash = 0
    let rim = 0
    let breather = 0
    let nextWave = 2
    let over = false
    let waveT = 0

    function laneX(lane, y) {
      const k = Math.max(0, Math.min(1, (y - TOP_Y) / (BOT_Y - TOP_Y)))
      const top = W / 2 + (lane - (LANES - 1) / 2) * 20
      const bot = W / 2 + (lane - (LANES - 1) / 2) * 52
      return top + (bot - top) * k
    }

    function startWave(n) {
      foes.length = 0
      waveT = 0
      const count = n === 1 ? 5 : 5 + n
      for (let i = 0; i < count; i += 1) {
        foes.push({
          lane: api.irnd(0, LANES - 1),
          y: BOT_Y - 12 - i * 26,
          vy: api.rnd(25, 34) + n * 4,
          zig: api.rnd(0.4, 1),
          ph: api.rnd(0, 6.28),
        })
      }
    }
    startWave(1)

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 46) parts.shift()
        parts.push({ x, y, vx: api.rnd(-110, 110), vy: api.rnd(-110, 110), life: api.rnd(0.22, 0.5), col })
      }
    }

    function tickFx(dt) {
      shake = Math.max(0, shake - dt * 2.6)
      flash = Math.max(0, flash - dt * 5)
      rim = Math.max(0, rim - dt * 2)
      if (comboT > 0) {
        comboT -= dt
        if (comboT <= 0) combo = 0
      }
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - 2.2 * dt
        p.vy *= 1 - 2.2 * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
    }

    function fire() {
      if (over || cool > 0) return
      cool = combo >= 3 ? 0.1 : 0.16
      if (shots.length >= 6) shots.shift()
      shots.push({ lane: player.lane, y: player.y + 8 })
    }

    const offKey = api.onKey((key, isDown) => {
      if (key === 'space' && isDown) fire()
    })

    function update(dt) {
      tickFx(dt)
      if (over) return
      cool = Math.max(0, cool - dt)
      invuln = Math.max(0, invuln - dt)
      if (api.down('space')) fire()
      if (api.down('left')) player.lane = Math.max(0, player.lane - 6 * dt)
      if (api.down('right')) player.lane = Math.min(LANES - 1, player.lane + 6 * dt)

      if (breather > 0) {
        breather -= dt
        if (breather <= 0) {
          wave = nextWave
          startWave(wave)
        }
      } else {
        waveT += dt
      }

      for (let i = shots.length - 1; i >= 0; i -= 1) {
        shots[i].y += 420 * dt
        if (shots[i].y > BOT_Y + 10) shots.splice(i, 1)
      }

      for (let i = foes.length - 1; i >= 0; i -= 1) {
        const f = foes[i]
        f.y -= f.vy * dt
        f.lane += Math.sin(waveT * f.zig + f.ph) * dt * 0.8
        if (f.lane < 0) f.lane = 0
        if (f.lane > LANES - 1) f.lane = LANES - 1
        if (f.y <= TOP_Y + 10) {
          const fx = laneX(f.lane, f.y)
          foes.splice(i, 1)
          burst(fx, TOP_Y + 10, C.warn, 12)
          combo = 0
          shake = 1
          flash = 1
          rim = 1
          if (invuln <= 0) {
            lives -= 1
            invuln = 1.2
            api.setStatus('HIT - LIVES ' + lives)
            if (lives <= 0) {
              over = true
              api.lose('the enemies reached the rim')
              return
            }
          }
          continue
        }
        for (let j = shots.length - 1; j >= 0; j -= 1) {
          const s = shots[j]
          if (Math.abs(s.lane - f.lane) < 0.55 && Math.abs(s.y - f.y) < 13) {
            shots.splice(j, 1)
            foes.splice(i, 1)
            combo += 1
            comboT = 2.2
            shake = Math.min(1, shake + 0.35)
            flash = 1
            burst(laneX(f.lane, f.y), f.y, C.accent2, 9)
            break
          }
        }
      }

      if (foes.length === 0 && breather <= 0) {
        cleared += 1
        api.progress(1)
        api.setStatus('WAVE ' + cleared + ' CLEAR')
        nextWave = wave + 1
        breather = 1.2
        shake = 1
        flash = 1
        burst(W / 2, TOP_Y + 4, C.good, 16)
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.07) * 3 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.09) * 3 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      const glow = 0.24 + Math.sin(waveT * 3) * 0.08
      for (let y = TOP_Y; y <= BOT_Y; y += 34) {
        const k = (y - TOP_Y) / (BOT_Y - TOP_Y)
        const half = 80 + (208 - 80) * k
        Rr(W / 2 - half, y, 1, 2, 'rgba(106,169,255,' + glow.toFixed(2) + ')')
        Rr(W / 2 + half, y, 1, 2, 'rgba(106,169,255,' + glow.toFixed(2) + ')')
      }
      for (let i = 0; i < LANES; i += 1) {
        for (let y = TOP_Y + 10; y < BOT_Y; y += 40) {
          Rr(laneX(i, y) - 1, y, 2, 2, 'rgba(143,160,180,0.2)')
        }
      }
      Rr(0, TOP_Y - 8, W, 2, rim > 0 ? C.warn : 'rgba(139,220,122,0.3)')
      for (const f of foes) {
        const fx = laneX(f.lane, f.y)
        Rr(fx - 2, f.y - 16, 4, 12, 'rgba(255,122,122,0.18)')
        Ci(fx, f.y, 11, 'rgba(255,122,122,0.14)')
        Rr(fx - 7, f.y - 5, 14, 10, C.warn)
        Rr(fx - 3, f.y - 9, 6, 5, C.accent2)
      }
      for (const s of shots) {
        const sx = laneX(s.lane, s.y)
        Rr(sx - 1.5, s.y - 6, 3, 11, C.good)
        Rr(sx - 3, s.y - 2, 6, 2, 'rgba(139,220,122,0.25)')
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      const px = laneX(player.lane, player.y)
      if (invuln <= 0 || Math.floor(waveT * 12) % 2 === 0) {
        Ci(px, player.y + 2, 16, 'rgba(106,169,255,0.16)')
        Rr(px - 12, player.y - 4, 24, 8, C.accent)
        Rr(px - 4, player.y - 10, 8, 6, C.accent2)
      }
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.1).toFixed(3) + ')')
      api.text('WAVE ' + wave, 12, 20, { size: 13, color: C.dim })
      api.text('CLEAR ' + cleared + '/2', W / 2, 20, { size: 13, color: C.dim, align: 'center' })
      api.text('LIVES ' + lives, W - 12, 20, { size: 13, color: lives > 1 ? C.dim : C.warn, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, W / 2, 38, { size: 13, color: C.accent2, align: 'center', weight: 'bold' })
      if (breather > 0) api.text('WAVE CLEAR', W / 2, 160, { size: 20, color: C.good, align: 'center', weight: 'bold' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.5)')
        api.text('TUNNEL LOST', W / 2, 170, { size: 22, color: C.warn, align: 'center', weight: 'bold' })
      }
    }

    return {
      update,
      draw,
      dispose() {
        offKey()
      },
    }
  },
})
