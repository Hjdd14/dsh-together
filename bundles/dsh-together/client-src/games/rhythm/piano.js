defineGame({
  id: 'piano',
  create(api) {
    const LANES = 4
    const LW = api.w / LANES
    const TILE_H = 54
    const LINE_Y = api.h - 74
    const MAX_TILES = 28
    const tiles = []
    const clicks = []
    let t = 0
    let spawn = 0.25
    let hits = 0
    let combo = 0
    let bestCombo = 0
    let flash = 0
    let missFlash = 0
    let shake = 0
    let dropped = 0
    let grade = ''
    let gradeT = 0
    let gradeC = '143,160,180'
    let gradeY = LINE_Y

    const fx = []
    const FX_MAX = 60
    function fxNew() {
      for (let i = 0; i < fx.length; i += 1) if (!fx[i].on) return fx[i]
      if (fx.length >= FX_MAX) return null
      fx.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 2, life: 0, ring: 0, c: '255,255,255' })
      return fx[fx.length - 1]
    }
    function burst(x, y, n, c, spd) {
      for (let k = 0; k < n; k += 1) {
        const p = fxNew()
        if (!p) return
        const a = api.rnd(-Math.PI, 0)
        const v = api.rnd(spd * 0.35, spd)
        p.on = true
        p.x = x
        p.y = y
        p.vx = Math.cos(a) * v
        p.vy = Math.sin(a) * v
        p.r = api.rnd(1.6, 3.2)
        p.life = 1
        p.ring = 0
        p.c = c
      }
    }
    function halo(x, y, c, r0) {
      const p = fxNew()
      if (!p) return
      p.on = true
      p.x = x
      p.y = y
      p.vx = 0
      p.vy = 0
      p.r = r0 || 10
      p.life = 1
      p.ring = 1
      p.c = c
    }
    function fxStep(dt) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.ring) {
          p.r += 230 * dt
          p.life -= dt * 2.6
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy = p.vy * 0.94 + 120 * dt
          p.life -= dt * 2.2
        }
        if (p.life <= 0) p.on = false
      }
    }
    function fxDraw(ox, oy) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.ring) {
          const a0 = p.life * 0.55
          api.circle(p.x + ox, p.y + oy, p.r, 'rgba(' + p.c + ',' + (p.life * 0.15).toFixed(3) + ')')
          for (let k = 0; k < 6; k += 1) {
            const aa = (k / 6) * Math.PI * 2 + p.r * 0.03
            api.circle(p.x + ox + Math.cos(aa) * p.r, p.y + oy + Math.sin(aa) * p.r, 2, 'rgba(' + p.c + ',' + a0.toFixed(3) + ')')
          }
        }
        else api.circle(p.x + ox, p.y + oy, p.r * (0.3 + p.life * 0.7), 'rgba(' + p.c + ',' + p.life.toFixed(3) + ')')
      }
    }

    const offPtr = api.onPointer((ev) => {
      if (ev.type !== 'down') return
      if (clicks.length < 6) clicks.push(ev.x)
    })

    function judgeAll() {
      while (clicks.length) {
        const x = clicks.shift()
        const lane = Math.max(0, Math.min(LANES - 1, Math.floor(x / LW)))
        let best = -1
        for (let i = 0; i < tiles.length; i += 1) {
          const tile = tiles[i]
          if (tile.lane !== lane || !tile.on) continue
          if (tile.y < 18 || tile.y > api.h - 8) continue
          if (best < 0 || tile.y > tiles[best].y) best = i
        }
        if (best < 0) {
          missFlash = 1
          shake = Math.max(shake, 0.5)
          grade = 'MISS'
          gradeT = 1
          gradeC = '255,122,122'
          gradeY = LINE_Y
          continue
        }
        const tile = tiles[best]
        tile.on = false
        const off = Math.abs(tile.y + TILE_H / 2 - LINE_Y)
        const perfect = off < 34
        hits += 1
        combo += 1
        if (combo > bestCombo) bestCombo = combo
        flash = 1
        grade = perfect ? 'PERFECT' : 'GOOD'
        gradeT = 1
        gradeC = perfect ? '139,220,122' : '255,207,92'
        gradeY = tile.y + TILE_H / 2
        const cx = tile.lane * LW + LW / 2
        halo(cx, tile.y + TILE_H / 2, perfect ? '139,220,122' : '255,207,92', 12)
        burst(cx, tile.y + TILE_H / 2, perfect ? 12 : 7, gradeC, 150)
        api.progress(1)
      }
    }

    return {
      update(dt) {
        t += dt
        const speed = Math.min(176, 96 + t * 1.9)
        spawn -= dt
        if (spawn <= 0) {
          let tile = null
          for (let i = 0; i < tiles.length; i += 1) {
            if (!tiles[i].on) {
              tile = tiles[i]
              break
            }
          }
          if (!tile && tiles.length < MAX_TILES) {
            tile = { on: false, lane: 0, y: 0, age: 0, born: 0 }
            tiles.push(tile)
          }
          if (tile) {
            tile.on = true
            tile.lane = api.irnd(0, LANES - 1)
            tile.y = -TILE_H
            tile.age = 0
            tile.born = t
          }
          spawn = Math.max(0.24, 0.5 - t * 0.008)
        }
        for (let i = 0; i < tiles.length; i += 1) {
          const tile = tiles[i]
          if (!tile.on) continue
          tile.y += speed * dt
          tile.age += dt
          if (tile.y > api.h + TILE_H) {
            tile.on = false
            dropped += 1
            missFlash = 1
            shake = Math.max(shake, 0.6)
          }
        }
        judgeAll()
        flash = Math.max(0, flash - dt * 5)
        missFlash = Math.max(0, missFlash - dt * 3.6)
        shake = Math.max(0, shake - dt * 5)
        gradeT = Math.max(0, gradeT - dt * 1.7)
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(t * 120) * shake * 5 : 0
        const oy = shake > 0 ? Math.sin(t * 143) * shake * 4 : 0
        api.clear(api.colors.bg)
        // 背景节拍脉动
        const beat = t % 0.5
        const bgp = Math.max(0, 1 - beat / 0.5)
        api.rect(0, 0, api.w, api.h, 'rgba(106,169,255,' + (bgp * 0.05).toFixed(3) + ')')
        for (let i = 0; i < LANES; i += 1) {
          api.rect(i * LW + 3 + ox, oy, LW - 6, api.h, i % 2 === 0 ? 'rgba(24,32,40,0.85)' : 'rgba(20,27,34,0.85)')
        }
        // 判定线
        api.rect(0, LINE_Y + oy, api.w, 2, 'rgba(255,207,92,0.35)')
        api.rect(0, LINE_Y + 2 + oy, api.w, 26, 'rgba(255,207,92,' + (0.04 + bgp * 0.05).toFixed(3) + ')')
        // 块（渐入缩放）
        for (let i = 0; i < tiles.length; i += 1) {
          const tile = tiles[i]
          if (!tile.on) continue
          const grow = Math.min(1, tile.age / 0.16)
          const h = (TILE_H - 6) * grow
          const x = tile.lane * LW + 8
          const y = tile.y + (TILE_H - h) / 2
          const near = tile.y + TILE_H > LINE_Y
          api.rect(x + ox, y + oy, (LW - 16) * (0.55 + grow * 0.45), h, near ? api.colors.accent2 : api.colors.accent)
          api.rect(x + 6 + ox, y + 6 + oy, (LW - 28) * (0.55 + grow * 0.45), Math.max(0, h - 14), 'rgba(16,20,24,0.38)')
        }
        for (let i = 1; i < LANES; i += 1) api.rect(i * LW - 1 + ox, 0, 2, api.h, 'rgba(143,160,180,0.22)')
        fxDraw(ox, oy)
        // 反馈
        if (flash > 0) api.rect(0, api.h - 18 + oy, api.w, 18, 'rgba(139,220,122,' + (flash * 0.45).toFixed(3) + ')')
        if (missFlash > 0) api.rect(0, 0, api.w, 10, 'rgba(255,122,122,' + (missFlash * 0.65).toFixed(3) + ')')
        if (gradeT > 0) {
          api.text(grade, api.w / 2 + ox, gradeY - 26 + oy, {
            size: 12 + gradeT * 5,
            color: 'rgba(' + gradeC + ',' + Math.min(1, gradeT).toFixed(3) + ')',
            align: 'center',
            weight: 'bold',
          })
        }
        // HUD
        api.text(String(hits), 18 + ox, 26 + oy, { size: 30, color: api.colors.fg, weight: 'bold' })
        if (combo > 1) api.text('x' + combo, 18 + ox, 50 + oy, { size: 13 + Math.min(8, combo), color: api.colors.good, weight: 'bold' })
        if (dropped > 0) api.text('-' + dropped, api.w - 18, 26, { size: 17, color: api.colors.dim, align: 'right' })
        if (bestCombo > 2) api.text('MAX x' + bestCombo, api.w - 18, 46, { size: 11, color: api.colors.dim, align: 'right' })
      },
      dispose() {
        offPtr()
      },
    }
  },
})
