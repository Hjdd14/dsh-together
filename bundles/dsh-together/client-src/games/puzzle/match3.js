defineGame({
  id: 'match3',
  create(api) {
    const C = api.colors;
    const COLS = 8;
    const ROWS = 8;
    const CELL = 40;
    const OX = 80;
    const OY = 18;
    const HUES = [C.accent, C.accent2, C.good, C.warn, 'rgba(185,140,255,1)'];
    const RGB = ['106,169,255', '255,207,92', '139,220,122', '255,122,122', '185,140,255'];
    const board = [];
    for (let i = 0; i < COLS * ROWS; i += 1) board.push(0);

    const fx = [];
    const pops = [];
    const rings = [];
    const notes = [];
    let shake = 0;
    let sel = -1;
    let hover = -1;
    let cleared = 0;

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function centre(i) {
      const x = i % COLS;
      const y = (i - x) / COLS;
      return { x: OX + x * CELL + CELL / 2, y: OY + y * CELL + CELL / 2 };
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 110) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-120, 120), vy: api.rnd(-150, 40),
          born: api.now(), life: api.rnd(260, 520), rgb: rgb, r: api.rnd(2, 4.5),
        });
      }
    }
    function pop(i, kind) {
      if (pops.length > 80) pops.shift();
      pops.push({ key: i, kind: kind, born: api.now(), life: kind === 'in' ? 170 : 200 });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 780 });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        if (pops[i].kind === 'in') s = Math.max(s, 0.55 + 0.45 * (1 - (1 - k) * (1 - k)));
        else s = Math.max(s, 1 + 0.25 * Math.sin(Math.PI * k));
      }
      return s;
    }

    function marks() {
      const grid = [];
      for (let i = 0; i < COLS * ROWS; i += 1) grid.push(0);
      let any = false;
      for (let y = 0; y < ROWS; y += 1) {
        let run = 1;
        for (let x = 1; x <= COLS; x += 1) {
          const same = x < COLS && board[y * COLS + x] >= 0 && board[y * COLS + x] === board[y * COLS + x - 1];
          if (same) {
            run += 1;
          } else {
            if (run >= 3) {
              any = true;
              for (let k = x - run; k < x; k += 1) grid[y * COLS + k] = 1;
            }
            run = 1;
          }
        }
      }
      for (let x = 0; x < COLS; x += 1) {
        let run = 1;
        for (let y = 1; y <= ROWS; y += 1) {
          const same = y < ROWS && board[y * COLS + x] >= 0 && board[y * COLS + x] === board[(y - 1) * COLS + x];
          if (same) {
            run += 1;
          } else {
            if (run >= 3) {
              any = true;
              for (let k = y - run; k < y; k += 1) grid[k * COLS + x] = 1;
            }
            run = 1;
          }
        }
      }
      return any ? grid : null;
    }

    function drop(fresh) {
      for (let x = 0; x < COLS; x += 1) {
        let write = ROWS - 1;
        for (let y = ROWS - 1; y >= 0; y -= 1) {
          const v = board[y * COLS + x];
          if (v >= 0) {
            board[write * COLS + x] = v;
            write -= 1;
          }
        }
        for (; write >= 0; write -= 1) {
          board[write * COLS + x] = api.irnd(0, HUES.length - 1);
          fresh.push(write * COLS + x);
        }
      }
    }

    function resolve() {
      let total = 0;
      for (let round = 0; round < 24; round += 1) {
        const grid = marks();
        if (!grid) break;
        let n = 0;
        for (let i = 0; i < grid.length; i += 1) {
          if (!grid[i]) continue;
          const p = centre(i);
          burst(p.x, p.y, RGB[board[i]] || '255,207,92', 5);
          board[i] = -1;
          n += 1;
        }
        total += n;
        if (round >= 1) {
          note('COMBO x' + (round + 1), '255,207,92');
          if (rings.length > 20) rings.shift();
          rings.push({ x: 240, y: 180, born: api.now(), life: 380 });
        } else if (n >= 5) {
          note('CLEAR', '139,220,122');
        }
        const fresh = [];
        drop(fresh);
        for (let k = 0; k < fresh.length; k += 1) pop(fresh[k], 'in');
      }
      return total;
    }

    function hasMove() {
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          const i = y * COLS + x;
          for (let k = 0; k < 2; k += 1) {
            const j = k === 0 ? (x + 1 < COLS ? i + 1 : -1) : (y + 1 < ROWS ? i + COLS : -1);
            if (j < 0) continue;
            const t = board[i];
            board[i] = board[j];
            board[j] = t;
            const ok = marks() !== null;
            const back = board[i];
            board[i] = board[j];
            board[j] = back;
            if (ok) return true;
          }
        }
      }
      return false;
    }

    function build() {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        for (let i = 0; i < board.length; i += 1) board[i] = api.irnd(0, HUES.length - 1);
        for (let guard = 0; guard < 60; guard += 1) {
          const grid = marks();
          if (!grid) break;
          for (let i = 0; i < grid.length; i += 1) if (grid[i]) board[i] = api.irnd(0, HUES.length - 1);
        }
        if (hasMove()) {
          for (let i = 0; i < board.length; i += 1) pop(i, 'in');
          return;
        }
      }
    }

    build();

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
      const at = gy * COLS + gx;
      if (sel < 0 || sel === at) {
        sel = sel === at ? -1 : at;
        return;
      }
      const sx = sel % COLS;
      const sy = (sel - sx) / COLS;
      if (Math.abs(sx - gx) + Math.abs(sy - gy) !== 1) {
        sel = at;
        return;
      }
      const a = sel;
      const b = at;
      const t = board[a];
      board[a] = board[b];
      board[b] = t;
      if (marks()) {
        const n = resolve();
        cleared += n;
        api.progress(n);
        if (!hasMove()) {
          note('SHUFFLE', '143,160,180');
          build();
        }
      } else {
        const back = board[a];
        board[a] = board[b];
        board[b] = back;
        shake = Math.min(1, shake + 0.5);
        note('MISS', '255,122,122');
      }
      sel = -1;
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
        for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].born >= rings[i].life) rings.splice(i, 1);
        for (let i = pops.length - 1; i >= 0; i -= 1) if (now - pops[i].born >= pops[i].life) pops.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.012 + 0.024 * (0.5 + 0.5 * Math.sin(now / 1200))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 20) * amp, Math.cos(now / 26) * amp * 0.6);
        }
        api.rect(OX - 6, OY - 6, COLS * CELL + 12, ROWS * CELL + 12, 'rgba(255,255,255,0.04)');
        for (let y = 0; y < ROWS; y += 1) {
          for (let x = 0; x < COLS; x += 1) {
            const i = y * COLS + x;
            const v = board[i];
            const px = OX + x * CELL;
            const py = OY + y * CELL;
            if (i === hover) api.rect(px + 2, py + 2, CELL - 4, CELL - 4, 'rgba(232,238,246,0.09)');
            if (v < 0) continue;
            const s = scaleFor(i, now);
            const w = CELL * s;
            const off = (CELL - w) / 2;
            api.rect(px + off + 3, py + off + 3, w - 6, w - 6, HUES[v]);
            api.rect(px + off + 9, py + off + 9, Math.max(2, w - 18), 5, 'rgba(255,255,255,0.28)');
            if (i === sel) {
              api.rect(px + 1, py + 1, CELL - 2, 3, C.fg);
              api.rect(px + 1, py + CELL - 4, CELL - 2, 3, C.fg);
              api.rect(px + 1, py + 1, 3, CELL - 2, C.fg);
              api.rect(px + CELL - 4, py + 1, 3, CELL - 2, C.fg);
            }
          }
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, 40 + 80 * k, rgba('255,207,92', 0.10 * (1 - k)));
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
        api.text('cleared ' + cleared + ' · swap two neighbours', 240, 350, { size: 11, color: C.dim, align: 'center' });
      },
    };
  },
});
