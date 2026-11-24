defineGame({
  id: 'altos',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const box = scene.mesh('box')
    const ball = scene.mesh('sphere', 10)

    const ground = (x) => 1.5 * Math.sin(x * 0.21) + 0.8 * Math.sin(x * 0.093 + 1.2) + 0.35 * Math.sin(x * 0.051)
    const slope = (x) => Math.atan(1.5 * 0.21 * Math.cos(x * 0.21) + 0.8 * 0.093 * Math.cos(x * 0.093 + 1.2) + 0.35 * 0.051 * Math.cos(x * 0.051))
    const norm = (a) => {
      let v = a
      while (v > Math.PI) v -= Math.PI * 2
      while (v < -Math.PI) v += Math.PI * 2
      return v
    }

    const rocks = []
    const spray = []
    let time = 0
    let px = 0
    let py = ground(0)
    let vy = 0
    let rot = slope(0)
    let air = false
    let speed = 9.5
    let dead = false
    let invuln = 1.2
    let shake = 0
    let flash = 0
    let clean = 0
    let holdT = 0
    let nextRock = 14

    function jump() {
      if (dead || air) return
      air = true
      vy = 9
      holdT = 0
    }

    api.onKey((key, down, ev) => {
      if (!down || dead || (ev && ev.repeat)) return
      if (key === 'space' || key === 'enter' || key === 'up') jump()
    })
    api.onPointer((event) => {
      if (event.type === 'down') jump()
    })

    function land() {
      air = false
      vy = 0
      py = ground(px)
      const diff = Math.abs(norm(rot - slope(px)))
      if (diff > 1.5) {
        if (invuln <= 0) {
          dead = true
          shake = 1
          api.lose('bad landing')
          return
        }
      }
      if (diff > 0.55) {
        shake = 0.5
        flash = 1
      } else {
        clean += 1
        flash = 1
        speed = Math.min(20, speed + 0.5)
      }
      rot = slope(px)
      for (let i = 0; i < 6; i += 1) spray.push({ x: px, y: py + 0.1, z: 0, life: 0.4, vx: (i - 2.5) * 1.2, vy: 1.2 })
    }

    return {
      update(dt) {
        if (dead) return
        time += dt
        invuln = Math.max(0, invuln - dt)
        shake = Math.max(0, shake - dt * 3)
        flash = Math.max(0, flash - dt * 3.5)
        for (let i = spray.length - 1; i >= 0; i -= 1) {
          const s = spray[i]
          s.life -= dt
          s.x += s.vx * dt
          s.y += s.vy * dt
          s.vy -= 6 * dt
          if (s.life <= 0) spray.splice(i, 1)
        }

        const holding = api.down('space') || api.down('enter') || api.down('up')
        if (air) {
          if (holding) {
            rot += 5.2 * dt
            holdT += dt
            speed = Math.min(22, speed + 2.6 * dt)
          }
          py += vy * dt - 10 * dt * dt
          vy -= 20 * dt
        } else {
          speed = Math.min(20, speed + 0.35 * dt)
          rot = slope(px)
          if (holding) speed = Math.min(22, speed + 1.2 * dt)
          py = ground(px)
        }

        px += speed * dt
        if (air && py <= ground(px)) {
          land()
          if (dead) return
        }
        if (!air) py = ground(px)

        // 敌石（必须跳过去）
        if (px > nextRock - 26) {
          rocks.push({ x: nextRock, hit: false })
          nextRock += api.rnd(13, 20)
        }
        for (let i = 0; i < rocks.length; i += 1) {
          const r = rocks[i]
          if (r.hit) continue
          if (Math.abs(px - r.x) < 0.72 && !air) {
            r.hit = true
            if (invuln > 0) continue
            dead = true
            shake = 1
            api.lose('rock')
            return
          }
          if (r.x < px - 8) r.hit = true
        }
        while (rocks.length > 6) rocks.shift()

        api.setStatus(
          Math.floor(time) + 's  ' + Math.round(speed * 3.6) + 'km/h  land ' + clean
        )
      },

      draw(g) {
        const gl = api.gl
        if (gl && gl.viewport) gl.viewport(0, 0, gl.drawingBufferWidth || 480, gl.drawingBufferHeight || 360)
        const jitter = shake > 0.01 ? Math.sin(time * 90) * shake * 0.4 : 0
        const gy = ground(px)
        scene.camera({
          fov: 55,
          eye: [px + 1.2, gy + 3.9 + jitter, 11.5],
          target: [px + 5, gy + 1.4, 0],
        })
        scene.light([0.5, 1, 0.5])
        scene.clear('#101a2b')

        // 远山
        for (let i = 0; i < 3; i += 1) {
          const mx = px + i * 26 - 6
          scene.draw(box, { x: mx, y: ground(mx) + 3.2, z: -26, sx: 18, sy: 7 - i * 1.4, sz: 6, rz: 0.12 }, '#1d2c44')
        }
        // 低多边形坡道
        for (let i = 0; i < 18; i += 1) {
          const x = px - 4 + i * 1.5
          const y = ground(x)
          const a = slope(x)
          scene.draw(box, { x, y: y - 0.22, z: 0, sx: 1.55, sy: 0.44, sz: 3.4, rz: a }, i % 2 === 0 ? '#f2f6ff' : '#dde7f7')
          scene.draw(box, { x, y: y - 1.2, z: 0, sx: 1.55, sy: 1.6, sz: 3.2, rz: a }, '#2b3f63')
        }
        // 松树
        for (let i = 0; i < 6; i += 1) {
          const x = Math.floor((px + i * 4.5) / 4.5) * 4.5 + i * 0.7
          const y = ground(x)
          scene.draw(box, { x, y: y + 1.1, z: -4.2, sx: 0.7, sy: 2.2, sz: 0.7 }, '#1f6b52')
          scene.draw(box, { x, y: y + 2.4, z: -4.2, sx: 0.42, sy: 1.1, sz: 0.42 }, '#2b8c69')
        }
        // 岩石
        for (let i = 0; i < rocks.length; i += 1) {
          const r = rocks[i]
          if (r.x < px - 8) continue
          scene.draw(box, { x: r.x, y: ground(r.x) + 0.35, z: 0, sx: 0.9, sy: 0.7, sz: 0.9, rz: 0.4 }, '#5b6b82')
          scene.draw(box, { x: r.x + 0.2, y: ground(r.x) + 0.6, z: 0.1, sx: 0.45, sy: 0.4, sz: 0.5, rz: -0.3 }, '#7b8ca3')
        }
        // 雪雾
        for (let i = 0; i < spray.length; i += 1) {
          const s = spray[i]
          scene.draw(ball, { x: s.x, y: s.y, z: s.z, s: 0.1 + s.life * 0.16 }, '#e8f2ff')
        }
        // 滑手 + 板
        scene.draw(box, { x: px, y: py + 0.06, z: 0.1, sx: 1.5, sy: 0.12, sz: 0.42, rz: rot }, flash > 0.6 ? '#ffffff' : '#ffcf5c')
        scene.draw(box, { x: px, y: py + 0.75, z: 0, sx: 0.5, sy: 0.85, sz: 0.42, rz: rot * 0.55 }, '#ff7a4f')
        scene.draw(ball, { x: px, y: py + 1.42, z: 0, s: 0.34 }, '#f6e7d2')
        scene.draw(box, { x: px - 0.05, y: py + 1.05, z: 0, sx: 0.62, sy: 0.14, sz: 0.3, rz: rot * 0.55 }, '#d95a35')
      },
    }
  },
})
