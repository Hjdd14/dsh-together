defineGame({
  id: 'brick3d',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const COLS = 6
    const ROWS = 4
    const BRICK_Z = -6
    const PAD_Z = 4.6
    const PAD_W = 1.5
    const BALL_R = 0.22
    const LIMIT_X = 4.1
    const TOP_Y = 5.6

    const bricks = []
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        bricks.push({
          x: (c - (COLS - 1) / 2) * 1.12,
          y: 1.3 + r * 1.06,
          tint: r,
          alive: true,
        })
      }
    }
    const TINTS = ['#4f8ef7', '#8bdc7a', '#ffcf5c', '#ff9f7a']

    let padX = 0
    let lives = 3
    let broken = 0
    let dead = false
    let reason = ''
    let serveTimer = 0.5
    let shake = 0
    let flash = 0
    let padFlash = 0
    let missFlash = 0
    let speedScale = 1
    const ball = { x: 0, y: 2.6, z: PAD_Z - 0.9, vx: 1.5, vy: 1.8, vz: -9 }
    const parts = []

    function serve() {
      ball.x = padX
      ball.y = 2.6
      ball.z = PAD_Z - 0.9
      const ang = api.rnd(-0.5, 0.5)
      ball.vx = Math.sin(ang) * 5
      ball.vy = Math.cos(ang) * 3.4 + 1.2
      ball.vz = -9 * speedScale
      serveTimer = 0.4
    }

    function burst(x, y, z, color, count) {
      for (let i = 0; i < count && parts.length < 44; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        parts.push({
          x: x + Math.cos(a) * 0.25,
          y: y + Math.sin(a) * 0.25,
          z,
          vy: api.rnd(0.8, 2.2),
          vz: api.rnd(-1.4, 1.4),
          life: api.rnd(0.24, 0.5),
          max: 0.5,
          c: color,
        })
      }
    }

    serve()
    api.setStatus('bricks 0 · life 3')

    return {
      update(dt) {
        if (dead) return
        if (flash > 0) flash = Math.max(0, flash - dt * 3.2)
        if (padFlash > 0) padFlash = Math.max(0, padFlash - dt * 4)
        if (missFlash > 0) missFlash = Math.max(0, missFlash - dt * 1.6)
        if (shake > 0) shake = Math.max(0, shake - dt * 2.8)

        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.life -= dt
          if (p.life <= 0) { parts.splice(i, 1); continue }
          p.y += p.vy * dt
          p.z += p.vz * dt
          p.vy -= 3 * dt
        }

        const dir = (api.down('right') ? 1 : 0) - (api.down('left') ? 1 : 0)
        padX += dir * 7.2 * dt
        if (padX < -LIMIT_X + PAD_W / 2) padX = -LIMIT_X + PAD_W / 2
        if (padX > LIMIT_X - PAD_W / 2) padX = LIMIT_X - PAD_W / 2

        if (serveTimer > 0) {
          serveTimer -= dt
          ball.x = padX
          ball.z = PAD_Z - 0.9
          return
        }

        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        ball.z += ball.vz * dt

        if (ball.x < -LIMIT_X) { ball.x = -LIMIT_X; ball.vx = Math.abs(ball.vx) }
        if (ball.x > LIMIT_X) { ball.x = LIMIT_X; ball.vx = -Math.abs(ball.vx) }
        if (ball.y < 0.6) { ball.y = 0.6; ball.vy = Math.abs(ball.vy) }
        if (ball.y > TOP_Y) { ball.y = TOP_Y; ball.vy = -Math.abs(ball.vy) }

        if (ball.vz < 0 && ball.z <= BRICK_Z + 0.55) {
          let hitIndex = -1
          for (let i = 0; i < bricks.length; i += 1) {
            const b = bricks[i]
            if (!b.alive) continue
            if (Math.abs(ball.x - b.x) > 0.6) continue
            if (Math.abs(ball.y - b.y) > 0.56) continue
            hitIndex = i
            break
          }
          ball.z = BRICK_Z + 0.55
          ball.vz = Math.abs(ball.vz)
          if (hitIndex >= 0) {
            const b = bricks[hitIndex]
            b.alive = false
            broken += 1
            shake = Math.max(shake, 0.24)
            flash = 1
            burst(b.x, b.y, BRICK_Z, TINTS[b.tint], 7)
            api.progress(1)
            api.setStatus('bricks ' + broken + ' · life ' + lives)
            ball.vx += api.rnd(-1.6, 1.6)
            ball.vy += api.rnd(-1.2, 1.2)
            speedScale = Math.min(1.5, speedScale + 0.03)
          }
        }

        if (ball.vz > 0 && ball.z >= PAD_Z - 0.35 && ball.z <= PAD_Z + 0.6
          && Math.abs(ball.x - padX) <= PAD_W / 2 + BALL_R) {
          ball.z = PAD_Z - 0.4
          ball.vz = -Math.abs(ball.vz) * 1.01
          ball.vx = (ball.x - padX) * 3.6
          ball.vy += api.rnd(-0.8, 0.8)
          padFlash = 1
          burst(ball.x, ball.y, PAD_Z, '#e8eef6', 4)
        }

        const sp = Math.hypot(ball.vx, ball.vy)
        if (sp > 11) {
          ball.vx = (ball.vx / sp) * 11
          ball.vy = (ball.vy / sp) * 11
        }

        if (ball.z > PAD_Z + 3.2) {
          lives -= 1
          missFlash = 1
          shake = 0.6
          burst(ball.x, ball.y, PAD_Z + 2.4, '#ff7a7a', 8)
          if (lives <= 0) {
            dead = true
            reason = 'ball lost'
            api.lose(reason)
          } else {
            api.setStatus('bricks ' + broken + ' · life ' + lives)
            serve()
          }
        }
        if (broken >= 24) api.setStatus('wall cleared')
      },
      draw(g) {
        const gl = api.gl
        const t = api.now() / 1000
        const jitter = shake > 0.01 ? Math.sin(api.now() / 40) * shake * 0.2 : 0
        scene.camera({
          fov: 56,
          eye: [0, 6.4 + jitter, 12.5],
          target: [0, 3, -2],
        })
        scene.clear('#0b1016')
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

        const box = scene.mesh('box')
        const plane = scene.mesh('plane')
        const sphere = scene.mesh('sphere')

        scene.draw(plane, { x: 0, y: 0, z: -1, sx: 9, sz: 13 }, '#101a24')
        for (let c = -4; c <= 4; c += 1) {
          scene.draw(box, { x: c * 1.05, y: 0.02, z: -1, sx: 0.9, sy: 0.03, sz: 12 },
            c % 2 === 0 ? '#16222e' : '#121c26')
        }
        scene.draw(box, { x: -LIMIT_X - 0.3, y: 3, z: -1, sx: 0.35, sy: 6, sz: 12.5 }, '#1d2b38')
        scene.draw(box, { x: LIMIT_X + 0.3, y: 3, z: -1, sx: 0.35, sy: 6, sz: 12.5 }, '#1d2b38')
        scene.draw(box, { x: 0, y: TOP_Y + 0.3, z: -1, sx: 9, sy: 0.35, sz: 12.5 }, '#1d2b38')

        for (let i = 0; i < bricks.length; i += 1) {
          const b = bricks[i]
          if (!b.alive) continue
          scene.draw(box, { x: b.x, y: b.y, z: BRICK_Z, sx: 1.0, sy: 0.9, sz: 0.55 }, TINTS[b.tint])
          scene.draw(box, { x: b.x, y: b.y + 0.34, z: BRICK_Z, sx: 1.0, sy: 0.16, sz: 0.6 }, '#e8eef6')
        }

        scene.draw(box, {
          x: padX,
          y: 0.75,
          z: PAD_Z,
          sx: PAD_W,
          sy: 0.24,
          sz: 0.9,
        }, padFlash > 0.4 ? '#ffffff' : '#6aa9ff')

        scene.draw(sphere, { x: ball.x, y: ball.y, z: ball.z, s: BALL_R * 2 }, '#fff2c4')
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = p.life / p.max
          scene.draw(box, { x: p.x, y: p.y, z: p.z, s: 0.1 + k * 0.14 }, p.c)
        }
        if (flash > 0.6) {
          scene.draw(box, { x: 0, y: 3.6, z: BRICK_Z, s: 0.26 }, '#ffffff')
        }
        if (missFlash > 0.5) {
          scene.draw(box, { x: 0, y: 0.1, z: PAD_Z + 2.4, sx: 9, sy: 0.06, sz: 1.4 }, '#ff7a7a')
        }
      },
      dispose() { parts.length = 0 },
    }
  },
})
