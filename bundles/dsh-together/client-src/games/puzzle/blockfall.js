defineGame({
  id: 'blockfall',
  create(api) {
    const C = api.colors;
    const N = 8;
    const CELL = 34;
    const OX = 104;
    const OY = 30;
    const HUES = [C.accent, C.accent2, C.good, 'rgba(185,140,255,1)', 'rgba(120,220,220,1)'];
    const RGB = ['106,169,255', '255,207,92', '139,220,122', '185,140,255', '120,220,220'];
    const SHAPES = [
      [[0, 0]],
      [[0, 0], [1, 0]],
      [[0, 0], [0, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [0, 1], [0, 2]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [1, 0], [0, 1]],
      [[0, 0], [1, 0], [1, 1]],
    ];
    const grid = [];
    for (let i = 0; i < N * N; i += 1) grid.push(-1);
    let tray = [];
    let grab = -1;
    let gx = 0;
    let gy = 0;
    let placed = 0;
    let shake = 0;
    let hoverTray = -1;
    const fx = [];
    const rings = [];
    const notes = [];
    const pops = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 100) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-130, 130), vy: api.rnd(-150, 40),
          born: api.now(), life: api.rnd(240, 500), rgb: rgb, r: api.rnd(2, 4),
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
    function makePiece() {
      const shape = api.pick(SHAPES);
      return { cells: shape, color: api.irnd(0, HUES.length - 1) };
    }
    function refill() {
      tray = [makePiece(), makePiece(), makePiece()];
      grab = -1;
    }
    function pieceSize(p) {
      let w = 0;
      let h = 0;
      for (let i = 0; i < p.cells.length; i += 1) {
        if (p.cells[i][0] + 1 > w) w = p.cells[i][0] + 1;
        if (p.cells[i][1] + 1 > h) h = p.cells[i][1] + 1;
      }
      return [w, h];
    }
    function canPlace(p, ac, ar) {
      for (let i = 0; i < p.cells.length; i += 1) {
        const c = ac + p.cells[i][0];
        const r = ar + p.cells[i][1];
        if (c < 0 || r < 0 || c >= N || r >= N) return false;
        if (grid[r * N + c] >= 0) return false;
      }
      return true;
    }
    function anyFit(p) {
      for (let r = 0; r < N; r += 1) {
        for (let c = 0; c < N; c += 1) if (canPlace(p, c, r)) return true;
      }
      return false;
    }
    function drop(p, ac, ar) {
      for (let i = 0; i < p.cells.length; i += 1) {
        const c = ac + p.cells[i][0];
        const r = ar + p.cells[i][1];
        grid[r * N + c] = p.color;
        pop(r * N + c);
      }
      placed += 1;
      api.progress(1);
      burst(OX + (ac + 1) * CELL, OY + (ar + 1) * CELL, RGB[p.color], 9);
      let lines = 0;
      for (let r = 0; r < N; r += 1) {
        let full = 1;
        for (let c = 0; c < N; c += 1) if (grid[r * N + c] < 0) full = 0;
        if (!full) continue;
        lines += 1;
        for (let c2 = 0; c2 < N; c2 += 1) {
          burst(OX + c2 * CELL + CELL / 2, OY + r * CELL + CELL / 2, '255,207,92', 4);
          grid[r * N + c2] = -1;
        }
      }
      for (let c = 0; c < N; c += 1) {
        let full = 1;
        for (let r = 0; r < N; r += 1) if (grid[r * N + c] < 0) full = 0;
        if (!full) continue;
        lines += 1;
        for (let r2 = 0; r2 < N; r2 += 1) {
          burst(OX + c * CELL + CELL / 2, OY + r2 * CELL + CELL / 2, '255,207,92', 4);
          grid[r2 * N + c] = -1;
        }
      }
      if (lines > 0) {
        if (rings.length > 20) rings.shift();
        rings.push({ x: 240, y: 170, born: api.now(), life: 380 });
        note('LINE x' + lines, '255,207,92');
      } else {
        note(placed >= 6 ? 'PERFECT' : 'PLACE ' + placed, '139,220,122');
      }
      if (tray.length === 0) refill();
      else if (!tray.some((q) => anyFit(q))) {
        refill();
        note('NEW SET', '143,160,180');
      }
    }

    refill();

    api.onPointer((p) => {
      if (p.type === 'down') {
        if (p.y < 306) return;
        for (let i = 0; i < tray.length; i += 1) {
          const cx0 = 96 + i * 120;
          if (p.x > cx0 - 46 && p.x < cx0 + 46) {
            grab = i;
            gx = p.x;
            gy = p.y;
            return;
          }
        }
        return;
      }
      if (p.type === 'move') {
        if (grab >= 0) {
          gx = p.x;
          gy = p.y;
        } else if (p.y > 306) {
          hoverTray = -1;
          for (let i = 0; i < tray.length; i += 1) {
            const cx0 = 96 + i * 120;
            if (p.x > cx0 - 46 && p.x < cx0 + 46) hoverTray = i;
          }
        }
        return;
      }
      if (p.type !== 'up' || grab < 0) return;
      const piece = tray[grab];
      if (!piece) {
        grab = -1;
        return;
      }
      const size = pieceSize(piece);
      const ac = Math.round((p.x - OX - (size[0] * CELL) / 2) / CELL);
      const ar = Math.round((p.y - OY - (size[1] * CELL) / 2) / CELL);
      if (p.y < 306 && canPlace(piece, ac, ar)) {
        tray.splice(grab, 1);
        drop(piece, ac, ar);
      } else {
        shake = Math.min(1, shake + 0.45);
        note('NO ROOM', '255,122,122');
      }
      grab = -1;
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
        api.rect(0, 0, 480, 360, 'rgba(185,140,255,' + (0.01 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1300))).toFixed(3) + ')');
        const amp = shake * 4;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 18) * amp, Math.cos(now / 25) * amp * 0.5);
        }
        api.text('pieces ' + placed + ' / 6 · drag a piece in', 240, 16, { size: 12, color: C.dim, align: 'center' });
        api.rect(OX - 5, OY - 5, N * CELL + 10, N * CELL + 10, C.panel);
        for (let r = 0; r < N; r += 1) {
          for (let c = 0; c < N; c += 1) {
            api.rect(OX + c * CELL + 1, OY + r * CELL + 1, CELL - 2, CELL - 2, 'rgba(255,255,255,0.035)');
          }
        }
        for (let r = 0; r < N; r += 1) {
          for (let c = 0; c < N; c += 1) {
            const hue = grid[r * N + c];
            if (hue < 0) continue;
            const s = scaleFor(r * N + c, now);
            const w = CELL * s - 4;
            api.rect(OX + c * CELL + (CELL - w) / 2, OY + r * CELL + (CELL - w) / 2, w, w, HUES[hue]);
            api.rect(OX + c * CELL + 4, OY + r * CELL + 4, CELL - 8, 3, 'rgba(255,255,255,0.22)');
          }
        }
        if (grab >= 0 && tray[grab] && gy < 320) {
          const piece = tray[grab];
          const size = pieceSize(piece);
          const ac = Math.round((gx - OX - (size[0] * CELL) / 2) / CELL);
          const ar = Math.round((gy - OY - (size[1] * CELL) / 2) / CELL);
          const ok = canPlace(piece, ac, ar);
          for (let i = 0; i < piece.cells.length; i += 1) {
            const c = ac + piece.cells[i][0];
            const r = ar + piece.cells[i][1];
            const px = OX + c * CELL;
            const py = OY + r * CELL;
            api.rect(px + 2, py + 2, CELL - 4, CELL - 4, ok ? rgba(RGB[piece.color], 0.7) : 'rgba(255,122,122,0.55)');
          }
        }
        api.rect(0, 306, 480, 54, 'rgba(255,255,255,0.03)');
        for (let i = 0; i < tray.length; i += 1) {
          const piece = tray[i];
          const cx0 = 96 + i * 120;
          const size = pieceSize(piece);
          const sc = 0.62;
          const w = size[0] * CELL * sc;
          for (let k = 0; k < piece.cells.length; k += 1) {
            const px = cx0 - w / 2 + piece.cells[k][0] * CELL * sc;
            const py = 330 - (size[1] * CELL * sc) / 2 + piece.cells[k][1] * CELL * sc;
            api.rect(px + 2, py + 2, CELL * sc - 4, CELL * sc - 4, i === grab ? 'rgba(232,238,246,0.22)' : HUES[piece.color]);
          }
          if (i === hoverTray) api.circle(cx0, 330, 44, 'rgba(232,238,246,0.06)');
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, 60 + 110 * k, rgba('255,207,92', 0.16 * (1 - k)));
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
          api.text(t.text, 240, 168 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
      },
    };
  },
});
