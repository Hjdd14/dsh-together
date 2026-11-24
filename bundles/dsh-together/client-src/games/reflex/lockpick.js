defineGame({
  id: 'lockpick',
  create(api) {
    const C = api.colors;
    const CX = 240;
    const CY = 168;
    const R = 92;
    let clock = 0;
    let angle = -Math.PI / 2;
    let speed = 2.5;
    let target = -Math.PI / 2;
    let half = 0.38;
    let hold = 0;
    let pins = 0;
    let bad = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    const pinSnap = [0, 0, 0, 0];
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.3, 0.68), max: 0.68, r: api.rnd(1.5, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 6) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function wrap(a) {
      let v = a;
      while (v > Math.PI) v -= Math.PI * 2;
      while (v < -Math.PI) v += Math.PI * 2;
      return v;
    }

    function newTarget() {
      for (let i = 0; i < 8; i += 1) {
        const t = wrap(api.rnd(-Math.PI, Math.PI));
        if (Math.abs(wrap(t - angle)) > half * 1.7) { target = t; return; }
      }
      target = wrap(angle + Math.PI * 0.62);
    }

    newTarget();

    function judge() {
      if (hold > 0) return;
      const d = Math.abs(wrap(angle - target));
      const nx = CX + Math.cos(angle) * R;
      const ny = CY + Math.sin(angle) * R;
      if (d <= half) {
        const perfect = d <= half * 0.34;
        const slot = pins < 4 ? pins : 3;
        pins += 1;
        combo += 1;
        comboT = 1.6;
        if (combo > best) best = combo;
        api.progress(1);
        api.score((perfect ? 28 : 16) * (1 + Math.floor(combo / 3)));
        pinSnap[slot] = 1;
        label(perfect ? 'CLICK!' : 'PIN ' + Math.min(pins, 4), CX, CY - R - 26, perfect ? C.accent2 : C.good);
        label((perfect ? 'PERFECT ' : 'GOOD ') + Math.round((1 - d / half) * 100) + '%', CX, CY + R + 40, perfect ? C.accent2 : C.good);
        burst(nx, ny, perfect ? C.accent2 : C.good, perfect ? 16 : 10, 210);
        pulse = 1;
        flash = 1;
        flashColor = C.good;
        hold = 0.5;
      } else {
        bad += 1;
        combo = 0;
        comboT = 0;
        shake = 1;
        flash = 1;
        flashColor = C.warn;
        label('SLIP', CX, CY - R - 26, C.warn);
        burst(nx, ny, 'rgba(255,122,122,0.5)', 6, 90);
      }
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      if (key === 'space' || key === 'enter') judge();
    });
    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'down') judge();
    });

    function arcDots(r, a0, a1, count, size, color) {
      for (let i = 0; i <= count; i += 1) {
        const a = a0 + ((a1 - a0) * i) / count;
        api.circle(CX + Math.cos(a) * r, CY + Math.sin(a) * r, size, color);
      }
    }

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pulse = Math.max(0, pulse - dt * 3.4);
        shake = Math.max(0, shake - dt * 4.2);
        flash = Math.max(0, flash - dt * 2.8);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        for (let i = 0; i < 4; i += 1) pinSnap[i] = Math.max(0, pinSnap[i] - dt * 2.2);
        if (hold > 0) {
          hold -= dt;
          if (hold <= 0) {
            speed = Math.min(5.6, speed + 0.3);
            half = Math.max(0.24, half - 0.02);
            newTarget();
          }
        } else {
          angle = wrap(angle + speed * dt);
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.t -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.92;
          p.vy *= 0.92;
          if (p.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 20;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 900);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        api.rect(0, 286, 480, 74, 'rgba(255,207,92,' + (0.008 + 0.02 * k).toFixed(3) + ')');
        const sx = shake > 0 ? Math.sin(clock * 0.22) * shake * 6 : 0;
        const sy = shake > 0 ? Math.cos(clock * 0.19) * shake * 4 : 0;

        api.circle(CX + sx, CY + sy, R + 16, C.panel);
        api.circle(CX + sx, CY + sy, R - 6, 'rgba(0,0,0,0.4)');
        for (let i = 0; i < 24; i += 1) {
          const a = (i / 24) * 6.2832;
          api.circle(CX + Math.cos(a) * (R + 6) + sx, CY + Math.sin(a) * (R + 6) + sy, 1.6, i % 3 === 0 ? C.dim : 'rgba(143,160,180,0.35)');
        }
        const tp = 1 + 0.05 * Math.sin(clock / 180);
        arcDots(R * tp, target - half, target + half, 11, 6, hold > 0 ? C.good : C.accent2);
        arcDots(R, target - half * 0.34, target + half * 0.34, 4, 7, C.good);

        for (let i = 1; i <= 4; i += 1) {
          const r = (R * i) / 4.5;
          const nx = CX + Math.cos(angle) * r + sx;
          const ny = CY + Math.sin(angle) * r + sy;
          api.circle(nx, ny, i === 4 ? 5 : 3.5, i === 4 ? C.fg : C.accent);
        }
        api.circle(CX + sx, CY + sy, 11 + pulse * 4, C.accent);
        api.circle(CX + sx, CY + sy, 5, C.bg);

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y + sy, p.r * (0.5 + p.t / p.max), p.t > 0.25 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y + sy, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        for (let i = 0; i < 4; i += 1) {
          const w = 34 * (1 + pinSnap[i] * 0.3);
          api.rect(150 + i * 46 - (w - 34) / 2, 292 - pinSnap[i] * 3, w, 10 + pinSnap[i] * 2, i < pins ? C.good : C.panel);
        }
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 40, { size: 15, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(196, 50, 88 * Math.max(0, comboT / 1.6), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(pins), 240, 320, { size: 22, color: C.accent2, align: 'center', weight: 'bold' });
        api.text('SPACE when the needle crosses the gold arc', 240, 344, { size: 10, color: C.dim, align: 'center' });
        api.text('SLIP ' + bad, 454, 320, { size: 11, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 454, 338, { size: 10, color: C.dim, align: 'right' });
        if (flash > 0) api.circle(CX + sx, CY + sy, R + 22, flashColor === C.good ? 'rgba(139,220,122,0.14)' : 'rgba(255,122,122,0.16)');
      },

      dispose() {
        offKey();
        offPointer();
      },
    };
  },
});
