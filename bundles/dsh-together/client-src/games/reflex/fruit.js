defineGame({
  id: 'fruit',
  create(api) {
    const C = api.colors;
    const GRAVITY = 520;
    const MAXLIVE = 6;
    const SKINS = [C.warn, C.good, C.accent2, C.accent];
    const fruits = [];
    const halves = [];
    const juice = [];
    const trail = [];
    const floats = [];
    let clock = 0;
    let spawnAt = 0;
    let cuts = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let flash = 0;
    let flashColor = C.good;
    let down = false;
    let px = 240;
    let py = 200;
    let hasPt = false;
    let missUp = 0;

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (juice.length >= 70) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        juice.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, t: api.rnd(0.4, 0.9), max: 0.9, r: api.rnd(2, 4.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 7) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function spawn() {
      fruits.push({
        x: api.rnd(70, 410),
        y: api.rnd(392, 410),
        vx: api.rnd(-70, 70),
        vy: api.rnd(-660, -540),
        r: api.rnd(18, 26),
        c: api.pick(SKINS),
        spin: api.rnd(0, 3),
        pop: 0,
      });
    }

    function segDist(x, y, ax, ay, bx, by) {
      const ex = bx - ax;
      const ey = by - ay;
      const len2 = ex * ex + ey * ey;
      let t = 0;
      if (len2 > 0.0001) t = ((x - ax) * ex + (y - ay) * ey) / len2;
      t = Math.max(0, Math.min(1, t));
      const dx = x - (ax + ex * t);
      const dy = y - (ay + ey * t);
      return Math.sqrt(dx * dx + dy * dy);
    }

    function sliceAt(x, y) {
      for (let i = fruits.length - 1; i >= 0; i -= 1) {
        const f = fruits[i];
        const d = hasPt ? segDist(f.x, f.y, px, py, x, y) : Math.sqrt((f.x - x) * (f.x - x) + (f.y - y) * (f.y - y));
        if (d > f.r + 6) continue;
        cuts += 1;
        combo += 1;
        comboT = 1.6;
        if (combo > best) best = combo;
        api.progress(1);
        api.score(10 * (1 + Math.floor(combo / 3)));
        burst(f.x, f.y, f.c, 12, 210);
        burst(f.x, f.y, 'rgba(255,255,255,0.65)', 4, 120);
        if (halves.length < 10) {
          const dir = f.vx >= 0 ? 1 : -1;
          halves.push({ x: f.x, y: f.y, vx: f.vx + dir * 70, vy: f.vy * 0.5, r: f.r, c: f.c, t: 0.5, s: 1 });
          halves.push({ x: f.x, y: f.y, vx: f.vx - dir * 70, vy: f.vy * 0.5 - 30, r: f.r, c: f.c, t: 0.5, s: -1 });
        }
        pulse = 1;
        flash = 1;
        flashColor = C.good;
        label(combo >= 3 ? 'SLICE x' + combo : 'SLICE', f.x, f.y - f.r - 12, combo >= 3 ? C.accent2 : C.good);
        fruits.splice(i, 1);
      }
    }

    function release() {
      down = false;
      hasPt = false;
      trail.length = 0;
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'down') {
        down = true;
        px = ev.x;
        py = ev.y;
        hasPt = true;
        trail.length = 0;
        trail.push({ x: ev.x, y: ev.y, t: 0.22 });
        sliceAt(ev.x, ev.y);
        return;
      }
      if (ev.type === 'up') {
        release();
        missUp = 0;
        return;
      }
      if (!ev.dragging) {
        missUp += 1;
        if (down && missUp >= 2) release();
        px = ev.x;
        py = ev.y;
        return;
      }
      missUp = 0;
      const moved = Math.sqrt((ev.x - px) * (ev.x - px) + (ev.y - py) * (ev.y - py));
      if (moved > 2) {
        sliceAt(ev.x, ev.y);
        if (trail.length >= 16) trail.shift();
        trail.push({ x: ev.x, y: ev.y, t: 0.22 });
      }
      px = ev.x;
      py = ev.y;
      hasPt = true;
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
        if (down && !hasPt) down = false;
        for (let i = fruits.length - 1; i >= 0; i -= 1) {
          const f = fruits[i];
          f.vy += GRAVITY * dt;
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.spin += dt * 2;
          if (f.pop < 1) f.pop = Math.min(1, f.pop + dt * 4);
          if (f.x < 22 || f.x > 458) f.vx = -f.vx;
          if (f.y > 440) fruits.splice(i, 1);
        }
        for (let i = halves.length - 1; i >= 0; i -= 1) {
          const h = halves[i];
          h.t -= dt;
          h.vy += GRAVITY * dt;
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          if (h.t <= 0) halves.splice(i, 1);
        }
        for (let i = juice.length - 1; i >= 0; i -= 1) {
          const p = juice[i];
          p.t -= dt;
          p.vy += 420 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.t <= 0) juice.splice(i, 1);
        }
        for (let i = trail.length - 1; i >= 0; i -= 1) {
          trail[i].t -= dt;
          if (trail[i].t <= 0) trail.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 24;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
        if (clock >= spawnAt && fruits.length < MAXLIVE) {
          spawn();
          spawnAt = clock + 430;
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 1000);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.045 * k).toFixed(3) + ')');
        api.rect(0, 0, 480, 70, 'rgba(255,207,92,' + (0.01 + 0.02 * (1 - k)).toFixed(3) + ')');
        for (let i = 0; i < 5; i += 1) {
          const y = 330 + Math.sin(clock / 900 + i * 1.4) * 3;
          api.rect(0, y + i * 6, 480, 1, 'rgba(143,160,180,0.06)');
        }

        for (let i = 0; i < juice.length; i += 1) {
          const p = juice[i];
          api.circle(p.x, p.y, p.r * (0.5 + p.t / p.max), p.t > 0.3 ? p.c : 'rgba(255,255,255,0.22)');
        }
        for (let i = 0; i < halves.length; i += 1) {
          const h = halves[i];
          api.circle(h.x + h.s * 5, h.y, h.r * 0.82 * (h.t / 0.5 + 0.3), h.c);
          api.circle(h.x + h.s * 5, h.y, h.r * 0.3, 'rgba(255,255,255,0.35)');
        }
        for (let i = 0; i < fruits.length; i += 1) {
          const f = fruits[i];
          const grow = 1 - (1 - f.pop) * (1 - f.pop);
          const wob = Math.sin(f.spin) * 2.5;
          api.circle(f.x, f.y + 3, f.r * grow, 'rgba(0,0,0,0.25)');
          api.circle(f.x, f.y, f.r * (0.75 + 0.25 * grow) * (1 + pulse * 0.03), f.c);
          api.circle(f.x - f.r * 0.3, f.y - f.r * 0.34, f.r * 0.26, 'rgba(255,255,255,0.6)');
          api.rect(f.x - 2, f.y - f.r - 6 - wob * 0.5, 4, 8, C.good);
        }
        for (let i = 0; i < trail.length; i += 1) {
          const t = trail[i];
          api.circle(t.x, t.y, 2 + 7 * (t.t / 0.22), 'rgba(255,255,255,0.16)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x, f.y, { size: 13, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }
        if (down && hasPt) api.circle(px, py, 6, 'rgba(255,255,255,0.45)');

        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 26, { size: 17, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(184, 38, 112 * Math.max(0, comboT / 1.6), 4, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(cuts), 26, 30, { size: 24, color: C.good, weight: 'bold' });
        api.text('SLICED', 26, 50, { size: 10, color: C.dim });
        api.text('BEST x' + best, 454, 30, { size: 11, color: C.dim, align: 'right' });
        api.text('drag across the fruits', 240, 344, { size: 11, color: C.dim, align: 'center' });
        if (flash > 0) api.rect(0, 356, 480, 4, flashColor);
      },

      dispose() {
        offPointer();
      },
    };
  },
});
