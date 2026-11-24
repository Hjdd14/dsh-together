defineGame({
  id: 'floorfill',
  create(api) {
    const C = api.colors;
    const N = 10;
    const CELL = 32;
    const OX = 80;
    const OY = 26;
    const HUES = [C.accent, C.accent2, C.good, C.warn];
    const RGB = ['106,169,255', '255,207,92', '139,220,122', '255,122,122'];
    const grid = [];
    const area = [];
    for (let i = 0; i < N * N; i += 1) {
      grid.push(api.irnd(0, HUES.length - 1));
      area.push(0);
    }

    const fx = [];
    const pops = [];
    const rings = [];
    const notes = [];
    let shake = 0;
    let hover = -1;

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function centre(i) {
      const x = i % N;
      const y = (i - x) / N;
      return { x: OX + x * CELL + CELL / 2, y: OY + y * CELL + CELL / 2 };
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 90) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-110, 110), vy: api.rnd(-130, 40),
          born: api.now(), life: api.rnd(230, 460), rgb: rgb, r: api.rnd(2, 4),
        });
      }
    }
    function pop(i, delay) {
      if (pops.length > 90) pops.shift();
      pops.push({ key: i, born: api.now() + (delay || 0), life: 210 });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 720 });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 0.55 + 0.45 * (1 - (1 - k) * (1 - k)));
      }
      return s;
    }

    function pool() {
      const seen = [];
      const dist = [];
      for (let i = 0; i < N * N; i += 1) {
        seen.push(0);
        dist.push(-1);
      }
      const hue = grid[0];
      const queue = [0];
      seen[0] = 1;
      dist[0] = 0;
      let head = 0;
      let size = 0;
      while (head < queue.length) {
        const i = queue[head];
        head += 1;
        size += 1;
        const x = i % N;
        const y = (i - x) / N;
        const near = [];
        if (x > 0) near.push(i - 1);
        if (x < N - 1) near.push(i + 1);
        if (y > 0) near.push(i - N);
        if (y < N - 1) near.push(i + N);
        for (let k = 0; k < near.length; k += 1) {
          const j = near[k];
          if (seen[j] || grid[j] !== hue) continue;
          seen[j] = 1;
          dist[j] = dist[i] + 1;
          queue.push(j);
        }
      }
      return { seen: seen, dist: dist, size: size };
    }

    let here = pool();
    for (let i = 0; i < N * N; i += 1) area[i] = here.seen[i];

    api.onPointer((p) => {
      if (p.type === 'move') {
        const col = Math.floor((p.x - OX) / CELL);
        const row = Math.floor((p.y - OY) / CELL);
        hover = col >= 0 && row >= 0 && col < N && row < N ? row * N + col : -1;
        return;
      }
      if (p.type !== 'down') return;
      const col = Math.floor((p.x - OX) / CELL);
      const row = Math.floor((p.y - OY) / CELL);
      if (col < 0 || row < 0 || col >= N || row >= N) return;
      const target = grid[row * N + col];
      if (target === grid[0]) {
        shake = Math.min(1, shake + 0.35);
        note('SAME', '143,160,180');
        return;
      }
      const before = here.size;
      for (let i = 0; i < N * N; i += 1) if (area[i]) grid[i] = target;
      here = pool();
      let grew = 0;
      for (let i = 0; i < N * N; i += 1) {
        if (here.seen[i] && !area[i]) {
          grew += 1;
          pop(i, here.dist[i] * 14);
          if (grew <= 14) {
            const c = centre(i);
            burst(c.x, c.y, RGB[target], 2);
          }
        }
        area[i] = here.seen[i];
      }
      if (grew > 0) {
        api.progress(grew);
        if (grew >= 6) note('SOAK +' + grew, '139,220,122');
        if (rings.length > 12) rings.shift();
        rings.push({ x: 240, y: 352, born: api.now(), life: 300 });
      } else {
        shake = Math.min(1, shake + 0.4);
        note('BLOCKED', '255,122,122');
      }
    });

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
          p.vy += 220 * dt;
        }
        for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].born >= rings[i].life) rings.splice(i, 1);
        for (let i = pops.length - 1; i >= 0; i -= 1) if (now - pops[i].born >= pops[i].life) pops.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(139,220,122,' + (0.01 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1250))).toFixed(3) + ')');
        const amp = shake * 4;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 18) * amp, Math.cos(now / 24) * amp * 0.5);
        }
        const pct = Math.round((here.size / (N * N)) * 100);
        api.text('floor ' + here.size + ' / ' + N * N + '  ' + pct + '%', 240, 14, { size: 12, color: C.dim, align: 'center' });
        api.rect(OX, 22, N * CELL, 4, 'rgba(255,255,255,0.10)');
        api.rect(OX, 22, (N * CELL * here.size) / (N * N), 4, C.good);
        for (let y = 0; y < N; y += 1) {
          for (let x = 0; x < N; x += 1) {
            const i = y * N + x;
            const px = OX + x * CELL;
            const py = OY + y * CELL;
            api.rect(px + 1, py + 1, CELL - 2, CELL - 2, HUES[grid[i]]);
            if (area[i]) {
              const s = scaleFor(i, now);
              const w = (CELL - 2) * s;
              api.rect(px + 1 + (CELL - 2 - w) / 2, py + 1 + (CELL - 2 - w) / 2, w, 3, 'rgba(16,20,24,0.5)');
            }
            if (i === hover) api.rect(px + 1, py + 1, CELL - 2, CELL - 2, 'rgba(232,238,246,0.12)');
          }
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, 4 + 30 * k, rgba('139,220,122', 0.25 * (1 - k)));
        }
        for (let i = 0; i < fx.length; i += 1) {
          const p = fx[i];
          const k = 1 - (now - p.born) / p.life;
          if (k <= 0) continue;
          api.circle(p.x, p.y, p.r * k + 0.6, rgba(p.rgb, k * 0.85));
        }
        for (let i = 0; i < notes.length; i += 1) {
          const t = notes[i];
          const k = (now - t.born) / t.life;
          if (k >= 1) continue;
          api.text(t.text, 240, 152 - k * 12 - i * 20, { size: 22, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('click a colour to soak it up', 240, 356, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
