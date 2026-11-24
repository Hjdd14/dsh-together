defineGame({
  id: 'fastsimon',
  create(api) {
    const C = api.colors;
    const PADS = [
      { x: 128, y: 112, w: 104, h: 92, c: C.warn },
      { x: 248, y: 112, w: 104, h: 92, c: C.accent2 },
      { x: 128, y: 218, w: 104, h: 92, c: C.good },
      { x: 248, y: 218, w: 104, h: 92, c: C.accent },
    ];
    const SEQ = 3;
    const LIT = 400;
    const GAP = 150;
    let clock = 0;
    let seq = [];
    let phase = 'show';
    let playI = 0;
    let lit = -1;
    let litUntil = 0;
    let nextAt = 0;
    let inputI = 0;
    let done = 0;
    let bad = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pop = 1;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    let banner = 'WATCH';
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.28, 0.62), max: 0.62, r: api.rnd(1.5, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 6) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.8, c: color });
    }

    function center(i) {
      return { x: PADS[i].x + PADS[i].w / 2, y: PADS[i].y + PADS[i].h / 2 };
    }

    function startShow() {
      seq = [];
      for (let i = 0; i < SEQ; i += 1) seq.push(api.irnd(0, 3));
      phase = 'show';
      playI = 0;
      inputI = 0;
      pop = 0;
      banner = 'WATCH';
      lit = seq[0];
      litUntil = clock + LIT;
      nextAt = litUntil + GAP;
      api.setStatus('watch the order');
    }

    startShow();

    function press(idx) {
      if (phase !== 'input') return;
      if (idx === seq[inputI]) {
        const p = center(idx);
        done += 1;
        combo += 1;
        comboT = 1.6;
        if (combo > best) best = combo;
        inputI += 1;
        api.progress(1);
        api.score(12 * (1 + Math.floor(combo / 3)));
        lit = idx;
        litUntil = clock + 170;
        pulse = 1;
        flash = 1;
        flashColor = C.good;
        burst(p.x, p.y, PADS[idx].c, 10, 180);
        if (inputI >= seq.length) {
          phase = 'done';
          nextAt = clock + 460;
          banner = 'CLEAR';
          label('STEP CLEAR', 240, 92, C.accent2);
        }
      } else {
        const p = center(idx);
        bad += 1;
        combo = 0;
        comboT = 0;
        shake = 1;
        flash = 1;
        flashColor = C.warn;
        phase = 'retry';
        lit = -1;
        nextAt = clock + 460;
        banner = 'MISS';
        burst(p.x, p.y, 'rgba(255,122,122,0.55)', 6, 110);
        label('MISS', 240, 92, C.warn);
        api.setStatus('missed - watch again');
      }
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      let idx = '1234'.indexOf(key);
      if (idx < 0) {
        if (key === 'left' || key === 'up') idx = 0;
        else if (key === 'right' || key === 'down') idx = 1;
      }
      if (idx >= 0) press(idx);
    });
    const offPointer = api.onPointer((ev) => {
      if (ev.type !== 'down') return;
      for (let i = 0; i < PADS.length; i += 1) {
        const p = PADS[i];
        if (ev.x >= p.x && ev.x <= p.x + p.w && ev.y >= p.y && ev.y <= p.y + p.h) {
          press(i);
          return;
        }
      }
    });

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pop = Math.min(1, pop + dt * 4.5);
        pulse = Math.max(0, pulse - dt * 4);
        shake = Math.max(0, shake - dt * 4.2);
        flash = Math.max(0, flash - dt * 2.8);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        if (lit >= 0 && clock >= litUntil) lit = -1;
        if (phase === 'show') {
          if (playI + 1 < seq.length) {
            if (clock >= nextAt) {
              playI += 1;
              lit = seq[playI];
              litUntil = clock + LIT;
              nextAt = litUntil + GAP;
            }
          } else if (clock >= nextAt) {
            phase = 'input';
            lit = -1;
            banner = 'REPEAT';
            api.setStatus('repeat the order');
          }
        } else if ((phase === 'retry' || phase === 'done') && clock >= nextAt) {
          startShow();
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
          floats[i].y -= dt * 22;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 850);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        api.rect(0, 300, 480, 60, 'rgba(255,207,92,' + (0.008 + 0.02 * k).toFixed(3) + ')');
        const sx = shake > 0 ? Math.sin(clock * 0.23) * shake * 5 : 0;
        const sy = shake > 0 ? Math.cos(clock * 0.2) * shake * 3 : 0;

        for (let i = 0; i < PADS.length; i += 1) {
          const p = PADS[i];
          const on = lit === i;
          const x = p.x + sx;
          const y = p.y + sy;
          api.rect(x, y, p.w, p.h, C.panel);
          api.rect(x + 4, y + 4, p.w - 8, p.h - 8, on ? p.c : 'rgba(0,0,0,0.4)');
          if (on) {
            api.rect(x + 4, y + 4, p.w - 8, p.h - 8, 'rgba(255,255,255,0.18)');
            api.rect(x - 3, y - 3, p.w + 6, p.h + 6, 'rgba(255,255,255,0.06)');
          }
          api.text(String(i + 1), x + p.w / 2, y + p.h / 2, {
            size: on ? 30 : 20,
            color: on ? C.bg : C.dim,
            align: 'center',
            weight: 'bold',
          });
        }

        const headColor = phase === 'retry' ? C.warn : phase === 'input' ? C.accent : phase === 'done' ? C.good : C.dim;
        api.text(banner, 240 + sx, 60, { size: 18 + pulse * 4, color: headColor, align: 'center', weight: 'bold' });
        for (let i = 0; i < seq.length; i += 1) {
          const filled = phase === 'input' ? i < inputI : phase === 'show' ? i <= playI : false;
          api.circle(214 + i * 26, 84, filled ? 6 : 4.5, filled ? C.good : C.panel);
        }

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y + sy, p.r * (0.5 + p.t / p.max), p.t > 0.25 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y + sy, { size: 13, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 336, { size: 14, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(196, 348, 88 * Math.max(0, comboT / 1.6), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(done), 30, 320, { size: 22, color: C.good, weight: 'bold' });
        api.text('STEPS', 30, 338, { size: 10, color: C.dim });
        api.text('MISS ' + bad, 452, 320, { size: 12, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 452, 338, { size: 10, color: C.dim, align: 'right' });
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
