defineGame({
  id: 'snake3d',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const N = 9
    const CELL = 0.92
    const STEP = 0.19
    const HALF = (N - 1) / 2

    const snake = [{ r: 4, c: 4 }, { r: 4, c: 3 }, { r: 4, c: 2 }]
    const food = { r: 4, c: 7 }
    let dir = { r: 0, c: 1 }
    let next = { r: 0, c: 1 }
    let acc = 0
    let eaten = 0
    let dead = false
    let reason = ''
    let shake = 0
    let flash = 0
    let growFlash = 0
    const parts = []

    function cellX(c) { return (c - HALF) * CELL }
    function cellZ(r) { return (r - HALF) * CELL }

    function occupied(r, c) {
      for (let i = 0; i < snake.length; i += 1) {
        if (snake[i].r === r && snake[i].c === c) return true
      }
      return false
    }

    function placeFood() {
      for (let i = 0; i < 80; i += 1) {
        const r = api.irnd(0, N - 1)
        const c = api.irnd(0, N - 1)
        if (!occupied(r, c)) {
          food.r = r
          food.c = c
          return
        }
      }
      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c < N; c += 1) {
          if (!occupied(r, c)) { food.r = r; food.c = c; return }
        }
      }
    }

    function burst(r, c, color, count) {
      for (let i = 0; i < count && parts.length < 32; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        parts.push({
          x: cellX(c) + Math.cos(a) * 0.12,
          y: 0.45,
          z: cellZ(r) + Math.sin(a) * 0.12,
          vy: api.rnd(0.9, 2.2),
          life: api.rnd(0.22, 0.44),
          max: 0.44,
          c: color,
        })
      }
    }

    placeFood()
    api.setStatus('cubes 0')

    api.onKey((key, isDown) => {
      if (!isDown || dead) return
      if (key === 'left' && dir.c === 0) next = { r: 0, c: -1 }
      else if (key === 'right' && dir.c === 0) next = { r: 0, c: 1 }
      else if (key === 'up' && dir.r === 0) next = { r: -1, c: 0 }
      else if (key === 'down' && dir.r === 0) next = { r: 1, c: 0 }
    })

    function die(why) {
      dead = true
      reason = why
      shake = 0.9
      burst(snake[0].r, snake[0].c, '#ff7a7a', 14)
      api.lose(why)
    }

    function stepOnce() {
      dir = next
      const head = { r: snake[0].r + dir.r, c: snake[0].c + dir.c }
      if (head.r < 0 || head.c < 0 || head.r >= N || head.c >= N) {
        die('hit the wall')
        return
      }
      const eat = head.r === food.r && head.c === food.c
      const last = snake.length - 1
      for (let i = 1; i <= last; i += 1) {
        if (!eat && i === last) continue
        if (snake[i].r === head.r && snake[i].c === head.c) {
          die('bit itself')
          return
        }
      }
      snake.unshift(head)
      if (eat) {
        eaten += 1
        growFlash = 1
        burst(head.r, head.c, '#ffcf5c', 7)
        api.progress(1)
        api.setStatus('cubes ' + eaten)
        placeFood()
      } else {
        snake.pop()
      }
    }

    return {
      update(dt) {
        if (dead) return
        if (flash > 0) flash = Math.max(0, flash - dt * 3)
        if (growFlash > 0) growFlash = Math.max(0, growFlash - dt * 3)
        if (shake > 0) shake = Math.max(0, shake - dt * 2.6)
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.life -= dt
          if (p.life <= 0) { parts.splice(i, 1); continue }
          p.y += p.vy * dt
          p.vy -= 3.4 * dt
        }
        acc += dt
        let guard = 0
        while (acc >= STEP && guard < 4 && !dead) {
          acc -= STEP
          guard += 1
          stepOnce()
        }
        if (acc > STEP * 4) acc = 0
      },
      draw(g) {
        const gl = api.gl
        const t = api.now() / 1000
        const jitter = shake > 0.01 ? Math.sin(api.now() / 40) * shake * 0.24 : 0
        scene.camera({
          fov: 56,
          eye: [0, 10.5 + jitter, 8.6],
          target: [0, 0.2, 0.4],
        })
        scene.clear('#0b1016')
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

        const box = scene.mesh('box')
        const plane = scene.mesh('plane')

        for (let r = 0; r < N; r += 1) {
          for (let c = 0; c < N; c += 1) {
            scene.draw(plane, {
              x: cellX(c),
              y: 0,
              z: cellZ(r),
              sx: CELL * 0.94,
              sz: CELL * 0.94,
            }, (r + c) % 2 === 0 ? '#16202b' : '#111a24')
          }
        }
        const edge = (HALF + 0.5) * CELL
        scene.draw(box, { x: 0, y: 0.35, z: -edge, sx: N * CELL + 0.6, sy: 0.7, sz: 0.3 }, '#2f4152')
        scene.draw(box, { x: 0, y: 0.35, z: edge, sx: N * CELL + 0.6, sy: 0.7, sz: 0.3 }, '#2f4152')
        scene.draw(box, { x: -edge, y: 0.35, z: 0, sx: 0.3, sy: 0.7, sz: N * CELL + 0.6 }, '#2f4152')
        scene.draw(box, { x: edge, y: 0.35, z: 0, sx: 0.3, sy: 0.7, sz: N * CELL + 0.6 }, '#2f4152')

        const fPulse = 0.5 + Math.sin(t * 5) * 0.12
        scene.draw(box, { x: cellX(food.c), y: 0.42, z: cellZ(food.r), s: 0.42 + fPulse * 0.2 }, '#ffcf5c')
        scene.draw(box, { x: cellX(food.c), y: 0.42, z: cellZ(food.r), s: 0.2 }, '#fff6d8')

        for (let i = snake.length - 1; i >= 0; i -= 1) {
          const seg = snake[i]
          const head = i === 0
          const col = dead ? '#4a5a6a' : head ? '#8bdc7a' : i % 2 === 0 ? '#5f9e52' : '#6fb862'
          const h = head ? 0.5 : 0.42
          scene.draw(box, {
            x: cellX(seg.c),
            y: h / 2 + 0.02,
            z: cellZ(seg.r),
            sx: CELL * 0.86,
            sy: h,
            sz: CELL * 0.86,
          }, col)
          if (head && !dead) {
            scene.draw(box, {
              x: cellX(seg.c) + dir.c * 0.2,
              y: h + 0.08,
              z: cellZ(seg.r) + dir.r * 0.2,
              s: 0.16,
            }, '#0b1016')
          }
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = p.life / p.max
          scene.draw(box, { x: p.x, y: p.y, z: p.z, s: 0.1 + k * 0.12 }, p.c)
        }
        if (growFlash > 0.6) {
          scene.draw(box, { x: cellX(snake[0].c), y: 0.9, z: cellZ(snake[0].r), s: 0.22 }, '#ffffff')
        }
      },
      dispose() { parts.length = 0 },
    }
  },
})
