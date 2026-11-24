defineGame({
  id: 'bubble',
  create(api) {
    const C = api.colors;
    const MAXLIVE = 7;
    const bubbles = [];
    const pops = [];
    const parts = [];
    const floats = [];
    const motes = [];
    let clock = 0;
    let popped = 0;
    let missed = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let flash = 0;
    let flashColor = C.good;

    function puff(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.35, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, t: api.rnd(0.28, 0.6), max: 0.6, r: api.rnd(1.6, 3.6), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 6) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.8, c: color });
    }

    function spawn(top) {
      const r = api.rnd(15, 26);
      bubbles.push({
        x: api.rnd(r + 16, 464 - r),
        y: top ? api.rnd(360, 420) : api.rnd(60, 400),
        r: r,
        vy: api.rnd(-96, -48),
        wob: api.rnd(0, 6.28),
        ph: api.rnd(0.6, 1.6),
        pop: 0,
      });
    }

    for (let i = 0; i < MAXLIVE; i += 1) spawn(false);
    for (let i = 0; i < 14; i += 1) {
      motes.push({ x: api.rnd(0, 480), y: api.rnd(0, 360), r: api.rnd(0.8, 2.2), sp: api.rnd(6, 20), a: api.rnd(0.05, 0.16) });
    }

    function popAt(x, y) {
      for (let i = bubbles.length - 1; i >= 0; i -= 1) {
        const b = bubbles[i];
        const dx = x - b.x;
        const dy = y - b.y;
        if (dx * dx + dy * dy > b.r * b.r) continue;
        popped += 1;
        combo += 1;
        comboT = 1.6;
        if (combo > best) best = combo;
        api.progress(1);
        api.score(9 * (1 + Math.floor(combo / 3)));
        if (pops.length >= 10) pops.shift();
        pops.push({ x: b.x, y: b.y, r: b.r, t: 0.45 });
        puff(b.x, b.y, b.r > 21 ? C.accent : C.accent2, 10, 190);
        puff(b.x, b.y, 'rgba(255,255,255,0.7)', 4, 110);
        label(combo >= 3 ? 'POP x' + combo : 'POP', b.x, b.y - b.r - 10, combo >= 3 ? C.accent2 : C.good);
        pulse = 1;
        flash = 1;
        flashColor = C.good;
        bubbles.splice(i, 1);
        spawn(true);
        return true;
      }
      return false;
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type !== 'down') return;
      if (popAt(ev.x, ev.y)) return;
      missed += 1;
      combo = 0;
      comboT = 0;
      if (pops.length >= 10) pops.shift();
      pops.push({ x: ev.x, y: ev.y, r: 6, t: 0.3 });
      puff(ev.x, ev.y, 'rgba(143,160,180,0.4)', 3, 60);
    });

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pulse = Math.max(0, pulse - dt * 4);
        flash = Math.max(0, flash - dt * 3);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        for (let i = bubbles.length - 1; i >= 0; i -= 1) {
          const b = bubbles[i];
          b.wob += b.ph * dt;
          b.y += b.vy * dt;
          b.x += Math.sin(b.wob) * 16 * dt;
          if (b.y < -b.r - 8) {
            if (b.y > -b.r - 30) {
              missed += 1;
              label('ESCAPED', b.x, 40, C.dim);
            }
            bubbles.splice(i, 1);
          }
        }
        while (bubbles.length < MAXLIVE) spawn(true);
        for (let i = pops.length - 1; i >= 0; i -= 1) {
          pops[i].t -= dt;
          if (pops[i].t <= 0) pops.splice(i, 1);
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.t -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.93;
          p.vy = p.vy * 0.93 + 120 * dt;
          if (p.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 22;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
        for (let i = 0; i < motes.length; i += 1) {
          const m = motes[i];
          m.y -= m.sp * dt;
          if (m.y < -4) { m.y = 364; m.x = api.rnd(0, 480); }
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 860);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.02 + 0.06 * k).toFixed(3) + ')');
        for (let i = 0; i < motes.length; i += 1) {
          const m = motes[i];
          api.circle(m.x, m.y, m.r, 'rgba(255,255,255,' + m.a.toFixed(3) + ')');
        }

        for (let i = 0; i < bubbles.length; i += 1) {
          const b = bubbles[i];
          api.circle(b.x, b.y, b.r, 'rgba(106,169,255,0.22)');
          api.circle(b.x, b.y, b.r - 2, 'rgba(106,169,255,0.14)');
          api.circle(b.x - b.r * 0.34, b.y - b.r * 0.34, b.r * 0.3, 'rgba(255,255,255,0.5)');
          api.circle(b.x + b.r * 0.4, b.y + b.r * 0.34, b.r * 0.14, 'rgba(255,255,255,0.26)');
          api.circle(b.x, b.y, b.r + 2 + Math.sin(clock / 200 + b.wob) * 2, 'rgba(255,255,255,0.04)');
        }
        for (let i = 0; i < pops.length; i += 1) {
          const p = pops[i];
          const kk = 1 - p.t / 0.45;
          api.circle(p.x, p.y, p.r + 22 * kk, 'rgba(255,255,255,0.07)');
          for (let s = 0; s < 5; s += 1) {
            const a = (s / 5) * 6.283 + kk * 2;
            api.circle(p.x + Math.cos(a) * (p.r + 20 * kk), p.y + Math.sin(a) * (p.r + 20 * kk), 3 * (1 - kk) + 1, C.accent2);
          }
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x, p.y, p.r * (0.5 + p.t / p.max), p.t > 0.2 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x, f.y, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        api.rect(0, 0, 480, 30, C.panel);
        api.text(String(popped), 26, 16, { size: 19, color: C.good, weight: 'bold' });
        api.text('POPPED', 70, 16, { size: 10, color: C.dim });
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 16, { size: 13, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
        }
        api.text('MISS ' + missed, 454, 16, { size: 11, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 240, 348, { size: 11, color: C.dim, align: 'center' });
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
      },

      dispose() {
        offPointer();
      },
    };
  },
});
