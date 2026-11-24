/* ── 3D layer (WebGL1, no dependencies) ───────────────────────────────────── *
 * The client bundle can only `require` platform seeds and packages already in the
 * boot graph, so three.js cannot be imported. This small layer gives 3D games a
 * perspective camera, boxes/planes/spheres and one directional light — enough for
 * the mid-sized games while staying a few hundred lines and testable without a GPU.
 */

function tgM4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2)
  const out = new Float32Array(16)
  out[0] = f / aspect
  out[5] = f
  out[10] = (far + near) / (near - far)
  out[11] = -1
  out[14] = (2 * far * near) / (near - far)
  return out
}

function tgM4LookAt(eye, center, up) {
  let zx = eye[0] - center[0]
  let zy = eye[1] - center[1]
  let zz = eye[2] - center[2]
  let len = Math.hypot(zx, zy, zz) || 1
  zx /= len; zy /= len; zz /= len
  let xx = up[1] * zz - up[2] * zy
  let xy = up[2] * zx - up[0] * zz
  let xz = up[0] * zy - up[1] * zx
  len = Math.hypot(xx, xy, xz) || 1
  xx /= len; xy /= len; xz /= len
  const yx = zy * xz - zz * xy
  const yy = zz * xx - zx * xz
  const yz = zx * xy - zy * xx
  const out = new Float32Array(16)
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2])
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2])
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2])
  out[15] = 1
  return out
}

function tgM4Multiply(a, b) {
  const out = new Float32Array(16)
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      out[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3]
    }
  }
  return out
}

/** Model matrix from position / Euler rotation / scale. */
function tgM4Model({ x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, sy, sz } = {}) {
  const cx = Math.cos(rx), sx = Math.sin(rx)
  const cy = Math.cos(ry), sy2 = Math.sin(ry)
  const cz = Math.cos(rz), sz2 = Math.sin(rz)
  const scaleX = s
  const scaleY = sy ?? s
  const scaleZ = sz ?? s
  // R = Ry * Rx * Rz, then scale, then translate.
  const m = new Float32Array(16)
  m[0] = (cy * cz + sy2 * sx * sz2) * scaleX
  m[1] = (cx * sz2) * scaleX
  m[2] = (-sy2 * cz + cy * sx * sz2) * scaleX
  m[4] = (-cy * sz2 + sy2 * sx * cz) * scaleY
  m[5] = (cx * cz) * scaleY
  m[6] = (sy2 * sz2 + cy * sx * cz) * scaleY
  m[8] = (sy2 * cx) * scaleZ
  m[9] = (-sx) * scaleZ
  m[10] = (cy * cx) * scaleZ
  m[12] = x
  m[13] = y
  m[14] = z
  m[15] = 1
  return m
}

