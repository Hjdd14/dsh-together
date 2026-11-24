defineGame({
  id: 'g2048small',
  create(api) {
    const C = api.colors
    const N = 3
    const CELL = 86
    const BX = 111
    const BY = 70
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let grid = []
    let score = 0
    let msg = 'ARROWS TO SLIDE'
    let resetAt = 0
    let mergeCells = []
    let mergeT = 0
    let spawnIdx = -1
    let spawnT = 0
    let scoreT = 0
    let pop = null
    const floats = []
    const fx = []

    function emptyCells() {
      const out = []
      for (let i = 0; i < N * N; i += 1) if (!grid[i]) out.push(i)
      return out
    }

    function burst(i, n, color) {
      const x = BX + (i % N) * CELL + CELL / 2
      const y = BY + Math.floor(i / N) * CELL + CELL / 2
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-90, 90), vy: api.rnd(-120, -30), t: 0, c: color })
      while (fx.length > 26) fx.shift()
    }

    function spawn() {
      const free = emptyCells()
      if (!free.length) return
      const i = api.pick(free)
      grid[i] = api.rng() < 0.15 ? 4 : 2
      spawnIdx = i
      spawnT = 0
    }

    function newGame() {
      grid = []
      for (let i = 0; i < N * N; i += 1) grid.push(0)
      score = 0
      resetAt = 0
      mergeCells = []
      mergeT = 0
      spawnT = 0
      scoreT = 0
      pop = null
      floats.length = 0
      fx.length = 0
      spawn()
      spawn()
      msg = 'ARROWS TO SLIDE'
    }
    newGame()

    function pack(vals) {
      const dense = []
      for (let i = 0; i < vals.length; i += 1) if (vals[i]) dense.push(vals[i])
      const res = []
      const merged = []
      let gain = 0
      for (let i = 0; i < dense.length; i += 1) {
        if (i + 1 < dense.length && dense[i] === dense[i + 1]) {
          const v = dense[i] * 2
          res.push(v)
          merged.push(res.length - 1)
          gain += v
          i += 1
        } else res.push(dense[i])
      }
      while (res.length < N) res.push(0)
      return { res: res, gain: gain, merged: merged }
    }

    function hasMove() {
      for (let i = 0; i < N * N; i += 1) if (!grid[i]) return true
      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c < N; c += 1) {
          const v = grid[r * N + c]
          if (c + 1 < N && v === grid[r * N + c + 1]) return true
          if (r + 1 < N && v === grid[(r + 1) * N + c]) return true
        }
      }
      return false
    }

    function move(dir) {
      if (resetAt) return
      const lines = []
      if (dir === 'left') for (let r = 0; r < N; r += 1) lines.push([r * N, r * N + 1, r * N + 2])
      if (dir === 'right') for (let r = 0; r < N; r += 1) lines.push([r * N + 2, r * N + 1, r * N])
      if (dir === 'up') for (let c = 0; c < N; c += 1) lines.push([c, c + N, c + 2 * N])
      if (dir === 'down') for (let c = 0; c < N; c += 1) lines.push([c + 2 * N, c + N, c])
      let changed = false
      let gained = 0
      const hits = []
      for (let k = 0; k < lines.length; k += 1) {
        const ids = lines[k]
        const got = pack([grid[ids[0]], grid[ids[1]], grid[ids[2]]])
        gained += got.gain
        for (let i = 0; i < N; i += 1) {
          if (grid[ids[i]] !== got.res[i]) changed = true
          grid[ids[i]] = got.res[i]
        }
        for (let m = 0; m < got.merged.length; m += 1) hits.push(ids[got.merged[m]])
      }
      if (!changed) {
        msg = 'NO MOVE THAT WAY'
        return
      }
      mergeCells = hits
      mergeT = 0
      if (gained > 0) {
        score += gained
        api.score(gained)
        scoreT = 0.5
        msg = 'MERGE +' + gained
        const at = hits.length ? hits[0] : 4
        floats.push({ x: BX + (at % N) * CELL + CELL / 2, y: BY + Math.floor(at / N) * CELL + CELL / 2, text: '+' + gained, t: 0 })
        while (floats.length > 5) floats.shift()
        for (let m = 0; m < hits.length; m += 1) burst(hits[m], 5, C.good)
        if (hits.length > 1) pop = { text: 'x' + hits.length + ' MERGE', color: C.accent2, t: 0 }
      } else {
        mergeCells = []
        msg = 'SLIDE'
      }
      spawn()
      if (!hasMove()) {
        msg = 'NO MOVES - NEW BOARD'
        resetAt = api.now() + 900
      }
    }

    api.onKey(function (key, isDown) {
      if (!isDown) return
      if (key === 'left' || key === 'right' || key === 'up' || key === 'down') move(key)
    })

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || !resetAt) return
      newGame()
    })

    function tileColor(v) {
      if (v === 2) return 'rgba(143,160,180,0.3)'
      if (v === 4) return 'rgba(143,160,180,0.55)'
      if (v === 8) return C.accent
      if (v === 16) return C.accent2
      if (v === 32) return C.good
      return C.warn
    }

    return {
      update(dt) {
        for (let k = fx.length - 1; k >= 0; k -= 1) {
          const p = fx[k]
          p.t += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 260 * dt
          if (p.t > 0.7) fx.splice(k, 1)
        }
        for (let k = floats.length - 1; k >= 0; k -= 1) {
          floats[k].t += dt
          if (floats[k].t > 0.7) floats.splice(k, 1)
        }
        if (mergeT < 1) mergeT += dt
        if (spawnT < 1) spawnT += dt
        if (scoreT > 0) scoreT -= dt
        if (pop) { pop.t += dt; if (pop.t > 0.8) pop = null }
        if (resetAt && api.now() >= resetAt) newGame()
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('2048 3x3 - MAKE A 32', 16, 22, { size: 14, color: C.dim, weight: 'bold' })
        api.text('SCORE ' + score, 400, 22, { size: 14, color: scoreT > 0 ? C.good : C.fg, align: 'center', weight: 'bold' })
        api.rect(BX - 8, BY - 8, N * CELL + 16, N * CELL + 16, C.panel)
        for (let r = 0; r < N; r += 1) {
          for (let c = 0; c < N; c += 1) {
            const i = r * N + c
            const v = grid[i]
            const x = BX + c * CELL + 4
            const y = BY + r * CELL + 4
            let inset = 0
            if (i === spawnIdx && spawnT < 0.2) inset = (1 - spawnT / 0.2) * 7
            api.rect(x + inset, y + inset, CELL - 8 - inset * 2, CELL - 8 - inset * 2, v ? tileColor(v) : 'rgba(0,0,0,0.3)')
            if (v) {
              api.text(String(v), x + (CELL - 8) / 2, y + (CELL - 8) / 2, { size: v > 99 ? 22 : 30, color: C.bg, align: 'center', weight: 'bold' })
            }
          }
        }
        if (mergeT < 0.3) {
          const a = mergeT < 0.15 ? 'rgba(139,220,122,0.45)' : 'rgba(139,220,122,0.20)'
          for (let k = 0; k < mergeCells.length; k += 1) {
            const i = mergeCells[k]
            api.rect(BX + (i % N) * CELL, BY + Math.floor(i / N) * CELL, CELL - 2, CELL - 2, a)
          }
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.7), fx[k].c)
        for (let k = 0; k < floats.length; k += 1) {
          const f = floats[k]
          api.text(f.text, f.x, f.y - 10 - f.t * 26, { size: 18, color: C.good, align: 'center', weight: 'bold' })
        }
        if (pop) api.text(pop.text, 240, 44 - pop.t * 8, { size: 18, color: pop.color, align: 'center', weight: 'bold' })
        api.text(msg, 240, 346, { size: 14, color: C.accent, align: 'center', weight: 'bold' })
      },
    }
  },
})
