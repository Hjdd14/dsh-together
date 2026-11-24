defineGame({
  id: 'g2048',
  create(api) {
    const C = api.colors;
    const N = 4;
    const OX = 91;
    const OY = 34;
    const SIZE = 70;
    const GAP = 6;
    const STEP = SIZE + GAP;
    const cells = [];
    for (let i = 0; i < N * N; i += 1) cells.push(0);

    const TINT = {
      2: 'rgba(120,150,180,0.30)',
      4: 'rgba(120,170,220,0.42)',
      8: 'rgba(106,169,255,0.62)',
      16: 'rgba(70,140,235,0.85)',
      32: C.accent2,
      64: C.good,
    };
    const RGB = {
      4: '120,150,180',
      8: '106,169,255',
      16: '70,140,235',
      32: '255,207,92',
      64: '139,220,122',
    };

    const fx = [];
    const pops = [];
    const notes = [];
    let shake = 0;

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function centre(i) {
      const x = i % N;
      const y = (i - x) / N;
      return { x: OX + x * STEP + SIZE / 2, y: OY + y * STEP + SIZE / 2 };
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 70) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-110, 110), vy: api.rnd(-140, 30),
          born: api.now(), life: api.rnd(260, 520), rgb: rgb, r: api.rnd(2, 4.5),
        });
      }
    }
    function pop(i, kind, v) {
      if (pops.length > 42) pops.shift();
      pops.push({ key: i, kind: kind, v: v || 0, born: api.now(), life: kind === 'in' ? 150 : 200 });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        const p = pops[i];
        if (p.key !== key) continue;
        const k = (now - p.born) / p.life;
        if (k < 0 || k >= 1) continue;
        if (p.kind === 'in') s = Math.max(s, 0.5 + 0.5 * (1 - (1 - k) * (1 - k)));
        else s = Math.max(s, 1 + 0.3 * Math.sin(Math.PI * k));
      }
      return s;
    }

    function empties() {
      const list = [];
      for (let i = 0; i < cells.length; i += 1) if (cells[i] === 0) list.push(i);
      return list;
    }

    function spawn() {
      const free = empties();
      if (free.length === 0) return false;
      const at = api.pick(free);
      cells[at] = api.rng() < 0.9 ? 2 : 4;
      pop(at, 'in', cells[at]);
      return true;
    }

    function lineOf(dir, k) {
      const idx = [];
      for (let j = 0; j < N; j += 1) {
        let i;
        if (dir === 0) i = k * N + j;
        else if (dir === 1) i = k * N + (N - 1 - j);
        else if (dir === 2) i = j * N + k;
        else i = (N - 1 - j) * N + k;
        idx.push(i);
      }
      return idx;
    }

    function slide(dir, marks) {
      let moved = false;
      for (let k = 0; k < N; k += 1) {
        const idx = lineOf(dir, k);
        const vals = [];
        for (let j = 0; j < N; j += 1) {
          const v = cells[idx[j]];
          if (v > 0) vals.push(v);
        }
        const out = [];
        for (let j = 0; j < vals.length; j += 1) {
          if (j + 1 < vals.length && vals[j] === vals[j + 1]) {
            const merged = vals[j] * 2;
            out.push(merged);
            api.score(merged);
            total += merged;
            marks.push({ i: idx[out.length - 1], v: merged });
            j += 1;
          } else {
            out.push(vals[j]);
          }
        }
        for (let j = 0; j < N; j += 1) {
          const next = j < out.length ? out[j] : 0;
          if (cells[idx[j]] !== next) moved = true;
          cells[idx[j]] = next;
        }
      }
      return moved;
    }

    function anyMove() {
      if (empties().length > 0) return true;
      for (let y = 0; y < N; y += 1) {
        for (let x = 0; x < N; x += 1) {
          const v = cells[y * N + x];
          if (x + 1 < N && cells[y * N + x + 1] === v) return true;
          if (y + 1 < N && cells[(y + 1) * N + x] === v) return true;
        }
      }
      return false;
    }

    spawn();
    spawn();
    let dead = false;
    let total = 0;

    api.onKey((key, isDown) => {
      if (!isDown || dead) return;
      let dir = -1;
      if (key === 'left') dir = 0;
      else if (key === 'right') dir = 1;
      else if (key === 'up') dir = 2;
      else if (key === 'down') dir = 3;
      if (dir < 0) return;
      const marks = [];
      if (!slide(dir, marks)) {
        shake = Math.min(1, shake + 0.35);
        return;
      }
      for (let k = 0; k < marks.length; k += 1) {
        const p = centre(marks[k].i);
        pop(marks[k].i, 'pop', marks[k].v);
        burst(p.x, p.y, RGB[marks[k].v] || '255,207,92', 7);
      }
      if (marks.length >= 2) note('COMBO x' + marks.length, '255,207,92');
      else if (marks.length === 1 && marks[0].v >= 32) note('NICE', '139,220,122');
      spawn();
      if (!anyMove()) {
        dead = true;
        api.lose('board full');
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
          p.vy += 260 * dt;
        }
        for (let i = pops.length - 1; i >= 0; i -= 1) if (now - pops[i].born >= pops[i].life) pops.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.02 + 0.03 * (0.5 + 0.5 * Math.sin(now / 1100))).toFixed(3) + ')');
        const amp = shake * 7;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 24) * amp, Math.cos(now / 31) * amp * 0.6);
        }
        api.rect(OX - 8, OY - 8, N * SIZE + (N - 1) * GAP + 16, N * SIZE + (N - 1) * GAP + 16, C.panel);
        for (let y = 0; y < N; y += 1) {
          for (let x = 0; x < N; x += 1) {
            const i = y * N + x;
            const v = cells[i];
            const px = OX + x * STEP;
            const py = OY + y * STEP;
            if (v === 0) {
              api.rect(px, py, SIZE, SIZE, 'rgba(255,255,255,0.05)');
              continue;
            }
            const s = scaleFor(i, now);
            const w = SIZE * s;
            const off = (SIZE - w) / 2;
            api.rect(px + off, py + off, w, w, TINT[v] || C.accent2);
            api.text(String(v), px + SIZE / 2, py + SIZE / 2, {
              size: v > 99 ? 20 : 27 * s,
              color: v > 32 ? C.bg : C.fg,
              align: 'center',
              weight: 'bold',
            });
          }
        }
        for (let i = 0; i < fx.length; i += 1) {
          const p = fx[i];
          const k = 1 - (now - p.born) / p.life;
          if (k <= 0) continue;
          api.circle(p.x, p.y, p.r * k + 0.7, rgba(p.rgb, k * 0.85));
        }
        for (let i = 0; i < notes.length; i += 1) {
          const t = notes[i];
          const k = (now - t.born) / t.life;
          if (k >= 1) continue;
          api.text(t.text, 240, 152 - k * 12 - i * 20, { size: 22, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('score ' + total + ' · arrows to merge', 240, 348, { size: 11, color: C.dim, align: 'center' });
      },
    };
  },
});
