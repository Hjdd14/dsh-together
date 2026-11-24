defineGame({
  id: 'aimline',
  create(api) {
    const C = api.colors;
    const CX = 240;
    const CY = 190;
    const FIELD = 132;
    const R = 20;
    const TIGHT = 8;
    const TTL = 2400;
    let clock = 0;
    let sweep = 0;
    let speed = 1.15;
    let spawnAt = 260;
    let hits = 0;
    let misses = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    const targets = [];
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.28, 0.62), max: 0.62, r: api.rnd(1.5, 3.3), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 7) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.8, c: color });
    }

    function spawn() {
      const a = api.rnd(0, 6.2832);
      const rad = api.rnd(56, FIELD - 12);
      targets.push({ x: CX + Math.cos(a) * rad, y: CY + Math.sin(a) * rad, born: clock, pop: 0, ph: api.rnd(0, 6.28) });
    }

    function fire(x, y) {
      let hit = -1;
      let bd = 1e9;
      for (let i = 0; i < targets.length; i += 1) {
        const dx = x - targets[i].x;
        const dy = y - targets[i].y;
        const d = dx * dx + dy * dy;
        if (d <= R * R && d < bd) { bd = d; hit = i; }
      }
      if (hit < 0) {
        misses += 1;
        combo = 0;
        comboT = 0;
        shake = 0.7;
        burst(x, y, 'rgba(255,122,122,0.6)', 5, 110);
        label('MISS', x, y - 18, C.warn);
        flash = 1;
        flashColor = C.warn;
        return;
      }
      const t = targets[hit];
      const tight = Math.sqrt(bd) <= TIGHT;
      hits += 1;
      combo += 1;
      comboT = 1.6;
      if (combo > best) best = combo;
      api.progress(1);
      api.score((tight ? 26 : 14) * (1 + Math.floor(combo / 3)));
      burst(t.x, t.y, tight ? C.accent2 : C.good, tight ? 16 : 10, 230);
      burst(t.x, t.y, 'rgba(255,255,255,0.7)', 4, 120);
      label(tight ? 'PERFECT' : 'ON LINE', t.x, t.y - 28, tight ? C.accent2 : C.good);
      pulse = 1;
      flash = 1;
      flashColor = C.good;
      targets.splice(hit, 1);
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type !== 'down') return;
      fire(ev.x, ev.y);
    });

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pulse = Math.max(0, pulse - dt * 4);
        shake = Math.max(0, shake - dt * 4.2);
        flash = Math.max(0, flash - dt * 2.8);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        sweep += speed * dt;
        if (sweep > 6.2832) sweep -= 6.2832;
        for (let i = targets.length - 1; i >= 0; i -= 1) {
          const t = targets[i];
          if (t.pop < 1) t.pop = Math.min(1, t.pop + dt * 6);
          if (clock - t.born > TTL) {
            label('LOST', t.x, t.y - 26, C.dim);
            combo = 0;
            comboT = 0;
            targets.splice(i, 1);
          }
        }
        if (clock >= spawnAt && targets.length < 3) {
          spawn();
          spawnAt = clock + Math.max(520, 900 - hits * 22);
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.t -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.9;
          p.vy *= 0.9;
          if (p.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 24;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 900);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        const sx = shake > 0 ? Math.sin(clock * 0.22) * shake * 5 : 0;
        const sy = shake > 0 ? Math.cos(clock * 0.19) * shake * 3 : 0;
        const cx = CX + sx;
        const cy = CY + sy;

        for (let ring = 1; ring <= 3; ring += 1) {
          const r = (FIELD * ring) / 3;
          for (let i = 0; i < 22; i += 1) {
            const a = (i / 22) * 6.2832;
            api.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.2, 'rgba(143,160,180,0.30)');
          }
        }
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * 6.2832;
          api.circle(cx + Math.cos(a) * FIELD, cy + Math.sin(a) * FIELD, 3, C.panel);
        }
        for (let i = 1; i <= 12; i += 1) {
          const a = sweep - i * 0.075;
          api.circle(cx + Math.cos(a) * FIELD, cy + Math.sin(a) * FIELD, 2.4, 'rgba(106,169,255,' + (0.30 - i * 0.02).toFixed(3) + ')');
          api.circle(cx + Math.cos(a) * (FIELD * 0.55), cy + Math.sin(a) * (FIELD * 0.55), 1.6, 'rgba(106,169,255,' + (0.18 - i * 0.012).toFixed(3) + ')');
        }
        api.circle(cx, cy, 8, C.accent);
        api.circle(cx, cy, 4, C.bg);
        const ex = cx + Math.cos(sweep) * FIELD;
        const ey = cy + Math.sin(sweep) * FIELD;
        for (let i = 1; i <= 5; i += 1) {
          api.circle(cx + ((ex - cx) * i) / 5, cy + ((ey - cy) * i) / 5, 2.2, C.accent);
        }
        api.circle(ex, ey, 5, C.fg);

        for (let i = 0; i < targets.length; i += 1) {
          const t = targets[i];
          const life = 1 - (clock - t.born) / TTL;
          const grow = 1 - (1 - t.pop) * (1 - t.pop);
          const rad = R * (0.4 + 0.6 * grow);
          const urgent = life < 0.28;
          api.circle(t.x + sx, t.y + sy, rad + 6, C.panel);
          api.circle(t.x + sx, t.y + sy, rad, urgent ? C.warn : C.dim);
          api.circle(t.x + sx, t.y + sy, rad - 6, C.bg);
          api.circle(t.x + sx, t.y + sy, (rad - 11) * (0.75 + 0.25 * Math.sin(clock / 130 + t.ph)), urgent ? C.warn : C.accent);
          api.circle(t.x + sx, t.y + sy, 3, C.bg);
          api.circle(t.x + sx, t.y + sy, rad + 13 * (1 - life), 'rgba(255,122,122,0.09)');
        }

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y + sy, p.r * (0.5 + p.t / p.max), p.t > 0.2 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y + sy, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 24, { size: 15, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(198, 35, 84 * Math.max(0, comboT / 1.6), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(hits), 32, 348, { size: 20, color: C.good, weight: 'bold' });
        api.text('HITS', 32, 331, { size: 9, color: C.dim });
        api.text('MISS ' + misses, 450, 348, { size: 12, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 450, 331, { size: 10, color: C.dim, align: 'right' });
        if (pulse > 0) api.circle(240, 190, 12 + pulse * 14, 'rgba(255,207,92,0.16)');
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
      },

      dispose() {
        offPointer();
      },
    };
  },
});
