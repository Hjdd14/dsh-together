defineGame({
  id: 'templerun',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const box = scene.mesh('box')
    const plane = scene.mesh('plane')
    const ball = scene.mesh('sphere', 10)

    const LANES = [-2.3, 0, 2.3]
    const obstacles = []
    const dust = []
    let time = 0
    let lane = 1
    let px = 0
    let py = 0
    let vy = 0
    let air = false
    let invuln = 1.2
    let dead = false
    let speed = 13
    let spawn = 1.5
    let shake = 0
    let flash = 0
    let coins = 0

    function hop() {
      if (dead || air) return
      air = true
      vy = 8.4
      for (let i = 0; i < 4; i += 1) dust.push({ x: px, y: 0.1, z: 0, life: 0.4, vx: (i - 1.5) * 0.6 })
    }

    function slide(dir) {
      if (dead) return
      const next = Math.max(0, Math.min(2, lane + dir))
      if (next !== lane) {
        lane = next
        for (let i = 0; i < 3; i += 1) dust.push({ x: px, y: 0.12, z: 0, life: 0.3, vx: -dir * 0.8 })
      }
    }

    function pushObstacle() {
      const kind = api.rng() < 0.45 ? 1 : 0 // 1 = 高门（必须换道）, 0 = 矮墩（可跳）
      obstacles.push({ lane: api.irnd(0, 2), z: -62, kind, done: false })
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
        for (let i = dust.length - 1; i >= 0; i -= 1) {
          dust[i].life -= dt
          dust[i].y += dt * 1.6
          if (dust[i].life <= 0) dust.splice(i, 1)
        }

        px += (LANES[lane] - px) * Math.min(1, dt * 13)
        if (air) {
          py += vy * dt - 12.5 * dt * dt
          vy -= 25 * dt
          if (py <= 0) {
            py = 0
            vy = 0
            air = false
            for (let i = 0; i < 3; i += 1) dust.push({ x: px, y: 0.1, z: 0, life: 0.35, vx: (i - 1) * 0.7 })
          }
        }

        speed = Math.min(24, 13 + time * 0.55)
        for (let i = 0; i < obstacles.length; i += 1) {
          const o = obstacles[i]
          const z0 = o.z
          o.z += speed * dt
          // 扫掠判定：低帧率下也不会整个跳过判定区
          if (o.done || !(z0 < 1.1 && o.z > -1.1)) continue
          o.done = true
          const sameLane = Math.abs(px - LANES[o.lane]) < 1.05
          const tooLow = py < (o.kind === 1 ? 2.2 : 1.05)
          if (sameLane && tooLow) {
            if (o.kind === 0 && py >= 0.6) continue // 矮墩跨过去了
            if (invuln > 0) continue
            dead = true
            shake = 0.8
            api.lose('hit the gate')
            return
          }
          coins += 1
          flash = 1
        }
        while (obstacles.length > 0 && obstacles[0].z > 9) obstacles.shift()

        spawn -= dt
        if (spawn <= 0) {
          pushObstacle()
          spawn = Math.max(0.78, 1.55 - time * 0.025)
        }
        api.setStatus(Math.floor(time) + 's  lane ' + (lane + 1) + '  dodge ' + coins)
      },

      draw(g) {
        const gl = api.gl
        if (gl && gl.viewport) gl.viewport(0, 0, gl.drawingBufferWidth || 480, gl.drawingBufferHeight || 360)
        const jitter = shake > 0.01 ? Math.sin(time * 70) * shake * 0.55 : 0
        scene.camera({
          fov: 60,
          eye: [px * 0.42, 4.7 + jitter, 8.8],
          target: [px * 0.3, py * 0.7 + 1.15, -7],
        })
        scene.light([0.35, 1, 0.4])
        scene.clear('#0a1016')

        // 石道（滚动）
        const scroll = (time * speed) % 4
        for (let i = 0; i < 17; i += 1) {
          const z = -scroll - i * 4
          scene.draw(plane, { x: 0, y: 0, z, sx: 8.2, sz: 3.9 }, i % 2 === 0 ? '#233042' : '#1a2532')
        }
        // 道线
        scene.draw(box, { x: -1.15, y: 0.03, z: -34, sx: 0.07, sy: 0.04, sz: 68 }, '#3d5570')
        scene.draw(box, { x: 1.15, y: 0.03, z: -34, sx: 0.07, sy: 0.04, sz: 68 }, '#3d5570')
        // 两侧石柱与火盆（滚动）
        for (let i = 0; i < 5; i += 1) {
          const z = -((time * speed) % 12) - i * 12
          for (let s = -1; s <= 1; s += 2) {
            scene.draw(box, { x: s * 5.2, y: 1.5, z, sx: 1.1, sy: 3, sz: 1.1 }, '#2b3a4d')
            scene.draw(ball, { x: s * 5.2, y: 3.3, z, s: 0.5 }, flash > 0.5 ? '#ffcf5c' : '#e2a03f')
          }
        }
        // 障碍
        for (let i = 0; i < obstacles.length; i += 1) {
          const o = obstacles[i]
          const x = LANES[o.lane]
          if (o.kind === 1) {
            scene.draw(box, { x, y: 1.35, z: o.z, sx: 2, sy: 2.7, sz: 0.5 }, '#8d5cff')
            scene.draw(box, { x, y: 1.35, z: o.z - 0.1, sx: 1.6, sy: 2.3, sz: 0.3 }, '#3a2a63')
          } else {
            scene.draw(box, { x, y: 0.38, z: o.z, sx: 2, sy: 0.76, sz: 0.8 }, '#d9643f')
            scene.draw(box, { x, y: 0.8, z: o.z, sx: 1.7, sy: 0.1, sz: 0.6 }, '#ff9a6b')
          }
        }
        // 尘土
        for (let i = 0; i < dust.length; i += 1) {
          const d = dust[i]
          scene.draw(box, { x: d.x + d.vx * (0.4 - d.life), y: d.y, z: d.z, s: 0.12 + d.life * 0.2, sy: 0.1 }, '#6f8296')
        }
        // 跑者
        const lean = (LANES[lane] - px) * 0.35
        scene.draw(box, { x: px, y: py + 0.62, z: 0, sx: 0.62, sy: 1.05, sz: 0.5, rz: lean }, flash > 0.6 ? '#ffffff' : '#4f8ef7')
        scene.draw(ball, { x: px, y: py + 1.42, z: 0, s: 0.42 }, '#e8eef6')
        scene.draw(box, { x: px - 0.26, y: py + 0.12, z: 0.1, sx: 0.16, sy: 0.4, sz: 0.18, rz: Math.sin(time * 14) * 0.5 }, '#2f5fa8')
        scene.draw(box, { x: px + 0.26, y: py + 0.12, z: 0.1, sx: 0.16, sy: 0.4, sz: 0.18, rz: -Math.sin(time * 14) * 0.5 }, '#2f5fa8')
      },
    }
  },
})
