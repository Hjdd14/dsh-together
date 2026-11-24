defineGame({
  id: 'wordsearch',
  create(api) {
    const C = api.colors;
    const N = 8;
    const CELL = 36;
    const OX = 96;
    const OY = 50;
    const AUX = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const POOL = ['CAT', 'DOG', 'MOON', 'STAR', 'FISH', 'TREE', 'GOLD', 'SAND'];
    const DIRS = [[1, 0], [0, 1], [1, 1], [-1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1]];
    const letters = [];
    for (let i = 0; i < N * N; i += 1) letters.push('');

    const picks = [];
    for (let i = 0; i < POOL.length; i += 1) picks.push(POOL[i]);
    for (let i = picks.length - 1; i > 0; i -= 1) {
      const j = api.irnd(0, i);
      const t = picks[i];
      picks[i] = picks[j];
      picks[j] = t;
    }
    const words = [];
    function place(word) {
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const d = DIRS[api.irnd(0, DIRS.length - 1)];
        const c0 = api.irnd(0, N - 1);
        const r0 = api.irnd(0, N - 1);
        const c1 = c0 + d[0] * (word.length - 1);
        const r1 = r0 + d[1] * (word.length - 1);
        if (c1 < 0 || r1 < 0 || c1 >= N || r1 >= N) continue;
        const cells = [];
        let ok = true;
        for (let k = 0; k < word.length; k += 1) {
          const c = c0 + d[0] * k;
          const r = r0 + d[1] * k;
          const at = r * N + c;
          if (letters[at] !== '' && letters[at] !== word.charAt(k)) {
            ok = false;
            break;
          }
          cells.push(at);
        }
        if (!ok) continue;
        for (let k = 0; k < word.length; k += 1) letters[cells[k]] = word.charAt(k);
        words.push({ word: word, cells: cells, found: 0, rgb: '255,207,92' });
        return true;
      }
      return false;
    }
    for (let i = 0; i < 3; i += 1) place(picks[i]);
    for (let i = 0; i < N * N; i += 1) {
      if (letters[i] === '') letters[i] = AUX.charAt(api.irnd(0, AUX.length - 1));
    }

    let down = -1;
    let start = -1;
    let end = -1;
    let shake = 0;
    let hover = -1;
    let foundCount = 0;
    const fx = [];
    const rings = [];
    const notes = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 80) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-100, 100), vy: api.rnd(-130, 30),
          born: api.now(), life: api.rnd(250, 480), rgb: rgb, r: api.rnd(1.8, 3.6),
        });
      }
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 820 });
    }
    function cx(c) {
      return OX + c * CELL + CELL / 2;
    }
    function cy(r) {
      return OY + r * CELL + CELL / 2;
    }
    function cellAt(x, y) {
      const c = Math.floor((x - OX) / CELL);
      const r = Math.floor((y - OY) / CELL);
      return c >= 0 && r >= 0 && c < N && r < N ? r * N + c : -1;
    }
    function segment(a, b) {
      const ac = a % N;
      const ar = (a - ac) / N;
      const bc = b % N;
      const br = (b - bc) / N;
      const dc = bc - ac;
      const dr = br - ar;
      if (dc !== 0 && dr !== 0 && Math.abs(dc) !== Math.abs(dr)) return null;
      const steps = Math.max(Math.abs(dc), Math.abs(dr));
      if (steps === 0) return [a];
      const sx = dc === 0 ? 0 : dc / Math.abs(dc);
      const sy = dr === 0 ? 0 : dr / Math.abs(dr);
      const out = [];
      for (let k = 0; k <= steps; k += 1) out.push((ar + sy * k) * N + (ac + sx * k));
      return out;
    }
    function readCells(cells) {
      let s = '';
      for (let i = 0; i < cells.length; i += 1) s += letters[cells[i]];
      return s;
    }
    function check() {
      if (start < 0 || end < 0) return;
      const cells = segment(start, end);
      if (!cells || cells.length < 3) return;
      const fwd = readCells(cells);
      const rev = fwd.split('').reverse().join('');
      for (let i = 0; i < words.length; i += 1) {
        if (words[i].found) continue;
        if (words[i].word !== fwd && words[i].word !== rev) continue;
        words[i].found = 1;
        foundCount += 1;
        api.progress(1);
        const mid = cells[Math.floor(cells.length / 2)];
        const midC = mid % N;
        const midR = (mid - midC) / N;
        for (let k = 0; k < cells.length; k += 1) {
          const c = cells[k] % N;
          const r = (cells[k] - c) / N;
          burst(cx(c), cy(r), '139,220,122', 3);
        }
        if (rings.length > 20) rings.shift();
        rings.push({ x: cx(midC), y: cy(midR), born: api.now(), life: 420 });
        note(foundCount >= 3 ? 'PERFECT' : 'FOUND ' + words[i].word, '139,220,122');
        return;
      }
      shake = Math.min(1, shake + 0.5);
      note('TRY AGAIN', '255,122,122');
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const at = cellAt(p.x, p.y);
        hover = at;
        if (down === 1 && at >= 0 && start >= 0) {
          const seg = segment(start, at);
          if (seg) end = at;
        }
        return;
      }
      if (p.type === 'down') {
        const at = cellAt(p.x, p.y);
        if (at < 0) return;
        down = 1;
        start = at;
        end = at;
        return;
      }
      if (p.type === 'up') {
        if (down === 1) {
          const at = cellAt(p.x, p.y);
          if (at >= 0 && segment(start, at)) end = at;
          check();
        }
        down = 0;
        start = -1;
        end = -1;
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
          p.vy += 230 * dt;
        }
        for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].born >= rings[i].life) rings.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(139,220,122,' + (0.01 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1300))).toFixed(3) + ')');
        const amp = shake * 4;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 18) * amp, Math.cos(now / 24) * amp * 0.5);
        }
        for (let i = 0; i < words.length; i += 1) {
          const w = words[i];
          api.text(w.word, 240 + (i - (words.length - 1) / 2) * 70, 24, {
            size: 13,
            color: w.found ? C.good : C.accent2,
            align: 'center',
            weight: w.found ? 'bold' : 'normal',
          });
        }
        const active = down === 1 && start >= 0 ? segment(start, end) : null;
        for (let r = 0; r < N; r += 1) {
          for (let c = 0; c < N; c += 1) {
            const i = r * N + c;
            api.rect(OX + c * CELL + 1, OY + r * CELL + 1, CELL - 2, CELL - 2, 'rgba(255,255,255,0.045)');
            if (i === hover) api.rect(OX + c * CELL + 1, OY + r * CELL + 1, CELL - 2, CELL - 2, 'rgba(232,238,246,0.10)');
            api.text(letters[i], cx(c), cy(r), { size: 18, color: C.fg, align: 'center' });
          }
        }
        for (let wi = 0; wi < words.length; wi += 1) {
          const w = words[wi];
          if (!w.found) continue;
          for (let k = 0; k < w.cells.length; k += 1) {
            const c = w.cells[k] % N;
            const r = (w.cells[k] - c) / N;
            api.rect(OX + c * CELL + 2, OY + r * CELL + 2, CELL - 4, CELL - 4, 'rgba(139,220,122,0.28)');
            api.text(letters[w.cells[k]], cx(c), cy(r), { size: 18, color: C.bg, align: 'center', weight: 'bold' });
          }
        }
        if (active) {
          for (let k = 0; k < active.length; k += 1) {
            const c = active[k] % N;
            const r = (active[k] - c) / N;
            api.rect(OX + c * CELL + 2, OY + r * CELL + 2, CELL - 4, CELL - 4, 'rgba(255,207,92,0.34)');
            api.text(letters[active[k]], cx(c), cy(r), { size: 18, color: C.bg, align: 'center', weight: 'bold' });
          }
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CELL * (0.6 + 1.6 * k), rgba('139,220,122', 0.26 * (1 - k)));
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
          api.text(t.text, 240, 150 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('drag across a hidden word', 240, 340, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
