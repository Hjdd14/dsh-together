defineGame({
  id: 'monument',
  mode: '3d',
  create(api) {
    const scene = api.gl3d
    const box = scene.mesh('box')
    const plane = scene.mesh('plane')
    const ball = scene.mesh('sphere')
    const PADS = [-6.4, -2.2, 2.2, 6.4]
    const GAPS = [-4.3, 0, 4.3]
    const DOOR = 9.6
    const WALK_TIME = 1.9
    let bridges = []
    let walkT = 0
    let back = false
    let done = false
    let solvedT = 0
    let hover = -1
    let flash = null
    let bump = 0

    function reset() {
      bridges = []
      for (let i = 0; i < 3; i += 1) bridges.push({ up: api.rng() < 0.45, t: 0 })
      if (bridges[0].up && bridges[1].up && bridges[2].up) bridges[api.irnd(0, 2)].up = false
      for (let i = 0; i < 3; i += 1) bridges[i].t = bridges[i].up ? 1 : 0
      walkT = 0
      back = false
      done = false
      solvedT = 0
      hover = -1
      flash = null
      bump = 0
      api.setStatus('click the gears to set every bridge')
    }
    reset()

    function ready() {
      return bridges[0].up && bridges[1].up && bridges[2].up
    }

    function toggle(i) {
      if (done) return
      if (walkT > 0 && !back) {
        back = true
        api.setStatus('walking back to the start')
      }
      bridges[i].up = !bridges[i].up
      flash = { i: i, t: 0 }
      bump = 0.35
      api.setStatus('bridge ' + (i + 1) + (bridges[i].up ? ' set' : ' lifted') + (ready() ? ' - path complete' : ''))
    }

    api.onPointer(function (ev) {
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) { hover = -1; return }
      let idx = -1
      if (ev.y >= 252) {
        idx = ev.x < 170 ? 0 : ev.x < 322 ? 1 : 2
      }
      if (ev.type === 'move') {
        hover = idx
        return
      }
      if (ev.type !== 'down' || done) return
      if (idx >= 0) {
        toggle(idx)
        return
      }
      if (ev.x >= 352 && ev.y <= 200) {
        if (ready()) {
          if (walkT <= 0) {
            walkT = 0.0001
            back = false
            api.setStatus('walking to the door')
          }
          return
        }
        bump = 0.4
        for (let i = 0; i < 3; i += 1) {
          if (!bridges[i].up) flash = { i: i, t: 0 }
        }
        api.setStatus('the path is broken - fix the bridges')
      }
    })

    return {
      update(dt) {
        if (bump > 0) bump = Math.max(0, bump - dt * 2)
        if (flash) {
          flash.t += dt
          if (flash.t > 0.5) flash = null
        }
        for (let i = 0; i < 3; i += 1) {
          const target = bridges[i].up ? 1 : 0
          bridges[i].t += (target - bridges[i].t) * Math.min(1, dt * 7)
        }
        if (done) {
          solvedT += dt
          return
        }
        if (walkT > 0) {
          if (back) {
            walkT -= dt / WALK_TIME
            if (walkT <= 0) {
              walkT = 0
              back = false
              api.setStatus('back at the start')
            }
          } else {
            walkT = Math.min(1, walkT + dt / WALK_TIME)
            if (walkT >= 1) {
              done = true
              api.progress(1)
              api.setStatus('door reached - solved')
            }
          }
        }
      },
      draw() {
        const bob = Math.sin(api.now() / 300) * 0.04
        scene.camera({ fov: 52, eye: [1, 6.9, 14.2], target: [1, 0.5, 0.4] })
        scene.clear('#0c1018')
        scene.draw(plane, { x: 1, y: -1.05, z: 0, sx: 40, sz: 26 }, '#111a24')
        for (let i = 0; i < PADS.length; i += 1) {
          scene.draw(box, { x: PADS[i], y: -0.35, z: 0, sx: 2.9, sy: 0.7, sz: 2.7 }, '#2b4054')
          scene.draw(box, { x: PADS[i], y: 0.02, z: 0, sx: 2.5, sy: 0.08, sz: 2.4 }, '#3c5a74')
        }
        for (let i = 0; i < 3; i += 1) {
          const b = bridges[i]
          const t = b.t
          const glow = flash && flash.i === i && flash.t < 0.3
          const col = glow ? '#ffffff' : b.up ? '#4f8ef7' : '#39485a'
          let x = GAPS[i]
          let z = -2.9 * (1 - t)
          let ry = 0
          if (i === 1) {
            ry = (1 - t) * 1.3
            z = -1.7 * (1 - t)
          }
          if (i === 2) x = GAPS[i] + 3.2 * (1 - t)
          scene.draw(box, { x: x, y: -0.08, z: z, sx: 1.9, sy: 0.26, sz: 1.7, ry: ry }, col)
        }
        for (let i = 0; i < 3; i += 1) {
          const gx = GAPS[i]
          const hot = hover === i
          const spin = api.now() / 900 + i
          scene.draw(box, { x: gx, y: -1.45 + (hot ? 0.16 : 0), z: 3.1, s: 0.62, ry: spin }, hot ? '#ffcf5c' : bridges[i].up ? '#8bdc7a' : '#7a8ea4')
          scene.draw(box, { x: gx, y: -1.45 + (hot ? 0.16 : 0), z: 3.1, s: 0.26, ry: spin + 0.6 }, '#0c1018')
        }
        const px = PADS[0] + (DOOR - PADS[0]) * walkT
        const hop = walkT > 0 && !back ? Math.abs(Math.sin(walkT * 18)) * 0.16 : 0
        scene.draw(box, { x: px, y: 0.42 + hop + bob, z: 0, sx: 0.42, sy: 0.9, sz: 0.42 }, done ? '#8bdc7a' : '#ffcf5c')
        scene.draw(ball, { x: px, y: 1.02 + hop + bob, z: 0, s: 0.3 }, '#e8eef6')
        const open = ready()
        scene.draw(box, { x: DOOR - 0.95, y: 1.1, z: 0, sx: 0.36, sy: 2.6, sz: 0.5 }, '#243546')
        scene.draw(box, { x: DOOR + 0.95, y: 1.1, z: 0, sx: 0.36, sy: 2.6, sz: 0.5 }, '#243546')
        scene.draw(box, { x: DOOR, y: 2.55, z: 0, sx: 2.3, sy: 0.36, sz: 0.5 }, '#243546')
        const pulse = 0.5 + 0.5 * Math.sin(api.now() / 240)
        scene.draw(box, {
          x: DOOR,
          y: 1.1,
          z: -0.2,
          sx: 1.5,
          sy: 2.1 + (open ? pulse * 0.12 : 0),
          sz: 0.2,
        }, done ? '#ffffff' : open ? '#8bdc7a' : '#ff7a7a')
        if (bump > 0.2) scene.draw(box, { x: 1, y: 1.2, z: 2.6, s: 1.4, ry: api.now() / 500 }, '#243b52')
        if (done) scene.draw(box, { x: DOOR - 0.9, y: 0.9, z: 2.2, s: 0.7 + solvedT * 0.2, ry: solvedT }, '#8bdc7a')
      },
    }
  },
})
