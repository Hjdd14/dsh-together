defineGame({
  id: 'nonogram',
  create(api) {
    const C = api.colors;
    const N = 5;
    const CELL = 50;
    const OX = 128;
    const OY = 86;
    const pattern = [];
    const filled = [];
    const wrong = [];
    for (let i = 0; i < N * N; i += 1) {
      pattern.push(0);
      filled.push(0);
      wrong.push(0);
    }

    const cands = [];
    for (let x = 0; x < 2; x += 1) {
      for (let y = 0; y < N; y += 1) cands.push({ x: x, y: y });
    }
    for (let i = cands.length - 1; i > 0; i -= 1) {
      const j = api.irnd(0, i);
      const t = cands[i];
      cands[i] = cands[j];
      cands[j] = t;
    }
    for (let k = 0; k < 5; k += 1) {
      const x = cands[k].x;
      const y = cands[k].y;
      pattern[y * N + x] = 1;
      pattern[y * N + (N - 1 - x)] = 1;
    }

    const rowHint = [];
    const colHint = [];
    for (let y = 0; y < N; y += 1) {
      let sum = 0;
      for (let x = 0; x < N; x += 1) sum += pattern[y * N + x];
      rowHint.push(sum);
    }
    for (let x = 0; x < N; x += 1) {
      let sum = 0;
      for (let y = 0; y < N; y += 1) sum += pattern[y * N + x];
      colHint.push(sum);
    }

    let got = 0;
    let hover = -1;
    let shake = 0;

    const fx = [];
    const pops = [];
    const rings = [];
    const notes = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function cellPX(x) {
      return OX + x * CELL;
    }
    function cellPY(y) {
      return OY + y * CELL;
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 80) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-110, 110), vy: api.rnd(-140, 40),
          born: api.now(), life: api.rnd(240, 480), rgb: rgb, r: api.rnd(2, 4),
        });
      }
    }
    function pop(i) {
      if (pops.length > 40) pops.shift();
      pops.push({ key: i, born: api.now(), life: 200 });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 0.6 + 0.4 * (1 - (1 - k) * (1 - k)));
      }
      return s;
    }
    function rowDone(y) {
      if (rowHint[y] === 0) return false;
      let sum = 0;
      for (let x = 0; x < N; x += 1) sum += filled[y * N + x];
      return sum === rowHint[y];
    }
    function colDone(x) {
      if (colHint[x] === 0) return false;
      let sum = 0;
      for (let y = 0; y < N; y += 1) sum += filled[y * N + x];
      return sum === colHint[x];
    }

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
      const i = row * N + col;
      if (filled[i]) return;
      if (pattern[i]) {
        filled[i] = 1;
        wrong[i] = 0;
        got += 1;
        api.progress(1);
        pop(i);
        burst(cellPX(col) + CELL / 2, cellPY(row) + CELL / 2, '106,169,255', 6);
        if (rings.length > 20) rings.shift();
        rings.push({ x: cellPX(col) + CELL / 2, y: cellPY(row) + CELL / 2, born: api.now(), life: 380 });
        note(got >= 10 ? 'PERFECT' : 'FILL', '106,169,255');
      } else {
        wrong[i] = 1;
        shake = Math.min(1, shake + 0.4);
        note('X', '255,122,122');
      }
    });

    api.onKey((key, isDown) => {
      if (!isDown || key !== 'space') return;
      for (let i = 0; i < wrong.length; i += 1) wrong[i] = 0;
      note('CLEAR X', '143,160,180');
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
        api.text('filled ' + got + ' / 10', 240, 24, { size: 13, color: C.dim, align: 'center' });
        for (let y = 0; y < N; y += 1) {
          const done = rowDone(y);
          api.text(String(rowHint[y]), OX - 24, cellPY(y) + CELL / 2, {
            size: done ? 20 : 18,
            color: done ? C.good : C.accent2,
            align: 'center',
            weight: done ? 'bold' : 'normal',
          });
        }
        for (let x = 0; x < N; x += 1) {
          const done = colDone(x);
          api.text(String(colHint[x]), cellPX(x) + CELL / 2, OY - 26, {
            size: done ? 20 : 18,
            color: done ? C.good : C.accent2,
            align: 'center',
            weight: done ? 'bold' : 'normal',
          });
        }
        for (let y = 0; y < N; y += 1) {
          for (let x = 0; x < N; x += 1) {
            const i = y * N + x;
            const px = cellPX(x);
            const py = cellPY(y);
            const sx = rowDone(y) || colDone(x);
            let col = 'rgba(255,255,255,0.05)';
            if (filled[i]) col = C.accent;
            else if (wrong[i]) col = 'rgba(255,122,122,0.35)';
            api.rect(px + 1, py + 1, CELL - 2, CELL - 2, col);
            if (i === hover) api.rect(px + 1, py + 1, CELL - 2, CELL - 2, 'rgba(232,238,246,0.10)');
            if (filled[i]) {
              const s = scaleFor(i, now);
              const w = (CELL - 2) * s;
              api.rect(px + 1 + (CELL - 2 - w) / 2, py + 1 + (CELL - 2 - w) / 2, w, w, C.accent);
            }
            if (sx) {
              const pulse = 0.2 + 0.12 * Math.sin(now / 320 + x + y);
              api.rect(px + 1, py + 1, CELL - 2, 3, rgba('139,220,122', pulse + 0.4));
            }
            if (wrong[i] && !filled[i]) {
              g.save();
              g.translate(px + CELL / 2, py + CELL / 2);
              g.rotate(Math.PI / 4);
              g.fillStyle = C.warn;
              g.fillRect(-9, -2, 18, 4);
              g.rotate(Math.PI / 2);
              g.fillRect(-9, -2, 18, 4);
              g.restore();
            }
          }
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CELL * (0.3 + 0.5 * k), rgba('106,169,255', 0.28 * (1 - k)));
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
        api.text('clues = filled per row / column', 240, 356, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
