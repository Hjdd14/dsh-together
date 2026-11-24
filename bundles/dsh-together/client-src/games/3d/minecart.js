defineGame({
  id: 'minecart',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const box = scene.mesh('box')
    const plane = scene.mesh('plane')
    const ball = scene.mesh('sphere')
    const LANES = [-1.8, 0, 1.8]
    const SEG_LEN = 26
    const JUMP_TIME = 0.62
    let lane = 1
    let laneX = LANES[1]
    let jumpT = 0
    let dist = 0
    let segs = 0
    let speed = 12
    let obs = []
    let spawnAt = 2
    let scroll = 0
    let over = false
    let shake = 0
    let flash = 0

    function crash() {
      if (over) return
      over = true
      shake = 0.7
      flash = 1
      api.setStatus('CRASHED - restart to ride again')
      api.lose('hit a crate')
    }

    api.onKey(function (key, down) {
      if (!down || over) return
      if (key === 'left') lane = Math.max(0, lane - 1)
      else if (key === 'right') lane = Math.min(2, lane + 1)
      else if (key === 'space' || key === 'up') {
        if (jumpT <= 0) jumpT = JUMP_TIME
      }
    })
    api.setStatus('SPACE jumps - arrows switch rails')

    return {
      update(dt) {
        if (shake > 0) shake = Math.max(0, shake - dt * 2)
        if (flash > 0) flash = Math.max(0, flash - dt * 2.5)
        if (over) return
        scroll += speed * dt
        dist += speed * dt
        if (dist >= SEG_LEN) {
          dist -= SEG_LEN
          segs += 1
          speed = Math.min(26, speed + 1.5)
          flash = 0.6
          shake = Math.max(shake, 0.18)
          api.progress(1)
          api.setStatus('SEGMENT ' + segs + ' cleared')
        }
        laneX += (LANES[lane] - laneX) * Math.min(1, dt * 9)
        if (jumpT > 0) jumpT = Math.max(0, jumpT - dt)
        spawnAt -= dt
        if (spawnAt <= 0) {
          obs.push({ lane: api.irnd(0, 2), z: -46, prev: -46, spin: api.rnd(0, 3) })
          spawnAt = Math.max(0.55, 1.35 - segs * 0.06)
          while (obs.length > 5) obs.shift()
        }
        for (let i = obs.length - 1; i >= 0; i -= 1) {
          const o = obs[i]
          o.prev = o.z
          o.z += speed * dt
          o.spin += dt * 1.8
          const crossed = o.prev < 0.15 && o.z >= 0.15
          if (crossed && o.lane === lane && jumpT <= 0.16) crash()
          if (o.z > 4) obs.splice(i, 1)
        }
      },
      draw() {
        const wobble = shake > 0 ? Math.sin(api.now() / 26) * shake : 0
        scene.camera({
          fov: 60,
          eye: [laneX * 0.42, 4.2 + wobble * 0.5, 8.8],
          target: [laneX * 0.3, 0.5, -9],
        })
        scene.clear(over ? '#150c11' : '#0b1016')
        scene.draw(plane, { x: 0, y: -0.4, z: -22, sx: 30, sz: 96 }, flash > 0.2 ? '#1c3a58' : '#141f2b')
        for (let l = 0; l < 3; l += 1) {
          const x = LANES[l]
          scene.draw(box, { x: x - 0.56, y: -0.06, z: -24, sx: 0.16, sy: 0.2, sz: 84 }, '#4a6b8a')
          scene.draw(box, { x: x + 0.56, y: -0.06, z: -24, sx: 0.16, sy: 0.2, sz: 84 }, '#4a6b8a')
        }
        for (let k = 0; k < 14; k += 1) {
          const z = -8 - (k * 3 - (scroll % 3))
          scene.draw(box, { x: 0, y: -0.26, z: z, sx: 13, sy: 0.12, sz: 0.7 }, '#22303e')
        }
        for (let k = 0; k < 8; k += 1) {
          const z = -6 - (k * 9 - (scroll % 9))
          scene.draw(box, { x: -8.2, y: 1.7 + wobble * 0.2, z: z, sx: 0.7, sy: 4.4, sz: 0.7 }, '#1a2a3a')
          scene.draw(box, { x: 8.2, y: 1.7 + wobble * 0.2, z: z, sx: 0.7, sy: 4.4, sz: 0.7 }, '#1a2a3a')
        }
        for (let i = 0; i < obs.length; i += 1) {
          const o = obs[i]
          const oy = 0.55
          scene.draw(box, { x: LANES[o.lane], y: oy, z: o.z, s: 1.15, ry: o.spin }, flash > 0.55 ? '#ffffff' : '#c0483f')
          scene.draw(box, { x: LANES[o.lane], y: oy + 0.9, z: o.z, s: 0.72, ry: -o.spin }, '#ff7a7a')
        }
        const k = jumpT > 0 ? Math.min(1, (JUMP_TIME - jumpT) / JUMP_TIME) : 0
        const jy = jumpT > 0 ? Math.sin(k * Math.PI) * 1.4 : 0
        scene.draw(box, { x: laneX, y: 0.52 + jy, z: 0, sx: 1.34, sy: 0.68, sz: 1.9 }, over ? '#8a3b36' : '#ffcf5c')
        scene.draw(box, { x: laneX, y: 1.0 + jy, z: 0.3, s: 0.5, ry: 0.6 }, '#6aa9ff')
        scene.draw(ball, { x: laneX - 0.8, y: 0.28 + jy, z: 0.7, s: 0.32 }, '#e8eef6')
        scene.draw(ball, { x: laneX + 0.8, y: 0.28 + jy, z: 0.7, s: 0.32 }, '#e8eef6')
        scene.draw(ball, { x: laneX - 0.8, y: 0.28 + jy, z: -0.7, s: 0.32 }, '#e8eef6')
        scene.draw(ball, { x: laneX + 0.8, y: 0.28 + jy, z: -0.7, s: 0.32 }, '#e8eef6')
        if (jumpT > 0) {
          scene.draw(box, { x: laneX, y: 0.16, z: 0, sx: 2.2, sy: 0.06, sz: 2.8 }, '#33402a')
        }
        for (let g = 0; g < 4; g += 1) {
          const gz = -34 - g * 26
          scene.draw(box, { x: -3.2, y: 0.2, z: gz, sx: 0.5, sy: 0.5, sz: 0.5 }, '#25405a')
          scene.draw(box, { x: 3.2, y: 0.2, z: gz, sx: 0.5, sy: 0.5, sz: 0.5 }, '#25405a')
        }
        if (shake > 0.4) scene.draw(box, { x: 0, y: 6, z: -3, s: 4 }, '#3a1b22')
      },
    }
  },
})
