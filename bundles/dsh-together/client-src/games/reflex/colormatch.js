defineGame({
  id: 'colormatch',
  create(api) {
    const C = api.colors;
    const NAMES = ['RED', 'GREEN', 'BLUE', 'YELLOW'];
    const INKS = [C.warn, C.good, C.accent, C.accent2];
    const ROUND = 2900;
    let clock = 0;
    let ink = 2;
    let word = 0;
    let roundUntil = 0;
    let roundStart = 0;
    let pop = 1;
    let lastAt = -999;
    let right = 0;
    let wrong = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    let chipPulse = [0, 0, 0, 0];
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 70) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: api.rnd(0.3, 0.7), max: 0.7, r: api.rnd(1.6, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 6) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function chipX(i) {
      return 40 + i * 102 + 46;
    }

    function next() {
      let n = api.irnd(0, 3);
      if (n === ink) n = (n + 1 + api.irnd(0, 2)) % 4;
      ink = n;
      let w = api.irnd(0, 3);
      if (w === ink && api.rng() < 0.55) w = (w + 1) % 4;
      word = w;
      roundStart = clock;
      roundUntil = clock + ROUND;
      pop = 0;
    }

    function answer(idx) {
      if (clock >= roundUntil) return;
      if (clock - lastAt < 60) return;
      lastAt = clock;
      if (idx === ink) {
        const fast = clock - roundStart < 1200;
        right += 1;
        combo += 1;
        comboT = 1.6;
        if (combo > best) best = combo;
        api.progress(1);
        api.score((fast ? 24 : 14) * (1 + Math.floor(combo / 3)));
        burst(chipX(idx), 240, INKS[idx], fast ? 16 : 10, 220);
        label(fast ? 'FAST!' : 'NICE', 240, 196, fast ? C.accent2 : C.good);
        chipPulse[idx] = 1;
        flash = 1;
        flashColor = C.good;
        next();
      } else {
        wrong += 1;
        combo = 0;
        comboT = 0;
        shake = 1;
        flash = 1;
        flashColor = C.warn;
        chipPulse[idx] = 1;
        burst(chipX(idx), 240, INKS[idx], 5, 90);
        label('WRONG', 240, 196, C.warn);
        const left = roundUntil - clock;
        roundUntil = clock + Math.max(420, left - 520);
      }
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown) return;
      if (ev && ev.repeat) return;
      const idx = '1234'.indexOf(key);
      if (idx >= 0) answer(idx);
    });
    const offPointer = api.onPointer((ev) => {
      if (ev.type !== 'down') return;
      for (let i = 0; i < 4; i += 1) {
        const x = 40 + i * 102;
        if (ev.x >= x && ev.x <= x + 92 && ev.y >= 212 && ev.y <= 268) {
          answer(i);
          return;
        }
      }
    });

    next();

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pop = Math.min(1, pop + dt * 5);
        shake = Math.max(0, shake - dt * 4.2);
        flash = Math.max(0, flash - dt * 2.8);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        for (let i = 0; i < 4; i += 1) chipPulse[i] = Math.max(0, chipPulse[i] - dt * 3.2);
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.t -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.93;
          p.vy = p.vy * 0.93 + 260 * dt;
          if (p.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 22;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
        if (clock >= roundUntil) {
          wrong += 1;
          combo = 0;
          comboT = 0;
          shake = 1;
          flash = 1;
          flashColor = C.warn;
          label('TOO SLOW', 240, 196, C.warn);
          next();
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 900);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        api.rect(0, 250, 480, 110, 'rgba(255,207,92,' + (0.008 + 0.022 * k).toFixed(3) + ')');
        const left = Math.max(0, roundUntil - clock) / ROUND;
        api.rect(30, 14, 420, 9, C.panel);
        api.rect(30, 14, 420 * left, 9, left < 0.3 ? C.warn : C.accent);

        const sx = shake > 0 ? Math.sin(clock * 0.2) * shake * 6 : 0;
        api.text('PRESS THE KEY OF THE INK COLOR', 240 + sx, 46, { size: 12, color: C.dim, align: 'center' });
        api.rect(120 + sx, 74, 240, 100, C.panel);
        api.rect(124 + sx, 78, 232, 92, 'rgba(0,0,0,0.35)');
        const grow = 0.7 + 0.3 * (1 - (1 - pop) * (1 - pop));
        api.text(NAMES[word], 240 + sx, 124, { size: 52 * grow, color: INKS[ink], align: 'center', weight: 'bold' });
        api.text('ink = ?', 240 + sx, 168, { size: 10, color: C.dim, align: 'center' });

        for (let i = 0; i < 4; i += 1) {
          const x = 40 + i * 102;
          const lift = chipPulse[i] * 5;
          api.rect(x, 212 - lift, 92, 56, INKS[i]);
          api.rect(x, 260 - lift, 92, 4, 'rgba(0,0,0,0.35)');
          api.text(String(i + 1), x + 46, 232 - lift, { size: 22, color: C.bg, align: 'center', weight: 'bold' });
          api.text(NAMES[i], x + 46, 254 - lift, { size: 10, color: C.bg, align: 'center' });
        }

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x, p.y, p.r * (0.5 + p.t / p.max), p.t > 0.25 ? p.c : 'rgba(255,255,255,0.22)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x, f.y, { size: 14, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 296, { size: 15, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(196, 306, 88 * Math.max(0, comboT / 1.6), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(right), 30, 330, { size: 22, color: C.good, weight: 'bold' });
        api.text('OK', 30, 348, { size: 10, color: C.dim });
        api.text('BAD ' + wrong, 450, 330, { size: 12, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 450, 348, { size: 10, color: C.dim, align: 'right' });
        if (flash > 0) {
          api.rect(0, 0, 480, 3, flashColor);
          api.rect(0, 357, 480, 3, flashColor);
        }
      },

      dispose() {
        offKey();
        offPointer();
      },
    };
  },
});
