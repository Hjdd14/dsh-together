defineGame({
  id: 'riskdice',
  create(api) {
    const C = api.colors
    const COLS = 3
    const ROWS = 2
    const TW = 96
    const TH = 84
    const BX = 96
    const BY = 92
    const GAP = 104
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let own = [2, 2, 2, 1, 1, 1]
    let roll = null
    let aiAt = 0
    let thinking = false
    let flash = null
    let pop = null
    let streak = 0
    let streakT = 0
    let lastTaken = -1
    let resetAt = 0
    let msg = 'CLICK AN ENEMY LAND BORDERING YOURS'
    let msgColor = C.dim
    const fx = []

    function tx(i) { return BX + (i % COLS) * GAP }
    function ty(i) { return BY + Math.floor(i / COLS) * GAP }
    function cx(i) { return tx(i) + TW / 2 }
    function cy(i) { return ty(i) + TH / 2 }

    function neighbors(i) {
      const r = Math.floor(i / COLS)
      const c = i % COLS
      const out = []
      if (r > 0) out.push(i - COLS)
      if (r < ROWS - 1) out.push(i + COLS)
      if (c > 0) out.push(i - 1)
      if (c < COLS - 1) out.push(i + 1)
      return out
    }

    function reset() {
      own = [2, 2, 2, 1, 1, 1]
      roll = null
      aiAt = 0
      thinking = false
      flash = null
      pop = null
      streak = 0
      streakT = 0
      lastTaken = -1
      resetAt = 0
      fx.length = 0
      msg = 'CLICK AN ENEMY LAND BORDERING YOURS'
      msgColor = C.dim
    }

    function burst(i, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: cx(i), y: cy(i), vx: api.rnd(-100, 100), vy: api.rnd(-140, -40), t: 0, c: color })
      while (fx.length > 30) fx.shift()
    }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 260 * dt
        if (p.t > 0.75) fx.splice(k, 1)
      }
      if (flash) { flash.t += dt; if (flash.t > 0.6) flash = null }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
      if (streakT > 0) { streakT -= dt; if (streakT <= 0) streak = 0 }
      if (roll) {
        roll.t += dt
        if (roll.t < 0.55) {
          roll.f1 = api.irnd(1, 6)
          roll.f2 = api.irnd(1, 6)
          roll.jx = api.rnd(-4, 4)
          roll.jy = api.rnd(-4, 4)
        }
        if (roll.t >= 0.75) settle()
      }
    }

    function sourceFor(i) {
      const nb = neighbors(i)
      for (let k = 0; k < nb.length; k += 1) if (own[nb[k]] === 1) return nb[k]
      return -1
    }

    function settle() {
      const r = roll
      roll = null
      if (!r) return
      const attackerWins = r.by === 1 ? r.mine > r.theirs : r.theirs > r.mine
      const target = r.dst
      if (attackerWins) {
        own[target] = r.by
        flash = { i: target, t: 0 }
        burst(target, 10, r.by === 1 ? C.good : C.warn)
        if (r.by === 1) {
          streak += 1
          streakT = 4
          lastTaken = target
          pop = { text: streak > 1 ? 'STREAK x' + streak : 'TAKEN!', color: C.good, t: 0 }
          msg = 'LAND ' + (target + 1) + ' CAPTURED'
          msgColor = C.good
          api.progress(1)
        } else {
          pop = { text: 'AI TAKES ' + (target + 1), color: C.warn, t: 0 }
          msg = 'AI TOOK LAND ' + (target + 1)
          msgColor = C.warn
        }
      } else {
        if (r.by === 1) {
          streak = 0
          streakT = 0
        }
        pop = { text: 'REPELLED', color: C.dim, t: 0 }
        msg = r.by === 1 ? 'ATTACK REPELLED' : 'AI ATTACK REPELLED'
        msgColor = C.dim
      }
      checkWipe()
      if (r.by === 1 && own[target] === 1) {
        aiAt = api.now() + 1100
        thinking = true
      }
    }

    function checkWipe() {
      let mine = 0
      let theirs = 0
      for (let i = 0; i < own.length; i += 1) {
        if (own[i] === 1) mine += 1
        if (own[i] === 2) theirs += 1
      }
      if (theirs === 0) {
        msg = 'ALL LANDS TAKEN'
        msgColor = C.good
        return true
      }
      if (mine === 0) {
        msg = 'WIPED OUT - NEW MAP'
        msgColor = C.warn
        resetAt = api.now() + 1300
        return true
      }
      return false
    }

    function aiPlay() {
      thinking = false
      const options = []
      for (let i = 0; i < own.length; i += 1) {
        if (own[i] !== 1) continue
        const src = sourceFor(i)
        if (src >= 0 && own[src] === 2) options.push({ src: src, dst: i })
      }
      if (!options.length) {
        aiAt = 0
        return
      }
      let pickIdx = api.irnd(0, options.length - 1)
      if (api.rng() >= 0.7 && lastTaken >= 0) {
        for (let k = 0; k < options.length; k += 1) if (options[k].dst === lastTaken) pickIdx = k
      }
      const o = options[pickIdx]
      roll = { src: o.src, dst: o.dst, by: 2, mine: api.irnd(1, 6), theirs: api.irnd(1, 6), f1: 1, f2: 1, jx: 0, jy: 0, t: 0 }
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || roll || resetAt || thinking) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      for (let i = 0; i < own.length; i += 1) {
        if (ev.x > tx(i) && ev.x < tx(i) + TW && ev.y > ty(i) && ev.y < ty(i) + TH) {
          if (own[i] !== 2) {
            msg = 'THAT LAND IS YOURS'
            msgColor = C.dim
            return
          }
          const src = sourceFor(i)
          if (src < 0) {
            msg = 'NO OWN LAND BORDERS IT'
            msgColor = C.warn
            return
          }
          roll = { src: src, dst: i, by: 1, mine: api.irnd(1, 6), theirs: api.irnd(1, 6), f1: 1, f2: 1, jx: 0, jy: 0, t: 0 }
          msg = 'ROLLING...'
          msgColor = C.accent2
          return
        }
      }
    })

    return {
      update(dt) {
        tick(dt)
        if (resetAt && api.now() >= resetAt) { reset(); return }
        if (!resetAt && !roll && thinking && api.now() >= aiAt) aiPlay()
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('DICE SIEGE - TAKE 2 LANDS', 16, 22, { size: 14, color: C.dim, weight: 'bold' })
        const pulse = 0.5 + 0.5 * Math.sin(api.now() / 220)
        for (let i = 0; i < own.length; i += 1) {
          const x = tx(i)
          const y = ty(i)
          const mine = own[i] === 1
          const canHit = !roll && !thinking && !resetAt && !mine && sourceFor(i) >= 0
          api.rect(x, y, TW, TH, mine ? 'rgba(106,169,255,0.28)' : 'rgba(255,122,122,0.24)')
          if (canHit) api.rect(x - 3 - pulse * 2, y - 3 - pulse * 2, TW + 6 + pulse * 4, TH + 6 + pulse * 4, 'rgba(255,207,92,0.20)')
          if (flash && flash.i === i) api.rect(x - 2, y - 2, TW + 4, TH + 4, flash.t < 0.25 ? 'rgba(232,238,246,0.5)' : 'rgba(232,238,246,0.16)')
          api.text(String(i + 1), x + TW / 2, y + TH / 2 - 8, { size: 26, color: mine ? C.accent : C.warn, align: 'center', weight: 'bold' })
          api.text(mine ? 'YOU' : 'AI', x + TW / 2, y + TH / 2 + 20, { size: 12, color: C.dim, align: 'center', weight: 'bold' })
        }
        if (roll) {
          for (let k = 1; k < 4; k += 1) {
            const e = k / 4
            api.circle(cx(roll.src) + (cx(roll.dst) - cx(roll.src)) * e, cy(roll.src) + (cy(roll.dst) - cy(roll.src)) * e, 4, C.accent2)
          }
          const mineVal = roll.t < 0.55 ? roll.f1 : roll.mine
          const theirVal = roll.t < 0.55 ? roll.f2 : roll.theirs
          api.rect(150, 294, 66, 60, C.panel)
          api.rect(266, 294, 66, 60, C.panel)
          api.text(String(mineVal), 183 + roll.jx, 324 + roll.jy, { size: 32, color: C.accent, align: 'center', weight: 'bold' })
          api.text(String(theirVal), 299 + roll.jy, 324 + roll.jx, { size: 32, color: C.warn, align: 'center', weight: 'bold' })
          api.text('YOUR DIE', 183, 286, { size: 10, color: C.accent, align: 'center', weight: 'bold' })
          api.text('AI DIE', 299, 286, { size: 10, color: C.warn, align: 'center', weight: 'bold' })
          if (roll.t >= 0.55) {
            const win = roll.by === 1 ? roll.mine > roll.theirs : roll.theirs > roll.mine
            api.text(win ? '>>' : '<<', 241, 324, { size: 22, color: C.fg, align: 'center', weight: 'bold' })
          }
        } else if (thinking) {
          api.text('AI', 214, 322, { size: 13, color: C.dim, weight: 'bold' })
          for (let k = 0; k < 3; k += 1) {
            const on = Math.floor(api.now() / 200) % 3 === k
            api.circle(240 + k * 14, 322, on ? 5 : 3, on ? C.accent2 : C.dim)
          }
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        if (pop) api.text(pop.text, 240, 46 - pop.t * 10, { size: 20, color: pop.color, align: 'center', weight: 'bold' })
        else if (streak > 1 && streakT > 0) api.text('STREAK x' + streak, 240, 46, { size: 14, color: C.accent2, align: 'center', weight: 'bold' })
        api.text(msg, 240, 70, { size: 13, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
