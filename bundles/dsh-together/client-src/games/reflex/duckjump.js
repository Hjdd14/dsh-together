defineGame({
  id: 'duckjump',
  create(api) {
    const C = api.colors;
    const GROUND = 268;
    const PX = 96;
    const SPEED = 330;
    let clock = 0;
    let atk = null;
    let nextAt = 700;
    let duckUntil = -1;
    let airUntil = -1;
    let lastDuck = -9999;
    let lastJump = -9999;
    let good = 0;
    let bad = 0;
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
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: api.rnd(0.3, 0.68), max: 0.68, r: api.rnd(1.5, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 7) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function spawn() {
      const high = api.rng() < 0.5;
      const travel = 1000 / SPEED * (470 - PX);
      atk = {
        kind: high ? 'high' : 'low',
        x: 490,
        hitAt: clock + travel,
        y: high ? 196 : 246,
        h: high ? 30 : 22,
      };
      api.setStatus(high ? 'high attack - duck' : 'low attack - jump');
    }

    function judge() {
      const high = atk.kind === 'high';
      const duckOn = clock < duckUntil || clock - lastDuck <= 620;
      const airOn = clock < airUntil || clock - lastJump <= 520;
      const ok = high ? duckOn : airOn;
      if (ok) {
        good += 1;
        combo += 1;
        comboT = 1.6;
        if (combo > best) best = combo;
        api.progress(1);
        api.score((airOn && !high ? 22 : 16) * (1 + Math.floor(combo / 3)));
        label(high ? 'DUCKED' : 'JUMPED', PX + 26, GROUND - 74, C.good);
        burst(PX + 20, GROUND - 30, C.good, 12, 200);
        pulse = 1;
        flash = 1;
        flashColor = C.good;
        api.setStatus(high ? 'ducked - nice' : 'jumped - nice');
      } else {
        bad += 1;
        combo = 0;
        comboT = 0;
        shake = 1;
        flash = 1;
        flashColor = C.warn;
        label(high ? 'TOO TALL' : 'TOO LOW', PX + 26, GROUND - 74, C.warn);
        burst(PX + 20, GROUND - 40, 'rgba(255,122,122,0.55)', 8, 140);
        api.setStatus(high ? 'should have ducked' : 'should have jumped');
      }
      atk = null;
      nextAt = clock + 620;
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      if (key === 'down' || key === 's') {
        duckUntil = clock + 400;
        lastDuck = clock;
      } else if (key === 'space' || key === 'up' || key === 'w' || key === 'enter') {
        airUntil = clock + 540;
        lastJump = clock;
      }
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
        if (atk) {
          atk.x -= SPEED * dt;
          if (clock >= atk.hitAt) judge();
        } else if (clock >= nextAt) {
          spawn();
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.t -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.92;
          p.vy = p.vy * 0.92 + 260 * dt;
          if (p.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 24;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 880);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        api.rect(0, GROUND, 480, 360 - GROUND, 'rgba(143,160,180,' + (0.05 + 0.05 * k).toFixed(3) + ')');
        const sx = shake > 0 ? Math.sin(clock * 0.25) * shake * 7 : 0;
        const airOn = clock < airUntil;
        const duckOn = clock < duckUntil;
        const jumpT = airOn ? 1 - (airUntil - clock) / 540 : 0;
        const jumpY = airOn ? Math.sin(Math.min(1, jumpT) * Math.PI) * 62 : 0;
        const bodyH = duckOn ? 20 : 46;
        const baseY = GROUND - 6 - jumpY;

        api.rect(0, GROUND - 2, 480, 2, C.dim);
        for (let i = 0; i < 8; i += 1) {
          api.rect(30 + i * 58, GROUND + 8, 30, 2, 'rgba(143,160,180,0.25)');
        }

        const bx = PX + sx;
        api.circle(bx, baseY - bodyH / 2, duckOn ? 15 : 13, C.accent);
        api.circle(bx, baseY - bodyH - 9, 11, C.fg);
        api.rect(bx - 9, baseY - bodyH, 18, bodyH, C.accent);
        if (duckOn) api.rect(bx - 15, baseY - 12, 30, 8, C.accent2);
        if (airOn) api.circle(bx, GROUND - 8, 16 + 6 * jumpT, 'rgba(255,255,255,0.08)');

        if (atk) {
          const near = 1 - Math.max(0, atk.hitAt - clock) / 900;
          const pulseA = 0.5 + 0.5 * Math.sin(clock / 90);
          const ax = atk.x + sx;
          api.rect(ax - 26, atk.y, 52, atk.h, atk.kind === 'high' ? C.warn : C.accent2);
          api.rect(ax - 26, atk.y, 52, atk.h, 'rgba(255,255,255,' + (0.1 + 0.2 * pulseA).toFixed(3) + ')');
          api.text(atk.kind === 'high' ? 'HIGH' : 'LOW', ax, atk.y - 12, {
            size: 11,
            color: atk.kind === 'high' ? C.warn : C.accent2,
            align: 'center',
            weight: 'bold',
          });
          api.rect(ax - 26, GROUND + 16, 52, 3, 'rgba(255,255,255,' + (0.15 + 0.35 * near).toFixed(3) + ')');
        }

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y, p.r * (0.5 + p.t / p.max), p.t > 0.25 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y, { size: 14, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        api.text('DOWN = duck    SPACE = jump', 240, 30, { size: 12, color: C.dim, align: 'center' });
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 52, { size: 15, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(198, 63, 84 * Math.max(0, comboT / 1.6), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(good), 30, 316, { size: 22, color: C.good, weight: 'bold' });
        api.text('CLEAN', 30, 334, { size: 10, color: C.dim });
        api.text('HIT ' + bad, 452, 316, { size: 12, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 452, 334, { size: 10, color: C.dim, align: 'right' });
        api.text(duckOn ? 'DUCK' : airOn ? 'JUMP' : 'ready', 240, 348, {
          size: 11,
          color: duckOn ? C.accent2 : airOn ? C.accent : C.dim,
          align: 'center',
          weight: 'bold',
        });
        if (pulse > 0) api.circle(PX + 20, GROUND - 40, 12 + pulse * 12, 'rgba(139,220,122,0.18)');
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
      },

      dispose() {
        offKey();
      },
    };
  },
});
