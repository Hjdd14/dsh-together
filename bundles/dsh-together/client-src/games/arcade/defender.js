defineGame({
  id: 'defender',
  create(api) {
    const C = api.colors
    const GROUND = 292
    let ship = { y: 180 }
    let bullets = []
    let enemies = []
    let humans = []
    let grabbed = 0
    let kills = 0
    let t = 0
    let cd = 0
    let spawnT = 1
    let shakeT = 0
    let flashT = 0
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let lost = false
    let scroll = 0
    const parts = []
    const stars = []

    for (let i = 0; i < 40; i += 1) {
      stars.push({ x: api.rnd(0, 480), y: api.rnd(60, 250), s: api.rnd(0.4, 1.4) })
    }
    for (let i = 0; i < 6; i += 1) humans.push({ x: 70 + i * 70 })
    ship.y = 180

    function burst(x, y, n, color) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(40, 180)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
          life: api.rnd(0.35, 0.8), age: 0, r: api.rnd(1.4, 3), c: color || C.good,
        })
      }
      while (parts.length > 80) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.7
    }

    function die(why) {
      if (lost) return
      lost = true
      api.lose(why)
    }

    function spawn() {
      const y = api.rnd(90, 240)
      enemies.push({ x: 500, y, vy: api.rnd(-16, 16), speed: api.rnd(38, 66), phase: api.rnd(0, 6.28) })
    }

    const held = {}
    api.onKey((key, isDown) => {
      if (!isDown) {
        held[key] = false
        return
      }
      if (held[key]) return
      held[key] = true
      if (key !== 'space' || lost) return
      if (cd > 0) return
      cd = 0.16
      bullets.push({ x: 118, y: ship.y })
    })

    return {
      update(dt) {
        t += dt
        if (lost) return
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        if (cd > 0) cd = Math.max(0, cd - dt)
        scroll += dt * 40
        if (api.down('up')) ship.y -= 210 * dt
        if (api.down('down')) ship.y += 210 * dt
        if (ship.y < 74) ship.y = 74
        if (ship.y > 268) ship.y = 268
        spawnT -= dt
        if (spawnT <= 0) {
          spawnT = Math.max(0.55, 1.7 - kills * 0.08)
          spawn()
        }
        for (let i = bullets.length - 1; i >= 0; i -= 1) {
          bullets[i].x += 520 * dt
          if (bullets[i].x > 486) bullets.splice(i, 1)
        }
        for (let i = enemies.length - 1; i >= 0; i -= 1) {
          const e = enemies[i]
          e.x -= e.speed * dt
          e.y += Math.sin(t * 2.2 + e.phase) * 24 * dt + e.vy * dt
          if (e.y < 82) e.y = 82
          if (e.y > 252) e.y = 252
          for (let k = bullets.length - 1; k >= 0; k -= 1) {
            const b = bullets[k]
            if (Math.abs(b.x - e.x) < 18 && Math.abs(b.y - e.y) < 16) {
              bullets.splice(k, 1)
              enemies.splice(i, 1)
              kills += 1
              api.progress(1)
              burst(e.x, e.y, 14)
              pop('DOWN', C.good)
              break
            }
          }
          if (enemies.indexOf(e) < 0) continue
          if (e.x < 62) {
            enemies.splice(i, 1)
            if (humans.length) {
              humans.pop()
              grabbed += 1
              flashT = 0.5
              shakeT = 0.4
              pop('ABDUCTED', C.warn)
              if (grabbed >= 3) die('humans lost')
            }
          }
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 240 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        for (let i = 0; i < stars.length; i += 1) {
          const st = stars[i]
          const x = (st.x - scroll * 0.4) % 480
          api.circle(x < 0 ? x + 480 : x, st.y, st.s, 'rgba(232,238,246,0.45)')
        }
        for (let i = 0; i < 3; i += 1) {
          api.rect(0, ((t * 6 + i * 150) % 460) - 70, api.w, 110, 'rgba(106,169,255,0.03)')
        }
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('DEFENDER', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('downed ' + kills, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        api.text('humans ' + humans.length, 250, 27, { size: 14, color: humans.length <= 3 ? C.warn : C.good, weight: 'bold' })
        api.rect(0, GROUND, api.w, api.h - GROUND, '#141a20')
        for (let i = 0; i < 12; i += 1) {
          const x = ((i * 48 - scroll * 0.7) % 528) - 24
          api.rect(x, GROUND - 6 - (i % 3) * 5, 44, 6 + (i % 3) * 5, '#1b242c')
        }
        for (let i = 0; i < humans.length; i += 1) {
          const hx = humans[i].x
          api.rect(hx - 3, GROUND - 14, 6, 10, C.accent2)
          api.circle(hx, GROUND - 18, 4, C.accent2)
        }
        const sx = shakeT > 0 ? Math.sin(shakeT * 70) * 6 * (shakeT / 0.4) : 0
        api.rect(96 + sx, ship.y - 4, 26, 8, C.accent)
        api.rect(104 + sx, ship.y - 9, 10, 18, C.accent)
        api.circle(122 + sx, ship.y, 5, C.fg)
        if (flashT > 0) api.circle(96 + sx, ship.y, 14, 'rgba(255,122,122,0.2)')
        for (let i = 0; i < bullets.length; i += 1) {
          api.rect(bullets[i].x, bullets[i].y - 1, 10, 3, C.accent2)
        }
        for (let i = 0; i < enemies.length; i += 1) {
          const e = enemies[i]
          api.rect(e.x - 14, e.y - 5, 28, 10, C.warn)
          api.circle(e.x, e.y - 8, 7, C.warn)
          api.circle(e.x, e.y - 8, 3, C.bg)
          api.rect(e.x - 8, e.y + 5, 16, 3, 'rgba(255,122,122,0.45)')
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? p.c : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 330, { size: 13 + popT * 9, color: popColor, align: 'center', weight: 'bold' })
        }
        api.rect(0, api.h - 20, api.w, 20, C.panel)
        api.text('up/down · space fires · protect the humans', api.w / 2, api.h - 10, {
          size: 10, color: C.dim, align: 'center',
        })
      },
    }
  },
})
