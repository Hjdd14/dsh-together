defineGame({
  id: 'stacker',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const LH = 24
    const BASE_Y = H - 34
    const MARGIN = 22
    const layers = [{ x: (W - 210) / 2, w: 210, settle: 0 }]
    const parts = []
    let bx = MARGIN
    let dir = 1
    let speed = 140
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
        parts.push({ x, y, vx: api.rnd(-120, 120), vy: api.rnd(-70, 40), life: api.rnd(0.22, 0.55), col })
      }
    }

    function drop() {
      if (over) return
      const top = layers[layers.length - 1]
      const l = Math.max(bx, top.x)
      const r = Math.min(bx + top.w, top.x + top.w)
      const w = r - l
      if (w < 8) {
        over = true
        shake = 1
        flash = 1
        burst(bx + top.w / 2, BASE_Y - layers.length * LH, C.warn, 24)
        api.lose('the stack collapsed')
        return
      }
      const perfect = Math.abs(w - top.w) < 4
      const cy = BASE_Y - (layers.length + 1) * LH
      layers.push({ x: l, w, settle: 0.16 })
      shake = Math.min(1, shake + (perfect ? 0.3 : 0.55))
      flash = perfect ? 1 : 0.6
      burst(l, cy + LH, perfect ? C.accent2 : C.dim, perfect ? 14 : 8)
      api.progress(1)
      api.setStatus('LAYER ' + (layers.length - 1) + '/8')
      if (perfect) {
        combo += 1
        comboT = 3
        best = Math.max(best, combo)
      } else {
        combo = 0
      }
      bx = MARGIN
      dir = layers.length % 2 === 0 ? 1 : -1
      speed = Math.min(330, 140 + layers.length * 22)
    }

    const offKey = api.onKey((key, isDown) => {
      if ((key === 'space' || key === 'enter') && isDown) drop()
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
        p.vy += 260 * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
      for (const l of layers) if (l.settle > 0) l.settle = Math.max(0, l.settle - dt)
      if (over) return
      t += dt
      const top = layers[layers.length - 1]
      const maxX = W - MARGIN - top.w
      bx += dir * speed * dt
      if (bx > maxX) {
        bx = maxX
        dir = -1
      }
      if (bx < MARGIN) {
        bx = MARGIN
        dir = 1
      }
      if (api.down('space') && t > 0.25 && layers.length === 1) drop()
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.08) * 3.4 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.105) * 3.4 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      for (let i = 0; i < 10; i += 1) {
        const y = 40 + ((i * 32 + t * 8) % (H - 40))
        Rr(0, y, W, 1, 'rgba(143,160,180,0.05)')
      }
      for (let i = 0; i < 5; i += 1) Rr(MARGIN + i * ((W - MARGIN * 2) / 4), BASE_Y + 4, 1, 6, 'rgba(143,160,180,0.18)')
      for (let i = Math.max(0, layers.length - 13); i < layers.length; i += 1) {
        const l = layers[i]
        const lift = l.settle > 0 ? l.settle * 60 : 0
        const y = BASE_Y - (i + 1) * LH - lift
        if (y < -LH) continue
        Rr(l.x, y, l.w, LH, i === 0 ? 'rgba(143,160,180,0.5)' : 'rgba(143,160,180,0.34)')
        Rr(l.x, y, l.w, 2, 'rgba(232,238,246,0.22)')
        Rr(l.x, y + LH - 2, l.w, 2, 'rgba(16,20,24,0.25)')
        if (l.w > 60) Rr(l.x + l.w / 2 - 1, y + 6, 2, LH - 12, 'rgba(16,20,24,0.12)')
      }
      const top = layers[layers.length - 1]
      const my = BASE_Y - (layers.length + 1) * LH
      if (!over) {
        const hot = Math.abs(bx - top.x) < 5 || Math.abs(bx + top.w - (top.x + top.w)) < 5
        Rr(bx, my, top.w, LH, hot ? C.accent2 : 'rgba(106,169,255,0.85)')
        Rr(bx, my, top.w, 2, 'rgba(232,238,246,0.3)')
        Rr(bx, my + LH - 2, top.w, 2, 'rgba(16,20,24,0.3)')
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.09).toFixed(3) + ')')
      api.text('LAYER ' + (layers.length - 1) + '/8', 10, 20, { size: 12, color: C.dim })
      api.text('WIDTH ' + Math.round(top.w), W - 10, 20, { size: 12, color: top.w < 60 ? C.warn : C.dim, align: 'right' })
      if (combo > 1) api.text('PERFECT x' + combo, W / 2, 20, { size: 13, color: C.accent2, align: 'center', weight: 'bold' })
      api.text('SPACE DROP', W / 2, H - 12, { size: 10, color: 'rgba(143,160,180,0.55)', align: 'center' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.55)')
        api.text('TOWER DOWN', W / 2, 150, { size: 20, color: C.warn, align: 'center', weight: 'bold' })
        api.text('BEST PERFECT x' + best, W / 2, 178, { size: 12, color: C.dim, align: 'center' })
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
