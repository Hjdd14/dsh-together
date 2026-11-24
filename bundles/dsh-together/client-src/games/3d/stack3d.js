defineGame({
  id: 'stack3d',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const layers = []
    const moving = { x: -3, dir: 1, speed: 1.9, size: 1.6 }
    let over = false
    let shake = 0
    let flash = 0
    const particleBursts = []

    const drop = () => {
      if (over) return
      const top = layers[layers.length - 1]
      const offset = top ? Math.abs(moving.x - top.x) : 0
      if (top && offset > top.size * 0.62) {
        over = true
        shake = 0.5
        api.lose('missed the tower')
        return
      }
      const perfect = top !== undefined && offset < 0.12
      layers.push({ x: moving.x, y: layers.length * 0.5, size: moving.size })
      api.progress(1)
      api.setStatus(perfect ? 'PERFECT' : `layers ${layers.length}`)
      flash = perfect ? 1 : 0.5
      shake = Math.min(0.32, shake + (perfect ? 0.22 : 0.1))
      particleBursts.push({ x: moving.x, y: layers.length * 0.5, life: 0.5, count: perfect ? 10 : 5 })
      while (particleBursts.length > 8) particleBursts.shift()
      moving.size = Math.max(0.7, moving.size - 0.07)
      moving.speed = Math.min(3.4, moving.speed + 0.16)
      if (layers.length >= 20) api.win()
    }

    api.onKey((key, down) => {
      if (!down) return
      if (key === 'space' || key === 'enter' || key === 'up') drop()
    })
    api.onPointer((event) => {
      if (event.type === 'down') drop()
    })

    return {
      update(dt) {
        shake = Math.max(0, shake - dt * 2.4)
        flash = Math.max(0, flash - dt * 3)
        for (let index = particleBursts.length - 1; index >= 0; index -= 1) {
          particleBursts[index].life -= dt
          if (particleBursts[index].life <= 0) particleBursts.splice(index, 1)
        }
        if (over) return
        moving.x += moving.dir * moving.speed * dt
        if (moving.x > 3) { moving.x = 3; moving.dir = -1 }
        if (moving.x < -3) { moving.x = -3; moving.dir = 1 }
      },
      draw(g) {
        const gl = api.gl
        const orbit = Math.sin(api.now() / 2600) * 0.5
        const jitter = shake > 0.01 ? (Math.sin(api.now() / 40) * shake) : 0
        scene.camera({
          fov: 55,
          eye: [Math.sin(orbit) * 9.5, 4.6 + layers.length * 0.22 + jitter, Math.cos(orbit) * 11],
          target: [0, 0.9 + layers.length * 0.24, 0],
        })
        scene.clear('#0b1016')
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

        const box = scene.mesh('box')
        const plane = scene.mesh('plane')
        // stage floor with a subtle grid of tiles
        for (let gx = -3; gx <= 3; gx += 1) {
          for (let gz = -3; gz <= 3; gz += 1) {
            scene.draw(plane, { x: gx * 1.2, y: 0, z: gz * 1.2, sx: 1.14, sz: 1.14 }, (gx + gz) % 2 === 0 ? '#16202b' : '#101922')
          }
        }
        for (let index = 0; index < layers.length; index += 1) {
          const layer = layers[index]
          const isTop = index === layers.length - 1
          scene.draw(box, { x: layer.x, y: layer.y + 0.25, z: 0, sx: layer.size, sy: 0.5, sz: layer.size },
            isTop && flash > 0.02 ? '#ffffff' : (index % 2 === 0 ? '#4f8ef7' : '#ffcf5c'))
        }
        if (!over) {
          scene.draw(box, { x: moving.x, y: layers.length * 0.5 + 0.25, z: 0, sx: moving.size, sy: 0.5, sz: moving.size }, '#e8eef6')
        }
        for (const burst of particleBursts) {
          const alpha = Math.max(0, burst.life / 0.5)
          for (let index = 0; index < burst.count; index += 1) {
            const angle = (index / burst.count) * Math.PI * 2
            const radius = (1 - alpha) * 1.6
            scene.draw(box, {
              x: burst.x + Math.cos(angle) * radius,
              y: burst.y + (1 - alpha) * 1.1,
              z: Math.sin(angle) * radius,
              s: 0.1 + alpha * 0.1,
            }, alpha > 0.5 ? '#ffd66b' : '#7fa6cc')
          }
        }
      },
    }
  },
})
