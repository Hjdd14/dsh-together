defineGame({
  id: 'td3d',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const SLOTS = [{ x: 2.6, z: -2.2 }, { x: -2.6, z: 2.2 }]
    const PATH_START = -11
    const PATH_END = 11
    const RANGE = 6.2

    const towers = []
    const enemies = []
    const shots = []
    const parts = []
    let hp = 3
    let wave = 0
    let waveActive = false
    let spawnIdx = 0
    let spawnTimer = 0
    let shotsDown = 0
    let dead = false
    let reason = ''
    let shake = 0
    let flash = 0

    function place() {
      if (dead) return
      if (towers.length >= SLOTS.length) return
      const slot = SLOTS[towers.length]
      towers.push({ x: slot.x, z: slot.z, cd: 0.4 })
      api.setStatus('towers ' + towers.length + '/' + SLOTS.length)
    }

    api.onPointer((event) => {
      if (event.type === 'down') place()
    })

    api.setStatus('click to build · towers 0/2')

    function spawnEnemy() {
      enemies.push({
        x: 0,
        y: 0.5,
        z: PATH_START + api.rnd(-0.4, 0.4),
        hp: 2,
        speed: api.rnd(2.1, 2.7),
        phase: api.rnd(0, 6.28),
      })
    }

    function burst(x, y, z, color, count) {
      for (let i = 0; i < count && parts.length < 40; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        parts.push({
          x: x + Math.cos(a) * 0.2,
          y: y + api.rnd(0, 0.5),
          z: z + Math.sin(a) * 0.2,
          vy: api.rnd(1.2, 2.6),
          life: api.rnd(0.25, 0.5),
          max: 0.5,
          c: color,
        })
      }
    }

    return {
      update(dt) {
        if (dead) return
        if (flash > 0) flash = Math.max(0, flash - dt * 3)
        if (shake > 0) shake = Math.max(0, shake - dt * 2.6)

        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.life -= dt
          if (p.life <= 0) { parts.splice(i, 1); continue }
          p.y += p.vy * dt
          p.vy -= 3.5 * dt
        }
        for (let i = shots.length - 1; i >= 0; i -= 1) {
          shots[i].life -= dt
          if (shots[i].life <= 0) shots.splice(i, 1)
        }

        if (!waveActive && wave < 3) {
          waveActive = true
          spawnIdx = 0
          spawnTimer = 0.3
          api.setStatus('wave ' + (wave + 1) + '/3')
        }
        if (waveActive && spawnIdx < 3) {
          spawnTimer -= dt
          if (spawnTimer <= 0) {
            spawnEnemy()
            spawnIdx += 1
            spawnTimer = 0.95
          }
        }

        for (let i = enemies.length - 1; i >= 0; i -= 1) {
          const e = enemies[i]
          e.z += e.speed * dt
          e.y = 0.5 + Math.sin(api.now() / 260 + e.phase) * 0.12
          if (e.z > PATH_END) {
            enemies.splice(i, 1)
            hp -= 1
            shake = 0.5
            burst(0, 0.6, PATH_END, '#ff7a7a', 6)
            if (hp <= 0) {
              dead = true
              reason = 'they got through'
              api.lose(reason)
              return
            }
            api.setStatus('base ' + hp)
          }
        }

        for (let t = 0; t < towers.length; t += 1) {
          const tower = towers[t]
          tower.cd -= dt
          if (tower.cd > 0) continue
          let best = null
          let bestD = RANGE
          for (let i = 0; i < enemies.length; i += 1) {
            const e = enemies[i]
            const d = Math.hypot(e.x - tower.x, e.z - tower.z)
            if (d < bestD) { bestD = d; best = e }
          }
          if (!best) continue
          tower.cd = 0.62
          best.hp -= 1
          shotsDown += 1
          shots.push({ x: tower.x, y: 1.3, z: tower.z, tx: best.x, ty: best.y, tz: best.z, life: 0.14 })
          flash = 1
          if (best.hp <= 0) {
            const idx = enemies.indexOf(best)
            if (idx >= 0) enemies.splice(idx, 1)
            burst(best.x, best.y, best.z, '#ffcf5c', 7)
            shake = Math.max(shake, 0.28)
          }
        }

        if (waveActive && spawnIdx >= 3 && enemies.length === 0) {
          waveActive = false
          wave += 1
          parts.length = 0
          api.progress(1)
          api.setStatus(wave + ' waves held')
          flash = 1
        }
      },
      draw(g) {
        const gl = api.gl
        const t = api.now() / 1000
        const jitter = shake > 0.01 ? Math.sin(api.now() / 35) * shake * 0.28 : 0
        scene.camera({
          fov: 58,
          eye: [0.6, 11 + jitter, 15],
          target: [0, 0.4, 0.5],
        })
        scene.clear('#0b1016')
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

        const box = scene.mesh('box')
        const plane = scene.mesh('plane')

        for (let gx = -4; gx <= 4; gx += 1) {
          for (let gz = -5; gz <= 5; gz += 1) {
            scene.draw(plane, { x: gx * 1.5, y: 0, z: gz * 1.5, sx: 1.42, sz: 1.42 },
              (gx + gz) % 2 === 0 ? '#16202b' : '#101922')
          }
        }
        for (let z = -11; z <= 11; z += 1) {
          scene.draw(plane, { x: 0, y: 0.02, z, sx: 1.1, sz: 0.55 }, z % 2 === 0 ? '#2b3a4a' : '#1d2a36')
        }
        scene.draw(box, { x: 0, y: 0.35, z: PATH_END + 0.4, sx: 3.2, sy: 0.7, sz: 0.8 },
          hp <= 1 ? '#ff7a7a' : '#ffcf5c')

        for (let t2 = 0; t2 < SLOTS.length; t2 += 1) {
          const slot = SLOTS[t2]
          const built = t2 < towers.length
          scene.draw(box, { x: slot.x, y: 0.1, z: slot.z, sx: 1.5, sy: 0.2, sz: 1.5 },
            built ? '#4f8ef7' : '#22303d')
          if (!built) {
            const pulse = 0.55 + Math.sin(t * 3 + t2) * 0.2
            scene.draw(box, { x: slot.x, y: 0.18, z: slot.z, sx: 0.4 * pulse, sy: 0.1, sz: 0.4 * pulse }, '#7fa6cc')
            continue
          }
          scene.draw(box, { x: slot.x, y: 0.85, z: slot.z, sx: 0.75, sy: 1.5, sz: 0.75 }, '#4f8ef7')
          const tower = towers[t2]
          scene.draw(box, { x: slot.x, y: 1.7, z: slot.z, s: 0.9 },
            tower.cd > 0.4 ? '#e8eef6' : '#6aa9ff')
          if (tower.cd > 0.42) {
            scene.draw(box, { x: slot.x, y: 1.7, z: slot.z, s: 1.2 }, '#ffd66b')
          }
        }

        for (let i = 0; i < enemies.length; i += 1) {
          const e = enemies[i]
          scene.draw(box, { x: e.x, y: e.y, z: e.z, s: 0.9 }, e.hp > 1 ? '#ff7a7a' : '#ffcf5c')
          scene.draw(box, { x: e.x, y: e.y + 0.62, z: e.z, s: 0.34 }, '#e8eef6')
        }
        for (let i = 0; i < shots.length; i += 1) {
          const s = shots[i]
          scene.draw(box, { x: s.tx, y: s.ty, z: s.tz, s: 0.26 }, '#fff2c4')
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = p.life / p.max
          scene.draw(box, { x: p.x, y: p.y, z: p.z, s: 0.16 + k * 0.16 }, p.c)
        }
        if (flash > 0.5) {
          scene.draw(box, { x: 0, y: 3.2, z: 0, s: 0.2 }, '#ffffff')
        }
      },
      dispose() {
        towers.length = 0
        enemies.length = 0
        shots.length = 0
        parts.length = 0
      },
    }
  },
})
