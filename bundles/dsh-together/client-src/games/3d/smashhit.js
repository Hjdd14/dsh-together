defineGame({
  id: 'smashhit',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const box = scene.mesh('box')
    const plane = scene.mesh('plane')
    const ball = scene.mesh('sphere', 10)

    const FOV = 60
    const F = 180 / Math.tan((FOV / 2) * Math.PI / 180)
    const SLOTS = [-1.9, 0, 1.9]
    const ROWS = [-0.9, 0.55]
    const panels = []
    const shards = []
    let time = 0
    let fly = 9
    let spawn = 1.2
    let dead = false
    let shake = 0
    let flash = 0
    let hits = 0
    let invuln = 1.2
    let bob = 0

    function project(x, y, z) {
      const d = Math.max(0.6, -z)
      return { x: 240 + (x / d) * F, y: 180 - (y / d) * F, d }
    }

    function smash(x, y) {
      if (dead) return
      let best = -1
      let bestZ = -99
      for (let i = 0; i < panels.length; i += 1) {
        const p = panels[i]
        if (p.dead || p.z > -1.6 || p.z < -18) continue
        const s = project(p.x, p.y, p.z)
        if (Math.abs(s.x - x) > 118 || Math.abs(s.y - y) > 100) continue
        if (p.z > bestZ) {
          bestZ = p.z
          best = i
        }
      }
      if (best < 0) return
      const p = panels[best]
      p.dead = true
      hits += 1
      flash = 1
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2
        shards.push({
          x: p.x + Math.cos(a) * 0.7,
          y: p.y + Math.sin(a) * 0.7,
          z: p.z,
          vx: Math.cos(a) * 4.5,
          vy: Math.sin(a) * 4.5 - 1.5,
          vz: 5,
          life: 0.75,
        })
      }
      while (shards.length > 40) shards.shift()
    }

    api.onKey((key, down, ev) => {
      if (!down || dead || (ev && ev.repeat)) return
      if (key === 'space' || key === 'enter') smash(240, 180)
    })
    api.onPointer((event) => {
      if (event.type === 'down') smash(event.x, event.y)
    })

    return {
      update(dt) {
        if (dead) return
        time += dt
        invuln = Math.max(0, invuln - dt)
        shake = Math.max(0, shake - dt * 3)
        flash = Math.max(0, flash - dt * 4)
        bob += dt
        fly = Math.min(14, 9 + time * 0.18)

        for (let i = 0; i < panels.length; i += 1) {
          const p = panels[i]
          if (p.dead) continue
          p.z += fly * dt
          if (p.z > -1.5) {
            if (invuln > 0) {
              p.dead = true
              continue
            }
            dead = true
            shake = 1
            api.lose('glass')
            return
          }
        }
        for (let i = shards.length - 1; i >= 0; i -= 1) {
          const s = shards[i]
          s.life -= dt
          s.x += s.vx * dt
          s.y += s.vy * dt
          s.z += s.vz * dt
          s.vy -= 7 * dt
          if (s.life <= 0) shards.splice(i, 1)
        }
        while (panels.length > 0 && panels[0].z > 2) panels.shift()

        spawn -= dt
        if (spawn <= 0) {
          panels.push({ x: api.pick(SLOTS), y: api.pick(ROWS), z: -58, dead: false })
          if (time > 6 && api.rng() < 0.25) {
            panels.push({ x: api.pick(SLOTS), y: api.pick(ROWS), z: -70, dead: false })
          }
          spawn = Math.max(0.72, 1.15 - time * 0.012)
        }
        api.setStatus(Math.floor(time) + 's  smash ' + hits + '  rocks ' + panels.length)
      },

      draw(g) {
        const gl = api.gl
        if (gl && gl.viewport) gl.viewport(0, 0, gl.drawingBufferWidth || 480, gl.drawingBufferHeight || 360)
        const jitter = shake > 0.01 ? Math.sin(time * 80) * shake * 0.3 : 0
        const by = Math.sin(bob * 3.1) * 0.05
        scene.camera({
          fov: FOV,
          eye: [Math.sin(bob * 1.7) * 0.08 + jitter, by, 0],
          target: [0, by * 0.5, -12],
        })
        scene.light([0.2, 0.85, 1])
        scene.clear('#070b12')

        // 空中走廊
        const scroll = (time * fly) % 6
        for (let i = 0; i < 12; i += 1) {
          const z = -scroll - i * 6 - 2
          scene.draw(plane, { x: 0, y: -1.9, z, sx: 8, sz: 5.6 }, i % 2 === 0 ? '#111a26' : '#0d151f')
          for (let s = -1; s <= 1; s += 2) {
            scene.draw(box, { x: s * 3.4, y: 0.4, z, sx: 0.32, sy: 4.6, sz: 0.7 }, s < 0 ? '#2a3d55' : '#243549')
            scene.draw(ball, { x: s * 3.4, y: 2.1, z, s: 0.2 }, flash > 0.5 ? '#ffffff' : '#6aa9ff')
          }
        }
        // 星点远处
        for (let i = 0; i < 10; i += 1) {
          const z = -60 + ((i * 7.3 + time * 6) % 40)
          scene.draw(box, { x: Math.sin(i * 2.3) * 7, y: Math.cos(i * 1.7) * 4 + 1.4, z, s: 0.16 }, '#48607f')
        }
        // 玻璃板
        for (let i = 0; i < panels.length; i += 1) {
          const p = panels[i]
          if (p.dead) continue
          const near = p.z > -20
          if (!near) continue
          scene.draw(box, { x: p.x, y: p.y, z: p.z, sx: 2.9, sy: 2.35, sz: 0.16 }, '#8fd6ff')
          scene.draw(box, { x: p.x, y: p.y, z: p.z - 0.02, sx: 2.5, sy: 1.95, sz: 0.1 }, '#4f9fd8')
          scene.draw(box, { x: p.x, y: p.y + 1.1, z: p.z, sx: 3, sy: 0.12, sz: 0.22 }, '#d8f0ff')
        }
        // 碎片
        for (let i = 0; i < shards.length; i += 1) {
          const s = shards[i]
          scene.draw(box, { x: s.x, y: s.y, z: s.z, s: 0.1 + s.life * 0.22, rz: s.life * 3, ry: s.life * 2 }, '#cfeaff')
        }
        // 准星
        for (let i = 0; i < 4; i += 1) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          scene.draw(box, { x: Math.cos(a) * 0.26, y: Math.sin(a) * 0.26, z: -1.6, s: 0.06 }, flash > 0.5 ? '#ffcf5c' : '#8fa0b4')
        }
      },
    }
  },
})
