defineGame({
  id: 'duel',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const TOP = 46
    const BOT = H - 30
    const me = { x: 46, y: H / 2, lives: 3, cool: 0 }
    const foe = { x: W - 46, y: H / 2, aim: 0, cool: 1.2 }
    const shots = []
    const parts = []
    const block = { x: W / 2 - 12, w: 24, top: 150, bot: 250 }
    let hits = 0
    let combo = 0
    let comboT = 0
    let over = false
    let shake = 0
    let flash = 0
    let t = 0

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 40) parts.shift()
        parts.push({ x, y, vx: api.rnd(-120, 120), vy: api.rnd(-120, 120), life: api.rnd(0.18, 0.45), col })
      }
    }

    function shoot() {
      if (over || me.cool > 0) return
      me.cool = 0.34
      if (shots.length >= 12) shots.shift()
      shots.push({ x: me.x + 14, y: me.y, vx: 340, owner: 0 })
    }

    const offKey = api.onKey((key, isDown) => {
      if (key === 'space' && isDown) shoot()
    })

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.8)
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
        if (p.life <= 0) parts.splice(i, 1)
      }
      if (over) return
      t += dt
      me.cool = Math.max(0, me.cool - dt)
      if (api.down('space')) shoot()

      const sp = 168 * dt
      if (api.down('up')) me.y -= sp
      if (api.down('down')) me.y += sp
      me.y = Math.max(TOP + 10, Math.min(BOT - 10, me.y))

      foe.aim += Math.sin(t * 1.1) * 46 * dt
      foe.y += (foe.aim - foe.y) * Math.min(1, dt * 1.7)
      foe.y = Math.max(TOP + 14, Math.min(BOT - 14, foe.y))
      foe.cool -= dt
      if (foe.cool <= 0) {
        foe.cool = api.rnd(1.5, 2.6)
        const miss = api.rnd(-46, 46)
        if (shots.length < 12) shots.push({ x: foe.x - 14, y: foe.y + miss * 0.35, vx: -290, owner: 1 })
      }

      for (let i = shots.length - 1; i >= 0; i -= 1) {
        const s = shots[i]
        s.x += s.vx * dt
        if (s.x < 12 || s.x > W - 12) {
          shots.splice(i, 1)
          continue
        }
        if (s.x > block.x && s.x < block.x + block.w && s.y > block.top && s.y < block.bot) {
          shots.splice(i, 1)
          burst(s.x, s.y, C.dim, 5)
          continue
        }
        if (s.owner === 0 && Math.abs(s.x - foe.x) < 14 && Math.abs(s.y - foe.y) < 16) {
          shots.splice(i, 1)
          hits += 1
          combo += 1
          comboT = 2.2
          shake = 1
          flash = 1
          burst(foe.x, foe.y, C.accent2, 14)
          api.score(1)
          api.setStatus('HITS ' + hits + '/3')
          foe.y = api.rnd(TOP + 30, BOT - 30)
          foe.aim = foe.y
          continue
        }
        if (s.owner === 1 && Math.abs(s.x - me.x) < 14 && Math.abs(s.y - me.y) < 16) {
          shots.splice(i, 1)
          me.lives -= 1
          combo = 0
          shake = 1
          flash = 1
          burst(me.x, me.y, C.warn, 16)
          me.y = H / 2
          if (me.lives <= 0) {
            over = true
            api.lose('rival outshot you')
            return
          }
        }
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.08) * 3 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.11) * 3 * shake : 0
      const Rr = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < 9; i += 1) {
        const y = TOP + ((i * 38 + t * 12) % (BOT - TOP))
        Rr(0, y, W, 1, 'rgba(143,160,180,0.06)')
      }
      Rr(0, TOP - 10, W, 2, 'rgba(143,160,180,0.18)')
      Rr(0, BOT + 8, W, 2, 'rgba(143,160,180,0.18)')
      Ci(block.x + block.w / 2, (block.top + block.bot) / 2, 30, 'rgba(143,160,180,0.08)')
      Rr(block.x, block.top, block.w, block.bot - block.top, 'rgba(143,160,180,0.4)')
      Rr(block.x, block.top, block.w, 3, 'rgba(232,238,246,0.2)')
      for (const s of shots) {
        Rr(s.x - 6, s.y - 2, 12, 4, s.owner === 0 ? C.good : C.warn)
        Rr(s.x - 12, s.y - 1, 8, 2, s.owner === 0 ? 'rgba(139,220,122,0.25)' : 'rgba(255,122,122,0.25)')
      }
      for (const p of parts) Rr(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      Ci(foe.x, foe.y, 17, 'rgba(255,122,122,0.13)')
      Rr(foe.x - 6, foe.y - 14, 12, 28, C.warn)
      Rr(foe.x - 3, foe.y - 18, 6, 6, C.warn)
      Ci(me.x, me.y, 17, 'rgba(139,220,122,0.13)')
      Rr(me.x - 6, me.y - 14, 12, 28, C.good)
      Rr(me.x - 3, me.y - 18, 6, 6, C.good)
      if (flash > 0) Rr(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.09).toFixed(3) + ')')
      api.text('HITS ' + hits + '/3', 8, 16, { size: 12, color: C.dim })
      api.text('LIVES ' + me.lives, W - 8, 16, { size: 12, color: me.lives > 1 ? C.dim : C.warn, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, W / 2, 16, { size: 13, color: C.accent2, align: 'center', weight: 'bold' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.55)')
        api.text('DUEL LOST', W / 2, 170, { size: 22, color: C.warn, align: 'center', weight: 'bold' })
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
