defineGame({
  id: 'jumpman',
  create(api) {
    const C = api.colors
    const FLOORS = [300, 236, 172]
    const FLOOR_H = 64
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let level = 0
    let f = 0
    let px = 60
    let climb = null
    let jumpT = 0
    let inv = 0
    let haz = []
    let ladders = []
    let spawnAt = 1.4
    let flash = null
    let pop = null
    let banner = 0
    let msg = 'ARROWS MOVE - UP CLIMBS - SPACE JUMPS'
    let msgColor = C.dim
    const fx = []

    function py() {
      return FLOORS[f] - (climb ? 0 : 0)
    }

    function burst(x, y, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-90, 90), vy: api.rnd(-130, -30), t: 0, c: color })
      while (fx.length > 26) fx.shift()
    }

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 240 * dt
        if (p.t > 0.7) fx.splice(k, 1)
      }
      if (flash) { flash.t += dt; if (flash.t > 0.5) flash = null }
      if (pop) { pop.t += dt; if (pop.t > 0.85) pop = null }
      if (jumpT > 0) jumpT -= dt
      if (inv > 0) inv -= dt
      if (banner > 0) banner -= dt
    }

    function resetLevel(next) {
      level = next ? level + 1 : level
      f = 0
      px = 60
      climb = null
      jumpT = 0
      inv = 0.6
      haz = []
      spawnAt = 1.6
      ladders = []
      for (let k = 0; k < FLOORS.length - 1; k += 1) {
        ladders.push({ f: k, x: api.rnd(70, 200) })
        ladders.push({ f: k, x: api.rnd(280, 412) })
      }
      msg = next ? 'LEVEL ' + (level + 1) + ' - CLIMB!' : 'ARROWS MOVE - UP CLIMBS - SPACE JUMPS'
      msgColor = next ? C.good : C.dim
    }
    resetLevel(false)

    function spawnHazard() {
      const fire = api.rng() < 0.3
      const dir = api.rng() < 0.5 ? 1 : -1
      haz.push({
        x: dir > 0 ? 20 : 460,
        // FLOORS has 3 entries; a hazard on "floor 3" read undefined and drew NaN.
        f: FLOORS.length - 1,
        dir: dir,
        sp: fire ? 150 + level * 8 : 100 + level * 6,
        fire: fire,
        t: 0,
      })
      while (haz.length > 5) haz.shift()
    }

    function hitPlayer() {
      if (inv > 0 || jumpT > 0.16) return false
      inv = 1.1
      flash = { t: 0 }
      burst(px, FLOORS[f] - 12, 8, C.warn)
      pop = { text: 'OUCH!', color: C.warn, t: 0 }
      msg = 'KNOCKED DOWN ONE FLOOR'
      msgColor = C.warn
      f = Math.max(0, f - 1)
      climb = null
      return true
    }

    function reachTop() {
      api.progress(1)
      banner = 1.3
      pop = { text: 'TOP! LEVEL ' + (level + 1), color: C.good, t: 0 }
      burst(px, FLOORS[FLOORS.length - 1] - 10, 12, C.good)
      msg = 'LEVEL CLEAR'
      msgColor = C.good
      for (let k = 0; k < haz.length; k += 1) haz[k].sp = 0
      resetLevel(true)
    }

    api.onKey(function (key, down) {
      if (!down) return
      if (key === 'space') {
        if (jumpT <= 0 && !climb) jumpT = 0.42
        return
      }
      if (key === 'up') {
        if (climb) return
        for (let k = 0; k < ladders.length; k += 1) {
          const L = ladders[k]
          if (L.f !== f || f >= FLOORS.length - 1) continue
          if (Math.abs(px - L.x) < 30) {
            climb = { fromY: FLOORS[f], toY: FLOORS[f + 1], t: 0, target: f + 1 }
            return
          }
        }
        msg = 'STAND AT A LADDER TO CLIMB'
        msgColor = C.dim
      }
    })

    return {
      update(dt) {
        tick(dt)
        if (banner > 0) return
        if (climb) {
          climb.t += dt
          if (climb.t >= 0.32) {
            f = climb.target
            climb = null
            if (f >= FLOORS.length - 1) reachTop()
          }
          return
        }
        const speed = 150 + level * 6
        if (api.down('left')) px -= speed * dt
        if (api.down('right')) px += speed * dt
        if (px < 18) px = 18
        if (px > 462) px = 462
        spawnAt -= dt
        if (spawnAt <= 0) {
          spawnHazard()
          spawnAt = Math.max(0.9, 2.5 - level * 0.14)
        }
        for (let k = haz.length - 1; k >= 0; k -= 1) {
          const h = haz[k]
          h.t += dt
          h.x += h.dir * h.sp * dt
          if (h.x > 462 || h.x < 18) {
            h.f -= 1
            h.dir = -h.dir
            h.x = h.x > 462 ? 462 : 18
            if (h.f < 0) {
              haz.splice(k, 1)
              continue
            }
          }
          if (h.f === f && Math.abs(h.x - px) < 18) hitPlayer()
        }
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        api.text('JUMPMAN - CLIMB UP', 16, 26, { size: 15, color: C.dim, weight: 'bold' })
        api.text('LEVEL ' + (level + 1), 402, 26, { size: 14, color: C.fg, align: 'center', weight: 'bold' })
        for (let k = 0; k < FLOORS.length; k += 1) {
          api.rect(14, FLOORS[k], 452, 7, k % 2 === 0 ? C.panel : 'rgba(143,160,180,0.28)')
          if (k < 3) {
            api.rect(14, FLOORS[k] + 7, 452, 3, 'rgba(0,0,0,0.35)')
          }
        }
        for (let k = 0; k < ladders.length; k += 1) {
          const L = ladders[k]
          const near = L.f === f && Math.abs(px - L.x) < 30
          const top = FLOORS[L.f + 1]
          const bottom = FLOORS[L.f]
          api.rect(L.x - 9, top, 3, bottom - top, near ? C.good : 'rgba(143,160,180,0.55)')
          api.rect(L.x + 6, top, 3, bottom - top, near ? C.good : 'rgba(143,160,180,0.55)')
          for (let ry = top + 8; ry < bottom; ry += 12) {
            api.rect(L.x - 9, ry, 18, 2, near ? 'rgba(139,220,122,0.7)' : 'rgba(143,160,180,0.4)')
          }
        }
        for (let k = 0; k < haz.length; k += 1) {
          const h = haz[k]
          const hy = FLOORS[h.f] - 11
          if (h.fire) {
            api.circle(h.x, hy, 10, C.warn)
            api.circle(h.x, hy - 3, 5, C.accent2)
          } else {
            api.circle(h.x, hy, 11, C.accent2)
            api.rect(h.x - 11, hy - 2, 22, 3, 'rgba(24,32,40,0.75)')
            api.circle(h.x, hy, 4, 'rgba(24,32,40,0.85)')
          }
        }
        let fly = 0
        let squash = 0
        if (jumpT > 0) {
          const k = 1 - Math.abs(jumpT - 0.21) / 0.21
          fly = -30 * Math.max(0, k)
          squash = 0.16 * Math.max(0, k)
        }
        const cy = (climb ? climb.fromY + (climb.toY - climb.fromY) * Math.min(1, climb.t / 0.32) : FLOORS[f]) + fly
        const cx = px
        if (inv > 0 && Math.floor(api.now() / 120) % 2 === 1) {
          api.circle(cx, cy - 12, 13, 'rgba(232,238,246,0.35)')
        } else {
          api.rect(cx - 9, cy - 26, 18, 18 + squash * 10, C.accent)
          api.circle(cx, cy - 30, 8, C.accent2)
          api.rect(cx - 9, cy - 8, 18, 8, C.panel)
        }
        if (flash) api.rect(0, 0, api.w, api.h, flash.t < 0.2 ? 'rgba(255,122,122,0.28)' : 'rgba(255,122,122,0.10)')
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.7), fx[k].c)
        if (banner > 0) {
          api.rect(0, 150, api.w, 60, 'rgba(139,220,122,0.18)')
          api.text('LEVEL CLEAR!', 240, 180, { size: 26, color: C.good, align: 'center', weight: 'bold' })
        }
        if (pop) api.text(pop.text, 240, 52 - pop.t * 8, { size: 20, color: pop.color, align: 'center', weight: 'bold' })
        api.text(msg, 240, 348, { size: 12, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
