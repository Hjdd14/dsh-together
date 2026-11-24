defineGame({
  id: 'duckhunt',
  create(api) {
    const C = api.colors
    const TOP = 74
    const BOTTOM = 246
    const GRASS = 268
    let ducks = []
    let hits = 0
    let escaped = 0
    let roundLeft = 3
    let spawnT = 1.1
    let t = 0
    let shots = 0
    let flashT = 0
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let lost = false
    let combo = 0
    let best = 0
    let cross = { x: 240, y: 160, age: 99 }
    const parts = []
    const clouds = []

    for (let i = 0; i < 5; i += 1) {
      clouds.push({ x: api.rnd(0, 480), y: api.rnd(80, 180), w: api.rnd(34, 66), s: api.rnd(4, 9) })
    }

    function burst(x, y, n, color) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(50, 190)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
          life: api.rnd(0.35, 0.8), age: 0, r: api.rnd(1.4, 3.2), c: color || C.accent2,
        })
      }
      while (parts.length > 80) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.75
    }

    function die(why) {
      if (lost) return
      lost = true
      api.lose(why)
    }

    function spawnDuck() {
      const x = api.rnd(120, 380)
      ducks.push({
        x,
        y: GRASS - 10,
        vx: api.rng() < 0.5 ? -80 : 80,
        vy: -110,
        phase: api.rnd(0, 6.28),
        flip: api.rnd(0.5, 1.1),
        life: api.rnd(3.6, 5),
      })
      roundLeft -= 1
    }

    api.onPointer((ev) => {
      if (ev.type !== 'down' || lost) return
      cross.x = ev.x
      cross.y = ev.y
      cross.age = 0
      shots += 1
      for (let i = ducks.length - 1; i >= 0; i -= 1) {
        const d = ducks[i]
        if (Math.abs(d.x - ev.x) < 26 && Math.abs(d.y - ev.y) < 26) {
          ducks.splice(i, 1)
          hits += 1
          api.progress(1)
          combo += 1
          best = Math.max(best, combo)
          burst(d.x, d.y, 16)
          pop(combo >= 4 ? 'STREAK x' + combo : 'HIT', C.good)
          return
        }
      }
      combo = 0
      burst(ev.x, ev.y, 4, C.dim)
      pop('MISS', C.dim)
    })

    return {
      update(dt) {
        t += dt
        if (lost) return
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        if (cross.age < 9) cross.age += dt
        for (let i = 0; i < clouds.length; i += 1) {
          clouds[i].x += clouds[i].s * dt
          if (clouds[i].x > 520) clouds[i].x = -70
        }
        if (roundLeft > 0 && ducks.length < 2 && spawnT <= 0) {
          spawnDuck()
          spawnT = 0.9
        }
        spawnT -= dt
        if (roundLeft <= 0 && ducks.length === 0) {
          roundLeft = 3
          spawnT = 0.8
        }
        for (let i = ducks.length - 1; i >= 0; i -= 1) {
          const d = ducks[i]
          d.life -= dt
          d.flip -= dt
          if (d.flip <= 0) {
            d.flip = api.rnd(0.5, 1.1)
            d.vx = -d.vx
          }
          d.x += d.vx * dt
          d.phase += 2.4 * dt
          d.vy += 240 * dt
          if (d.vy > 90) d.vy = 90
          d.y += d.vy * dt
          if (d.y > BOTTOM) {
            d.y = BOTTOM
            d.vy = -Math.abs(d.vy) * 0.8
          }
          if (d.y < TOP) {
            d.y = TOP
            d.vy = Math.abs(d.vy) * 0.7
          }
          if (d.x < 26) {
            d.x = 26
            d.vx = Math.abs(d.vx)
          }
          if (d.x > 454) {
            d.x = 454
            d.vx = -Math.abs(d.vx)
          }
          if (d.life <= 0) {
            ducks.splice(i, 1)
            escaped += 1
            combo = 0
            flashT = 0.4
            pop('GOT AWAY', C.warn)
            if (escaped >= 3) die('too many misses')
          }
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 300 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        api.rect(0, 54, api.w, GRASS - 54, '#131b24')
        for (let i = 0; i < clouds.length; i += 1) {
          const cl = clouds[i]
          api.circle(cl.x, cl.y, cl.w * 0.28, 'rgba(232,238,246,0.08)')
          api.circle(cl.x + cl.w * 0.3, cl.y + 4, cl.w * 0.22, 'rgba(232,238,246,0.06)')
        }
        api.rect(0, GRASS, api.w, api.h - GRASS, '#16220f')
        for (let i = 0; i < 26; i += 1) {
          const x = (i * 19 + Math.sin(t * 0.6 + i) * 3) % 484
          api.rect(x, GRASS + 4 + (i % 4) * 12, 3, 12, 'rgba(96,200,120,0.35)')
        }
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('DUCK HUNT', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('down ' + hits, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        api.text('missed ' + escaped + '/3', 236, 27, {
          size: 14, color: escaped >= 2 ? C.warn : C.dim, weight: 'bold',
        })
        if (combo > 1) api.text('x' + combo, 150, 27, { size: 14, color: C.good, weight: 'bold' })
        for (let i = 0; i < ducks.length; i += 1) {
          const d = ducks[i]
          const flap = Math.sin(t * 9 + d.phase) * 6
          api.circle(d.x, d.y, 9, '#3c4a56')
          api.rect(d.x - 2, d.y - 16, 5, 10, '#3c4a56')
          api.rect(d.x + 5, d.y - 9, 9, 4, C.accent2)
          api.rect(d.x - 16, d.y - 6 + flap * 0.4, 14, 7, '#2b3540')
          api.rect(d.x + 2, d.y - 6 - flap * 0.4, 14, 7, '#2b3540')
          api.circle(d.x - 5, d.y - 4, 2, C.fg)
        }
        if (cross.age < 0.35) {
          const k = 1 - cross.age / 0.35
          api.circle(cross.x, cross.y, 12 + (1 - k) * 16, 'rgba(255,207,92,0.25)')
          api.rect(cross.x - 14, cross.y - 1, 28, 2, 'rgba(255,207,92,0.7)')
          api.rect(cross.x - 1, cross.y - 14, 2, 28, 'rgba(255,207,92,0.7)')
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? p.c : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, api.w / 2, 118, { size: 15 + popT * 10, color: popColor, align: 'center', weight: 'bold' })
        }
        api.rect(0, api.h - 20, api.w, 20, C.panel)
        api.text('click the ducks · ' + Math.max(0, roundLeft) + ' left this round · shots ' + shots, api.w / 2, api.h - 10, {
          size: 10, color: C.dim, align: 'center',
        })
      },
    }
  },
})
