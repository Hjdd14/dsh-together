defineGame({
  id: 'pipes',
  create(api) {
    const C = api.colors;
    const COLS = 4;
    const ROWS = 4;
    const CELL = 74;
    const OX = 92;
    const OY = 36;
    const bits = [1, 2, 4, 8];
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const cells = [];
    for (let i = 0; i < COLS * ROWS; i += 1) cells.push({ base: 3, rot: 0, src: false });

    const srcIdx = 8;
    cells[srcIdx] = { base: 2, rot: 0, src: true };

    const visited = [];
    for (let i = 0; i < cells.length; i += 1) visited.push(0);
    visited[srcIdx] = 1;
    let cur = { x: 1, y: 2 };
    let inDir = 3;
    let made = 0;
    while (made < 3) {
      const i = cur.y * COLS + cur.x;
      let outDir = (inDir + 1) % 4;
      const options = [];
      for (let d = 0; d < 4; d += 1) {
        if (d === inDir) continue;
        const nx = cur.x + dirs[d][0];
        const ny = cur.y + dirs[d][1];
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        if (visited[ny * COLS + nx]) continue;
        options.push(d);
      }
      if (options.length) outDir = api.pick(options);
      const need = bits[inDir] | bits[outDir];
      const straight = need === 10 || need === 5;
      cells[i] = { base: need, rot: straight ? 1 : 2, src: false };
      visited[i] = 1;
      made += 1;
      if (!options.length) break;
      cur = { x: cur.x + dirs[outDir][0], y: cur.y + dirs[outDir][1] };
      inDir = (outDir + 2) % 4;
    }
    const kinds = [3, 6, 12, 9, 10, 5];
    for (let i = 0; i < cells.length; i += 1) {
      if (visited[i] || i === srcIdx) continue;
      cells[i] = { base: api.pick(kinds), rot: api.irnd(0, 3), src: false };
    }

    function rotBits(mask, turns) {
      let m = mask;
      for (let t = 0; t < turns; t += 1) m = ((m << 1) | (m >> 3)) & 15;
      return m;
    }
    function maskOf(i) {
      return cells[i].src ? cells[i].base : rotBits(cells[i].base, cells[i].rot);
    }
    function flow() {
      const seen = [];
      for (let i = 0; i < cells.length; i += 1) seen.push(0);
      seen[srcIdx] = 1;
      const queue = [srcIdx];
      while (queue.length) {
        const i = queue.shift();
        const m = maskOf(i);
        const x = i % COLS;
        const y = (i - x) / COLS;
        for (let d = 0; d < 4; d += 1) {
          if (!(m & bits[d])) continue;
          const nx = x + dirs[d][0];
          const ny = y + dirs[d][1];
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          const j = ny * COLS + nx;
          if (seen[j]) continue;
          if (!(maskOf(j) & bits[(d + 2) % 4])) continue;
          seen[j] = 1;
          queue.push(j);
        }
      }
      let count = 0;
      for (let i = 0; i < cells.length; i += 1) if (seen[i] && i !== srcIdx) count += 1;
      return { live: seen, count: count };
    }

    const credited = [];
    for (let i = 0; i < cells.length; i += 1) credited.push(0);

    let live = flow().live;
    for (let i = 0; i < cells.length; i += 1) {
      if (i !== srcIdx && live[i] && !cells[i].src) cells[i].rot = (cells[i].rot + 1) % 4;
    }

    const fx = [];
    const rings = [];
    const notes = [];
    const spins = [];
    let shake = 0;
    let hover = -1;
    let shown = flow();

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function centre(i) {
      const x = i % COLS;
      const y = (i - x) / COLS;
      return { x: OX + x * CELL + CELL / 2, y: OY + y * CELL + CELL / 2 };
    }
    function burst(i, rgb, n) {
      const p = centre(i);
      for (let k = 0; k < n; k += 1) {
        if (fx.length > 70) fx.shift();
        fx.push({
          x: p.x, y: p.y,
          vx: api.rnd(-90, 90), vy: api.rnd(-90, 90),
          born: api.now(), life: api.rnd(240, 460), rgb: rgb, r: api.rnd(2, 4),
        });
      }
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const gx = Math.floor((p.x - OX) / CELL);
        const gy = Math.floor((p.y - OY) / CELL);
        hover = gx >= 0 && gy >= 0 && gx < COLS && gy < ROWS ? gy * COLS + gx : -1;
        return;
      }
      if (p.type !== 'down') return;
      const gx = Math.floor((p.x - OX) / CELL);
      const gy = Math.floor((p.y - OY) / CELL);
      if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return;
      const i = gy * COLS + gx;
      if (cells[i].src) {
        shake = Math.min(1, shake + 0.4);
        note('SOURCE', '143,160,180');
        return;
      }
      const before = shown.count;
      cells[i].rot = (cells[i].rot + 1) % 4;
      if (spins.length > 8) spins.shift();
      spins.push({ key: i, born: api.now(), life: 150 });
      shown = flow();
      for (let k = 0; k < cells.length; k += 1) {
        if (k === srcIdx || !shown.live[k]) continue;
        if (!credited[k]) {
          credited[k] = 1;
          api.progress(1);
          burst(k, '106,169,255', 9);
          if (rings.length > 22) rings.shift();
          const p = centre(k);
          rings.push({ x: p.x, y: p.y, born: api.now(), life: 420 });
          note(credited.filter((v) => v).length >= 3 ? 'PERFECT' : 'FLOW', '139,220,122');
        }
      }
      if (shown.count > before) burst(i, '139,220,122', 4);
    });

    function spinFor(i, now) {
      for (let k = 0; k < spins.length; k += 1) {
        if (spins[k].key !== i) continue;
        const t = (now - spins[k].born) / spins[k].life;
        if (t < 0 || t >= 1) continue;
        return -(1 - (1 - (1 - t) * (1 - t))) * Math.PI * 0.5;
      }
      return 0;
    }

    return {
      update(dt) {
        const now = api.now();
        for (let i = fx.length - 1; i >= 0; i -= 1) {
          const p = fx[i];
          if (now - p.born >= p.life) {
            fx.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 90 * dt;
        }
        for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].born >= rings[i].life) rings.splice(i, 1);
        for (let i = spins.length - 1; i >= 0; i -= 1) if (now - spins[i].born >= spins[i].life) spins.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.014 + 0.026 * (0.5 + 0.5 * Math.sin(now / 1300))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 22) * amp, 0);
        }
        const thick = 13;
        for (let y = 0; y < ROWS; y += 1) {
          for (let x = 0; x < COLS; x += 1) {
            const i = y * COLS + x;
            const px = OX + x * CELL;
            const py = OY + y * CELL;
            api.rect(px + 2, py + 2, CELL - 4, CELL - 4, 'rgba(255,255,255,0.035)');
            if (i === hover) api.rect(px + 2, py + 2, CELL - 4, CELL - 4, 'rgba(232,238,246,0.08)');
            const on = shown.live[i];
            let col = 'rgba(143,160,180,0.5)';
            if (on) {
              const pulse = 0.62 + 0.3 * (0.5 + 0.5 * Math.sin(now / 240 + i * 0.7));
              col = cells[i].src ? C.accent2 : rgba('106,169,255', pulse);
            }
            const cx = px + CELL / 2;
            const cy = py + CELL / 2;
            const m = maskOf(i);
            const spin = spinFor(i, now);
            g.save();
            g.translate(cx, cy);
            if (spin !== 0) g.rotate(spin);
            g.fillStyle = col;
            const half = CELL / 2;
            if (m & 1) g.fillRect(-thick / 2, -half + 2, thick, half - 2);
            if (m & 2) g.fillRect(0, -thick / 2, half - 2, thick);
            if (m & 4) g.fillRect(-thick / 2, 0, thick, half - 2);
            if (m & 8) g.fillRect(-half + 2, -thick / 2, half - 2, thick);
            g.beginPath();
            g.arc(0, 0, thick * 0.62, 0, Math.PI * 2);
            g.fill();
            g.restore();
          }
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CELL * (0.3 + 0.5 * k), rgba('106,169,255', 0.34 * (1 - k)));
        }
        for (let i = 0; i < fx.length; i += 1) {
          const p = fx[i];
          const k = 1 - (now - p.born) / p.life;
          if (k <= 0) continue;
          api.circle(p.x, p.y, p.r * k + 0.6, rgba(p.rgb, k * 0.9));
        }
        for (let i = 0; i < notes.length; i += 1) {
          const t = notes[i];
          const k = (now - t.born) / t.life;
          if (k >= 1) continue;
          api.text(t.text, 240, 152 - k * 12 - i * 20, { size: 22, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('flow ' + shown.count + ' · click to turn a pipe', 240, 352, { size: 11, color: C.dim, align: 'center' });
      },
    };
  },
});
