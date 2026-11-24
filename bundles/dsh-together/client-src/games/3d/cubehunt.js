defineGame({
  id: 'cubehunt',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const ARENA = 9
    const player = { x: 0, z: 0 }
    const cubes = []
    let got = 0
    let clock = 40
    let over = false
    let shake = 0
    let flash = 0
    let t = 0
    let lastSecond = -1

    function spawnCube() {
      for (let i = 0; i < 30; i += 1) {
        const x = api.rnd(-ARENA + 1, ARENA - 1)
        const z = api.rnd(-ARENA + 1, ARENA - 1)
        if (Math.abs(x - player.x) + Math.abs(z - player.z) < 7.5) continue
        cubes.push({ x, z, ph: api.rnd(0, 6.28), live: true })
        return
      }
      cubes.push({ x: 0, z: -ARENA + 2, ph: 0, live: true })
    }
    spawnCube()
    spawnCube()

    function update(dt) {
      shake = Math.max(0, shake - dt * 2.6)
      flash = Math.max(0, flash - dt * 4)
      if (over) return
      t += dt
      clock -= dt
      const sp = 6.4 * dt
      if (api.down('left')) player.x -= sp
      if (api.down('right')) player.x += sp
      if (api.down('up')) player.z -= sp
      if (api.down('down')) player.z += sp
      player.x = Math.max(-ARENA, Math.min(ARENA, player.x))
      player.z = Math.max(-ARENA, Math.min(ARENA, player.z))

      for (const c of cubes) {
        if (!c.live) continue
        const dx = c.x - player.x
        const dz = c.z - player.z
        if (dx * dx + dz * dz < 1.5) {
          c.live = false
          got += 1
          flash = 1
          shake = Math.min(1, shake + 0.45)
          api.progress(1)
          api.setStatus('CUBES ' + got + '/6')
          spawnCube()
        }
      }
      for (let i = cubes.length - 1; i >= 0; i -= 1) if (!cubes[i].live) cubes.splice(i, 1)

      if (clock <= 0) {
        over = true
        api.lose('out of time')
        return
      }
      const second = Math.ceil(clock)
      if (second !== lastSecond) {
        lastSecond = second
        api.setStatus('CUBES ' + got + '/6  TIME ' + second)
      }
    }

    function draw(g) {
      const gl = api.gl
      const jitter = shake > 0.01 ? Math.sin(api.now() / 50) * shake * 0.22 : 0
      scene.camera({
        fov: 58,
        eye: [player.x, 7.4 + jitter, player.z + 8.2],
        target: [player.x, 0.6, player.z],
      })
      scene.clear('#0a0f16')
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

      const box = scene.mesh('box')
      const plane = scene.mesh('plane')

      scene.draw(plane, { x: 0, y: 0, z: 0, sx: ARENA * 2 + 2, sz: ARENA * 2 + 2 }, '#111a23')
      for (let i = -8; i <= 8; i += 2) {
        scene.draw(plane, { x: i, y: 0.01, z: 0, sx: 0.06, sz: ARENA * 1.94 }, '#1a2733')
        scene.draw(plane, { x: 0, y: 0.01, z: i, sx: ARENA * 1.94, sz: 0.06 }, '#1a2733')
      }
      for (let side = -1; side <= 1; side += 2) {
        scene.draw(box, { x: side * (ARENA + 0.5), y: 0.5, z: 0, sx: 0.4, sy: 1, sz: ARENA * 2 + 1 }, '#1e2d3c')
        scene.draw(box, { x: 0, y: 0.5, z: side * (ARENA + 0.5), sx: ARENA * 2 + 1, sy: 1, sz: 0.4 }, '#1e2d3c')
      }

      for (const c of cubes) {
        const bob = 0.6 + Math.sin(t * 3 + c.ph) * 0.18
        scene.draw(box, { x: c.x, y: bob, z: c.z, s: 0.62, ry: t * 1.6 + c.ph }, '#ffcf5c')
        scene.draw(plane, { x: c.x, y: 0.02, z: c.z, sx: 1.5, sz: 1.5 }, '#2a2417')
      }

      scene.draw(plane, { x: player.x, y: 0.02, z: player.z, sx: 1.3, sz: 1.3 }, '#05090c')
      scene.draw(box, { x: player.x, y: 0.55, z: player.z, s: 0.8, sy: 1.1 }, flash > 0.4 ? '#ffffff' : '#6aa9ff')
      scene.draw(box, { x: player.x, y: 1.3, z: player.z, sx: 0.3, sy: 0.3, sz: 0.3 }, '#e8eef6')

      if (flash > 0) scene.draw(plane, { x: player.x, y: 0.03, z: player.z, sx: 6, sz: 6 }, '#2f3a2a')
    }

    return { update, draw }
  },
})
