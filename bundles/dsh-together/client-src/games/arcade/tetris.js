defineGame({
  id: 'tetris',
  create(api) {
    const COLS = 10
    const ROWS = 18
    const C = 20
    const X0 = 140
    const PER_LINE = 150
    const SHAPES = [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[2, 0], [0, 1], [1, 1], [2, 1]],
    ]
    const TINTS = [api.colors.accent, api.colors.accent2, api.colors.good, api.colors.fg,
      api.colors.warn, api.colors.dim, api.colors.accent2]

    const board = []
    for (let y = 0; y < ROWS; y += 1) {
      const row = []
      for (let x = 0; x < COLS; x += 1) row.push(0)
      board.push(row)
    }

    const parts = []
    let piece = null
    let nextKind = api.irnd(0, SHAPES.length - 1)
    let drop = 0
    let interval = 0.62
    let cleared = 0
    let dead = false
    let combo = 0
    let comboTimer = 0
    let shake = 0
    let shx = 0
    let shy = 0
    let lineFlash = 0
    let lockFlash = 0
    let softTimer = 0
    let repeatTimer = 0
    let repeatDir = 0

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 80; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.3, 0.65), max: 0.65,
          c: color, r: api.rnd(1.4, 3.4),
        })
      }
    }

    function collide(cells, px, py) {
      for (let i = 0; i < cells.length; i += 1) {
        const x = px + cells[i][0]
        const y = py + cells[i][1]
        if (x < 0 || x >= COLS || y >= ROWS) return true
        if (y >= 0 && board[y][x]) return true
      }
      return false
    }

    function spawn() {
      const kind = nextKind
      nextKind = api.irnd(0, SHAPES.length - 1)
      piece = { cells: SHAPES[kind].map((p) => [p[0], p[1]]), tint: kind, x: 3, y: -1 }
      if (collide(piece.cells, piece.x, piece.y)) {
        dead = true
        api.lose('stack')
      }
    }

    function rotate() {
      if (!piece) return
      const spun = piece.cells.map((p) => [-p[1], p[0]])
      let minX = spun[0][0]
      let minY = spun[0][1]
      for (let i = 1; i < spun.length; i += 1) {
        if (spun[i][0] < minX) minX = spun[i][0]
        if (spun[i][1] < minY) minY = spun[i][1]
      }
      const cells = spun.map((p) => [p[0] - minX, p[1] - minY])
      const kicks = [0, -1, 1, -2, 2]
      for (let i = 0; i < kicks.length; i += 1) {
        const nx = piece.x + kicks[i]
        if (!collide(cells, nx, piece.y)) {
          piece.cells = cells
          piece.x = nx
          shake = Math.max(shake, 0.08)
          return
        }
      }
    }

    function lock() {
      if (!piece) return
      for (let i = 0; i < piece.cells.length; i += 1) {
        const x = piece.x + piece.cells[i][0]
        const y = piece.y + piece.cells[i][1]
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) board[y][x] = piece.tint + 1
      }
      lockFlash = 1
      let lines = 0
      for (let y = ROWS - 1; y >= 0; y -= 1) {
        let full = true
        for (let x = 0; x < COLS; x += 1) if (!board[y][x]) full = false
        if (full) {
          for (let x = 0; x < COLS; x += 1) {
            burst(X0 + x * C + C / 2, y * C + C / 2, TINTS[board[y][x] - 1], 1, 130)
          }
          board.splice(y, 1)
          const row = []
          for (let x = 0; x < COLS; x += 1) row.push(0)
          board.unshift(row)
          lines += 1
          y += 1
        }
      }
      if (lines > 0) {
        cleared += lines
        combo = lines > 1 ? combo + lines : comboTimer > 0 ? combo + 1 : 1
        comboTimer = 2.2
        lineFlash = 1
        shake = Math.max(shake, 0.2 + lines * 0.14)
        api.score(lines * PER_LINE)
        interval = Math.max(0.22, 0.62 - cleared * 0.035)
        api.setStatus(combo > 1 ? 'lines ' + cleared + ' x' + combo : 'lines ' + cleared)
      }
      piece = null
      drop = 0
      spawn()
    }

    function move(dx) {
      if (!piece || dead) return
      if (!collide(piece.cells, piece.x + dx, piece.y)) piece.x += dx
    }

    function softDrop() {
      if (!piece || dead) return
      if (!collide(piece.cells, piece.x, piece.y + 1)) {
        piece.y += 1
        drop = 0
      } else {
        lock()
      }
    }

    function hardDrop() {
      if (!piece || dead) return
      let guard = 0
      while (!collide(piece.cells, piece.x, piece.y + 1) && guard < ROWS + 4) {
        piece.y += 1
        guard += 1
      }
      shake = Math.max(shake, 0.16)
      lock()
    }

    api.onKey((key, isDown) => {
      if (dead) return
      if (!isDown) {
        if (key === 'left' || key === 'right') repeatDir = 0
        return
      }
      if (key === 'left') { move(-1); repeatDir = -1; repeatTimer = 0.22 }
      else if (key === 'right') { move(1); repeatDir = 1; repeatTimer = 0.22 }
      else if (key === 'up') rotate()
      else if (key === 'down') softDrop()
      else if (key === 'space') hardDrop()
    })

    spawn()
    api.setStatus('lines 0')

    return {
      update(dt) {
        if (dead) return
        if (comboTimer > 0) {
          comboTimer -= dt
          if (comboTimer <= 0) combo = 0
        }
        if (lineFlash > 0) lineFlash = Math.max(0, lineFlash - dt * 3)
        if (lockFlash > 0) lockFlash = Math.max(0, lockFlash - dt * 5)
        if (shake > 0) {
          shake = Math.max(0, shake - dt)
          shx = api.rnd(-1, 1) * shake * 12
          shy = api.rnd(-1, 1) * shake * 12
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
          p.vy += 260 * dt
          p.vx *= 1 - 1.6 * dt
        }
        if (!piece) return

        if (repeatDir !== 0) {
          repeatTimer -= dt
          if (repeatTimer <= 0) { move(repeatDir); repeatTimer = 0.055 }
        }
        if (api.down('down')) {
          softTimer -= dt
          if (softTimer <= 0) { softDrop(); softTimer = 0.055 }
        } else {
          softTimer = 0
        }

        drop += dt
        let guard = 0
        while (drop >= interval && guard < 8 && piece && !dead) {
          drop -= interval
          guard += 1
          if (!collide(piece.cells, piece.x, piece.y + 1)) piece.y += 1
          else lock()
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        const t = api.now() / 1000
        for (let y = 0; y < api.h; y += 30) {
          api.rect(0, y + ((t * 10) % 30), api.w, 1, api.colors.panel)
        }
        api.rect(X0 - 6 + shx, 0 + shy, COLS * C + 12, ROWS * C, api.colors.panel)
        for (let x = 0; x <= COLS; x += 1) {
          api.rect(X0 + x * C - 0.5 + shx, shy, 1, ROWS * C, lineFlash > 0.4 ? api.colors.fg : api.colors.bg)
        }
        for (let y = 0; y <= ROWS; y += 1) {
          api.rect(X0 + shx, y * C - 0.5 + shy, COLS * C, 1, lineFlash > 0.4 ? api.colors.fg : api.colors.bg)
        }
        for (let y = 0; y < ROWS; y += 1) {
          for (let x = 0; x < COLS; x += 1) {
            const v = board[y][x]
            if (!v) continue
            const col = dead ? api.colors.dim : TINTS[v - 1]
            api.rect(X0 + x * C + 1 + shx, y * C + 1 + shy, C - 2, C - 2, col)
            if (!dead) api.rect(X0 + x * C + 2 + shx, y * C + 2 + shy, C - 4, 2, api.colors.fg)
          }
        }
        if (piece) {
          for (let i = 0; i < piece.cells.length; i += 1) {
            const x = piece.x + piece.cells[i][0]
            const y = piece.y + piece.cells[i][1]
            if (y < 0) continue
            api.rect(X0 + x * C + 1 + shx, y * C + 1 + shy, C - 2, C - 2, TINTS[piece.tint])
          }
          let gy = piece.y
          let guard = 0
          while (!collide(piece.cells, piece.x, gy + 1) && guard < ROWS + 4) { gy += 1; guard += 1 }
          for (let i = 0; i < piece.cells.length; i += 1) {
            const x = piece.x + piece.cells[i][0]
            const y = gy + piece.cells[i][1]
            if (y < 0 || y >= ROWS) continue
            api.rect(X0 + x * C + 7 + shx, y * C + 7 + shy, C - 14, C - 14, api.colors.dim)
          }
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
        }
        api.text('lines ' + cleared, X0 + COLS * C + 14, 30, { size: 13, color: api.colors.dim })
        for (let i = 0; i < SHAPES[nextKind].length; i += 1) {
          api.rect(X0 + COLS * C + 16 + SHAPES[nextKind][i][0] * 12,
            56 + SHAPES[nextKind][i][1] * 12, 10, 10, TINTS[nextKind])
        }
        api.text('next', X0 + COLS * C + 14, 50, { size: 11, color: api.colors.dim })
        if (combo >= 2 && !dead) {
          api.text('COMBO x' + combo, X0 + COLS * C + 14, 110, {
            size: 13, color: api.colors.accent2, weight: 'bold',
          })
        }
        if (lockFlash > 0.5) api.rect(X0 + shx, 0, COLS * C, 3, api.colors.fg)
        if (dead) {
          api.text('STACK FULL', X0 + COLS * C / 2, api.h / 2 - 18, {
            size: 14, color: api.colors.dim, align: 'center',
          })
          api.text('LOSE', api.w / 2, api.h / 2 + 16, {
            size: 36, color: api.colors.warn, align: 'center', weight: 'bold',
          })
        }
      },
      dispose() { parts.length = 0 },
    }
  },
})
