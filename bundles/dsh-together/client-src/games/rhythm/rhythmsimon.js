defineGame({
  id: 'rhythmsimon',
  create(api) {
    const W = api.w
    const PADS = [
      { x: 66, y: 78, w: 150, h: 86 },
      { x: 264, y: 78, w: 150, h: 86 },
      { x: 66, y: 182, w: 150, h: 86 },
      { x: 264, y: 182, w: 150, h: 86 },
    ]
    const clicks = []
    let seq = []
    let phase = 'play'
    let step = 0
    let timer = 0
    let delay = 0.4
    let inputPos = 0
    let round = 0
    let done = 0
    let lit = -1
    let litT = 0
    let warn = 0
    let shake = 0
    let banner = 0
    let t = 0
    let msg = ''
    let msgT = 0

    const fx = []
    const FX_MAX = 64
    function fxNew() {
      for (let i = 0; i < fx.length; i += 1) if (!fx[i].on) return fx[i]
      if (fx.length >= FX_MAX) return null
      fx.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 2, life: 0, k: 0, grow: 0, c: '255,255,255' })
      return fx[fx.length - 1]
    }
    function burst(x, y, n, c, spd) {
      for (let j = 0; j < n; j += 1) {
        const p = fxNew()
        if (!p) return
        const a = api.rnd(0, Math.PI * 2)
        const v = api.rnd(spd * 0.3, spd)
        p.on = true
        p.x = x
        p.y = y
        p.vx = Math.cos(a) * v
        p.vy = Math.sin(a) * v
        p.r = api.rnd(1.6, 3.2)
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
      p.grow = growRate || 260
      p.c = c
    }
    function fxStep(dt) {
      for (let i = 0; i < fx.length; i += 1) {
        const p = fx[i]
        if (!p.on) continue
        if (p.k === 1) {
          p.r += p.grow * dt
          p.life -= dt * 2.4
        } else {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.93
          p.vy *= 0.93
          p.life -= dt * 2.1
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

    const padCenter = (i) => ({ x: PADS[i].x + PADS[i].w / 2, y: PADS[i].y + PADS[i].h / 2 })

    function newSeq(len) {
      seq = []
      for (let i = 0; i < len; i += 1) seq.push(api.irnd(0, 3))
    }

    function startPlay() {
      phase = 'play'
      step = 0
      timer = 0
      delay = 0.5
      inputPos = 0
      lit = -1
      litT = 0
    }

    const padAt = (x, y) => {
      for (let i = 0; i < PADS.length; i += 1) {
        const p = PADS[i]
        if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i
      }
      return -1
    }

    function flashPad(i) {
      lit = i
      litT = 1
      const c = padCenter(i)
      halo(c.x, c.y, i % 2 === 0 ? '106,169,255' : '255,207,92', 10, 200)
      burst(c.x, c.y, 5, i % 2 === 0 ? '106,169,255' : '255,207,92', 110)
    }

    function tap(idx) {
      if (phase !== 'input' || idx < 0) return
      flashPad(idx)
      if (seq[inputPos] === idx) {
        inputPos += 1
        msg = 'OK'
        msgT = 1
        if (inputPos >= seq.length) {
          done += 1
          round += 1
          banner = 1
          halo(W / 2, 170, '139,220,122', 30, 320)
          burst(W / 2, 170, 16, '139,220,122', 190)
          api.progress(1)
          newSeq(Math.min(6, 2 + round))
          startPlay()
        }
      } else {
        // 错按不清空整局：重放同一条节奏让人再来一次
        warn = 1
        shake = 1
        msg = 'WRONG'
        msgT = 1
        const c = padCenter(idx)
        burst(c.x, c.y, 8, '255,122,122', 140)
        startPlay()
      }
    }

    const offPtr = api.onPointer((ev) => {
      if (ev.type !== 'down') return
      if (clicks.length < 4) clicks.push({ x: ev.x, y: ev.y })
    })
    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return
      const n = '1234'.indexOf(key)
      if (n >= 0) tap(n)
    })

    newSeq(2)

    return {
      update(dt) {
        t += dt
        litT = Math.max(0, litT - dt * 2.2)
        warn = Math.max(0, warn - dt * 2.5)
        shake = Math.max(0, shake - dt * 5)
        banner = Math.max(0, banner - dt * 1.4)
        msgT = Math.max(0, msgT - dt * 1.4)
        fxStep(dt)
        while (clicks.length) {
          const p = clicks.shift()
          tap(padAt(p.x, p.y))
        }
        if (delay > 0) {
          delay -= dt
          return
        }
        if (phase === 'play') {
          timer += dt
          if (timer >= 0.46) {
            timer = 0
            step += 1
            if (step >= seq.length) {
              phase = 'input'
              inputPos = 0
              lit = -1
            } else {
              flashPad(seq[step])
            }
          } else if (timer > 0.26) {
            lit = -1 // 每步尾部熄灯：连续两下同一个鼓点也分得清
          } else if (lit !== seq[step]) {
            flashPad(seq[step])
          }
        }
      },
      draw(g) {
        const ox = shake > 0 ? Math.cos(t * 126) * shake * 6 : 0
        const oy = shake > 0 ? Math.sin(t * 138) * shake * 5 : 0
        api.clear(api.colors.bg)
        const beat = Math.max(0, 1 - (t % 0.46) / 0.46)
        api.rect(0, 0, W, api.h, 'rgba(106,169,255,' + (beat * 0.035).toFixed(3) + ')')
        for (let i = 0; i < PADS.length; i += 1) {
          const p = PADS[i]
          const on = lit === i && litT > 0
          const grow = on ? 1 + litT * 0.06 : 1
          const w = p.w * grow
          const h = p.h * grow
          const x = p.x - (w - p.w) / 2
          const y = p.y - (h - p.h) / 2
          api.rect(x - 3 + ox, y - 3 + oy, w + 6, h + 6, on ? api.colors.fg : 'rgba(143,160,180,0.18)')
          api.rect(x + ox, y + oy, w, h, on ? (i % 2 === 0 ? api.colors.accent : api.colors.accent2) : api.colors.panel)
          api.circle(p.x + p.w / 2 + ox, p.y + p.h / 2 + oy, (on ? 20 : 13) + beat * 2, on ? 'rgba(16,20,24,0.5)' : 'rgba(143,160,180,0.28)')
          api.text(String(i + 1), p.x + p.w / 2 + ox, p.y + p.h / 2 + oy, {
            size: 15,
            color: on ? api.colors.bg : api.colors.dim,
            align: 'center',
            weight: 'bold',
          })
        }
        fxDraw(ox, oy)
        // 输入进度点（命中时放大）
        for (let i = 0; i < seq.length; i += 1) {
          const hit = i < inputPos
          api.circle(W / 2 - (seq.length - 1) * 7 + i * 14 + ox, 300 + oy, hit ? 5.5 : 4, hit ? api.colors.good : 'rgba(143,160,180,0.3)')
        }
        // 状态
        api.text(phase === 'play' ? 'WATCH' : 'TAP', 16 + ox, 22 + oy, {
          size: 14,
          color: phase === 'play' ? api.colors.accent2 : api.colors.good,
          weight: 'bold',
        })
        api.text(String(done), W - 16 + ox, 22 + oy, { size: 20, color: api.colors.fg, align: 'right', weight: 'bold' })
        if (msgT > 0) {
          api.text(msg, W / 2 + ox, 262 + oy, {
            size: 12 + msgT * 3,
            color: msg === 'WRONG' ? 'rgba(255,122,122,' + msgT.toFixed(3) + ')' : 'rgba(139,220,122,' + msgT.toFixed(3) + ')',
            align: 'center',
            weight: 'bold',
          })
        }
        if (banner > 0) {
          api.rect(0, 150, W, 44, 'rgba(139,220,122,' + (banner * 0.2).toFixed(3) + ')')
          api.text('CLEAR', W / 2, 172, { size: 18, color: api.colors.good, align: 'center', weight: 'bold' })
        }
        if (warn > 0) api.rect(0, 0, W, 6, 'rgba(255,122,122,' + (warn * 0.7).toFixed(3) + ')')
        if (phase === 'input') api.rect(0, 330, W, 2, 'rgba(139,220,122,' + (0.2 + beat * 0.2).toFixed(3) + ')')
      },
      dispose() {
        offPtr()
        offKey()
      },
    }
  },
})
