defineGame({
  id: 'flow',
  create(api) {
    const C = api.colors;
    const N = 6;
    const CELL = 50;
    const OX = 90;
    const OY = 46;
    const HUES = [C.accent, C.accent2, C.good, 'rgba(185,140,255,1)', 'rgba(120,220,220,1)'];
    const RGB = ['106,169,255', '255,207,92', '139,220,122', '185,140,255', '120,220,220'];
    let pairs = [];
    let level = 1;
    let drag = -1;
    let hover = -1;
    let shake = 0;
    let doneCount = 0;
    const fx = [];
    const rings = [];
    const notes = [];
    const pops = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function cellX(i) {
      return OX + (i % N) * CELL + CELL / 2;
    }
    function cellY(i) {
      return OY + Math.floor(i / N) * CELL + CELL / 2;
    }
    function cellAt(x, y) {
      const c = Math.floor((x - OX) / CELL);
      const r = Math.floor((y - OY) / CELL);
      return c >= 0 && r >= 0 && c < N && r < N ? r * N + c : -1;
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 90) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-120, 120), vy: api.rnd(-140, 40),
          born: api.now(), life: api.rnd(240, 480), rgb: rgb, r: api.rnd(2, 4),
        });
      }
      if (rings.length > 20) rings.shift();
      rings.push({ x: x, y: y, born: api.now(), life: 360, rgb: rgb });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }

    function freeNeighbours(at, used) {
      const out = [];
      const c = at % N;
      const r = (at - c) / N;
      if (c > 0 && used[at - 1] < 0) out.push(at - 1);
      if (c < N - 1 && used[at + 1] < 0) out.push(at + 1);
      if (r > 0 && used[at - N] < 0) out.push(at - N);
      if (r < N - 1 && used[at + N] < 0) out.push(at + N);
      return out;
    }
    function newLevel() {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const used = [];
        for (let i = 0; i < N * N; i += 1) used.push(-1);
        const built = [];
        let good = true;
        for (let k = 0; k < 3; k += 1) {
          const want = api.irnd(3, 6);
          let placed = false;
          for (let tries = 0; tries < 50 && !placed; tries += 1) {
            const start = api.irnd(0, N * N - 1);
            if (used[start] >= 0) continue;
            const walk = [start];
            const local = used.slice();
            local[start] = k;
            while (walk.length < want) {
              const opts = freeNeighbours(walk[walk.length - 1], local);
              if (!opts.length) break;
              const nx = api.pick(opts);
              local[nx] = k;
              walk.push(nx);
            }
            if (walk.length < 3) continue;
            for (let i = 0; i < local.length; i += 1) used[i] = local[i];
            built.push({ a: start, b: walk[walk.length - 1], path: [], done: 0, color: k, from: -1 });
            placed = true;
          }
          if (!placed) good = false;
        }
        if (good && built.length === 3) {
          pairs = built;
          drag = -1;
          return;
        }
      }
      pairs = [];
    }
    newLevel();

    function blockedByOther(at, pi) {
      for (let k = 0; k < pairs.length; k += 1) {
        if (k === pi) continue;
        const pr = pairs[k];
        if (pr.a === at || pr.b === at) return true;
        if (pr.path.indexOf(at) >= 0) return true;
      }
      return false;
    }
    function extend(at) {
      const pr = pairs[drag];
      if (!pr) return;
      const last = pr.path[pr.path.length - 1];
      if (at === last) return;
      if (pr.path.length > 1 && at === pr.path[pr.path.length - 2]) {
        pr.path.pop();
        return;
      }
      const lc = last % N;
      const lr = (last - lc) / N;
      const ac = at % N;
      const ar = (at - ac) / N;
      if (Math.abs(lc - ac) + Math.abs(lr - ar) !== 1) return;
      if (blockedByOther(at, drag)) {
        shake = Math.min(1, shake + 0.25);
        return;
      }
      if (pr.path.indexOf(at) >= 0) return;
      pr.path.push(at);
      const target = pr.from === pr.a ? pr.b : pr.a;
      if (at === target) {
        pr.done = 1;
        doneCount += 1;
        api.progress(1);
        burst(cellX(at), cellY(at), RGB[pr.color], 10);
        note(doneCount >= 12 ? 'PERFECT' : 'LINK ' + doneCount, '139,220,122');
        drag = -1;
        if (pairs.every((q) => q.done)) {
          level += 1;
          newLevel();
          note('LEVEL ' + level, '255,207,92');
        }
      }
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        hover = cellAt(p.x, p.y);
        if (drag >= 0 && hover >= 0) extend(hover);
        return;
      }
      if (p.type === 'down') {
        const at = cellAt(p.x, p.y);
        if (at < 0) return;
        for (let k = 0; k < pairs.length; k += 1) {
          const pr = pairs[k];
          if (pr.a !== at && pr.b !== at) continue;
          if (pr.done) pr.done = 0;
          pr.path = [at];
          pr.from = at;
          drag = k;
          return;
        }
        return;
      }
      if (p.type === 'up') drag = -1;
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
        api.text('links ' + doneCount + ' / 12 · level ' + level, 240, 24, { size: 12, color: C.dim, align: 'center' });
        api.rect(OX - 5, OY - 5, N * CELL + 10, N * CELL + 10, C.panel);
        for (let r = 0; r < N; r += 1) {
          for (let c = 0; c < N; c += 1) {
            api.rect(OX + c * CELL + 1, OY + r * CELL + 1, CELL - 2, CELL - 2, 'rgba(255,255,255,0.035)');
          }
        }
        for (let k = 0; k < pairs.length; k += 1) {
          const pr = pairs[k];
          for (let i = 0; i + 1 < pr.path.length; i += 1) {
            const a = pr.path[i];
            const b = pr.path[i + 1];
            const ax = cellX(a);
            const ay = cellY(a);
            const bx = cellX(b);
            const by = cellY(b);
            const w = 16;
            if (ay === by) api.rect(Math.min(ax, bx) - w / 2, ay - w / 2, Math.abs(bx - ax) + w, w, HUES[pr.color]);
            else api.rect(ax - w / 2, Math.min(ay, by) - w / 2, w, Math.abs(by - ay) + w, HUES[pr.color]);
          }
          const pulse = 0.35 + 0.15 * Math.sin(now / 300 + k);
          api.circle(cellX(pr.a), cellY(pr.a), 13, pr.done ? HUES[pr.color] : rgba(RGB[pr.color], pulse + 0.45));
          api.circle(cellX(pr.b), cellY(pr.b), 13, pr.done ? HUES[pr.color] : rgba(RGB[pr.color], pulse + 0.45));
          if (pr.done) api.circle(cellX(pr.a), cellY(pr.a), 6, 'rgba(16,20,24,0.6)');
          if (pr.done) api.circle(cellX(pr.b), cellY(pr.b), 6, 'rgba(16,20,24,0.6)');
        }
        if (hover >= 0) {
          const hc = hover % N;
          const hr = (hover - hc) / N;
          api.rect(OX + hc * CELL + 1, OY + hr * CELL + 1, CELL - 2, CELL - 2, 'rgba(232,238,246,0.08)');
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CELL * (0.3 + 0.6 * k), rgba(r.rgb, 0.28 * (1 - k)));
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
        api.text('drag from one dot to its twin', 240, 352, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
