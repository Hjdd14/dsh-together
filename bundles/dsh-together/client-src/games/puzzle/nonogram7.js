defineGame({
  id: 'nonogram7',
  create(api) {
    const C = api.colors;
    const N = 7;
    const CELL = 36;
    const OX = 124;
    const OY = 78;
    const pattern = [];
    const filled = [];
    const wrong = [];
    for (let i = 0; i < N * N; i += 1) {
      pattern.push(0);
      filled.push(0);
      wrong.push(0);
    }

    const pairs = [];
    for (let x = 0; x < 3; x += 1) {
      for (let y = 0; y < N; y += 1) pairs.push({ x: x, y: y });
    }
    for (let i = pairs.length - 1; i > 0; i -= 1) {
      const j = api.irnd(0, i);
      const t = pairs[i];
      pairs[i] = pairs[j];
      pairs[j] = t;
    }
    for (let k = 0; k < 8; k += 1) {
      const x = pairs[k].x;
      const y = pairs[k].y;
      pattern[y * N + x] = 1;
      pattern[y * N + (N - 1 - x)] = 1;
    }
    const mids = [];
    for (let y = 0; y < N; y += 1) mids.push(y);
    for (let i = mids.length - 1; i > 0; i -= 1) {
      const j = api.irnd(0, i);
      const t = mids[i];
      mids[i] = mids[j];
      mids[j] = t;
    }
    for (let k = 0; k < 4; k += 1) pattern[mids[k] * N + 3] = 1;

    function runsOf(get) {
      const out = [];
      let run = 0;
      for (let k = 0; k < N; k += 1) {
        if (get(k)) {
          run += 1;
        } else {
          if (run) out.push(run);
          run = 0;
        }
      }
      if (run) out.push(run);
      return out;
    }
    const rowRuns = [];
    const colRuns = [];
    for (let y = 0; y < N; y += 1) rowRuns.push(runsOf((x) => pattern[y * N + x] === 1));
    for (let x = 0; x < N; x += 1) colRuns.push(runsOf((y) => pattern[y * N + x] === 1));

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
    function px(x) {
      return OX + x * CELL;
    }
    function py(y) {
      return OY + y * CELL;
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 70) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-100, 100), vy: api.rnd(-130, 30),
          born: api.now(), life: api.rnd(240, 460), rgb: rgb, r: api.rnd(1.8, 3.6),
        });
      }
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }
    function pop(i) {
      if (pops.length > 40) pops.shift();
      pops.push({ key: i, born: api.now(), life: 200 });
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
    function rowDone(y) {
      for (let x = 0; x < N; x += 1) if (pattern[y * N + x] && !filled[y * N + x]) return false;
      return rowRuns[y].length > 0;
    }
    function colDone(x) {
      for (let y = 0; y < N; y += 1) if (pattern[y * N + x] && !filled[y * N + x]) return false;
      return colRuns[x].length > 0;
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
      if (filled[i]) return;
      if (pattern[i]) {
        filled[i] = 1;
        wrong[i] = 0;
        got += 1;
        api.progress(1);
        pop(i);
        burst(px(c) + CELL / 2, py(r) + CELL / 2, '106,169,255', 5);
        if (rings.length > 20) rings.shift();
        rings.push({ x: px(c) + CELL / 2, y: py(r) + CELL / 2, born: api.now(), life: 360 });
        note(got >= 20 ? 'PERFECT' : 'FILL', '139,220,122');
      } else {
        wrong[i] = 1;
        shake = Math.min(1, shake + 0.35);
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
          p.vy += 230 * dt;
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
        const amp = shake * 4;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 18) * amp, 0);
        }
        api.text('filled ' + got + ' / 20', 240, 26, { size: 13, color: C.dim, align: 'center' });
        for (let y = 0; y < N; y += 1) {
          const done = rowDone(y);
          const label = rowRuns[y].length ? rowRuns[y].join(' ') : '0';
          api.text(label, OX - 10, py(y) + CELL / 2, {
            size: 12,
            color: done ? C.good : C.accent2,
            align: 'right',
            weight: done ? 'bold' : 'normal',
          });
        }
        for (let x = 0; x < N; x += 1) {
          const done = colDone(x);
          const list = colRuns[x].length ? colRuns[x] : [0];
          for (let k = 0; k < list.length; k += 1) {
            api.text(String(list[k]), px(x) + CELL / 2, OY - 12 - (list.length - 1 - k) * 13, {
              size: 11,
              color: done ? C.good : C.accent2,
              align: 'center',
            });
          }
        }
        for (let y = 0; y < N; y += 1) {
          for (let x = 0; x < N; x += 1) {
            const i = y * N + x;
            let col = 'rgba(255,255,255,0.05)';
            if (filled[i]) col = C.accent;
            else if (wrong[i]) col = 'rgba(255,122,122,0.35)';
            api.rect(px(x) + 1, py(y) + 1, CELL - 2, CELL - 2, col);
            if (i === hover) api.rect(px(x) + 1, py(y) + 1, CELL - 2, CELL - 2, 'rgba(232,238,246,0.10)');
            if (filled[i]) {
              const s = scaleFor(i, now);
              const w = (CELL - 2) * s;
              api.rect(px(x) + 1 + (CELL - 2 - w) / 2, py(y) + 1 + (CELL - 2 - w) / 2, w, w, C.accent);
            }
            if (wrong[i] && !filled[i]) {
              g.save();
              g.translate(px(x) + CELL / 2, py(y) + CELL / 2);
              g.rotate(Math.PI / 4);
              g.fillStyle = C.warn;
              g.fillRect(-7, -1.5, 14, 3);
              g.rotate(Math.PI / 2);
              g.fillRect(-7, -1.5, 14, 3);
              g.restore();
            }
          }
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CELL * (0.3 + 0.5 * k), rgba('106,169,255', 0.3 * (1 - k)));
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
          api.text(t.text, 240, 164 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('clues = runs per row / column', 240, 352, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
