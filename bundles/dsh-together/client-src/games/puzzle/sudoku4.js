defineGame({
  id: 'sudoku4',
  create(api) {
    const C = api.colors;
    const N = 4;
    const CELL = 68;
    const OX = 104;
    const OY = 62;
    const base = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
    const perm = [1, 2, 3, 4];
    for (let i = 3; i > 0; i -= 1) {
      const j = api.irnd(0, i);
      const t = perm[i];
      perm[i] = perm[j];
      perm[j] = t;
    }
    const cells = [];
    const credited = [];
    const conflict = [];
    for (let i = 0; i < 16; i += 1) {
      cells.push({ v: perm[base[i] - 1], fixed: 1 });
      credited.push(0);
      conflict.push(0);
    }
    const order = [];
    for (let i = 0; i < 16; i += 1) order.push(i);
    for (let i = 15; i > 0; i -= 1) {
      const j = api.irnd(0, i);
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    for (let k = 0; k < 10; k += 1) {
      cells[order[k]].v = 0;
      cells[order[k]].fixed = 0;
    }

    const fx = [];
    const pops = [];
    const rings = [];
    const notes = [];
    let shake = 0;
    let hover = -1;
    let got = 0;

    for (let i = 0; i < 16; i += 1) {
      if (!cells[i].fixed) continue;
      credited[i] = 1;
      got += 1;
      api.progress(1);
    }


    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function cx(i) {
      const c = i % N;
      return OX + c * CELL + CELL / 2;
    }
    function cy(i) {
      return OY + Math.floor(i / N) * CELL + CELL / 2;
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 70) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-110, 110), vy: api.rnd(-140, 40),
          born: api.now(), life: api.rnd(240, 480), rgb: rgb, r: api.rnd(2, 4),
        });
      }
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }
    function pop(i) {
      if (pops.length > 30) pops.shift();
      pops.push({ key: i, born: api.now(), life: 200 });
    }
    function ring(i, rgb) {
      if (rings.length > 20) rings.shift();
      rings.push({ x: cx(i), y: cy(i), born: api.now(), life: 380, rgb: rgb });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 0.62 + 0.38 * (1 - (1 - k) * (1 - k)));
      }
      return s;
    }

    function legal(i, v) {
      const r = Math.floor(i / N);
      const c = i % N;
      for (let k = 0; k < N; k += 1) {
        if (k !== c && cells[r * N + k].v === v) return false;
        if (k !== r && cells[k * N + c].v === v) return false;
      }
      const br = (Math.floor(r / 2)) * 2;
      const bc = (Math.floor(c / 2)) * 2;
      for (let y = br; y < br + 2; y += 1) {
        for (let x = bc; x < bc + 2; x += 1) {
          if (y * N + x !== i && cells[y * N + x].v === v) return false;
        }
      }
      return true;
    }
    function refreshConflicts() {
      for (let i = 0; i < 16; i += 1) {
        const v = cells[i].v;
        conflict[i] = v > 0 && !legal(i, v) ? 1 : 0;
      }
    }
    function lineDone(isRow, idx) {
      let full = 0;
      for (let k = 0; k < N; k += 1) {
        const i = isRow ? idx * N + k : k * N + idx;
        if (cells[i].v === 0) return false;
        if (conflict[i]) return false;
        full += 1;
      }
      return full === N;
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const c = Math.floor((p.x - OX) / CELL);
        const r = Math.floor((p.y - OY) / CELL);
        hover = c >= 0 && r >= 0 && c < N && r < N ? r * N + c : -1;
        return;
      }
      if (p.type !== 'down') return;
      const c = Math.floor((p.x - OX) / CELL);
      const r = Math.floor((p.y - OY) / CELL);
      if (c < 0 || r < 0 || c >= N || r >= N) return;
      const i = r * N + c;
      if (cells[i].fixed) {
        shake = Math.min(1, shake + 0.3);
        note('GIVEN', '143,160,180');
        return;
      }
      const next = (cells[i].v + 1) % (N + 1);
      cells[i].v = next;
      if (next === 0) return;
      if (legal(i, next)) {
        pop(i);
        burst(cx(i), cy(i), '106,169,255', 6);
        if (!credited[i]) {
          credited[i] = 1;
          got += 1;
          api.progress(1);
          note(got >= 16 ? 'PERFECT' : 'OK', '139,220,122');
          if (lineDone(true, r) || lineDone(false, c)) ring(i, '139,220,122');
        }
      } else {
        shake = Math.min(1, shake + 0.45);
        note('CLASH', '255,122,122');
      }
      refreshConflicts();
    });

    refreshConflicts();

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
          p.vy += 240 * dt;
        }
        for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].born >= rings[i].life) rings.splice(i, 1);
        for (let i = pops.length - 1; i >= 0; i -= 1) if (now - pops[i].born >= pops[i].life) pops.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.012 + 0.024 * (0.5 + 0.5 * Math.sin(now / 1250))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 19) * amp, 0);
        }
        api.text('cells ' + got + ' / 16', 240, 26, { size: 13, color: C.dim, align: 'center' });
        api.rect(OX - 4, OY - 4, N * CELL + 8, N * CELL + 8, C.panel);
        for (let y = 0; y < N; y += 1) {
          for (let x = 0; x < N; x += 1) {
            const i = y * N + x;
            const px = OX + x * CELL;
            const py = OY + y * CELL;
            api.rect(px + 2, py + 2, CELL - 4, CELL - 4, 'rgba(255,255,255,0.05)');
            if (i === hover) api.rect(px + 2, py + 2, CELL - 4, CELL - 4, 'rgba(232,238,246,0.09)');
            const v = cells[i].v;
            if (v > 0) {
              const s = scaleFor(i, now);
              const col = cells[i].fixed ? C.accent2 : conflict[i] ? C.warn : C.fg;
              api.text(String(v), px + CELL / 2, py + CELL / 2, {
                size: 34 * s, color: col, align: 'center', weight: 'bold',
              });
            }
          }
        }
        for (let k = 1; k < N; k += 1) {
          const t = k % 2 === 0 ? 3 : 1;
          api.rect(OX + k * CELL - t / 2, OY, t, N * CELL, 'rgba(232,238,246,0.22)');
          api.rect(OX, OY + k * CELL - t / 2, N * CELL, t, 'rgba(232,238,246,0.22)');
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CELL * (0.3 + 0.5 * k), rgba(r.rgb, 0.3 * (1 - k)));
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
          api.text(t.text, 240, 152 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('click a cell to cycle 1-4', 240, 348, { size: 11, color: C.dim, align: 'center' });
      },
    };
  },
});
