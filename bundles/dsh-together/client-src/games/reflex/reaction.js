defineGame({
  id: 'reaction',
  create(api) {
    const C = api.colors;
    const FAST = 450;
    const PERFECT = 300;
    const MAXWAIT = 1500;
    let clock = 0;
    let phase = 'wait';
    let until = 0;
    let goAt = 0;
    let msg = 'WAIT';
    let msgColor = C.dim;
    let hits = 0;
    let misses = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.35, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.3, 0.7), max: 0.7, r: api.rnd(1.6, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 8) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.9, c: color });
    }

    function armWait() {
      phase = 'wait';
      until = clock + api.rnd(720, 1450);
      msg = 'WAIT';
      msgColor = C.dim;
      api.setStatus('wait for green');
    }

    function armGo() {
      phase = 'go';
      goAt = clock;
      until = goAt + MAXWAIT;
      msg = 'TAP!';
      msgColor = C.good;
      pulse = 0.7;
    }

    function settle(ok, ms) {
      phase = 'result';
      until = clock + (ok ? 640 : 840);
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
        label(perfect ? 'PERFECT' : 'NICE', 240, 92, msgColor);
        burst(240, 150, msgColor, perfect ? 18 : 12, perfect ? 260 : 190);
        pulse = 1;
        flash = 1;
        flashColor = C.good;
        api.setStatus(perfect ? 'perfect ' + Math.round(ms) + 'ms' : 'nice ' + Math.round(ms) + 'ms');
      } else {
        misses += 1;
        combo = 0;
        comboT = 0;
        msg = ms < 0 ? 'EARLY' : 'SLOW';
        msgColor = C.warn;
        label(ms < 0 ? 'TOO EARLY' : 'TOO SLOW', 240, 92, C.warn);
        shake = 1;
        flash = 1;
        flashColor = C.warn;
        api.setStatus(ms < 0 ? 'too early' : 'too slow');
      }
    }

    function press() {
      if (phase === 'wait') settle(false, -1);
      else if (phase === 'go') {
        const took = clock - goAt;
        if (took > MAXWAIT) return;
        settle(took <= FAST, took);
      }
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type !== 'down') return;
      press();
    });
    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown) return;
      if (ev && ev.repeat) return;
      if (key === 'space' || key === 'enter') press();
    });

    armWait();

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pulse = Math.max(0, pulse - dt * 3.2);
        shake = Math.max(0, shake - dt * 4.5);
        flash = Math.max(0, flash - dt * 2.6);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
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
          floats[i].y -= dt * 26;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
        if (clock >= until) {
          if (phase === 'wait') armGo();
          else if (phase === 'go') settle(false, MAXWAIT + 1);
          else armWait();
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 820);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.02 + 0.06 * k).toFixed(3) + ')');
        api.rect(0, 210, 480, 150, 'rgba(255,207,92,' + (0.01 + 0.03 * (1 - k)).toFixed(3) + ')');

        const sx = shake > 0 ? Math.sin(clock * 0.16) * shake * 7 : 0;
        const sy = shake > 0 ? Math.cos(clock * 0.13) * shake * 4 : 0;
        const cx = 240 + sx;
        const cy = 150 + sy;
        const breathe = 1 + 0.025 * Math.sin(clock / 240);

        let ring = C.panel;
        if (phase === 'go') ring = C.good;
        else if (phase === 'result') ring = msgColor;
        api.circle(cx, cy, 100 * breathe, C.panel);
        api.circle(cx, cy, (76 + pulse * 12) * breathe, ring);
        api.circle(cx, cy, 62, C.bg);
        for (let i = 0; i < 12; i += 1) {
          const a = (i / 12) * 6.2832 + clock / 2600;
          api.circle(cx + Math.cos(a) * 104, cy + Math.sin(a) * 104, 2.5, i % 3 === 0 ? C.accent2 : C.dim);
        }
        api.text(msg, cx, cy, { size: 30, color: msgColor, align: 'center', weight: 'bold' });
        api.text('target < ' + FAST + 'ms', cx, cy + 44, { size: 12, color: C.dim, align: 'center' });

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x, p.y, p.r * (0.5 + p.t / p.max), p.t > 0.25 ? p.c : 'rgba(255,255,255,0.22)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x, f.y, { size: 15, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 30, { size: 18, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(180, 44, 120 * Math.max(0, comboT / 1.5), 4, comboT > 0.5 ? C.good : C.warn);
        }
        for (let i = 0; i < hits && i < 12; i += 1) api.rect(60 + i * 15, 316, 10, 10, C.good);
        for (let i = 0; i < misses && i < 12; i += 1) api.rect(300 + i * 8, 316, 5, 10, C.warn);
        api.text(String(hits), 34, 321, { size: 14, color: C.fg, align: 'center' });
        api.text('BEST x' + best, 446, 321, { size: 12, color: C.dim, align: 'right' });
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
