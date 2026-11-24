defineGame({
  id: 'stopbar',
  create(api) {
    const C = api.colors;
    const X = 56;
    const W = 368;
    const Y = 214;
    let clock = 0;
    let pos = 0.4;
    let dir = 1;
    let speed = 0.6;
    let zc = 0.5;
    let half = 0.13;
    let hold = 0;
    let ok = 0;
    let bad = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    const trail = [];
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 70) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.28, 0.62), max: 0.62, r: api.rnd(1.5, 3.2), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 6) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function newZone() {
      zc = api.rnd(0.16, 0.84);
      pos = 0.5 - (zc - 0.5) * 0.6;
      pos = Math.max(0.03, Math.min(0.97, pos));
      dir = api.rng() < 0.5 ? -1 : 1;
      trail.length = 0;
    }

    newZone();

    function judge() {
      if (hold > 0) return;
      const d = Math.abs(pos - zc);
      const mx = X + pos * W;
      if (d <= half) {
        const perfect = d <= half * 0.32;
        ok += 1;
        combo += 1;
        comboT = 1.6;
        if (combo > best) best = combo;
        api.progress(1);
        api.score((perfect ? 26 : 15) * (1 + Math.floor(combo / 3)));
        label((perfect ? 'PERFECT' : 'NICE') + '  ' + Math.round((1 - d / half) * 100) + '%', mx, Y - 34, perfect ? C.accent2 : C.good);
        burst(mx, Y + 16, perfect ? C.accent2 : C.good, perfect ? 16 : 10, 220);
        pulse = 1;
        flash = 1;
        flashColor = C.good;
        hold = 0.44;
      } else {
        bad += 1;
        combo = 0;
        comboT = 0;
        shake = 1;
        flash = 1;
        flashColor = C.warn;
        label('OFF BY ' + Math.round(d * 100), mx, Y - 34, C.warn);
        burst(mx, Y + 16, 'rgba(255,122,122,0.5)', 6, 100);
      }
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      if (key === 'space' || key === 'enter') judge();
    });
    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'down') judge();
    });

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pulse = Math.max(0, pulse - dt * 3.6);
        shake = Math.max(0, shake - dt * 4.2);
        flash = Math.max(0, flash - dt * 2.8);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        if (hold > 0) {
          hold -= dt;
          if (hold <= 0) {
            half = Math.max(0.08, half * 0.92);
            speed = Math.min(1.15, speed + 0.06);
            newZone();
          }
        } else {
          pos += dir * speed * dt;
          if (pos > 1) { pos = 1; dir = -1; }
          if (pos < 0) { pos = 0; dir = 1; }
          if (trail.length >= 8) trail.shift();
          trail.push({ p: pos, t: 0.18 });
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.t -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.92;
          p.vy = p.vy * 0.92 + 200 * dt;
          if (p.t <= 0) parts.splice(i, 1);
        }
        for (let i = trail.length - 1; i >= 0; i -= 1) {
          trail[i].t -= dt;
          if (trail[i].t <= 0) trail.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 20;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 950);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        api.rect(0, 296, 480, 64, 'rgba(255,207,92,' + (0.008 + 0.02 * k).toFixed(3) + ')');
        const sx = shake > 0 ? Math.sin(clock * 0.21) * shake * 6 : 0;
        api.text('STOP INSIDE THE ZONE', 240 + sx, 44, { size: 13, color: C.dim, align: 'center' });

        api.rect(X - 10 + sx, Y - 12, W + 20, 56, C.panel);
        api.rect(X + sx, Y, W, 32, 'rgba(0,0,0,0.45)');
        const zx = X + (zc - half) * W;
        const zw = Math.max(6, half * 2 * W);
        const zp = 1 + 0.04 * Math.sin(clock / 200);
        api.rect(zx + sx, Y + 6 - 3 * (zp - 1) * 20, zw, 20, hold > 0 ? C.good : 'rgba(255,207,92,0.35)');
        api.rect(X + (zc - half * 0.32) * W + sx, Y, Math.max(5, half * 0.64 * W), 32, hold > 0 ? C.good : C.accent2);

        for (let i = 0; i < trail.length; i += 1) {
          const t = trail[i];
          api.rect(X + t.p * W - 3 + sx, Y + 2, 6, 28, 'rgba(255,255,255,' + (0.05 + 0.1 * (t.t / 0.18)).toFixed(3) + ')');
        }
        const mx = X + pos * W + sx;
        api.rect(mx - 5, Y - 18, 10, 68, flashColor);
        api.circle(mx, Y + 16, 5 + pulse * 3, C.fg);
        api.circle(mx, Y + 16, 9 + pulse * 8, 'rgba(255,255,255,0.10)');

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x, p.y, p.r * (0.5 + p.t / p.max), p.t > 0.25 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x, f.y, { size: 13, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        api.text('SPACE / CLICK', 240, Y + 66, { size: 11, color: C.dim, align: 'center' });
        for (let i = 0; i < ok && i < 10; i += 1) api.rect(96 + i * 16, 296, 11, 11, C.good);
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 130, { size: 16, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(192, 142, 96 * Math.max(0, comboT / 1.6), 4, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(ok), 60, 322, { size: 26, color: C.accent2, weight: 'bold' });
        api.text('STOPS', 60, 342, { size: 10, color: C.dim });
        api.text('MISS ' + bad, 420, 322, { size: 12, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 420, 342, { size: 10, color: C.dim, align: 'right' });
        if (flash > 0) api.rect(0, 0, 480, 3, flashColor);
      },

      dispose() {
        offKey();
        offPointer();
      },
    };
  },
});
