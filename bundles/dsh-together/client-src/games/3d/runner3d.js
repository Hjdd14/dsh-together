defineGame({
  id: 'runner3d',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const GRAV = 24
    const JUMP = 7.6
    const player = { y: 0, vy: 0 }
    const blocks = []
    const decor = []
    let dist = 0
    let speed = 13
    let spawnT = 0.9
    let over = false
    let shake = 0
    let flash = 0
    let t = 0
    let lastSecond = -1

    for (let i = 0; i < 10; i += 1) {
      decor.push({ x: i % 2 === 0 ? -6.4 : 6.4, z: -6 - i * 6, h: 1.2 + (i % 3) * 0.9 })
    }

    function jump() {
      if (over || player.y > 0.01) return
      player.vy = JUMP
    }

    const offKey = api.onKey((key, isDown) => {
      if (key === 'space' && isDown) jump()
    })
    const offPointer = api.onPointer((p) => {
      if (p.type === 'down') jump()
    })

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.6)
      flash = Math.max(0, flash - dt * 4)
      if (over) return
      t += dt
      speed = Math.min(20, 13 + t * 0.42)
      if (player.y > 0 || player.vy > 0) {
        player.vy -= GRAV * dt
        player.y += player.vy * dt
        if (player.y <= 0) {
          player.y = 0
          player.vy = 0
        }
      }
      dist += speed * dt

      spawnT -= dt
      if (spawnT <= 0) {
        spawnT = api.rnd(0.95, 1.45)
        blocks.push({ z: -46, w: api.rnd(0.7, 1.3), h: api.rnd(0.7, 1.1) })
      }

      for (let i = blocks.length - 1; i >= 0; i -= 1) {
        const b = blocks[i]
        b.z += speed * dt
        if (b.z > 6) {
          blocks.splice(i, 1)
          continue
        }
        if (Math.abs(b.z) < 0.72 && player.y < b.h - 0.08) {
          shake = 1
          flash = 1
          over = true
          api.lose('hit an obstacle')
          return
        }
      }

      const second = Math.floor(t)
      if (second !== lastSecond) {
        lastSecond = second
        api.setStatus('RUNNING ' + second + 's')
      }
    }

    function draw(g) {
      const gl = api.gl
      const jitter = shake > 0.01 ? Math.sin(api.now() / 40) * shake * 0.18 : 0
      scene.camera({
        fov: 58,
        eye: [0, 3.5 + jitter, 7.4],
        target: [0, 1.1 + player.y * 0.22, -9],
      })
      scene.clear('#0a1017')
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

      const box = scene.mesh('box')
      const plane = scene.mesh('plane')

      scene.draw(plane, { x: 0, y: 0, z: -26, sx: 15, sz: 70 }, '#121b24')
      for (let i = 0; i < 14; i += 1) {
        const z = 6 - ((i * 4.6 + dist * 1) % 62)
        scene.draw(plane, { x: 0, y: 0.01, z, sx: 0.32, sz: 1.5 }, '#20303f')
      }
      for (let side = -1; side <= 1; side += 2) {
        scene.draw(box, { x: side * 4.6, y: 0.5, z: -26, sy: 1, sz: 66, sx: 0.3 }, '#26374a')
      }

      for (const d of decor) {
        const z = ((d.z + dist) % 62) - 56
        scene.draw(box, { x: d.x, y: d.h / 2, z, s: 0.8, sy: d.h }, '#1c2a38')
      }

      for (const b of blocks) {
        if (b.z < -60) continue
        const hot = b.z > -6
        scene.draw(box, { x: 0, y: b.h / 2, z: b.z, sx: b.w, sy: b.h, sz: 0.7 }, hot ? '#ff8b5c' : '#ffcf5c')
        scene.draw(box, { x: 0, y: b.h + 0.06, z: b.z, sx: b.w * 0.5, sy: 0.06, sz: 0.3 }, '#fff0b8')
      }

      scene.draw(plane, { x: 0, y: 0.02, z: 0, sx: 0.9 - player.y * 0.3, sz: 0.6 - player.y * 0.2 }, '#060a0e')
      scene.draw(box, { x: 0, y: player.y + 0.45, z: 0, s: 0.85, sy: 0.9 }, flash > 0.4 ? '#ffffff' : '#6aa9ff')
      scene.draw(box, { x: 0, y: player.y + 0.2, z: 0.36, s: 0.3, sy: 0.25 }, '#e8eef6')

      if (flash > 0) scene.draw(plane, { x: 0, y: 0.03, z: -8, sx: 16, sz: 30 }, '#7a3b3b')
    }

    return {
      update,
      draw,
      dispose() {
        offKey()
        offPointer()
      },
    }
  },
})
