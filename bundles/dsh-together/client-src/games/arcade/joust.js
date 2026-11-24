defineGame({
  id: 'joust',
  create(api) {
    const GRAVITY = 340
    const FLAP = -132
    const FLAP_COOL = 0.11
    const GROUND = 336
    const R = 13

    const player = { x: api.w / 2, y: 190, vx: 0, vy: 0, face: 1 }
    const foes = []
    let lives = 3
    let invuln = 0
    let flapCool = 0
    let downed = 0
    let dead = false
    let reason = ''
    let shake = 0
    let shx = 0
    let shy = 0
    let hurtFlash = 0
    let wingT = 0
    const parts = []

    function spawnFoe(index) {
      const slots = [
        { x: 92, y: 96, vx: 44 },
        { x: 388, y: 88, vx: -48 },
        { x: 150, y: 178, vx: 36 },
        { x: 330, y: 214, vx: -40 },
      ]
      const s = slots[index % slots.length]
      foes.push({
        x: s.x,
        y: s.y,
        vx: s.vx,
        baseY: s.y,
        phase: api.rnd(0, 6.28),
        alive: true,
        respawn: 0,
      })
    }

    for (let i = 0; i < 2; i += 1) spawnFoe(i)

    function burst(cx, cy, color, count, power) {
      for (let i = 0; i < count && parts.length < 64; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const s = api.rnd(power * 0.3, power)
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: api.rnd(0.26, 0.55), max: 0.55,
          c: color, r: api.rnd(1.4, 3.4),
        })
      }
    }

    function hurt() {
      if (invuln > 0) return
      lives -= 1
      invuln = 1.2
      hurtFlash = 1
      shake = 0.8
      burst(player.x, player.y, api.colors.warn, 14, 180)
      if (lives <= 0) {
        dead = true
        reason = 'hit from below'
        api.lose(reason)
        return
      }
      player.x = api.w / 2
      player.y = 190
      player.vx = 0
      player.vy = -60
      api.setStatus('downs ' + downed + ' · life ' + lives)
    }

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'space' && flapCool <= 0) {
        player.vy = FLAP
        flapCool = FLAP_COOL
        wingT = 1
      }
    })

    api.setStatus('downs 0')

    return {
      update(dt) {
        if (dead) return
        const t = api.now() / 1000
        if (flapCool > 0) flapCool -= dt
        if (invuln > 0) invuln -= dt
        if (wingT > 0) wingT = Math.max(0, wingT - dt * 4)
        if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt * 1.5)
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
          p.vy += 200 * dt
          p.vx *= 1 - 1.6 * dt
        }

        const dir = (api.down('right') ? 1 : 0) - (api.down('left') ? 1 : 0)
        if (dir !== 0) player.face = dir
        player.vx += dir * 420 * dt
        player.vx *= 1 - 2.4 * dt
        player.vy += GRAVITY * dt
        player.x += player.vx * dt
        player.y += player.vy * dt
        if (player.x < R) { player.x = R; player.vx = Math.abs(player.vx) * 0.4 }
        if (player.x > api.w - R) { player.x = api.w - R; player.vx = -Math.abs(player.vx) * 0.4 }
        if (player.y < 30) { player.y = 30; player.vy = 0 }
        if (player.y > GROUND) {
          player.y = GROUND
          player.vy = -150
          hurt()
          if (dead) return
        }

        let aliveCount = 0
        for (let i = 0; i < foes.length; i += 1) if (foes[i].alive) aliveCount += 1
        if (aliveCount < 2 && foes.length < 4) {
          spawnFoe(foes.length)
        }
        for (let i = 0; i < foes.length; i += 1) {
          const f = foes[i]
          if (!f.alive) {
            f.respawn -= dt
            if (f.respawn <= 0) {
              f.alive = true
              f.x = api.rnd(80, api.w - 80)
              f.y = api.rnd(80, 120)
              f.baseY = f.y
              f.vx = api.rng() < 0.5 ? -60 : 60
            }
            continue
          }
          f.x += f.vx * dt
          if (f.x < 60) { f.x = 60; f.vx = Math.abs(f.vx) }
          if (f.x > api.w - 60) { f.x = api.w - 60; f.vx = -Math.abs(f.vx) }
          f.y = f.baseY + Math.sin(t * 1.7 + f.phase) * 26

          const dx = player.x - f.x
          const dy = player.y - f.y
          if (Math.hypot(dx, dy) > R + 18) continue
          if (player.y < f.y + 2) {
            f.alive = false
            f.respawn = 1.2
            downed += 1
            shake = Math.max(shake, 0.4)
            burst(f.x, f.y, api.colors.accent2, 12, 190)
            api.progress(1)
            api.setStatus('downs ' + downed)
            player.vy = -170
          } else if (player.y > f.y + 12) {
            hurt()
            if (dead) return
          }
        }
      },
      draw(g) {
        api.clear(api.colors.bg)
        const t = api.now() / 1000
        api.rect(0, GROUND + 6, api.w, api.h - GROUND, api.colors.panel)
        for (let i = 0; i < 9; i += 1) {
          api.rect(i * 56 + 8, GROUND + 10, 30, 3, api.colors.dim)
        }
        for (let i = 0; i < foes.length; i += 1) {
          const f = foes[i]
          if (!f.alive) continue
          const fx = f.x + shx
          const fy = f.y + shy
          const flap = Math.sin(t * 9 + f.phase) * 6
          g.fillStyle = api.colors.warn
          g.beginPath()
          g.moveTo(fx - 12, fy)
          g.lineTo(fx - 26, fy - 8 - flap)
          g.lineTo(fx - 10, fy + 4)
          g.closePath()
          g.fill()
          g.beginPath()
          g.moveTo(fx + 12, fy)
          g.lineTo(fx + 26, fy - 8 - flap)
          g.lineTo(fx + 10, fy + 4)
          g.closePath()
          g.fill()
          api.circle(fx, fy, 11, api.colors.warn)
          api.circle(fx - 4, fy - 3, 2.4, api.colors.bg)
          api.circle(fx + 4, fy - 3, 2.4, api.colors.bg)
          api.rect(fx - 3, fy + 3, 6, 2, api.colors.bg)
        }
        if (!dead && (invuln <= 0 || Math.floor(api.now() / 90) % 2 === 0)) {
          const px = player.x + shx
          const py = player.y + shy
          const flap = wingT * 16 + 4 + Math.sin(t * 12) * 3
          g.fillStyle = api.colors.good
          g.beginPath()
          g.moveTo(px - 11, py)
          g.lineTo(px - 27 * player.face, py - 10 - flap)
          g.lineTo(px - 9, py + 4)
          g.closePath()
          g.fill()
          g.beginPath()
          g.moveTo(px + 11, py)
          g.lineTo(px + 27 * player.face, py - 10 - flap)
          g.lineTo(px + 9, py + 4)
          g.closePath()
          g.fill()
          api.circle(px, py, 12, api.colors.good)
          api.circle(px - 4, py - 3, 2.6, api.colors.bg)
          api.circle(px + 4, py - 3, 2.6, api.colors.bg)
          api.rect(px - 4, py + 4, 8, 2, api.colors.bg)
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          api.circle(p.x + shx, p.y + shy, p.r * (p.life / p.max), p.c)
        }
        api.text('downs ' + downed, 12, 16, { size: 13, color: api.colors.dim })
        api.text('life ' + (lives > 0 ? lives : 0), api.w - 12, 16, {
          size: 13, color: api.colors.dim, align: 'right',
        })
        if (hurtFlash > 0.5) {
          api.rect(0, 0, api.w, 4, api.colors.warn)
          api.rect(0, api.h - 4, api.w, 4, api.colors.warn)
        }
        if (dead) {
          api.text(reason, api.w / 2, api.h / 2 - 18, {
            size: 14, color: api.colors.dim, align: 'center',
          })
          api.text('LOSE', api.w / 2, api.h / 2 + 16, {
            size: 38, color: api.colors.warn, align: 'center', weight: 'bold',
          })
        }
      },
      dispose() { foes.length = 0; parts.length = 0 },
    }
  },
})
