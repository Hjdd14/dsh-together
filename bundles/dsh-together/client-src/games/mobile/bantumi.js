defineGame({
  id: 'bantumi',
  create(api) {
    const W = api.w
    const H = api.h
    const PIT_X = [64, 132, 200, 268, 336, 404]
    const PIT_Y_PLAYER = 262
    const PIT_Y_AI = 106
    const PIT_R = 25
    const MOVE_LIMIT = 12

    // 0-5 player pits, 6 player store, 7-12 cpu pits, 13 cpu store
    const pits = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]
    let turn = 0
    let aiTimer = 0
    let over = false
    let result = ''
    let won = false
    let playerMoves = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let dropFlash = 0
    let pick = -1
    const parts = []

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 40; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.22, 0.5), max: 0.5,
          c: color, r: api.rnd(1.2, 2.8),
        })
      }
    }

    function pitPos(i) {
      if (i <= 5) return { x: PIT_X[i], y: PIT_Y_PLAYER }
      if (i >= 7 && i <= 12) return { x: PIT_X[12 - i], y: PIT_Y_AI }
      if (i === 6) return { x: 452, y: PIT_Y_PLAYER }
      return { x: 452, y: PIT_Y_AI }
    }

    function isPlayerPit(i) { return i >= 0 && i <= 5 }
    function isCpuPit(i) { return i >= 7 && i <= 12 }

    function sideEmpty(lo, hi) {
      for (let i = lo; i < hi; i += 1) if (pits[i] > 0) return false
      return true
    }

    function totals() {
      let my = pits[6]
      let ai = pits[13]
      for (let i = 0; i < 6; i += 1) my += pits[i]
      for (let i = 7; i < 13; i += 1) ai += pits[i]
      return { my, ai }
    }

    function finish() {
      over = true
      const t = totals()
      won = t.my >= t.ai
      result = won ? 'YOU WIN' : 'YOU LOSE'
      shake = won ? 0.5 : 0.8
      if (won) {
        burst(pitPos(6).x, pitPos(6).y, api.colors.accent2, 16, 190)
        api.progress(1)
        api.setStatus('won ' + t.my + '-' + t.ai)
        api.win()
      } else {
        api.setStatus('lost ' + t.my + '-' + t.ai)
        api.lose('lost the sowing game')
      }
    }

    function sow(start) {
      let n = pits[start]
      if (n <= 0) return false
      pits[start] = 0
      const skipStore = start <= 5 ? 13 : 6
      let idx = start
      let lastEmpty = false
      let last = start
      while (n > 0) {
        idx = (idx + 1) % 14
        if (idx === skipStore) continue
        lastEmpty = pits[idx] === 0
        pits[idx] += 1
        last = idx
        n -= 1
      }
      const mine = start <= 5 ? isPlayerPit(last) : isCpuPit(last)
      if (mine && lastEmpty) {
        const opp = 12 - last
        const gain = pits[opp]
        if (gain > 0) {
          pits[last] += gain
          pits[opp] = 0
          const p = pitPos(last)
          burst(p.x, p.y, api.colors.accent2, 8, 150)
          shake = Math.max(shake, 0.2)
        }
      }
      dropFlash = 1
      const p2 = pitPos(last)
      burst(p2.x, p2.y, api.colors.good, 4, 110)
      return true
    }

    function afterMove() {
      if (sideEmpty(0, 6) || sideEmpty(7, 13) || playerMoves >= MOVE_LIMIT) {
        finish()
        return
      }
      turn = turn === 0 ? 1 : 0
      if (turn === 1) aiTimer = 0.6
    }

    function playerMove(i) {
      if (over || turn !== 0) return
      if (!isPlayerPit(i) || pits[i] <= 0) {
        shake = Math.max(shake, 0.18)
        return
      }
      pick = i
      sow(i)
      pick = -1
      playerMoves += 1
      afterMove()
    }

    function aiMove() {
      if (over || turn !== 1) return
      const options = []
      for (let i = 7; i <= 12; i += 1) if (pits[i] > 0) options.push(i)
      if (!options.length) { finish(); return }
      let choice = options[api.irnd(0, options.length - 1)]
      if (api.rng() < 0.25) {
        let worst = Infinity
        for (let k = 0; k < options.length; k += 1) {
          const i = options[k]
          if (pits[i] < worst) { worst = pits[i]; choice = i }
        }
      }
      sow(choice)
      afterMove()
    }

    api.onPointer((event) => {
      if (event.type !== 'down' || over || turn !== 0) return
      let best = -1
      let bd = 40
      for (let i = 0; i < 6; i += 1) {
        const d = Math.hypot(event.x - PIT_X[i], event.y - PIT_Y_PLAYER)
        if (d < bd) { bd = d; best = i }
      }
      if (best >= 0) playerMove(best)
    })

    api.onKey((key, isDown) => {
      if (!isDown || over || turn !== 0) return
      if (key === 'left') playerMove(0)
      else if (key === 'right') playerMove(5)
      else if (key === 'up') playerMove(1)
      else if (key === 'down') playerMove(4)
      else if (key === 'space' || key === 'enter') playerMove(2)
    })

    api.setStatus('your turn')

    function drawPit(i, mine, active) {
      const p = pitPos(i)
      const cx = p.x + shx
      const cy = p.y + shy
      api.circle(cx, cy, PIT_R, mine ? api.colors.panel : '#1a1410')
      api.circle(cx, cy, PIT_R - 4, api.colors.bg)
      if (active) {
        const glow = 0.6 + 0.4 * Math.sin(api.now() / 200 + i)
        api.circle(cx, cy, PIT_R + 2, glow > 0.75 ? api.colors.good : api.colors.panel)
      }
      if (pick === i) api.circle(cx, cy, PIT_R + 4, api.colors.accent2)
      const n = pits[i]
      const perRow = 3
      const rows = Math.ceil(Math.min(n, 12) / perRow)
      for (let s = 0; s < n && s < 12; s += 1) {
        const row = Math.floor(s / perRow)
        const col = s % perRow
        const cols = Math.min(perRow, n - row * perRow)
        const ox = (col - (cols - 1) / 2) * 11
        const oy = (row - (rows - 1) / 2) * 11
        api.circle(cx + ox, cy + oy, 3.4, mine ? api.colors.good : api.colors.accent2)
      }
      if (n > 12) api.text(String(n), cx, cy + 17, { size: 9, color: api.colors.fg, align: 'center' })
    }

    return {
      update(dt) {
        if (dropFlash > 0) dropFlash = Math.max(0, dropFlash - dt * 3)
        if (shake > 0) {
          shake = Math.max(0, shake - dt)
          shx = api.rnd(-1, 1) * shake * 8
          shy = api.rnd(-1, 1) * shake * 8
        } else {
          shx = 0
          shy = 0
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.life -= dt
          if (p.life <= 0) { parts.splice(i, 1); continue }
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 160 * dt
        }
        if (over) return
        if (sideEmpty(0, 6) || sideEmpty(7, 13)) { finish(); return }
        if (turn === 1) {
          aiTimer -= dt
          if (aiTimer <= 0) aiMove()
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        for (let y = 24; y < H - 24; y += 26) {
          api.rect(24, y + shx, W - 48, 1, api.colors.panel)
        }
        api.text('CPU', 24, 44, { size: 11, color: api.colors.dim })
        api.text('YOU', 24, 320, { size: 11, color: api.colors.good })

        for (let i = 0; i < 6; i += 1) {
          drawPit(i, true, turn === 0 && !over && pits[i] > 0)
        }
        for (let i = 7; i <= 12; i += 1) {
          drawPit(i, false, false)
        }

        const t = totals()
        api.rect(436 + shx, PIT_Y_AI - 24 + shy, 32, 48, api.colors.panel)
        api.text(String(pits[13]), 452 + shx, PIT_Y_AI + shy, {
          size: 14, color: api.colors.accent2, align: 'center', weight: 'bold',
        })
        api.rect(436 + shx, PIT_Y_PLAYER - 24 + shy, 32, 48, api.colors.panel)
        api.text(String(pits[6]), 452 + shx, PIT_Y_PLAYER + shy, {
          size: 14, color: api.colors.good, align: 'center', weight: 'bold',
        })

        api.text(t.ai + '  vs  ' + t.my, W / 2, 184, {
          size: 12, color: api.colors.dim, align: 'center',
        })
        api.text('MOVE ' + playerMoves + '/' + MOVE_LIMIT, W - 64, 44, {
          size: 11, color: api.colors.dim, align: 'right',
        })
        api.text(over ? result : turn === 0 ? 'CLICK A PIT' : 'CPU THINKING', W / 2, 320, {
          size: 12, color: over ? (won ? api.colors.good : api.colors.warn) : api.colors.dim,
          align: 'center', weight: over ? 'bold' : 'normal',
        })
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.rect(p.x + shx, p.y + shy, p.r * 2, p.r * 2, p.c)
        }
        if (over) {
          api.text(won ? 'WIN' : 'LOSE', 240, 214, {
            size: 30, color: won ? api.colors.good : api.colors.warn,
            align: 'center', weight: 'bold',
          })
        }
      },
      dispose() { parts.length = 0 },
    }
  },
})
