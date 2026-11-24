defineGame({
  id: 'mahjong',
  create(api) {
    const C = api.colors;
    const COLS = 6;
    const ROWS = 6;
    const CW = 58;
    const CH = 44;
    const OX = 61;
    const OY = 54;
    const GLYPH = ['◆', '●', '■', '▲', '★', '❖'];
    const RGB = ['255,207,92', '106,169,255', '139,220,122', '255,122,122', '185,140,255', '120,220,220'];
    const grid = [];
    for (let i = 0; i < COLS * ROWS; i += 1) grid.push(-1);

    function freeIn(board, i) {
      if (board[i] < 0) return false;
      const c = i % COLS;
      const leftOpen = c === 0 || board[i - 1] < 0;
      const rightOpen = c === COLS - 1 || board[i + 1] < 0;
      return leftOpen || rightOpen;
    }
    function trial(board) {
      const copy = board.slice();
      let pairs = 0;
      for (let round = 0; round < 30; round += 1) {
        let did = 0;
        for (let i = 0; i < copy.length && !did; i += 1) {
          if (!freeIn(copy, i)) continue;
          for (let j = i + 1; j < copy.length; j += 1) {
            if (copy[j] !== copy[i] || !freeIn(copy, j)) continue;
            copy[i] = -1;
            copy[j] = -1;
            pairs += 1;
            did = 1;
            break;
          }
        }
        if (!did) break;
      }
      return pairs;
    }
    function deal() {
      const deck = [];
      for (let s = 0; s < 6; s += 1) {
        for (let k = 0; k < 6; k += 1) deck.push(s);
      }
      for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = api.irnd(0, i);
        const t = deck[i];
        deck[i] = deck[j];
        deck[j] = t;
      }
      for (let i = 0; i < grid.length; i += 1) grid[i] = deck[i];
    }
    for (let attempt = 0; attempt < 40; attempt += 1) {
      deal();
      if (trial(grid) >= 12) break;
    }

    let sel = -1;
    let hover = -1;
    let shake = 0;
    let pairs = 0;
    let streak = 0;
    const fx = [];
    const pops = [];
    const rings = [];
    const gone = [];
    const notes = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function tx(i) {
      return OX + (i % COLS) * (CW + 4);
    }
    function ty(i) {
      return OY + Math.floor(i / COLS) * (CH + 4);
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 90) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-120, 120), vy: api.rnd(-140, 40),
          born: api.now(), life: api.rnd(250, 500), rgb: rgb, r: api.rnd(1.8, 4),
        });
      }
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 780 });
    }
    function pop(i) {
      if (pops.length > 30) pops.shift();
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

    function anyFreePair() {
      for (let i = 0; i < grid.length; i += 1) {
        if (!freeIn(grid, i)) continue;
        for (let j = i + 1; j < grid.length; j += 1) {
          if (grid[j] === grid[i] && freeIn(grid, j)) return true;
        }
      }
      return false;
    }
    function shuffleLeft() {
      const at = [];
      const syms = [];
      for (let i = 0; i < grid.length; i += 1) {
        if (grid[i] < 0) continue;
        at.push(i);
        syms.push(grid[i]);
      }
      for (let i = syms.length - 1; i > 0; i -= 1) {
        const j = api.irnd(0, i);
        const t = syms[i];
        syms[i] = syms[j];
        syms[j] = t;
      }
      for (let k = 0; k < at.length; k += 1) grid[at[k]] = syms[k];
      shake = Math.min(1, shake + 0.3);
      note('SHUFFLE', '143,160,180');
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const c = Math.floor((p.x - OX) / (CW + 4));
        const r = Math.floor((p.y - OY) / (CH + 4));
        hover = c >= 0 && r >= 0 && c < COLS && r < ROWS && p.x - OX - c * (CW + 4) <= CW && p.y - OY - r * (CH + 4) <= CH
          ? r * COLS + c : -1;
        return;
      }
      if (p.type !== 'down') return;
      const c = Math.floor((p.x - OX) / (CW + 4));
      const r = Math.floor((p.y - OY) / (CH + 4));
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
      if (p.x - OX - c * (CW + 4) > CW || p.y - OY - r * (CH + 4) > CH) return;
      const i = r * COLS + c;
      if (grid[i] < 0) return;
      if (!freeIn(grid, i)) {
        shake = Math.min(1, shake + 0.45);
        note('BLOCKED', '143,160,180');
        return;
      }
      if (sel === i) {
        sel = -1;
        return;
      }
      if (sel < 0) {
        sel = i;
        return;
      }
      if (grid[sel] !== grid[i]) {
        sel = i;
        shake = Math.min(1, shake + 0.3);
        streak = 0;
        return;
      }
      const a = sel;
      const b = i;
      sel = -1;
      const kind = grid[a];
      gone.push({ i: a, kind: kind, born: api.now(), life: 200 });
      gone.push({ i: b, kind: kind, born: api.now(), life: 200 });
      grid[a] = -1;
      grid[b] = -1;
      pairs += 1;
      streak += 1;
      api.progress(1);
      burst(tx(a) + CW / 2, ty(a) + CH / 2, RGB[kind], 8);
      burst(tx(b) + CW / 2, ty(b) + CH / 2, RGB[kind], 8);
      if (rings.length > 20) rings.shift();
      rings.push({ x: tx(b) + CW / 2, y: ty(b) + CH / 2, born: api.now(), life: 380 });
      note(streak >= 2 ? 'COMBO x' + streak : pairs >= 12 ? 'PERFECT' : 'MATCH', '139,220,122');
      if (pairs < 12 && !anyFreePair()) shuffleLeft();
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
        for (let i = gone.length - 1; i >= 0; i -= 1) if (now - gone[i].born >= gone[i].life) gone.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(255,207,92,' + (0.01 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1250))).toFixed(3) + ')');
        const amp = shake * 4;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 18) * amp, Math.cos(now / 26) * amp * 0.5);
        }
        api.text('pairs ' + pairs + ' / 12', 240, 26, { size: 13, color: C.dim, align: 'center' });
        for (let i = 0; i < grid.length; i += 1) {
          if (grid[i] < 0) continue;
          const px = tx(i);
          const py = ty(i);
          const open = freeIn(grid, i);
          const s = scaleFor(i, now);
          const w = CW * s;
          const h = CH * s;
          api.rect(px + 2 + (CW - w) / 2, py + 2 + (CH - h) / 2, w, h, open ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.05)');
          if (open) {
            api.rect(px + 2, py + 2, CW - 4, 3, 'rgba(232,238,246,0.22)');
            api.rect(px + 2, py + CH - 5, CW - 4, 3, 'rgba(0,0,0,0.35)');
          }
          api.text(GLYPH[grid[i]], px + CW / 2, py + CH / 2, {
            size: 22 * s,
            color: open ? rgba(RGB[grid[i]], 1) : rgba(RGB[grid[i]], 0.4),
            align: 'center',
          });
          if (i === sel) {
            api.rect(px + 1, py + 1, CW - 2, 2, C.fg);
            api.rect(px + 1, py + CH - 3, CW - 2, 2, C.fg);
          }
          if (i === hover && open) api.rect(px + 2, py + 2, CW - 4, CH - 4, 'rgba(232,238,246,0.10)');
        }
        for (let i = 0; i < gone.length; i += 1) {
          const g2 = gone[i];
          const k = (now - g2.born) / g2.life;
          if (k >= 1) continue;
          const px = tx(g2.i);
          const py = ty(g2.i);
          api.rect(px + 2, py + 2, CW - 4, CH - 4, rgba(RGB[g2.kind], 0.35 * (1 - k)));
          api.text(GLYPH[g2.kind], px + CW / 2, py + CH / 2, {
            size: 22 * (1 - k),
            color: rgba(RGB[g2.kind], 1 - k),
            align: 'center',
          });
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CW * (0.3 + 0.7 * k), rgba('139,220,122', 0.3 * (1 - k)));
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
          api.text(t.text, 240, 168 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('clear pairs from the row ends', 240, 348, { size: 11, color: C.dim, align: 'center' });
      },
    };
  },
});
