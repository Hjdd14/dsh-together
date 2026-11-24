defineGame({
  id: 'rhythmbreak',
  create(api) {
    const W = api.w
    const H = api.h
    const COLS = 4
    const ROWS = 2
    const BW = 100
    const BH = 24
    const START_X = 30
    const START_Y = 48
    const PAD_W = 92
    const PAD_Y = H - 26
    const bricks = []
    const ball = { x: W / 2, y: PAD_Y - 20, vx: 0, vy: 0, r: 6 }
    const trail = []
    let paddleX = W / 2
    let t = 0
    let lives = 3
    let broken = 0
    let hold = 0.7
    let flash = 0
    let hurt = 0
    let shake = 0
    let combo = 0
    let bestCombo = 0
    let comboT = 0

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        bricks.push({ on: true, x: START_X + c * (BW + 7), y: START_Y + r * (BH + 12), row: r, hit: 0 })
      }
    }

    const fx = []
    const FX_MAX = 80
    function fxNew() {
      for (let i = 0; i < fx.length; i += 1) if (!fx[i].on) return fx[i]
      if (fx.length >= FX_MAX) return null
      fx.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 2, life: 0, k: 0, grow: 0, c: '255,255,255' })
      return fx[fx.length - 1]
    }
    function burst(x, y, n, c, spd, dir) {
      for (let j = 0; j < n; j += 1) {
        const p = fxNew()
        if (!p) return
        const a = dir === undefined ? api.rnd(0, Math.PI * 2) : dir + api.rnd(-0.8, 0.8)
        const v = api.rnd(spd * 0.3, spd)
        p.on = true
        p.x = x
        p.y = y
        p.vx = Math.cos(a) * v
        p.vy = Math.sin(a) * v
        p.r = api.rnd(1.6, 3.4)
        p.life = 1
        p.k = 0
        p.grow = 0
        p.c = c
      }
    }
    function halo(x, y, c, r0, growRate) {
      const p = fxNew()
      if (!p) return
      p.on = true
      p.x = x
      p.y = y
      p.vx = 0
      p.vy = 0
      p.r = r0 || 12
      p.life = 1
      p.k = 1
      p.grow = growRate || 240
      p.c = c
    }
    function fxStep(dt) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.k === 1) {
          p.r += p.grow * dt
          p.life -= dt * 2.5
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.94
          p.vy = p.vy * 0.94 + 110 * dt
          p.life -= dt * 2.2
        }
        if (p.life <= 0) p.on = false
      }
    }
    function fxDraw(ox, oy) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.k === 1) {
          const a0 = p.life * 0.55
          api.circle(p.x + ox, p.y + oy, p.r, 'rgba(' + p.c + ',' + (p.life * 0.15).toFixed(3) + ')')
          for (let k = 0; k < 6; k += 1) {
            const aa = (k / 6) * Math.PI * 2 + p.r * 0.03
            api.circle(p.x + ox + Math.cos(aa) * p.r, p.y + oy + Math.sin(aa) * p.r, 2, 'rgba(' + p.c + ',' + a0.toFixed(3) + ')')
          }
        } else {
          api.circle(p.x + ox, p.y + oy, p.r * (0.3 + p.life * 0.7), 'rgba(' + p.c + ',' + p.life.toFixed(3) + ')')
        }
      }
    }

    function launch() {
      const dir = api.rng() < 0.5 ? -1 : 1
      ball.vx = dir * 118
      ball.vy = -136
      hold = 0
    }

    function resetBall() {
      hold = 0.7
      ball.x = paddleX
      ball.y = PAD_Y - 20
      ball.vx = 0
      ball.vy = 0
      trail.length = 0
    }

    return {
      update(dt) {
        t += dt
        flash = Math.max(0, flash - dt * 4)
        hurt = Math.max(0, hurt - dt * 2)
        shake = Math.max(0, shake - dt * 5)
        comboT = Math.max(0, comboT - dt)
        if (comboT === 0) combo = 0
        if (api.down('left')) paddleX -= 330 * dt
        if (api.down('right')) paddleX += 330 * dt
        paddleX = Math.max(PAD_W / 2 + 4, Math.min(W - PAD_W / 2 - 4, paddleX))

        if (hold > 0) {
          hold -= dt
          ball.x = paddleX
          ball.y = PAD_Y - 20
          if (hold <= 0) launch()
          fxStep(dt)
          return
        }

        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        trail.push({ x: ball.x, y: ball.y })
        if (trail.length > 10) trail.shift()
        const r = ball.r
        if (ball.x < r + 4) {
          ball.x = r + 4
          ball.vx = Math.abs(ball.vx)
          burst(ball.x, ball.y, 2, '143,160,180', 70, 0)
        }
        if (ball.x > W - r - 4) {
          ball.x = W - r - 4
          ball.vx = -Math.abs(ball.vx)
          burst(ball.x, ball.y, 2, '143,160,180', 70, Math.PI)
        }
        if (ball.y < r + 26) {
          ball.y = r + 26
          ball.vy = Math.abs(ball.vy)
          burst(ball.x, ball.y, 2, '143,160,180', 70, Math.PI / 2)
        }

        // 挡板
        if (ball.vy > 0 && ball.y + r >= PAD_Y && ball.y - r < PAD_Y + 14 && Math.abs(ball.x - paddleX) <= PAD_W / 2 + r) {
          const off = Math.max(-1, Math.min(1, (ball.x - paddleX) / (PAD_W / 2)))
          const sp = Math.min(268, Math.hypot(ball.vx, ball.vy) * 1.03)
          ball.vx = off * sp * 0.85
          // 防止垂直死循环：永远保留横向分量
          if (Math.abs(ball.vx) < 48) ball.vx = ball.x >= paddleX ? 48 : -48
          ball.vy = -Math.sqrt(Math.max(8100, sp * sp - ball.vx * ball.vx))
          ball.y = PAD_Y - r - 1
          flash = 1
          burst(ball.x, PAD_Y, 4, '139,220,122', 120, -Math.PI / 2)
        }

        // 砖块
        for (let i = 0; i < bricks.length; i += 1) {
          const b = bricks[i]
          if (!b.on) continue
          const cx = Math.max(b.x, Math.min(ball.x, b.x + BW))
          const cy = Math.max(b.y, Math.min(ball.y, b.y + BH))
          const dx = ball.x - cx
          const dy = ball.y - cy
          if (dx * dx + dy * dy > r * r) continue
          b.on = false
          b.hit = 1
          broken += 1
          flash = 1
          combo += 1
          comboT = 2
          if (combo > bestCombo) bestCombo = combo
          const bc = b.row === 0 ? '255,207,92' : '106,169,255'
          burst(b.x + BW / 2, b.y + BH / 2, 12, bc, 180)
          halo(b.x + BW / 2, b.y + BH / 2, bc, 10, 260)
          api.progress(1)
          if (Math.abs(dx) > Math.abs(dy)) {
            ball.vx = dx >= 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx)
            ball.x += dx >= 0 ? r - dx : -(r + dx)
          } else {
            ball.vy = dy >= 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy)
            ball.y += dy >= 0 ? r - dy : -(r + dy)
          }
          break
        }

        if (ball.y > H + 24) {
          lives -= 1
          hurt = 1
          shake = 1
          combo = 0
          burst(ball.x, H - 4, 14, '255,122,122', 170)
          if (lives <= 0) {
            api.lose('ball lost')
            return
          }
          resetBall()
        }
        fxStep(dt)
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(t * 122) * shake * 6 : 0
        const oy = shake > 0 ? Math.sin(t * 135) * shake * 5 : 0
        api.clear(api.colors.bg)
        // 视觉节拍：底部条 + 背景微亮
        const beat = Math.max(0, 1 - (t % 0.6) / 0.6)
        api.rect(0, 0, W, H, 'rgba(106,169,255,' + (beat * 0.03).toFixed(3) + ')')
        for (let i = 0; i < 8; i += 1) {
          const y = 30 + i * 40
          api.rect(0 + ox, y + oy, W, 1, 'rgba(143,160,180,' + (0.07 + beat * 0.05).toFixed(3) + ')')
        }
        // 砖块（随拍轻微放大）
        for (let i = 0; i < bricks.length; i += 1) {
          const b = bricks[i]
          if (!b.on) continue
          const g2 = 1 + beat * 0.03
          const w = BW * g2
          const h = BH * g2
          const x = b.x - (w - BW) / 2
          const y = b.y - (h - BH) / 2
          api.rect(x + ox, y + oy, w, h, b.row === 0 ? api.colors.accent2 : api.colors.accent)
          api.rect(x + 5 + ox, y + 5 + oy, w - 10, h - 10, 'rgba(16,20,24,0.35)')
          api.rect(x + w / 2 - 1 + ox, y + 4 + oy, 2, h - 8, 'rgba(232,238,246,0.5)')
        }
        // 球拖尾
        for (let i = 0; i < trail.length - 1; i += 1) {
          const f = (i + 1) / trail.length
          api.circle(trail[i].x + ox, trail[i].y + oy, ball.r * f * 0.8, 'rgba(232,238,246,' + (f * 0.18).toFixed(3) + ')')
        }
        // 挡板
        api.rect(paddleX - PAD_W / 2 + ox, PAD_Y + oy, PAD_W, 12, flash > 0 ? api.colors.good : api.colors.fg)
        api.rect(paddleX - PAD_W / 2 + 8 + ox, PAD_Y + 4 + oy, PAD_W - 16, 4, 'rgba(16,20,24,0.4)')
        // 球
        api.circle(ball.x + ox, ball.y + oy, ball.r + 4 + beat * 2, 'rgba(255,207,92,' + (0.16 + beat * 0.1).toFixed(3) + ')')
        api.circle(ball.x + ox, ball.y + oy, ball.r, api.colors.fg)
        if (hold > 0) api.text('TAP', ball.x + ox, ball.y - 22 + oy, { size: 12, color: api.colors.dim, align: 'center' })
        fxDraw(ox, oy)
        // HUD
        for (let i = 0; i < 3; i += 1) {
          api.circle(14 + i * 16, 16, 5, i < lives ? api.colors.good : 'rgba(143,160,180,0.25)')
        }
        api.text(String(broken), W - 14, 16, { size: 18, color: api.colors.fg, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, W - 44, 17, { size: 12 + Math.min(7, combo), color: api.colors.accent2, align: 'right', weight: 'bold' })
        if (hurt > 0) api.rect(0, 0, W, H, 'rgba(255,122,122,' + (hurt * 0.2).toFixed(3) + ')')
        api.rect(0, H - 4, W * (1 - (t % 0.6) / 0.6), 3, 'rgba(106,169,255,0.35)')
        if (bestCombo > 2) api.text('MAX x' + bestCombo, 74, 16, { size: 11, color: api.colors.dim })
      },
    }
  },
})
