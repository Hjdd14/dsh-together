defineGame({
  id: 'qix',
  create(api) {
    const C = api.colors
    const COLS = 20
    const ROWS = 12
    const CELL = 20
    const OX = 40
    const OY = 70
    let claimed = []
    let player = { c: 1, r: 0 }
    let trail = []
    let drawing = false
    let stepT = 0
    let dir = 'right'
    let enemy = { x: 240, y: 190 }
    let t = 0
    let combo = 0
    let best = 0
    let shakeT = 0
    let flashT = 0
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let lost = false
    const parts = []

    function idx(c, r) {
      return r * COLS + c
    }

    function reset() {
      claimed = []
      for (let i = 0; i < COLS * ROWS; i += 1) claimed.push(false)
      for (let c = 0; c < COLS; c += 1) {
        claimed[idx(c, 0)] = true
        claimed[idx(c, ROWS - 1)] = true
      }
      for (let r = 0; r < ROWS; r += 1) {
        claimed[idx(0, r)] = true
        claimed[idx(COLS - 1, r)] = true
      }
      player = { c: 1, r: 0 }
      trail = []
      drawing = false
      stepT = 0
      dir = 'right'
    }

    reset()

    function burst(x, y, n, color) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(40, 170)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
          life: api.rnd(0.4, 0.85), age: 0, r: api.rnd(1.4, 3), c: color || C.good,
        })
      }
      while (parts.length > 80) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.75
    }

    function capture() {
      let gained = 0
      for (let i = 0; i < trail.length; i += 1) {
        const cell = trail[i]
        if (!claimed[cell]) {
          claimed[cell] = true
          gained += 1
        }
      }
      trail = []
      const seen = []
      const groups = []
      for (let i = 0; i < COLS * ROWS; i += 1) seen.push(false)
      for (let i = 0; i < COLS * ROWS; i += 1) {
        if (claimed[i] || seen[i]) continue
        const group = []
        const queue = [i]
        seen[i] = true
        while (queue.length) {
          const cur = queue.shift()
          group.push(cur)
          const c = cur % COLS
          const r = Math.floor(cur / COLS)
          const nb = []
          if (c > 0) nb.push(cur - 1)
          if (c < COLS - 1) nb.push(cur + 1)
          if (r > 0) nb.push(cur - COLS)
          if (r < ROWS - 1) nb.push(cur + COLS)
          for (let k = 0; k < nb.length; k += 1) {
            if (!claimed[nb[k]] && !seen[nb[k]]) {
              seen[nb[k]] = true
              queue.push(nb[k])
            }
          }
        }
        groups.push(group)
      }
      if (groups.length > 1) {
        let small = groups[0]
        for (let i = 1; i < groups.length; i += 1) {
          if (groups[i].length < small.length) small = groups[i]
        }
        for (let i = 0; i < small.length; i += 1) {
          claimed[small[i]] = true
          gained += 1
        }
      }
      for (let i = 0; i < gained; i += 1) api.progress(1)
      if (gained > 0) {
        combo += 1
        best = Math.max(best, combo)
        pop('+' + gained + ' TILES', C.good)
        burst(OX + player.c * CELL + CELL / 2, OY + player.r * CELL + CELL / 2, 14)
      }
      drawing = false
    }

    function step() {
      const dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0
      const dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0
      const nc = player.c + dc
      const nr = player.r + dr
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return
      const target = idx(nc, nr)
      player.c = nc
      player.r = nr
      if (claimed[target]) {
        if (drawing) capture()
        return
      }
      drawing = true
      if (trail.indexOf(target) < 0) trail.push(target)
    }

    function enemyCell() {
      const c = Math.floor((enemy.x - OX) / CELL)
      const r = Math.floor((enemy.y - OY) / CELL)
      return { c, r }
    }

    function die(why) {
      if (lost) return
      lost = true
      burst(OX + player.c * CELL + CELL / 2, OY + player.r * CELL + CELL / 2, 22, C.warn)
      api.lose(why)
    }

    return {
      update(dt) {
        t += dt
        if (lost) return
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        let moving = false
        if (api.down('left')) { dir = 'left'; moving = true } else if (api.down('right')) {
          dir = 'right'; moving = true
        } else if (api.down('up')) { dir = 'up'; moving = true } else if (api.down('down')) {
          dir = 'down'; moving = true
        }
        stepT -= dt
        if (moving && stepT <= 0) {
          stepT = 0.075
          step()
          if (drawing) {
            const ec = enemyCell()
            if (ec.c === player.c && ec.r === player.r) die('caught')
          }
        }
        enemy.x = 240 + Math.cos(t * 0.62) * 150
        enemy.y = 190 + Math.sin(t * 0.94) * 92
        const e = enemyCell()
        if (e.c >= 0 && e.c < COLS && e.r >= 0 && e.r < ROWS) {
          const cell = idx(e.c, e.r)
          if (drawing && trail.indexOf(cell) >= 0) {
            flashT = 0.4
            die('line hit')
          }
          if (e.c === player.c && e.r === player.r) die('caught')
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 260 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        for (let i = 0; i < 3; i += 1) {
          api.rect(0, ((t * 8 + i * 150) % 460) - 70, api.w, 110, 'rgba(106,169,255,0.04)')
        }
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('QIX', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('claimed', api.w - 18, 27, { size: 14, color: C.accent2, align: 'right', weight: 'bold' })
        let count = 0
        for (let i = 0; i < claimed.length; i += 1) if (claimed[i]) count += 1
        api.text(String(Math.max(0, count - (2 * COLS + 2 * ROWS - 4))), 396, 27, {
          size: 14, color: C.good, align: 'right', weight: 'bold',
        })
        if (combo > 1) api.text('x' + combo, 250, 27, { size: 14, color: C.good, align: 'right', weight: 'bold' })
        for (let r = 0; r < ROWS; r += 1) {
          for (let c = 0; c < COLS; c += 1) {
            const x = OX + c * CELL
            const y = OY + r * CELL
            const i = idx(c, r)
            let fill = 'rgba(255,255,255,0.035)'
            if (claimed[i]) fill = c === 0 || c === COLS - 1 || r === 0 || r === ROWS - 1 ? C.dim : 'rgba(106,169,255,0.35)'
            if (trail.indexOf(i) >= 0) fill = flashT > 0 ? C.warn : C.accent2
            api.rect(x + 1, y + 1, CELL - 2, CELL - 2, fill)
          }
        }
        const px = OX + player.c * CELL + CELL / 2
        const py = OY + player.r * CELL + CELL / 2
        api.circle(px, py, 8, drawing ? C.accent2 : C.accent)
        api.circle(px, py, 3, '#0d1218')
        const glow = 0.5 + 0.5 * Math.sin(t * 6)
        api.circle(enemy.x, enemy.y, 11 + glow * 2, C.warn)
        api.circle(enemy.x, enemy.y, 5, C.bg)
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? p.c : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 340, { size: 13 + popT * 8, color: popColor, align: 'center', weight: 'bold' })
        }
        api.rect(0, api.h - 20, api.w, 20, C.panel)
        api.text('arrows walk · step off the edge to draw · back = claim', api.w / 2, api.h - 10, {
          size: 10, color: C.dim, align: 'center',
        })
      },
    }
  },
})
