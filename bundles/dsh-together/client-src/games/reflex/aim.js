defineGame({
  id: 'aim',
  create(api) {
    const C = api.colors;
    const MAXLIVE = 2;
    const TTL = 1900;
    const R = 24;
    const targets = [];
    const parts = [];
    const floats = [];
    let clock = 0;
    let hits = 0;
    let misses = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    let px = 240;
    let py = 180;
    let pointerIn = false;

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.28, 0.62), max: 0.62, r: api.rnd(1.4, 3.2), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 8) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.8, c: color });
    }

    function spawn() {
      let x = 240;
      let y = 180;
      for (let tries = 0; tries < 10; tries += 1) {
        x = api.rnd(56, 424);
        y = api.rnd(64, 300);
        let clear = true;
        for (let i = 0; i < targets.length; i += 1) {
          const dx = targets[i].x - x;
          const dy = targets[i].y - y;
          if (dx * dx + dy * dy < 96 * 96) clear = false;
        }
        if (clear) break;
      }
      targets.push({ x: x, y: y, born: clock, pop: 0 });
    }

    for (let i = 0; i < MAXLIVE; i += 1) spawn();

    function dropExpired() {
      for (let i = targets.length - 1; i >= 0; i -= 1) {
        if (clock - targets[i].born > TTL) {
          const t = targets[i];
          label('GONE', t.x, t.y - 30, C.dim);
          combo = 0;
          comboT = 0;
          targets.splice(i, 1);
        }
      }
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
        shake = 0.8;
        flash = 1;
        flashColor = C.warn;
        burst(x, y, 'rgba(255,122,122,0.6)', 5, 110);
        label('MISS', x, y - 18, C.warn);
        return;
      }
      const t = targets[hit];
      const tight = Math.sqrt(bd) <= R * 0.45;
      hits += 1;
      combo += 1;
      comboT = 1.5;
      if (combo > best) best = combo;
      api.progress(1);
      api.score((tight ? 25 : 12) * (1 + Math.floor(combo / 3)));
      burst(t.x, t.y, tight ? C.accent2 : C.good, tight ? 16 : 10, 240);
      burst(t.x, t.y, 'rgba(255,255,255,0.7)', 4, 130);
      label(tight ? 'PERFECT' : 'NICE', t.x, t.y - 30, tight ? C.accent2 : C.good);
      pulse = 1;
      flash = 1;
      flashColor = C.good;
      targets.splice(hit, 1);
      dropExpired();
      while (targets.length < MAXLIVE) spawn();
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'move' || ev.type === 'down') {
        px = ev.x;
        py = ev.y;
        pointerIn = true;
      }
      if (ev.type === 'down') fire(ev.x, ev.y);
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
        for (let i = targets.length - 1; i >= 0; i -= 1) {
          if (targets[i].pop < 1) targets[i].pop = Math.min(1, targets[i].pop + dt * 5.5);
        }
        dropExpired();
        while (targets.length < MAXLIVE) spawn();
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
          floats[i].y -= dt * 26;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 780);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        api.rect(0, 300, 480, 60, 'rgba(255,207,92,' + (0.01 + 0.025 * k).toFixed(3) + ')');
        for (let i = 0; i < 6; i += 1) {
          const gy = 60 + i * 52 + Math.sin(clock / 1400 + i) * 3;
          api.rect(0, gy, 480, 1, 'rgba(143,160,180,0.07)');
        }
        const sx = shake > 0 ? Math.sin(clock * 0.22) * shake * 5 : 0;
        const sy = shake > 0 ? Math.cos(clock * 0.19) * shake * 3 : 0;

        for (let i = 0; i < targets.length; i += 1) {
          const t = targets[i];
          const life = 1 - (clock - t.born) / TTL;
          const grow = 1 - (1 - t.pop) * (1 - t.pop);
          const rad = R * (0.35 + 0.65 * grow);
          const urgent = life < 0.25;
          api.circle(t.x + sx, t.y + sy, rad + 5, C.panel);
          api.circle(t.x + sx, t.y + sy, rad, urgent ? C.warn : C.dim);
          api.circle(t.x + sx, t.y + sy, rad - 7, C.bg);
          api.circle(t.x + sx, t.y + sy, (rad - 13) * (0.8 + 0.2 * Math.sin(clock / 120 + i)), urgent ? C.warn : C.accent);
          api.circle(t.x + sx, t.y + sy, 4, C.bg);
          api.circle(t.x + sx, t.y + sy, rad + 14 * (1 - life), 'rgba(255,122,122,0.10)');
        }

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y + sy, p.r * (0.5 + p.t / p.max), p.t > 0.2 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y + sy, { size: 13, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        if (pointerIn) {
          api.circle(px, py, 14 + pulse * 8, 'rgba(255,255,255,0.10)');
          api.circle(px, py, 3, C.fg);
        }
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 18, { size: 16, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(190, 30, 100 * Math.max(0, comboT / 1.5), 4, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(hits), 26, 348, { size: 20, color: C.good, weight: 'bold' });
        api.text('HITS', 26, 334, { size: 9, color: C.dim });
        api.text('MISS ' + misses, 454, 348, { size: 12, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 454, 332, { size: 10, color: C.dim, align: 'right' });
        if (flash > 0) api.rect(0, 0, 480, 3, flashColor);
      },

      dispose() {
        offPointer();
      },
    };
  },
});
