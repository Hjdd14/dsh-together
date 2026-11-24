defineGame({
  id: 'race3d',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const car = { x: 0, vx: 0 }
    const gates = []
    const cones = []
    let speed = 17
    let dist = 0
    let passed = 0
    let hits = 0
    let gateT = 3.2
    let coneT = 1.8
    let over = false
    let shake = 0
    let flash = 0
    let t = 0
    let lastSecond = -1

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.6)
      flash = Math.max(0, flash - dt * 4)
      if (over) return
      t += dt
      const braking = api.down('space')
      const target = braking ? 9 : 17 + Math.min(6, t * 0.12)
      speed += (target - speed) * Math.min(1, dt * 2.2)
      const steer = 3.4 * dt
      if (api.down('left')) car.x -= steer
      if (api.down('right')) car.x += steer
      car.x = Math.max(-3.2, Math.min(3.2, car.x))
      dist += speed * dt

      gateT -= dt
      if (gateT <= 0) {
        gateT = 6.5
        gates.push({ z: -74, x: api.rnd(-2, 2), w: 2.4, done: false })
      }
      coneT -= dt
      if (coneT <= 0) {
        coneT = api.rnd(1.3, 2.2)
        cones.push({ z: -74, x: api.rnd(-3, 3) })
      }

      for (let i = gates.length - 1; i >= 0; i -= 1) {
        const g = gates[i]
        g.z += speed * dt
        if (!g.done && g.z > -0.4) {
          g.done = true
          if (Math.abs(car.x - g.x) < g.w) {
            passed += 1
            flash = 1
            shake = Math.min(1, shake + 0.4)
            api.progress(1)
            api.setStatus('GATE ' + passed + '/3')
          } else {
            api.setStatus('GATE MISSED')
          }
        }
        if (g.z > 8) gates.splice(i, 1)
      }

      for (let i = cones.length - 1; i >= 0; i -= 1) {
        const c = cones[i]
        c.z += speed * dt
        if (c.z > 8) {
          cones.splice(i, 1)
          continue
        }
        if (Math.abs(c.z) < 0.9 && Math.abs(c.x - car.x) < 0.85) {
          cones.splice(i, 1)
          hits += 1
          speed = Math.max(6, speed * 0.55)
          shake = 1
          flash = 1
          if (hits >= 3) {
            over = true
            api.lose('three cone hits')
            return
          }
        }
      }

      const second = Math.floor(t)
      if (second !== lastSecond) {
        lastSecond = second
        api.setStatus('GATE ' + passed + '/3  SPD ' + speed.toFixed(0))
      }
    }

    function draw(g) {
      const gl = api.gl
      const jitter = shake > 0.01 ? Math.sin(api.now() / 45) * shake * 0.3 : 0
      scene.camera({
        fov: 62,
        eye: [car.x * 0.5 + jitter, 2.6, 7.6],
        target: [car.x * 0.3, 1.1, -12],
      })
      scene.clear('#080e14')
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

      const box = scene.mesh('box')
      const plane = scene.mesh('plane')

      scene.draw(plane, { x: 0, y: 0, z: -30, sx: 8, sz: 78 }, '#141d26')
      for (let side = -1; side <= 1; side += 2) {
        scene.draw(box, { x: side * 4.1, y: 0.16, z: -30, sx: 0.3, sz: 78, sy: 0.18 }, '#3d5568')
        scene.draw(box, { x: side * 4.9, y: 0.5, z: -30, sx: 0.22, sz: 78, sy: 0.7 }, '#22303d')
      }
      for (let i = 0; i < 16; i += 1) {
        const z = 4 - ((i * 5 + dist) % 72)
        scene.draw(plane, { x: 0, y: 0.01, z, sx: 0.5, sz: 1.9 }, '#2a3c4d')
      }

      for (const c of cones) {
        if (c.z < -70) continue
        scene.draw(box, { x: c.x, y: 0.32, z: c.z, s: 0.42, sy: 0.6 }, '#ff8b5c')
      }

      for (const g2 of gates) {
        if (g2.z < -70) continue
        const warm = g2.z > -10
        for (let side = -1; side <= 1; side += 2) {
          scene.draw(box, { x: g2.x + side * (g2.w + 0.15), y: 1.1, z: g2.z, sx: 0.16, sy: 2.2, sz: 0.3 }, warm ? '#8bdc7a' : '#4a7f52')
        }
        scene.draw(box, { x: g2.x, y: 2.25, z: g2.z, sx: g2.w * 2 + 0.5, sy: 0.14, sz: 0.28 }, warm ? '#e8eef6' : '#5c7a68')
      }

      scene.draw(plane, { x: car.x, y: 0.02, z: 0, sx: 1.1, sz: 1.6 }, '#05090c')
      scene.draw(box, { x: car.x, y: 0.42, z: 0, sx: 1.3, sy: 0.45, sz: 2.2 }, flash > 0.4 ? '#ffffff' : '#f26d5b')
      scene.draw(box, { x: car.x, y: 0.82, z: 0.15, sx: 0.85, sy: 0.4, sz: 1.1 }, '#cfe3f5')
      scene.draw(box, { x: car.x, y: 0.3, z: 1.15, sy: 0.2, sx: 1.2, sz: 0.25 }, '#ffe9a3')

      if (flash > 0) scene.draw(plane, { x: car.x, y: 0.04, z: -14, sx: 14, sz: 20 }, '#2f4a3a')
    }

    return { update, draw }
  },
})