function tgHexToRgb(color) {
  if (typeof color !== 'string') return [0.6, 0.7, 0.9]
  let hex = color.trim()
  if (hex.startsWith('#')) hex = hex.slice(1)
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  const value = Number.parseInt(hex, 16)
  if (!Number.isFinite(value)) return [0.6, 0.7, 0.9]
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

/**
 * Build the 3D helper bound to one WebGL context.
 * @param {WebGLRenderingContext} gl
 */
export function tgCreateGl3d(gl) {
  const quad = (positions, normals) => positions

  const boxPositions = []
  const boxNormals = []
  const boxIndices = []
  const faces = [
    { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, 0, -1], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { n: [1, 0, 0], v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
    { n: [-1, 0, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
    { n: [0, 1, 0], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
    { n: [0, -1, 0], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
  ]
  faces.forEach((face, faceIndex) => {
    for (const vertex of face.v) {
      boxPositions.push(vertex[0] * 0.5, vertex[1] * 0.5, vertex[2] * 0.5)
      boxNormals.push(face.n[0], face.n[1], face.n[2])
    }
    const base = faceIndex * 4
    boxIndices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  })

  const planePositions = [-0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, -0.5]
  const planeNormals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
  const planeIndices = [0, 1, 2, 0, 2, 3]

  const sphere = (segments) => {
    const rings = Math.max(6, segments | 0)
    const positions = []
    const normals = []
    const indices = []
    for (let lat = 0; lat <= rings; lat += 1) {
      const theta = (lat / rings) * Math.PI
      const sinTheta = Math.sin(theta)
      const cosTheta = Math.cos(theta)
      for (let lon = 0; lon <= rings; lon += 1) {
        const phi = (lon / rings) * Math.PI * 2
        const x = sinTheta * Math.cos(phi)
        const y = cosTheta
        const z = sinTheta * Math.sin(phi)
        positions.push(x * 0.5, y * 0.5, z * 0.5)
        normals.push(x, y, z)
      }
    }
    for (let lat = 0; lat < rings; lat += 1) {
      for (let lon = 0; lon < rings; lon += 1) {
        const a = lat * (rings + 1) + lon
        const b = a + rings + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    return { positions, normals, indices }
  }

  const vertexShader = `attribute vec3 aPos;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uViewProj;varying vec3 vNormal;varying vec3 vWorld;void main(){vec4 world=uModel*vec4(aPos,1.0);vWorld=world.xyz;vNormal=mat3(uModel[0].xyz,uModel[1].xyz,uModel[2].xyz)*aNormal;gl_Position=uViewProj*world;}`
  const fragmentShader = `precision mediump float;varying vec3 vNormal;varying vec3 vWorld;uniform vec3 uColor;uniform vec3 uLight;void main(){vec3 n=normalize(vNormal);float d=max(dot(n,normalize(uLight)),0.0);float rim=0.18*pow(1.0-max(n.z,0.0),2.0);gl_FragColor=vec4(uColor*(0.42+0.68*d)+rim,1.0);}`

  const program = gl.createProgram()
  const vs = gl.createShader(gl.VERTEX_SHADER)
  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  gl.shaderSource(vs, vertexShader)
  gl.compileShader(vs)
  gl.shaderSource(fs, fragmentShader)
  gl.compileShader(fs)
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.useProgram(program)
  const locations = {
    aPos: gl.getAttribLocation(program, 'aPos'),
    aNormal: gl.getAttribLocation(program, 'aNormal'),
    uModel: gl.getUniformLocation(program, 'uModel'),
    uViewProj: gl.getUniformLocation(program, 'uViewProj'),
    uColor: gl.getUniformLocation(program, 'uColor'),
    uLight: gl.getUniformLocation(program, 'uLight'),
  }

  const upload = (positions, normals, indices) => {
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
    const normalBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW)
    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
    return { positionBuffer, normalBuffer, indexBuffer, count: indices.length }
  }

  const meshes = {
    box: upload(boxPositions, boxNormals, boxIndices),
    plane: upload(planePositions, planeNormals, planeIndices),
  }
  const sphereCache = new Map()
  let viewProj = tgM4Multiply(tgM4Perspective(1.1, 4 / 3, 0.1, 200), tgM4LookAt([0, 6, 14], [0, 1, 0], [0, 1, 0]))
  let light = [0.4, 0.9, 0.3]

  return {
    /** Reset the camera. */
    camera({ fov = 60, eye = [0, 6, 14], target = [0, 1, 0], up = [0, 1, 0], near = 0.1, far = 200 } = {}) {
      const aspect = (gl.drawingBufferWidth || 480) / (gl.drawingBufferHeight || 360)
      viewProj = tgM4Multiply(
        tgM4Perspective((fov * Math.PI) / 180, aspect || 4 / 3, near, far),
        tgM4LookAt(eye, target, up),
      )
    },
    /** Direction the light comes from. */
    light(direction) {
      light = direction
    },
    mesh(kind, size = 12) {
      if (kind === 'sphere') {
        const key = Math.max(6, size | 0)
        if (!sphereCache.has(key)) {
          const built = sphere(key)
          sphereCache.set(key, upload(built.positions, built.normals, built.indices))
        }
        return sphereCache.get(key)
      }
      return meshes[kind === 'plane' ? 'plane' : 'box']
    },
    /** Draw one mesh with a transform and a flat colour. */
    draw(mesh, transform = {}, color = '#8fb8ff') {
      if (!mesh) return
      const model = tgM4Model(transform)
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer)
      gl.enableVertexAttribArray(locations.aPos)
      gl.vertexAttribPointer(locations.aPos, 3, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer)
      gl.enableVertexAttribArray(locations.aNormal)
      gl.vertexAttribPointer(locations.aNormal, 3, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer)
      gl.uniformMatrix4fv(locations.uModel, false, model)
      gl.uniformMatrix4fv(locations.uViewProj, false, viewProj)
      gl.uniform3fv(locations.uColor, tgHexToRgb(color))
      gl.uniform3fv(locations.uLight, light)
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0)
    },
    clear(color = '#0b1016') {
      const [r, g, b] = tgHexToRgb(color)
      gl.clearColor(r, g, b, 1)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    },
    get context() {
      return gl
    },
  }
}

/**
 * Cheap pseudo-3D projection for mode-7 style games on a 2D canvas.
 * `z` is distance ahead of the camera; 0 is at the horizon, 1 is closest.
 */
export function tgDepth(W, H, options = {}) {
  const horizon = options.horizon ?? H * 0.42
  const focal = options.focal ?? H * 1.1
  return {
    horizon,
    /** Project a ground-plane point at distance `z` (larger = farther). */
    project(x, y, z) {
      const safe = Math.max(0.05, z)
      const scale = focal / (focal + safe * 220)
      return {
        x: W / 2 + x * scale,
        y: horizon + (H - horizon) * scale - y * scale,
        scale,
      }
    },
    /** Scale factor at a distance, for sizing sprites along the road. */
    scaleAt(z) {
      return focal / (focal + Math.max(0.05, z) * 220)
    },
  }
}
