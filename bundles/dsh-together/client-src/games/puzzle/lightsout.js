defineGame({
  id: 'lightsout',
  create(api) {
    const C = api.colors;
    const N = 4;
    const SIZE = 70;
    const GAP = 8;
    const STEP = SIZE + GAP;
    const OX = 88;
    const OY = 36;
    const lit = [];
    const credited = [];
    for (let i = 0; i < N * N; i += 1) {
      lit.push(1);
      credited.push(0);
    }

    const fx = [];
    const rings = [];
    const pops = [];
    const notes = [];
    let shake = 0;
    let streak = 0;
    let hover = -1;

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function centre(i) {
      const x = i % N;
      const y = (i - x) / N;
      return { x: OX + x * STEP + SIZE / 2, y: OY + y * STEP + SIZE / 2 };
    }
    function ring(i, rgb) {
      if (rings.length > 26) rings.shift();
      const p = centre(i);
      rings.push({ x: p.x, y: p.y, born: api.now(), life: 340, rgb: rgb });
    }
    function burst(i, rgb, n) {
      const p = centre(i);
      for (let k = 0; k < n; k += 1) {
        if (fx.length > 90) fx.shift();
        fx.push({
          x: p.x, y: p.y,
          vx: api.rnd(-120, 120), vy: api.rnd(-140, 40),
          born: api.now(), life: api.rnd(240, 470), rgb: rgb, r: api.rnd(2, 4),
        });
      }
    }
    function pop(i, life) {
      if (pops.length > 40) pops.shift();
      pops.push({ key: i, born: api.now(), life: life || 190 });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 720 });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 0.45 + 0.55 * (1 - (1 - k) * (1 - k)));
      }
      return s;
    }

    function toggleAt(x, y) {
      const around = [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      let turnedOff = 0;
      let turnedOn = 0;
      for (let i = 0; i < around.length; i += 1) {
        const cx = around[i][0];
        const cy = around[i][1];
        if (cx < 0 || cy < 0 || cx >= N || cy >= N) continue;
        const at = cy * N + cx;
        if (lit[at] === 1) {
          lit[at] = 0;
          turnedOff += 1;
          ring(at, '255,207,92');
          burst(at, '255,207,92', 4);
          pop(at);
          if (credited[at] === 0) {
            credited[at] = 1;
            api.progress(1);
          }
        } else {
          lit[at] = 1;
          turnedOn += 1;
          pop(at);
        }
      }
      if (turnedOff > 0 && turnedOn === 0) {
        streak += 1;
        if (streak >= 2) note('CHAIN x' + streak, '139,220,122');
      } else {
        if (turnedOn > 0) {
          streak = 0;
          shake = Math.min(1, shake + 0.5);
          note('BACK ON', '255,122,122');
        }
        streak = 0;
      }
    }

    function reset() {
      for (let i = 0; i < lit.length; i += 1) lit[i] = 1;
      streak = 0;
      note('RESET', '143,160,180');
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const gx = Math.floor((p.x - OX) / STEP);
        const gy = Math.floor((p.y - OY) / STEP);
        const inX = p.x - OX - gx * STEP;
        const inY = p.y - OY - gy * STEP;
        hover = gx >= 0 && gy >= 0 && gx < N && gy < N && inX <= SIZE && inY <= SIZE ? gy * N + gx : -1;
        return;
      }
      if (p.type !== 'down') return;
      const gx = Math.floor((p.x - OX) / STEP);
      const gy = Math.floor((p.y - OY) / STEP);
      if (gx < 0 || gy < 0 || gx >= N || gy >= N) return;
      if (p.x - OX - gx * STEP > SIZE) return;
      if (p.y - OY - gy * STEP > SIZE) return;
      toggleAt(gx, gy);
    });

    api.onKey((key, isDown) => {
      if (isDown && key === 'space') reset();
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
        api.rect(0, 0, 480, 360, 'rgba(255,207,92,' + (0.014 + 0.026 * (0.5 + 0.5 * Math.sin(now / 1250))).toFixed(3) + ')');
        const amp = shake * 6;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 21) * amp, Math.cos(now / 28) * amp * 0.7);
        }
        let on = 0;
        for (let i = 0; i < lit.length; i += 1) if (lit[i] === 1) on += 1;
        api.text('lights ' + on + ' / 16', 240, 18, { size: 13, color: C.dim, align: 'center' });
        for (let y = 0; y < N; y += 1) {
          for (let x = 0; x < N; x += 1) {
            const at = y * N + x;
            const px = OX + x * STEP;
            const py = OY + y * STEP;
            api.rect(px, py, SIZE, SIZE, C.panel);
            if (at === hover) api.rect(px + 2, py + 2, SIZE - 4, SIZE - 4, 'rgba(232,238,246,0.10)');
            if (lit[at] === 1) {
              const s = scaleFor(at, now);
              const cx = px + SIZE / 2;
              const cy = py + SIZE / 2;
              api.circle(cx, cy, SIZE * 0.33 * s, 'rgba(255,207,92,0.20)');
              api.circle(cx, cy, SIZE * 0.21 * s, C.accent2);
            } else {
              api.circle(px + SIZE / 2, py + SIZE / 2, SIZE * 0.09, 'rgba(255,255,255,0.07)');
            }
          }
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, SIZE * (0.2 + 0.45 * k), rgba(r.rgb, 0.30 * (1 - k)));
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
        api.text('click to toggle a cross', 240, 348, { size: 11, color: C.dim, align: 'center' });
      },
    };
  },
});
