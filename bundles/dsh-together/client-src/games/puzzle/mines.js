defineGame({
  id: 'mines',
  create(api) {
    const C = api.colors;
    const N = 6;
    const MINES = 5;
    const CELL = 52;
    const OX = 84;
    const OY = 28;
    const mine = [];
    const near = [];
    const shown = [];
    for (let i = 0; i < N * N; i += 1) {
      mine.push(0);
      near.push(0);
      shown.push(0);
    }
    let armed = false;
    let over = false;
    let opened = 0;
    let hover = -1;

    const fx = [];
    const pops = [];
    const rings = [];
    const notes = [];
    let shake = 0;
    let flash = 0;

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function centre(i) {
      const x = i % N;
      const y = (i - x) / N;
      return { x: OX + x * CELL + CELL / 2, y: OY + y * CELL + CELL / 2 };
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 80) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-110, 110), vy: api.rnd(-140, 40),
          born: api.now(), life: api.rnd(250, 480), rgb: rgb, r: api.rnd(2, 4),
        });
      }
    }
    function pop(i, delay) {
      if (pops.length > 60) pops.shift();
      pops.push({ key: i, born: api.now() + (delay || 0), life: 200 });
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
        s = Math.max(s, 0.7 + 0.3 * (1 - (1 - k) * (1 - k)));
      }
      return s;
    }

    function lay(firstX, firstY) {
      let left = MINES;
      let guard = 0;
      while (left > 0 && guard < 4000) {
        guard += 1;
        const x = api.irnd(0, N - 1);
        const y = api.irnd(0, N - 1);
        if (Math.abs(x - firstX) <= 1 && Math.abs(y - firstY) <= 1) continue;
        const i = y * N + x;
        if (mine[i]) continue;
        mine[i] = 1;
        left -= 1;
      }
      for (let y = 0; y < N; y += 1) {
        for (let x = 0; x < N; x += 1) {
          let count = 0;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
              if (mine[ny * N + nx]) count += 1;
            }
          }
          near[y * N + x] = count;
        }
      }
      armed = true;
    }

    function openCell(start) {
      const depth = [];
      for (let i = 0; i < N * N; i += 1) depth.push(-1);
      const queue = [start];
      depth[start] = 0;
      while (queue.length) {
        const i = queue.shift();
        if (shown[i]) continue;
        shown[i] = 1;
        opened += 1;
        api.progress(1);
        pop(i, depth[i] * 12);
        const p = centre(i);
        burst(p.x, p.y, '106,169,255', 2);
        if (near[i] !== 0) continue;
        const x = i % N;
        const y = (i - x) / N;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
            const j = ny * N + nx;
            if (shown[j] || mine[j] || depth[j] >= 0) continue;
            depth[j] = depth[i] + 1;
            queue.push(j);
          }
        }
      }
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const gx = Math.floor((p.x - OX) / CELL);
        const gy = Math.floor((p.y - OY) / CELL);
        hover = gx >= 0 && gy >= 0 && gx < N && gy < N ? gy * N + gx : -1;
        return;
      }
      if (p.type !== 'down' || over) return;
      const gx = Math.floor((p.x - OX) / CELL);
      const gy = Math.floor((p.y - OY) / CELL);
      if (gx < 0 || gy < 0 || gx >= N || gy >= N) return;
      const i = gy * N + gx;
      if (shown[i]) return;
      if (!armed) {
        lay(gx, gy);
        note('SAFE START', '139,220,122');
        if (rings.length > 12) rings.shift();
        rings.push({ x: centre(i).x, y: centre(i).y, born: api.now(), life: 420 });
      }
      if (mine[i]) {
        shown[i] = 1;
        over = true;
        flash = 1;
        shake = 1;
        burst(centre(i).x, centre(i).y, '255,122,122', 18);
        note('BOOM', '255,122,122');
        api.lose('mine');
        return;
      }
      openCell(i);
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
          p.vy += 250 * dt;
        }
        for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].born >= rings[i].life) rings.splice(i, 1);
        for (let i = pops.length - 1; i >= 0; i -= 1) if (now - pops[i].born >= pops[i].life) pops.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 2.6);
        if (flash > 0) flash = Math.max(0, flash - dt * 1.8);
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(139,220,122,' + (0.012 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1200))).toFixed(3) + ')');
        if (flash > 0) api.rect(0, 0, 480, 360, 'rgba(255,122,122,' + (0.28 * flash).toFixed(3) + ')');
        const amp = shake * 7;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 17) * amp, Math.cos(now / 23) * amp * 0.8);
        }
        api.text('safe ' + opened + ' / 20', 240, 16, { size: 13, color: C.dim, align: 'center' });
        for (let y = 0; y < N; y += 1) {
          for (let x = 0; x < N; x += 1) {
            const i = y * N + x;
            const px = OX + x * CELL;
            const py = OY + y * CELL;
            if (!shown[i]) {
              api.rect(px + 2, py + 2, CELL - 4, CELL - 4, C.panel);
              api.rect(px + 2, py + 2, CELL - 4, 3, 'rgba(255,255,255,0.22)');
              api.rect(px + 2, py + CELL - 5, CELL - 4, 3, 'rgba(0,0,0,0.35)');
              if (i === hover) api.rect(px + 6, py + 6, CELL - 12, CELL - 12, 'rgba(232,238,246,0.10)');
              if (over && mine[i]) api.circle(px + CELL / 2, py + CELL / 2, CELL * 0.16, C.warn);
            } else if (mine[i]) {
              api.rect(px + 2, py + 2, CELL - 4, CELL - 4, 'rgba(255,122,122,0.25)');
              const s = scaleFor(i, now);
              api.circle(px + CELL / 2, py + CELL / 2, CELL * 0.2 * s, C.warn);
            } else {
              api.rect(px + 2, py + 2, CELL - 4, CELL - 4, 'rgba(255,255,255,0.05)');
              const s = scaleFor(i, now);
              if (near[i] > 0) {
                const col = near[i] > 2 ? C.warn : near[i] > 1 ? C.accent2 : C.accent;
                api.text(String(near[i]), px + CELL / 2, py + CELL / 2, {
                  size: 22 * s,
                  color: col,
                  align: 'center',
                  weight: 'bold',
                });
              }
            }
          }
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CELL * (0.3 + 0.6 * k), rgba('139,220,122', 0.3 * (1 - k)));
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
        api.text('first tap is safe', 240, 352, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
