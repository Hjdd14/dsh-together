defineGame({
  id: 'maze3d',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const R = 0.32
    const WALLS = [
      { x: 0, z: -4.5, w: 9.6, d: 0.6 },
      { x: 0, z: 4.5, w: 9.6, d: 0.6 },
      { x: -4.5, z: 0, w: 0.6, d: 9.6 },
      { x: 4.5, z: 0, w: 0.6, d: 9.6 },
      { x: 0.6, z: -1.55, w: 0.6, d: 4.7 },
      { x: 2.6, z: 2, w: 4.4, d: 0.6 },
    ]
    const GOAL = { x: 3.4, z: 3.3, r: 0.55 }
    const ball = { x: -3.4, y: R, z: -3.4, vx: 0, vz: 0 }
    let tiltX = 0
    let tiltZ = 0
    let pointerTilt = false
    let done = false
    let flash = 0
    let shake = 0
    let spills = 0
    const parts = []

    function tiltFrom(event) {
      const dx = event.x - api.w / 2
      const dy = event.y - api.h / 2
      const len = Math.hypot(dx, dy) || 1
      const strength = Math.min(1, len / 150)
      tiltX = (dx / len) * strength
      tiltZ = (dy / len) * strength
    }

    api.onPointer((event) => {
      if (event.type === 'down') {
        pointerTilt = true
        tiltFrom(event)
      } else if (event.type === 'move' && pointerTilt) {
        tiltFrom(event)
      } else if (event.type === 'up') {
        pointerTilt = false
        tiltX = 0
        tiltZ = 0
      }
    })
    api.onKey((key, isDown) => {
      if (!isDown) return
      pointerTilt = false
      if (key === 'left') { tiltX = -1; tiltZ = 0 }
      else if (key === 'right') { tiltX = 1; tiltZ = 0 }
      else if (key === 'up') { tiltX = 0; tiltZ = -1 }
      else if (key === 'down') { tiltX = 0; tiltZ = 1 }
    })

    api.setStatus('roll to the glow')

    function burst(x, y, z, color, count) {
      for (let i = 0; i < count && parts.length < 36; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        parts.push({
          x: x + Math.cos(a) * 0.15,
          y: y + api.rnd(0, 0.3),
          z: z + Math.sin(a) * 0.15,
          vy: api.rnd(0.8, 2),
          life: api.rnd(0.22, 0.46),
          max: 0.46,
          c: color,
        })
      }
    }

    return {
      update(dt) {
        if (flash > 0) flash = Math.max(0, flash - dt * 2.4)
        if (shake > 0) shake = Math.max(0, shake - dt * 2.6)
        if (done) return
        if (!pointerTilt) {
          let tx = 0
          let tz = 0
          if (api.down('left')) tx -= 1
          if (api.down('right')) tx += 1
          if (api.down('up')) tz -= 1
          if (api.down('down')) tz += 1
          if (tx !== 0 || tz !== 0) { tiltX = tx; tiltZ = tz }
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.life -= dt
          if (p.life <= 0) { parts.splice(i, 1); continue }
          p.y += p.vy * dt
          p.vy -= 3.2 * dt
        }

        ball.vx += tiltX * 11 * dt
        ball.vz += tiltZ * 11 * dt
        const drag = 1 - 1.4 * dt
        ball.vx *= drag
        ball.vz *= drag
        ball.x += ball.vx * dt
        ball.z += ball.vz * dt

        for (let i = 0; i < WALLS.length; i += 1) {
          const w = WALLS[i]
          const halfW = w.w / 2 + R
          const halfD = w.d / 2 + R
          const dx = ball.x - w.x
          const dz = ball.z - w.z
          if (Math.abs(dx) >= halfW || Math.abs(dz) >= halfD) continue
          const penX = halfW - Math.abs(dx)
          const penZ = halfD - Math.abs(dz)
          if (penX < penZ) {
            ball.x = w.x + Math.sign(dx || 1) * halfW
            ball.vx = -ball.vx * 0.45
            if (Math.abs(ball.vx) > 1.6) { shake = 0.18; spills += 0 }
          } else {
            ball.z = w.z + Math.sign(dz || 1) * halfD
            ball.vz = -ball.vz * 0.45
          }
        }

        if (Math.abs(ball.vx) > 5) ball.vx = Math.sign(ball.vx) * 5
        if (Math.abs(ball.vz) > 5) ball.vz = Math.sign(ball.vz) * 5

        if (Math.hypot(ball.x - GOAL.x, ball.z - GOAL.z) < GOAL.r) {
          done = true
          flash = 1
          burst(GOAL.x, 0.4, GOAL.z, '#8bdc7a', 14)
          api.progress(1)
          api.setStatus('home')
          api.win()
        }
      },
      draw(g) {
        const gl = api.gl
        const t = api.now() / 1000
        const jitter = shake > 0.01 ? Math.sin(api.now() / 40) * shake * 0.2 : 0
        scene.camera({
          fov: 55,
          eye: [0, 11.5 + jitter, 9.5],
          target: [0, 0, 0.4],
        })
        scene.clear('#0b1016')
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

        const box = scene.mesh('box')
        const plane = scene.mesh('plane')
        const sphere = scene.mesh('sphere')

        scene.draw(plane, { x: 0, y: 0, z: 0, sx: 10.2, sz: 10.2 }, '#16202b')
        for (let i = -4; i <= 4; i += 1) {
          scene.draw(box, { x: i * 1.1, y: 0.02, z: 0, sx: 0.03, sy: 0.02, sz: 9.4 }, '#1e2c3a')
          scene.draw(box, { x: 0, y: 0.02, z: i * 1.1, sx: 9.4, sy: 0.02, sz: 0.03 }, '#1e2c3a')
        }
        for (let i = 0; i < WALLS.length; i += 1) {
          const w = WALLS[i]
          scene.draw(box, { x: w.x, y: 0.45, z: w.z, sx: w.w, sy: 0.9, sz: w.d }, '#3a4d61')
          scene.draw(box, { x: w.x, y: 0.94, z: w.z, sx: w.w, sy: 0.08, sz: w.d }, '#7fa6cc')
        }
        const pulse = 0.75 + Math.sin(t * 4) * 0.25
        scene.draw(sphere, { x: GOAL.x, y: 0.42, z: GOAL.z, s: GOAL.r * 2 * pulse }, '#8bdc7a')
        scene.draw(sphere, { x: GOAL.x, y: 0.42, z: GOAL.z, s: GOAL.r * 1.1 }, '#e8fff0')
        scene.draw(sphere, { x: ball.x, y: R, z: ball.z, s: R * 2 }, flash > 0.5 ? '#ffffff' : '#ffcf5c')
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = p.life / p.max
          scene.draw(box, { x: p.x, y: p.y, z: p.z, s: 0.1 + k * 0.12 }, p.c)
        }
        if (flash > 0.6) {
          scene.draw(box, { x: GOAL.x, y: 1.2, z: GOAL.z, s: 0.3 }, '#ffffff')
        }
      },
      dispose() { parts.length = 0 },
    }
  },
})
