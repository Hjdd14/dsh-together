defineGame({
  id: 'water',
  create(api) {
    const C = api.colors;
    const CELL = 30;
    const COLS = 16;
    const ROWS = 12;
    const NEED = 7;
    const solid = [];
    const wb = [];
    for (let r = 0; r < ROWS; r += 1) {
      const s = [];
      const w = [];
      for (let c = 0; c < COLS; c += 1) {
        s.push(0);
        w.push(0);
      }
      solid.push(s);
      wb.push(w);
    }
    const parts = [];
    const floats = [];
    let clock = 0;
    let srcX = 84;
    let pipeX = 384;
    let emitAt = 0;
    let drained = 0;
    let dug = 0;
    let routed = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let flash = 0;
    let flashColor = C.good;
    let blink = 0;
    let mouth = 0;
    let down = false;
    let missUp = 0;

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50, t: api.rnd(0.3, 0.7), max: 0.7, r: api.rnd(1.6, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 7) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.9, c: color });
    }

    function buildLayout() {
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          solid[r][c] = 0;
          wb[r][c] = 0;
        }
      }
      srcX = api.rnd(62, 150);
      pipeX = api.rnd(280, 424);
      for (let c = 0; c < COLS; c += 1) {
        if (api.rng() < 0.55) solid[3][c] = 1;
        if (api.rng() < 0.34) solid[4][c] = 1;
        if (api.rng() < 0.2) solid[6][c] = 1;
        if (api.rng() < 0.14) solid[8][c] = 1;
      }
      for (let i = 0; i < 3; i += 1) {
        const br = api.irnd(5, 8);
        const bc = api.irnd(1, COLS - 3);
        solid[br][bc] = 1;
        solid[br][bc + 1] = 1;
      }
      const pc = Math.max(0, Math.min(COLS - 1, Math.floor(pipeX / CELL)));
      // The tub used to fill with no digging at all: the whole intake column was cleared
      // and the floor was open, so water slid along the bottom row into the mouth. Make
      // the bottom row a real floor with a single gap, and bury that gap in dirt above.
      const pc0 = Math.max(0, Math.floor((pipeX - 32) / CELL));
      const pc1 = Math.min(COLS - 1, Math.floor((pipeX + 32) / CELL));
      for (let c = 0; c < COLS; c += 1) solid[ROWS - 1][c] = c < pc0 || c > pc1 ? 1 : 0;
      for (let c = pc0; c <= pc1; c += 1) {
        for (let r = 5; r < ROWS - 1; r += 1) solid[r][c] = 1;
      }
      drained = 0;
      emitAt = clock;
      mouth = 0;
      api.setStatus('drag the dirt to guide the water');
    }

    buildLayout();

    function dig(x, y) {
      const r0 = Math.max(0, Math.floor((y - 22) / CELL));
      const r1 = Math.min(ROWS - 1, Math.floor((y + 22) / CELL));
      const c0 = Math.max(0, Math.floor((x - 22) / CELL));
      const c1 = Math.min(COLS - 1, Math.floor((x + 22) / CELL));
      for (let r = r0; r <= r1; r += 1) {
        for (let c = c0; c <= c1; c += 1) {
          if (!solid[r][c]) continue;
          const dx = c * CELL + CELL / 2 - x;
          const dy = r * CELL + CELL / 2 - y;
          if (dx * dx + dy * dy > 24 * 24) continue;
          solid[r][c] = 0;
          dug += 1;
          if (parts.length < 70) burst(c * CELL + 15, r * CELL + 15, 'rgba(150,112,72,0.9)', 3, 90);
        }
      }
    }

    function complete() {
      routed += 1;
      combo += 1;
      comboT = 2;
      if (combo > best) best = combo;
      api.progress(1);
      api.score(40 * (1 + Math.floor(combo / 3)));
      burst(pipeX, 330, C.accent, 18, 220);
      burst(pipeX, 330, C.good, 6, 130);
      label('FLOW +1', pipeX, 296, C.good);
      pulse = 1;
      flash = 1;
      flashColor = C.good;
      blink = 1;
      mouth = 1;
      buildLayout();
    }

    function flow() {
      let total = 0;
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) total += wb[r][c];
      }
      if (clock >= emitAt && total < 26) {
        const c = Math.max(0, Math.min(COLS - 1, Math.floor(srcX / CELL)));
        if (wb[1][c] < 0.9) wb[1][c] = Math.min(1, wb[1][c] + 0.5);
        emitAt = clock + 95;
      }
      for (let pass = 0; pass < 3; pass += 1) {
        for (let r = ROWS - 1; r >= 0; r -= 1) {
          for (let c = 0; c < COLS; c += 1) {
            const w = wb[r][c];
            if (w <= 0.02) continue;
            if (r + 1 < ROWS && !solid[r + 1][c]) {
              const room = 1 - wb[r + 1][c];
              if (room > 0.02) {
                const move = Math.min(w, room, 0.55);
                wb[r][c] -= move;
                wb[r + 1][c] += move;
                continue;
              }
            }
            const first = api.rng() < 0.5 ? -1 : 1;
            for (let k = 0; k < 2; k += 1) {
              const nc = c + (k === 0 ? first : -first);
              if (nc < 0 || nc >= COLS || solid[r][nc]) continue;
              const diff = wb[r][c] - wb[r][nc];
              if (diff > 0.08) {
                const move = Math.min(diff * 0.5, 0.28);
                wb[r][c] -= move;
                wb[r][nc] += move;
                break;
              }
            }
          }
        }
      }
      const pc0 = Math.max(0, Math.floor((pipeX - 32) / CELL));
      const pc1 = Math.min(COLS - 1, Math.floor((pipeX + 32) / CELL));
      for (let c = pc0; c <= pc1; c += 1) {
        const w = wb[ROWS - 1][c];
        if (w <= 0.02) continue;
        const take = Math.min(w, 0.4);
        wb[ROWS - 1][c] -= take;
        drained += take;
        if (parts.length < 70) burst(c * CELL + 15, 350, 'rgba(106,169,255,0.9)', 1, 60);
      }
      if (drained >= NEED) complete();
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'down') {
        down = true;
        missUp = 0;
        dig(ev.x, ev.y);
        return;
      }
      if (ev.type === 'up') {
        down = false;
        missUp = 0;
        return;
      }
      if (!ev.dragging) {
        missUp += 1;
        if (down && missUp >= 2) down = false;
        return;
      }
      missUp = 0;
      if (down || ev.dragging) dig(ev.x, ev.y);
    });

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pulse = Math.max(0, pulse - dt * 3.4);
        flash = Math.max(0, flash - dt * 2.6);
        blink = Math.max(0, blink - dt * 2);
        mouth = Math.max(0, mouth - dt * 0.8);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        flow();
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const q = parts[i];
          q.t -= dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.vx *= 0.92;
          q.vy = q.vy * 0.92 + 300 * dt;
          if (q.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 24;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 900);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.02 + 0.05 * k).toFixed(3) + ')');
        api.rect(0, 330, 480, 30, 'rgba(24,32,40,0.5)');

        for (let r = 0; r < ROWS; r += 1) {
          for (let c = 0; c < COLS; c += 1) {
            const x = c * CELL;
            const y = r * CELL;
            if (solid[r][c]) {
              api.rect(x + 1, y + 1, CELL - 2, CELL - 2, 'rgba(124,92,58,0.95)');
              api.rect(x + 3, y + 2, CELL - 6, 4, 'rgba(160,124,84,0.95)');
              if (r % 2 === 0) api.rect(x + 6, y + 12, 7, 4, 'rgba(96,70,44,0.7)');
              continue;
            }
            const w = wb[r][c];
            if (w < 0.03) continue;
            const h = Math.max(2, (CELL - 3) * w);
            api.rect(x + 1, y + CELL - 1 - h, CELL - 2, h, 'rgba(106,169,255,' + (0.4 + 0.4 * w).toFixed(2) + ')');
            api.rect(x + 3, y + CELL - 1 - h, CELL - 6, 2, 'rgba(255,255,255,0.4)');
          }
        }

        api.rect(srcX - 18, 6, 36, 10, C.panel);
        api.rect(srcX - 16, 8, 32, 14, C.accent2);
        api.text('SRC', srcX, 32, { size: 8, color: C.dim, align: 'center' });

        const fill = Math.min(1, drained / NEED);
        api.rect(pipeX - 38, 322, 76, 34, C.panel);
        api.rect(pipeX - 34, 326, 68, 8, C.accent);
        api.rect(pipeX - 30, 334, 60, 20, 'rgba(0,0,0,0.45)');
        api.rect(pipeX - 30, 334 + 20 - 20 * fill, 60, 20 * fill, 'rgba(106,169,255,' + (0.55 + 0.25 * fill).toFixed(2) + ')');
        api.circle(pipeX - 12, 344, 5, C.fg);
        api.circle(pipeX + 12, 344, 5, C.fg);
        api.circle(pipeX - 12, 344, blink > 0 ? 1.5 : 2.4, C.bg);
        api.circle(pipeX + 12, 344, blink > 0 ? 1.5 : 2.4, C.bg);
        api.rect(pipeX - 14, 352 + mouth * 2, 28, 3 + mouth * 5, C.bg);

        for (let i = 0; i < parts.length; i += 1) {
          const q = parts[i];
          api.circle(q.x, q.y, q.r * (0.5 + q.t / q.max), q.t > 0.25 ? q.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x, f.y, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        api.rect(14, 344, 210, 8, 'rgba(0,0,0,0.4)');
        api.rect(14, 344, 210 * fill, 8, 'rgba(106,169,255,0.8)');
        api.text('WATER ' + Math.round(drained * 10) / 10 + '/' + NEED, 14, 336, { size: 10, color: C.dim });
        api.text('ROUTED ' + routed, 240, 350, { size: 10, color: C.good, align: 'center', weight: 'bold' });
        api.text('DIG ' + dug, 452, 350, { size: 9, color: C.dim, align: 'right' });
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 14, { size: 13, color: comboT > 0.6 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(200, 24, 80 * Math.max(0, comboT / 2), 3, comboT > 0.6 ? C.good : C.warn);
        }
        api.text('BEST x' + best, 240, 306, { size: 9, color: C.dim, align: 'center' });
        if (pulse > 0) api.circle(pipeX, 300, 14 + pulse * 14, 'rgba(139,220,122,0.18)');
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
      },

      dispose() {
        offPointer();
      },
    };
  },
});
