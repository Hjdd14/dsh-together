defineGame({
  id: 'tetravex',
  create(api) {
    const C = api.colors;
    const COLS = 3;
    const ROWS = 2;
    const TS = 84;
    const OX = 114;
    const OY = 80;
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = api.irnd(0, i);
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    const hEdge = [pool[0], pool[1], pool[2]];
    const vEdge = [[0, pool[3], pool[4]], [0, pool[5], pool[6]]];
    const tiles = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        tiles.push({
          top: r === 0 ? 0 : hEdge[c],
          right: c === COLS - 1 ? 0 : vEdge[r][c + 1],
          bottom: r === ROWS - 1 ? 0 : hEdge[c],
          left: c === 0 ? 0 : vEdge[r][c],
        });
      }
    }
    const pos = [];
    const credited = [];
    for (let i = 0; i < 6; i += 1) {
      pos.push(i);
      credited.push(0);
    }
    for (let k = 0; k < 10; k += 1) {
      const a = api.irnd(0, 5);
      const b = api.irnd(0, 5);
      if (a === b) continue;
      const t = pos[a];
      pos[a] = pos[b];
      pos[b] = t;
    }
    let solved = 6;
    for (let i = 0; i < 6; i += 1) if (pos[i] === i) solved -= 1;
    if (solved === 6) {
      const t = pos[0];
      pos[0] = pos[1];
      pos[1] = t;
    }

    let sel = -1;
    let hover = -1;
    let shake = 0;
    let swaps = 0;
    let correct = 0;
    let anim = null;
    const fx = [];
    const rings = [];
    const pops = [];
    const notes = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function slotRect(i) {
      const c = i % COLS;
      const r = (i - c) / COLS;
      return { x: OX + c * TS, y: OY + r * TS };
    }
    function tileOf(i) {
      return tiles[pos[i]];
    }
    function neighbour(i, dc, dr) {
      const c = i % COLS;
      const r = (i - c) / COLS;
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) return -1;
      return nr * COLS + nc;
    }
    function rightOk(i) {
      const j = neighbour(i, 1, 0);
      if (j < 0) return false;
      return tileOf(i).right === tileOf(j).left && tileOf(i).right !== 0;
    }
    function downOk(i) {
      const j = neighbour(i, 0, 1);
      if (j < 0) return false;
      return tileOf(i).bottom === tileOf(j).top && tileOf(i).bottom !== 0;
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 80) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-120, 120), vy: api.rnd(-140, 40),
          born: api.now(), life: api.rnd(250, 500), rgb: rgb, r: api.rnd(1.8, 4),
        });
      }
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 800 });
    }
    function pop(i) {
      if (pops.length > 20) pops.shift();
      pops.push({ key: i, born: api.now(), life: 210 });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 0.68 + 0.32 * (1 - (1 - k) * (1 - k)));
      }
      return s;
    }
    function settle() {
      for (let i = 0; i < 6; i += 1) {
        if (credited[i] || pos[i] !== i) continue;
        credited[i] = 1;
        correct += 1;
        api.progress(1);
        pop(i);
        const r = slotRect(i);
        burst(r.x + TS / 2, r.y + TS / 2, '139,220,122', 9);
        if (rings.length > 20) rings.shift();
        rings.push({ x: r.x + TS / 2, y: r.y + TS / 2, born: api.now(), life: 420 });
        note(correct >= 6 ? 'PERFECT' : 'MATCH', '139,220,122');
      }
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const c = Math.floor((p.x - OX) / TS);
        const r = Math.floor((p.y - OY) / TS);
        hover = c >= 0 && r >= 0 && c < COLS && r < ROWS ? r * COLS + c : -1;
        return;
      }
      if (p.type !== 'down') return;
      const c = Math.floor((p.x - OX) / TS);
      const r = Math.floor((p.y - OY) / TS);
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
      const i = r * COLS + c;
      if (sel < 0) {
        sel = i;
        return;
      }
      if (sel === i) {
        sel = -1;
        return;
      }
      const before = correct;
      const a = sel;
      const b = i;
      const t = pos[a];
      pos[a] = pos[b];
      pos[b] = t;
      anim = { a: a, b: b, born: api.now(), life: 170 };
      swaps += 1;
      settle();
      if (correct < before) {
        shake = Math.min(1, shake + 0.3);
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
          p.vy += 230 * dt;
        }
        for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].born >= rings[i].life) rings.splice(i, 1);
        for (let i = pops.length - 1; i >= 0; i -= 1) if (now - pops[i].born >= pops[i].life) pops.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
        if (anim && now - anim.born >= anim.life) anim = null;
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(185,140,255,' + (0.01 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1250))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 18) * amp, Math.cos(now / 26) * amp * 0.6);
        }
        api.text('tiles ' + correct + ' / 6 · swaps ' + swaps, 240, 26, { size: 13, color: C.dim, align: 'center' });
        for (let i = 0; i < 6; i += 1) {
          const base = slotRect(i);
          let x = base.x;
          let y = base.y;
          if (anim && (anim.a === i || anim.b === i)) {
            const other = anim.a === i ? anim.b : anim.a;
            const from = slotRect(other);
            const t = Math.min(1, (now - anim.born) / anim.life);
            const e = 1 - (1 - t) * (1 - t);
            x = from.x + (base.x - from.x) * e;
            y = from.y + (base.y - from.y) * e;
          }
          const tile = tileOf(i);
          const s = scaleFor(i, now);
          const w = TS * s;
          const pxx = x + (TS - w) / 2;
          const pyy = y + (TS - w) / 2;
          api.rect(pxx + 3, pyy + 3, w - 6, w - 6, 'rgba(255,255,255,0.10)');
          api.rect(pxx + 6, pyy + 6, w - 12, w - 12, C.panel);
          const okRight = rightOk(i);
          const okDown = downOk(i);
          if (okRight) api.rect(pxx + w - 9, pyy + 6, 3, w - 12, 'rgba(139,220,122,0.75)');
          if (okDown) api.rect(pxx + 6, pyy + w - 9, w - 12, 3, 'rgba(139,220,122,0.75)');
          const leftOk = neighbour(i, -1, 0) >= 0 && tileOf(i).left === tileOf(neighbour(i, -1, 0)).right && tileOf(i).left !== 0;
          const topOk = neighbour(i, 0, -1) >= 0 && tileOf(i).top === tileOf(neighbour(i, 0, -1)).bottom && tileOf(i).top !== 0;
          if (tile.top) {
            api.text(String(tile.top), pxx + w / 2, pyy + 15, {
              size: 15, color: topOk ? C.good : C.accent2, align: 'center', weight: 'bold',
            });
          }
          if (tile.bottom) {
            api.text(String(tile.bottom), pxx + w / 2, pyy + w - 15, {
              size: 15, color: okDown ? C.good : C.accent2, align: 'center', weight: 'bold',
            });
          }
          if (tile.left) {
            api.text(String(tile.left), pxx + 15, pyy + w / 2, {
              size: 15, color: leftOk ? C.good : C.accent2, align: 'center', weight: 'bold',
            });
          }
          if (tile.right) {
            api.text(String(tile.right), pxx + w - 15, pyy + w / 2, {
              size: 15, color: okRight ? C.good : C.accent2, align: 'center', weight: 'bold',
            });
          }
          if (i === sel) {
            api.rect(pxx + 1, pyy + 1, w - 2, 3, C.fg);
            api.rect(pxx + 1, pyy + w - 4, w - 2, 3, C.fg);
            api.rect(pxx + 1, pyy + 1, 3, w - 2, C.fg);
            api.rect(pxx + w - 4, pyy + 1, 3, w - 2, C.fg);
          }
          if (i === hover && i !== sel) api.rect(pxx + 6, pyy + 6, w - 12, w - 12, 'rgba(232,238,246,0.08)');
          if (credited[i]) api.text('\u2713', pxx + w / 2, pyy + w / 2, { size: 18, color: C.good, align: 'center' });
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, TS * (0.3 + 0.7 * k), rgba('139,220,122', 0.3 * (1 - k)));
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
          api.text(t.text, 240, 300 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('swap tiles until every touching pair matches', 240, 346, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
