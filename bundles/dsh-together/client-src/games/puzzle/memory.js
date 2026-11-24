defineGame({
  id: 'memory',
  create(api) {
    const C = api.colors;
    const COLS = 4;
    const ROWS = 2;
    const CW = 96;
    const CH = 110;
    const GAP = 10;
    const OX = 33;
    const OY = 54;
    const FACE = [C.accent, C.accent2, C.good, 'rgba(185,140,255,1)'];
    const RGB = ['106,169,255', '255,207,92', '139,220,122', '185,140,255'];
    const faces = [];
    const open = [];
    const done = [];
    for (let i = 0; i < 4; i += 1) {
      faces.push(i);
      faces.push(i);
    }
    for (let i = faces.length - 1; i > 0; i -= 1) {
      const j = api.irnd(0, i);
      const t = faces[i];
      faces[i] = faces[j];
      faces[j] = t;
    }
    for (let i = 0; i < COLS * ROWS; i += 1) {
      open.push(0);
      done.push(0);
    }
    let first = -1;
    let second = -1;
    let wait = 0;
    let pairs = 0;
    let hover = -1;
    let shake = 0;

    const flips = [];
    const fx = [];
    const rings = [];
    const notes = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function cardX(i) {
      return OX + (i % COLS) * (CW + GAP);
    }
    function cardY(i) {
      return OY + ((i - (i % COLS)) / COLS) * (CH + GAP);
    }
    function flip(i, dir) {
      if (flips.length > 16) flips.shift();
      flips.push({ i: i, dir: dir, born: api.now(), life: 200 });
    }
    function burst(i, rgb, n) {
      const x = cardX(i) + CW / 2;
      const y = cardY(i) + CH / 2;
      for (let k = 0; k < n; k += 1) {
        if (fx.length > 70) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-120, 120), vy: api.rnd(-140, 40),
          born: api.now(), life: api.rnd(240, 480), rgb: rgb, r: api.rnd(2, 4),
        });
      }
      if (rings.length > 20) rings.shift();
      rings.push({ x: x, y: y, born: api.now(), life: 400, rgb: rgb });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }
    function flipOf(i, now) {
      let out = null;
      for (let k = 0; k < flips.length; k += 1) {
        const f = flips[k];
        if (f.i !== i) continue;
        const t = (now - f.born) / f.life;
        if (t < 0 || t >= 1) continue;
        out = { dir: f.dir, k: t };
      }
      return out;
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const col = Math.floor((p.x - OX) / (CW + GAP));
        const row = Math.floor((p.y - OY) / (CH + GAP));
        hover = col >= 0 && row >= 0 && col < COLS && row < ROWS ? row * COLS + col : -1;
        return;
      }
      if (p.type !== 'down' || wait > 0) return;
      const col = Math.floor((p.x - OX) / (CW + GAP));
      const row = Math.floor((p.y - OY) / (CH + GAP));
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return;
      const i = row * COLS + col;
      if (done[i] || open[i]) return;
      open[i] = 1;
      flip(i, 'show');
      if (first < 0) {
        first = i;
        return;
      }
      second = i;
      if (faces[first] === faces[second]) {
        done[first] = 1;
        done[second] = 1;
        pairs += 1;
        api.progress(1);
        burst(first, RGB[faces[first]], 8);
        burst(second, RGB[faces[second]], 8);
        note('PAIR', '139,220,122');
        first = -1;
        second = -1;
      } else {
        wait = 0.62;
        shake = Math.min(1, shake + 0.5);
        note('MISS', '255,122,122');
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
        for (let i = flips.length - 1; i >= 0; i -= 1) if (now - flips[i].born >= flips[i].life) flips.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
        if (wait <= 0) return;
        wait -= dt;
        if (wait > 0) return;
        open[first] = 0;
        open[second] = 0;
        flip(first, 'hide');
        flip(second, 'hide');
        first = -1;
        second = -1;
        wait = 0;
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(139,220,122,' + (0.012 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1300))).toFixed(3) + ')');
        const amp = shake * 6;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 18) * amp, 0);
        }
        api.text('pairs ' + pairs + ' / 4', 240, 26, { size: 13, color: C.dim, align: 'center' });
        for (let i = 0; i < COLS * ROWS; i += 1) {
          const px = cardX(i);
          const py = cardY(i);
          const f = flipOf(i, now);
          let w = CW;
          let face = open[i] === 1 || done[i] === 1;
          if (f) {
            const half = f.k < 0.5;
            w = CW * Math.abs(1 - 2 * f.k);
            face = f.dir === 'show' ? !half : half;
          }
          const left = px + (CW - w) / 2;
          api.rect(px, py, CW, CH, 'rgba(255,255,255,0.03)');
          if (w > 1) {
            api.rect(left, py, w, CH, face ? FACE[faces[i]] : C.panel);
            if (!face) {
              api.rect(left + 8, py + 12, Math.max(0, w - 16), 4, 'rgba(255,255,255,0.12)');
              api.rect(left + 8, py + CH - 16, Math.max(0, w - 16), 4, 'rgba(255,255,255,0.12)');
            } else if (w > CW * 0.55) {
              api.circle(left + w / 2, py + CH / 2, 24, 'rgba(16,20,24,0.55)');
              api.text(String(faces[i] + 1), left + w / 2, py + CH / 2, {
                size: 28, color: C.fg, align: 'center', weight: 'bold',
              });
            }
          }
          if (i === hover) api.rect(px + 1, py + 1, CW - 2, CH - 2, 'rgba(232,238,246,0.07)');
          if (done[i]) api.rect(px + 1, py + 1, CW - 2, 4, C.good);
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, 30 + 70 * k, rgba(r.rgb, 0.28 * (1 - k)));
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
        api.text('find the pairs', 240, 348, { size: 11, color: C.dim, align: 'center' });
      },
    };
  },
});
