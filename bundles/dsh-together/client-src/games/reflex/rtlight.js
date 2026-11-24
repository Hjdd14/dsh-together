defineGame({
  id: 'rtlight',
  create(api) {
    const C = api.colors;
    const FAST = 500;
    const PERFECT = 300;
    const MAXWAIT = 1550;
    const lamps = [];
    for (let i = 0; i < 5; i += 1) lamps.push({ x: 76 + i * 82, lit: 0 });
    let clock = 0;
    let phase = 'wait';
    let target = 2;
    let until = 0;
    let goAt = 0;
    let hits = 0;
    let misses = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    let msg = 'WAIT';
    let msgColor = C.dim;
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.3, 0.7), max: 0.7, r: api.rnd(1.6, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 7) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.9, c: color });
    }

    function allDark() {
      for (let i = 0; i < lamps.length; i += 1) lamps[i].lit = 0;
    }

    function armWait() {
      allDark();
      phase = 'wait';
      target = api.irnd(0, lamps.length - 1);
      until = clock + api.rnd(700, 1450);
      msg = 'WAIT';
      msgColor = C.dim;
      api.setStatus('wait for a green lamp');
    }

    function armGo() {
      phase = 'go';
      goAt = clock;
      until = goAt + MAXWAIT;
      lamps[target].lit = 1;
      msg = 'GO';
      msgColor = C.good;
      pulse = 0.6;
    }

    function settle(ok, ms, which) {
      phase = 'result';
      until = clock + (ok ? 640 : 840);
      allDark();
      const lx = lamps[Math.max(0, Math.min(lamps.length - 1, which === undefined ? target : which))].x;
      if (ok) {
        const perfect = ms <= PERFECT;
        hits += 1;
        combo += 1;
        comboT = 1.5;
        if (combo > best) best = combo;
        api.progress(1);
        api.score((perfect ? 30 : 20) * (1 + Math.floor(combo / 3)));
        msg = Math.round(ms) + 'ms';
        msgColor = perfect ? C.accent2 : C.good;
        label(perfect ? 'PERFECT' : 'NICE', lx, 96, msgColor);
        burst(lx, 176, msgColor, perfect ? 18 : 12, perfect ? 250 : 190);
        pulse = 1;
        flash = 1;
        flashColor = C.good;
        api.setStatus((perfect ? 'perfect ' : 'nice ') + Math.round(ms) + 'ms');
      } else {
        misses += 1;
        combo = 0;
        comboT = 0;
        msg = ms === -2 ? 'WRONG LAMP' : ms < 0 ? 'EARLY' : 'TOO SLOW';
        msgColor = C.warn;
        label(ms === -2 ? 'WRONG LAMP' : ms < 0 ? 'TOO EARLY' : 'TOO SLOW', lx, 96, C.warn);
        shake = 1;
        flash = 1;
        flashColor = C.warn;
        api.setStatus(ms === -2 ? 'wrong lamp' : ms < 0 ? 'too early' : 'too slow');
      }
    }

    function press(x, y) {
      let best2 = -1;
      let bd = 1e9;
      for (let i = 0; i < lamps.length; i += 1) {
        const dx = x - lamps[i].x;
        const dy = y - 176;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best2 = i; }
      }
      const aim = best2;
      if (phase === 'wait') {
        settle(false, -1, aim);
        return;
      }
      if (phase !== 'go') return;
      if (aim === target) settle(clock - goAt <= FAST, clock - goAt, aim);
      else settle(false, -2, aim);
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type !== 'down') return;
      press(ev.x, ev.y);
    });
    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      if (key === 'space' || key === 'enter') press(lamps[target].x, 176);
    });

    armWait();

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pulse = Math.max(0, pulse - dt * 3.2);
        shake = Math.max(0, shake - dt * 4.4);
        flash = Math.max(0, flash - dt * 2.6);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        for (let i = 0; i < lamps.length; i += 1) {
          const goal = lamps[i].lit ? 1 : 0;
          lamps[i].lit = Math.min(1, lamps[i].lit + (goal - lamps[i].lit) * Math.min(1, dt * 12));
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.t -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.92;
          p.vy = p.vy * 0.92 + 210 * dt;
          if (p.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 24;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
        if (clock >= until) {
          if (phase === 'wait') armGo();
          else if (phase === 'go') settle(false, MAXWAIT + 1, target);
          else armWait();
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 840);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.02 + 0.06 * k).toFixed(3) + ')');
        api.rect(0, 232, 480, 128, 'rgba(255,207,92,' + (0.01 + 0.03 * (1 - k)).toFixed(3) + ')');
        const sx = shake > 0 ? Math.sin(clock * 0.17) * shake * 6 : 0;
        const sy = shake > 0 ? Math.cos(clock * 0.14) * shake * 4 : 0;

        api.rect(40 + sx, 136 + sy, 400, 82, 'rgba(0,0,0,0.35)');
        for (let i = 0; i < lamps.length; i += 1) {
          const L = lamps[i];
          const lit = L.lit;
          api.circle(L.x + sx, 176 + sy, 30, C.panel);
          api.circle(L.x + sx, 176 + sy, 25, lit > 0.02 ? (lit > 0.7 ? C.good : C.dim) : 'rgba(24,32,40,0.9)');
          if (lit > 0.02) {
            api.circle(L.x + sx, 176 + sy, 25 + 16 * lit, 'rgba(139,220,122,' + (0.1 + 0.22 * lit).toFixed(3) + ')');
            api.circle(L.x + sx - 8, 168 + sy, 6, 'rgba(255,255,255,0.35)');
          }
          api.text('P' + (i + 1), L.x + sx, 218 + sy, { size: 9, color: C.dim, align: 'center' });
        }

        api.text(msg, 240 + sx, 64, { size: 26, color: msgColor, align: 'center', weight: 'bold' });
        api.text('target < ' + FAST + 'ms', 240 + sx, 92, { size: 11, color: C.dim, align: 'center' });

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y + sy, p.r * (0.5 + p.t / p.max), p.t > 0.25 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y + sy, { size: 14, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 24, { size: 17, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(182, 36, 116 * Math.max(0, comboT / 1.5), 4, comboT > 0.5 ? C.good : C.warn);
        }
        for (let i = 0; i < hits && i < 10; i += 1) api.rect(96 + i * 18, 300, 12, 12, C.good);
        api.text(String(hits), 56, 306, { size: 16, color: C.fg, align: 'center' });
        api.text('BEST x' + best, 240, 330, { size: 12, color: C.dim, align: 'center' });
        api.text('MISS ' + misses, 240, 348, { size: 11, color: C.dim, align: 'center' });
        if (pulse > 0) api.circle(240, 268, 10 + pulse * 8, C.accent2);
        if (flash > 0) {
          api.rect(0, 0, 480, 3, flashColor);
          api.rect(0, 357, 480, 3, flashColor);
        }
      },

      dispose() {
        offPointer();
        offKey();
      },
    };
  },
});
