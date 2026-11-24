defineGame({
  id: 'hidden',
  create(api) {
    const C = api.colors;
    const TARGETS = 6;
    const cells = [];
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 6; c += 1) {
        cells.push({
          x: 62 + c * 71 + api.rnd(-6, 6),
          y: 104 + r * 62 + api.rnd(-5, 5),
          r: api.rnd(8, 11),
          target: false,
          found: false,
          pop: 0,
          ph: api.rnd(0, 6.28),
        });
      }
    }
    let placed = 0;
    for (let guard = 0; guard < 400 && placed < TARGETS; guard += 1) {
      const idx = api.irnd(0, cells.length - 1);
      if (!cells[idx].target) {
        cells[idx].target = true;
        placed += 1;
      }
    }
    for (let i = 0; placed < TARGETS && i < cells.length; i += 1) {
      if (!cells[i].target) {
        cells[i].target = true;
        placed += 1;
      }
    }
    let clock = 0;
    let hits = 0;
    let misses = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let lastFindAt = 0;
    let hint = -1;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 70) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.3, 0.68), max: 0.68, r: api.rnd(1.4, 3.2), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 6) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function pickHint() {
      hint = -1;
      for (let i = 0; i < cells.length; i += 1) {
        if (cells[i].target && !cells[i].found) { hint = i; return; }
      }
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type !== 'down') return;
      let bestIdx = -1;
      let bd = 1e9;
      for (let i = 0; i < cells.length; i += 1) {
        const dx = ev.x - cells[i].x;
        const dy = ev.y - cells[i].y;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; bestIdx = i; }
      }
      if (bestIdx < 0 || bd > 26 * 26) {
        misses += 1;
        combo = 0;
        comboT = 0;
        shake = 0.6;
        burst(ev.x, ev.y, 'rgba(143,160,180,0.4)', 3, 60);
        return;
      }
      const cell = cells[bestIdx];
      if (cell.target && !cell.found) {
        cell.found = true;
        cell.pop = 1;
        hits += 1;
        combo += 1;
        comboT = 1.6;
        if (combo > best) best = combo;
        lastFindAt = clock;
        hint = -1;
        api.progress(1);
        api.score(14 * (1 + Math.floor(combo / 3)));
        flash = 1;
        flashColor = C.good;
        burst(cell.x, cell.y, C.accent2, 14, 200);
        burst(cell.x, cell.y, C.good, 5, 120);
        label(combo >= 3 ? 'COMBO ' + combo : 'FOUND', cell.x, cell.y - 30, combo >= 3 ? C.accent2 : C.good);
      } else {
        misses += 1;
        combo = 0;
        comboT = 0;
        shake = 1;
        flash = 1;
        flashColor = C.warn;
        burst(cell.x, cell.y, 'rgba(143,160,180,0.5)', 4, 80);
        label('EMPTY', cell.x, cell.y - 26, C.warn);
      }
    });

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        shake = Math.max(0, shake - dt * 4.2);
        flash = Math.max(0, flash - dt * 2.8);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        for (let i = 0; i < cells.length; i += 1) {
          if (cells[i].pop > 0) cells[i].pop = Math.max(0, cells[i].pop - dt * 1.3);
        }
        if (hint < 0 && lastFindAt > 0 && clock - lastFindAt > 6000) pickHint();
        if (lastFindAt === 0 && clock > 7000 && hint < 0) pickHint();
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.t -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.92;
          p.vy *= 0.92;
          if (p.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 22;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 940);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        api.rect(0, 58, 480, 250, 'rgba(0,0,0,0.28)');
        const sx = shake > 0 ? Math.sin(clock * 0.25) * shake * 5 : 0;
        const sy = shake > 0 ? Math.cos(clock * 0.21) * shake * 3 : 0;
        api.text('FIND THE BRIGHT DOTS', 240, 36, { size: 13, color: C.dim, align: 'center' });

        const hintPulse = 0.5 + 0.5 * Math.sin(clock / 150);
        for (let i = 0; i < cells.length; i += 1) {
          const cell = cells[i];
          const breathe = 1 + 0.04 * Math.sin(clock / 500 + cell.ph);
          api.circle(cell.x + sx, cell.y + sy, (cell.r + 4) * breathe, C.panel);
          api.circle(cell.x + sx, cell.y + sy, cell.r * breathe, 'rgba(143,160,180,0.28)');
          if (cell.found) {
            api.circle(cell.x + sx, cell.y + sy, 3, C.good);
            api.circle(cell.x + sx, cell.y + sy, cell.r + 9 + 13 * cell.pop, 'rgba(139,220,122,0.2)');
          } else if (cell.target) {
            api.circle(cell.x + sx, cell.y + sy, 3, C.accent2);
            if (i === hint) api.circle(cell.x + sx, cell.y + sy, cell.r + 8 + 6 * hintPulse, 'rgba(255,207,92,0.22)');
          } else {
            api.circle(cell.x + sx, cell.y + sy, 3, 'rgba(24,32,40,0.9)');
          }
        }

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y + sy, p.r * (0.5 + p.t / p.max), p.t > 0.25 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y + sy, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 320, { size: 14, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(196, 331, 88 * Math.max(0, comboT / 1.6), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(hits), 32, 28, { size: 22, color: C.good, weight: 'bold' });
        api.text('FOUND', 32, 46, { size: 10, color: C.dim });
        api.text('WRONG ' + misses, 448, 28, { size: 12, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 448, 46, { size: 10, color: C.dim, align: 'right' });
        api.text(hint >= 0 ? 'a hint is glowing' : 'click a cell', 240, 346, { size: 11, color: hint >= 0 ? C.accent2 : C.dim, align: 'center' });
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
      },

      dispose() {
        offPointer();
      },
    };
  },
});
