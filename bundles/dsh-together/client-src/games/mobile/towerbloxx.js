defineGame({
  id: 'towerbloxx',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const PIVOT_X = W / 2
    const PIVOT_Y = 26
    const ARM = 186
    const HOOK_Y = 76
    const LH = 34
    const BASE_Y = H - 40
    const floors = []
    const parts = []
    let angle = 0
    let dir = 1
    let swing = 1.15
    let falling = null
    let settle = 0
    let cool = 0
    let combo = 0
    let comboT = 0
    let best = 0
    let shake = 0
    let flash = 0
    let over = false
    let t = 0

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 40) parts.shift()
        parts.push({ x, y, vx: api.rnd(-110, 110), vy: api.rnd(-90, 10), life: api.rnd(0.25, 0.6), col })
      }
    }

    function topCx() {
      return floors.length === 0 ? PIVOT_X : floors[floors.length - 1].cx
    }

    function drop() {
      if (over || falling || cool > 0) return
      falling = { x: PIVOT_X + Math.sin(angle) * ARM, y: HOOK_Y, vy: 0 }
    }

    const offKey = api.onKey((key, isDown) => {
      if ((key === 'space' || key === 'enter') && isDown) drop()
    })

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.4)
      flash = Math.max(0, flash - dt * 4.5)
      if (comboT > 0) {
        comboT -= dt
        if (comboT <= 0) combo = 0
      }
      settle = Math.max(0, settle - dt * 2)
      cool = Math.max(0, cool - dt)
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 300 * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
      if (over) return
      t += dt
      if (!falling) {
        angle += dir * swing * dt
        if (angle > 0.62) {
          angle = 0.62
          dir = -1
        }
        if (angle < -0.62) {
          angle = -0.62
          dir = 1
        }
      } else {
        falling.vy += 1500 * dt
        falling.y += falling.vy * dt
        const landY = BASE_Y - floors.length * LH - LH
        if (falling.y >= landY) {
          const cx = falling.x
          const off = cx - topCx()
          falling = null
          if (Math.abs(off) > 46 || Math.abs(cx - PIVOT_X) > 150) {
            over = true
            shake = 1
            flash = 1
            burst(cx, landY + LH, C.warn, 26)
            api.lose('the tower toppled')
            return
          }
          floors.push({ cx, y: landY, settle: 0.2 })
          cool = 0.32
          settle = 1
          const perfect = Math.abs(off) < 8
          if (perfect) {
            combo += 1
            comboT = 3
            best = Math.max(best, combo)
          } else {
            combo = 0
          }
          shake = Math.min(1, shake + (perfect ? 0.28 : 0.5))
          flash = perfect ? 1 : 0.55
          burst(cx, landY + LH, perfect ? C.accent2 : C.dim, perfect ? 14 : 9)
          api.progress(1)
          api.setStatus('FLOOR ' + floors.length + '/6')
          swing = Math.min(2.2, 1.15 + floors.length * 0.14)
        }
      }
      if (falling === null && api.down('space') && t > 0.3 && floors.length === 0) drop()
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.075) * 3.4 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.1) * 3.4 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      for (let i = 0; i < 9; i += 1) {
        const y = 30 + ((i * 38 + t * 7) % (H - 30))
        Rr(0, y, W, 1, 'rgba(143,160,180,0.05)')
      }
      Rr(0, BASE_Y, W, H - BASE_Y, 'rgba(143,160,180,0.18)')
      Rr(0, BASE_Y, W, 2, 'rgba(143,160,180,0.35)')
      Rr(PIVOT_X - 60, BASE_Y - 4, 120, 4, 'rgba(143,160,180,0.3)')

      Rr(PIVOT_X - 5, PIVOT_Y - 10, 10, 12, 'rgba(143,160,180,0.55)')
      const tipX = PIVOT_X + Math.sin(angle) * ARM
      const tipY = HOOK_Y - 14
      Rr(Math.min(PIVOT_X, tipX), PIVOT_Y - 2, Math.abs(tipX - PIVOT_X) + 2, 3, 'rgba(143,160,180,0.45)')
      const blockX = falling ? falling.x : tipX
      const blockY = falling ? falling.y : tipY
      Rr(blockX - 2, PIVOT_Y, 2, Math.max(4, blockY - PIVOT_Y - 4), 'rgba(143,160,180,0.3)')

      for (let i = Math.max(0, floors.length - 12); i < floors.length; i += 1) {
        const f = floors[i]
        const lift = f.settle > 0 ? f.settle * 40 : 0
        if (f.y < -LH) continue
        Rr(f.cx - 46, f.y - lift, 92, LH, 'rgba(143,160,180,0.34)')
        Rr(f.cx - 46, f.y - lift, 92, 2, 'rgba(232,238,246,0.2)')
        Rr(f.cx - 46, f.y - lift + LH - 2, 92, 2, 'rgba(16,20,24,0.28)')
        for (let k = -1; k <= 1; k += 1) Rr(f.cx + k * 22 - 3, f.y - lift + 8, 6, 8, 'rgba(16,20,24,0.18)')
      }

      if (!over) {
        Rr(blockX - 46, blockY, 92, LH, falling ? C.accent2 : 'rgba(106,169,255,0.9)')
        Rr(blockX - 46, blockY, 92, 2, 'rgba(232,238,246,0.28)')
        if (!falling) Rr(blockX - 2, blockY - 6, 4, 6, 'rgba(143,160,180,0.5)')
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.09).toFixed(3) + ')')
      api.text('FLOOR ' + floors.length + '/6', 10, 16, { size: 12, color: C.dim })
      api.text('SWAY ' + Math.round(topCx() - PIVOT_X), W - 10, 16, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('PERFECT x' + combo, W / 2, 16, { size: 13, color: C.accent2, align: 'center', weight: 'bold' })
      api.text('SPACE RELEASE', W / 2, H - 10, { size: 10, color: 'rgba(143,160,180,0.55)', align: 'center' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.55)')
        api.text('TOWER DOWN', W / 2, 120, { size: 20, color: C.warn, align: 'center', weight: 'bold' })
        api.text('BEST PERFECT x' + best, W / 2, 148, { size: 12, color: C.dim, align: 'center' })
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
