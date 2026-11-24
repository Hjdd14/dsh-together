defineGame({
  id: 'crossmini',
  create(api) {
    const C = api.colors
    const PUZZLES = [
      {
        grid: 'LIGHTE...RM...EO...ANIGHT',
        clues: [
          { row: 0, col: 0, dir: 'a', len: 5, text: 'lamp glow' },
          { row: 4, col: 0, dir: 'a', len: 5, text: 'not day' },
          { row: 0, col: 0, dir: 'd', len: 5, text: 'sour fruit' },
          { row: 0, col: 4, dir: 'd', len: 5, text: 'small gift' },
        ],
      },
      {
        grid: 'TABLEH...RR...AE...DEAGLE',
        clues: [
          { row: 0, col: 0, dir: 'a', len: 5, text: 'you eat at it' },
          { row: 4, col: 0, dir: 'a', len: 5, text: 'big bird' },
          { row: 0, col: 0, dir: 'd', len: 5, text: '2 + 1' },
          { row: 0, col: 4, dir: 'd', len: 5, text: 'swap things' },
        ],
      },
      {
        grid: 'ABOUTR...AE...BN...LABOVE',
        clues: [
          { row: 0, col: 0, dir: 'a', len: 5, text: 'roughly' },
          { row: 4, col: 0, dir: 'a', len: 5, text: 'higher than' },
          { row: 0, col: 0, dir: 'd', len: 5, text: 'sports hall' },
          { row: 0, col: 4, dir: 'd', len: 5, text: 'furniture' },
        ],
      },
    ]
    const SIZE = 5
    let puzzle = api.pick(PUZZLES)
    let solvedGrid = []
    let filled = []
    let entryIdx = 0
    let entryPos = 0
    let cells = []
    let done = 0
    let combo = 0
    let best = 0
    let t = 0
    let slide = 1
    let shakeT = 0
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    const parts = []

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(50, 190)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 55,
          life: api.rnd(0.45, 0.9), age: 0, r: api.rnd(1.5, 3.2),
        })
      }
      while (parts.length > 72) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.7
    }

    function entryCells(e) {
      const out = []
      for (let i = 0; i < e.len; i += 1) {
        const r = e.dir === 'd' ? e.row + i : e.row
        const c = e.dir === 'a' ? e.col + i : e.col
        out.push(r * SIZE + c)
      }
      return out
    }

    function load() {
      solvedGrid = []
      for (let i = 0; i < puzzle.grid.length; i += 1) solvedGrid.push(puzzle.grid[i] === '.' ? '' : puzzle.grid[i])
      filled = []
      for (let i = 0; i < SIZE * SIZE; i += 1) filled.push(false)
      cells = []
      for (let i = 0; i < puzzle.clues.length; i += 1) cells.push(entryCells(puzzle.clues[i]))
      entryIdx = 0
      entryPos = 0
      slide = 1
      advancePos()
    }

    function advancePos() {
      while (entryIdx < cells.length) {
        const list = cells[entryIdx]
        while (entryPos < list.length && filled[list[entryPos]]) entryPos += 1
        if (entryPos < list.length) return
        api.progress(1)
        done += 1
        combo += 1
        best = Math.max(best, combo)
        burst(200, 168, 10)
        pop('ENTRY ' + done, C.good)
        entryIdx += 1
        entryPos = 0
      }
      pop('CROSSWORD DONE', C.good)
      burst(240, 180, 26)
      const next = api.pick(PUZZLES)
      puzzle = next === puzzle ? PUZZLES[(PUZZLES.indexOf(next) + 1) % PUZZLES.length] : next
      load()
    }

    load()

    function curCell() {
      if (entryIdx >= cells.length) return -1
      return cells[entryIdx][entryPos]
    }

    function acceptCell() {
      const idx = curCell()
      if (idx < 0) return
      filled[idx] = true
      burst(120 + (idx % SIZE) * 44, 92 + Math.floor(idx / SIZE) * 44, 8)
      okFlash = true
      flashT = 0.2
      entryPos += 1
      advancePos()
    }

    const heldKeys = {}

    api.onKey((key, isDown) => {
      if (!isDown) {
        heldKeys[key] = false
        return
      }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (key.length !== 1 || key < 'a' || key > 'z') return
      const idx = curCell()
      if (idx < 0) return
      if (key === solvedGrid[idx].toLowerCase()) acceptCell()
      else {
        combo = 0
        okFlash = false
        flashT = 0.36
        shakeT = 0.36
        pop('NOPE', C.warn)
      }
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 9 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(106,169,255,0.04)')
      }
    }

    return {
      update(dt) {
        t += dt
        slide = Math.max(0, slide - dt * 5)
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 320 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        bands()
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('CROSSWORD', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('entries ' + done, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        const size = 44
        const gx = 22
        const gy = 64
        const sx = shakeT > 0 ? Math.sin(shakeT * 76) * 8 * (shakeT / 0.36) : 0
        const cur = curCell()
        for (let i = 0; i < SIZE * SIZE; i += 1) {
          const r = Math.floor(i / SIZE)
          const c = i % SIZE
          const x = gx + c * size + sx + slide * 8
          const y = gy + r * size
          if (!solvedGrid[i]) {
            api.rect(x, y, size - 3, size - 3, 'rgba(255,255,255,0.028)')
            continue
          }
          const inEntry = entryIdx < cells.length && cells[entryIdx].indexOf(i) >= 0
          api.rect(x, y, size - 3, size - 3, i === cur && flashT > 0 && !okFlash ? C.warn : inEntry ? 'rgba(106,169,255,0.16)' : C.panel)
          if (i === cur) api.rect(x, y, size - 3, 3, C.accent2)
          if (filled[i]) {
            api.text(solvedGrid[i], x + (size - 3) / 2, y + (size - 3) / 2 + 1, {
              size: 22, color: C.good, align: 'center', weight: 'bold',
            })
          }
        }
        const px = 262
        api.text('CLUES', px, 70, { size: 11, color: C.dim, weight: 'bold' })
        for (let i = 0; i < puzzle.clues.length; i += 1) {
          const e = puzzle.clues[i]
          const tag = (e.dir === 'a' ? 'A' : 'D') + (i + 1)
          const active = i === entryIdx
          const doneFlag = filled[cells[i][cells[i].length - 1]]
          api.text(tag, px, 92 + i * 44, { size: 12, color: active ? C.accent2 : C.dim, weight: 'bold' })
          api.text(e.text, px + 26, 92 + i * 44, {
            size: 12, color: doneFlag ? C.good : active ? C.fg : C.dim, weight: active ? 'bold' : 'normal',
          })
          api.rect(px, 102 + i * 44, 176, 2, active ? C.accent2 : C.panel)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, 300, 306, {
            size: 14 + popT * 9, color: popColor, align: 'center', weight: 'bold',
          })
        }
        api.rect(0, api.h - 22, api.w, 22, C.panel)
        api.text('a-z types into the lit cell · ' + (4 - entryIdx) + ' entries left', api.w / 2, api.h - 11, {
          size: 11, color: C.dim, align: 'center',
        })
      },
    }
  },
})
