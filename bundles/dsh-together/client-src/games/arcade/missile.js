defineGame({
  id: 'missile',
  create(api) {
    const W = api.w
    const H = api.h
    const C = api.colors
    const groundY = H - 34
    const bases = [
      { x: 78, alive: true },
      { x: 240, alive: true },
      { x: 402, alive: true },
    ]
    const missiles = []
    const booms = []
    const parts = []
    const pops = []
    let spawnT = 0.3
    let got = 0
    let combo = 0
    let comboT = 0
    let shake = 0
    let flash = 0
    let over = false
    let t = 0

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 48) parts.shift()
        parts.push({ x, y, vx: api.rnd(-120, 120), vy: api.rnd(-120, 120), life: api.rnd(0.2, 0.5), col })
      }
    }

    function tickFx(dt) {
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
        p.vx *= 1 - 2.2 * dt
        p.vy *= 1 - 2.2 * dt
        if (p.life <= 0) parts.splice(i, 1)
      }
      for (let i = pops.length - 1; i >= 0; i -= 1) {
        pops[i].t += dt
        if (pops[i].t > 0.9) pops.splice(i, 1)
      }
    }

    function boom(x, y) {
      if (over) return
      if (booms.length >= 7) booms.shift()
      booms.push({ x, y, t: 0 })
      burst(x, y, C.accent2, 6)
    }

    const offPointer = api.onPointer((p) => {
      if (p.type === 'down' || (p.type === 'move' && p.dragging)) boom(p.x, p.y)
    })
    const offKey = api.onKey((key, isDown) => {
      if (key === 'space' && isDown) boom(W / 2, H / 2)
    })

    function aliveBases() {
      let n = 0
      for (const b of bases) if (b.alive) n += 1
      return n
    }

    function spawnOne() {
      const fast = api.rnd(52, 74) + got * 1.4
      const split = got >= 3 && api.rng() < 0.5 ? 0 : 1
      missiles.push({ x: api.rnd(40, W - 40), y: -12, vx: api.rnd(-26, 26), vy: fast, mirv: split })
    }

    function update(dt) {
      tickFx(dt)
      if (over) return
      t += dt
      spawnT -= dt
      if (spawnT <= 0) {
        spawnT = Math.max(0.42, 0.95 - got * 0.04)
        if (missiles.length < 14) spawnOne()
      }

      for (let i = booms.length - 1; i >= 0; i -= 1) {
        booms[i].t += dt
        if (booms[i].t > 0.6) booms.splice(i, 1)
      }

      for (let i = missiles.length - 1; i >= 0; i -= 1) {
        const m = missiles[i]
        m.x += m.vx * dt
        m.y += m.vy * dt
        if (m.x < 6) {
          m.x = 6
          m.vx = -m.vx
        }
        if (m.x > W - 6) {
          m.x = W - 6
          m.vx = -m.vx
        }
        let killed = false
        for (const b of booms) {
          const r = Math.min(40, 8 + b.t * 140)
          const dx = m.x - b.x
          const dy = m.y - b.y
          if (dx * dx + dy * dy < r * r) {
            killed = true
            break
          }
        }
        if (killed) {
          missiles.splice(i, 1)
          got += 1
          combo += 1
          comboT = 2
          shake = Math.min(1, shake + 0.4)
          flash = 1
          burst(m.x, m.y, C.warn, 9)
          pops.push({ x: m.x, y: m.y, t: 0, txt: '+1' })
          if (pops.length > 8) pops.shift()
          api.progress(1)
          api.setStatus('HIT ' + got + '/10')
          continue
        }
        if (m.mirv === 0 && m.y > H * 0.42) {
          m.mirv = 1
          if (missiles.length < 14) {
            missiles.push({ x: m.x, y: m.y, vx: -m.vx * 0.9, vy: m.vy * 0.95, mirv: 1 })
            burst(m.x, m.y, C.accent2, 4)
          }
        }
        if (m.y >= groundY) {
          missiles.splice(i, 1)
          let best = null
          let bd = 999
          for (const b of bases) {
            if (!b.alive) continue
            const d = Math.abs(b.x - m.x)
            if (d < bd) {
              bd = d
              best = b
            }
          }
          if (best && bd < 90) {
            best.alive = false
            shake = 1
            flash = 1
            combo = 0
            burst(best.x, groundY - 8, C.warn, 20)
          }
          if (aliveBases() === 0) {
            over = true
            api.lose('every base was hit')
            return
          }
        }
      }
    }

    function draw(g) {
      api.clear(C.bg)
      const ox = shake > 0 ? Math.sin(api.now() * 0.07) * 3.4 * shake : 0
      const oy = shake > 0 ? Math.cos(api.now() * 0.09) * 3.4 * shake : 0
      const R = (x, y, w, h, c) => api.rect(x + ox, y + oy, w, h, c)
      const Ci = (x, y, r, c) => api.circle(x + ox, y + oy, r, c)
      for (let i = 0; i < 6; i += 1) {
        const y = 28 + ((i * 50 + t * 16) % (H - 60))
        R(0, y, W, 1, 'rgba(106,169,255,0.07)')
      }
      for (const m of missiles) {
        R(m.x - 1, m.y - 12, 2, 12, 'rgba(255,122,122,0.3)')
        Ci(m.x, m.y, 5, 'rgba(255,122,122,0.18)')
        Ci(m.x, m.y, 3, C.warn)
      }
      for (const b of booms) {
        const r = Math.min(40, 8 + b.t * 140)
        const a = Math.max(0, 0.75 - b.t * 1.2)
        Ci(b.x, b.y, r, 'rgba(255,207,92,' + a.toFixed(2) + ')')
        Ci(b.x, b.y, r * 0.45, 'rgba(232,238,246,' + (a * 0.8).toFixed(2) + ')')
      }
      for (const p of parts) R(p.x - 1.5, p.y - 1.5, 3, 3, p.col)
      R(0, groundY, W, H - groundY, 'rgba(139,220,122,0.16)')
      for (const b of bases) {
        if (b.alive) {
          Ci(b.x, groundY - 12, 18, 'rgba(139,220,122,0.12)')
          R(b.x - 16, groundY - 10, 32, 10, C.good)
          R(b.x - 5, groundY - 20, 10, 10, C.good)
        } else {
          R(b.x - 16, groundY - 4, 32, 4, 'rgba(255,122,122,0.5)')
        }
      }
      for (const p of pops) {
        const a = Math.max(0, 1 - p.t * 1.1)
        api.text(p.txt, p.x, p.y - p.t * 22, { size: 12, color: 'rgba(255,207,92,' + a.toFixed(2) + ')', align: 'center' })
      }
      if (flash > 0) R(0, 0, W, H, 'rgba(255,255,255,' + (flash * 0.1).toFixed(3) + ')')
      api.text('HIT ' + got + '/10', 12, 20, { size: 13, color: C.dim })
      api.text('CLICK to intercept', W - 12, 20, { size: 12, color: C.dim, align: 'right' })
      if (combo > 1) api.text('COMBO x' + combo, W / 2, 20, { size: 14, color: C.accent2, align: 'center', weight: 'bold' })
      if (over) {
        api.rect(0, 0, W, H, 'rgba(16,20,24,0.5)')
        api.text('ALL BASES LOST', W / 2, 160, { size: 20, color: C.warn, align: 'center', weight: 'bold' })
      }
    }

    return {
      update,
      draw,
      dispose() {
        offPointer()
        offKey()
      },
    }
  },
})
