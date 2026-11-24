defineGame({
  id: 'subwaysurf',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const box = scene.mesh('box')
    const plane = scene.mesh('plane')
    const ball = scene.mesh('sphere', 10)

    const LANES = [-2.4, 0, 2.4]
    const cars = []
    let time = 0
    let lane = 1
    let px = 0
    let py = 0
    let vy = 0
    let air = false
    let invuln = 1.2
    let dead = false
    let speed = 15
    let spawn = 1.6
    let shake = 0
    let flash = 0
    let passed = 0

    function hop() {
      if (dead || air) return
      air = true
      vy = 8.6
    }

    function slide(dir) {
      if (dead) return
      const next = Math.max(0, Math.min(2, lane + dir))
      if (next !== lane) lane = next
    }

    function pushCar() {
      const kind = api.rng() < 0.42 ? 1 : 0 // 1 = 长车厢（必须换轨）, 0 = 栏杆（可跳）
      cars.push({ lane: api.irnd(0, 2), z: -64, kind, done: false, len: kind === 1 ? 9 : 0.7 })
      // 长车厢挡住的那条轨，短暂不给同一轨再来一个
      const last = cars[cars.length - 1]
      if (last.kind === 0 && api.rng() < 0.35) cars.push({ lane: api.irnd(0, 2), z: -84, kind: 0, done: false, len: 0.7 })
    }

    api.onKey((key, down, ev) => {
      if (!down || dead || (ev && ev.repeat)) return
      if (key === 'left') slide(-1)
      else if (key === 'right') slide(1)
      else if (key === 'space' || key === 'up') hop()
    })
    api.onPointer((event) => {
      if (event.type === 'down') hop()
    })

    return {
      update(dt) {
        if (dead) return
        time += dt
        invuln = Math.max(0, invuln - dt)
        shake = Math.max(0, shake - dt * 3)
        flash = Math.max(0, flash - dt * 3.5)

        px += (LANES[lane] - px) * Math.min(1, dt * 14)
        if (air) {
          py += vy * dt - 13 * dt * dt
          vy -= 26 * dt
          if (py <= 0) {
            py = 0
            vy = 0
            air = false
          }
        }

        speed = Math.min(26, 15 + time * 0.5)
        for (let i = 0; i < cars.length; i += 1) {
          const c = cars[i]
          const z0 = c.z
          c.z += speed * dt
          if (c.done) continue
          const sameLane = Math.abs(px - LANES[c.lane]) < 1.1
          if (c.kind === 1) {
            if (sameLane && c.z > -c.len && c.z < 2.6) {
              if (invuln > 0) continue
              dead = true
              shake = 0.9
              api.lose('train')
              return
            }
          } else if (z0 < 1.1 && c.z > -1) {
            c.done = true
            if (sameLane && py < 1.02) {
              if (invuln > 0) continue
              dead = true
              shake = 0.9
              api.lose('fence')
              return
            }
            passed += 1
            flash = 1
          }
        }
        while (cars.length > 0 && cars[0].z > 12) cars.shift()

        spawn -= dt
        if (spawn <= 0) {
          pushCar()
          spawn = Math.max(1.5, 2.6 - time * 0.03)
        }
        api.setStatus(Math.floor(time) + 's  rail ' + (lane + 1) + '  clear ' + passed)
      },

      draw(g) {
        const gl = api.gl
        if (gl && gl.viewport) gl.viewport(0, 0, gl.drawingBufferWidth || 480, gl.drawingBufferHeight || 360)
        const jitter = shake > 0.01 ? Math.sin(time * 68) * shake * 0.6 : 0
        scene.camera({
          fov: 58,
          eye: [px * 0.45, 5.1 + jitter, 9.2],
          target: [px * 0.32, py * 0.7 + 1.1, -7.5],
        })
        scene.light([0.3, 1, 0.45])
        scene.clear('#0d1219')

        // 地面
        const scroll = (time * speed) % 3.2
        for (let i = 0; i < 15; i += 1) {
          const z = -scroll - i * 3.2
          scene.draw(plane, { x: 0, y: 0, z, sx: 8.6, sz: 3.1 }, i % 2 === 0 ? '#1e2836' : '#182231')
        }
        // 枕木
        for (let i = 0; i < 12; i += 1) {
          const z = -((time * speed) % 2.6) - i * 2.6
          scene.draw(box, { x: 0, y: 0.07, z, sx: 7.4, sy: 0.14, sz: 0.42 }, '#2c3a4d')
        }
        // 三轨（双钢轨）
        for (let l = 0; l < 3; l += 1) {
          for (let s = -1; s <= 1; s += 2) {
            scene.draw(box, { x: LANES[l] + s * 0.52, y: 0.14, z: -30, sx: 0.1, sy: 0.1, sz: 62 }, l === lane ? '#ffcf5c' : '#6f8296')
          }
        }
        // 侧墙灯
        for (let i = 0; i < 5; i += 1) {
          const z = -((time * speed) % 16) - i * 16
          for (let s = -1; s <= 1; s += 2) {
            scene.draw(box, { x: s * 5.4, y: 3.2, z, sx: 0.5, sy: 2.4, sz: 3.2 }, '#23303f')
            scene.draw(ball, { x: s * 5.4, y: 4.5, z, s: 0.34 }, flash > 0.5 ? '#ffffff' : '#8bdc7a')
          }
        }
        // 车厢 / 栏杆
        for (let i = 0; i < cars.length; i += 1) {
          const c = cars[i]
          const x = LANES[c.lane]
          if (c.kind === 1) {
            scene.draw(box, { x, y: 1.5, z: c.z - c.len / 2, sx: 2.1, sy: 3, sz: c.len }, '#3f7bd6')
            scene.draw(box, { x, y: 1.5, z: c.z - c.len / 2, sx: 2.16, sy: 2.5, sz: c.len - 0.6 }, '#2a5596')
            for (let w = 0; w < 3; w += 1) {
              scene.draw(box, { x: x - 1.02, y: 1.9, z: c.z - c.len + 1.4 + w * 2.6, sx: 0.06, sy: 0.7, sz: 1.4 }, '#bcd8ff')
            }
          } else {
            scene.draw(box, { x, y: 0.55, z: c.z, sx: 2.1, sy: 0.16, sz: 0.14 }, '#ffcf5c')
            scene.draw(box, { x, y: 0.28, z: c.z, sx: 2.1, sy: 0.16, sz: 0.14 }, '#ffcf5c')
            scene.draw(box, { x: x - 1, y: 0.5, z: c.z, sx: 0.14, sy: 1, sz: 0.14 }, '#c9a13c')
            scene.draw(box, { x: x + 1, y: 0.5, z: c.z, sx: 0.14, sy: 1, sz: 0.14 }, '#c9a13c')
          }
        }
        // 玩家
        scene.draw(box, { x: px, y: py + 0.6, z: 0, sx: 0.6, sy: 1, sz: 0.5, rz: (LANES[lane] - px) * 0.4 }, flash > 0.6 ? '#ffffff' : '#ff7a4f')
        scene.draw(ball, { x: px, y: py + 1.4, z: 0, s: 0.4 }, '#e8eef6')
        scene.draw(box, { x: px, y: py + 0.06, z: 0.05, sx: 0.9, sy: 0.1, sz: 1.1 }, '#8bdc7a')
        scene.draw(box, { x: px - 0.24, y: py + 0.1, z: 0.36, sx: 0.16, sy: 0.36, sz: 0.18, rz: Math.sin(time * 16) * 0.6 }, '#243244')
        scene.draw(box, { x: px + 0.24, y: py + 0.1, z: 0.36, sx: 0.16, sy: 0.36, sz: 0.18, rz: -Math.sin(time * 16) * 0.6 }, '#243244')
      },
    }
  },
})
