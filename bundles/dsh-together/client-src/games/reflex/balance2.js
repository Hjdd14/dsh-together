defineGame({
  id: 'balance2',
  create(api) {
    const C = api.colors;
    const TRAY_Y = 302;
    const HALF = 46;
    const GRAVITY = 190;
    let clock = 0;
    let trayX = 240;
    let trayV = 0;
    let trayTilt = 0;
    let caught = 0;
    let dropped = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    let spawnAt = 520;
    const items = [];
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, t: api.rnd(0.3, 0.68), max: 0.68, r: api.rnd(1.6, 3.5), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 7) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function spawn() {
      const r = api.rnd(11, 17);
      items.push({
        x: api.rnd(48, 432),
        y: -14,
        r: r,
        vy: api.rnd(96, 140),
        drift: api.rnd(-26, 26),
        ph: api.rnd(0, 6.28),
        c: api.pick([C.accent2, C.warn, C.good, C.accent]),
      });
    }

    function catchItem(it) {
      caught += 1;
      combo += 1;
      comboT = 1.6;
      if (combo > best) best = combo;
      api.progress(1);
      api.score(12 * (1 + Math.floor(combo / 3)));
      pulse = 1;
      flash = 1;
      flashColor = C.good;
      burst(it.x, TRAY_Y - 6, it.c, 12, 200);
      burst(it.x, TRAY_Y - 6, 'rgba(255,255,255,0.6)', 4, 110);
      label(combo >= 3 ? 'CATCH x' + combo : 'NICE', it.x, TRAY_Y - 46, combo >= 3 ? C.accent2 : C.good);
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      if (key === 'left') trayTilt = Math.min(1, trayTilt + 0.25);
      else if (key === 'right') trayTilt = Math.max(-1, trayTilt - 0.25);
    });
    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'move' || ev.type === 'down') trayX = ev.x;
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

        const dir = (api.down('left') ? -1 : 0) + (api.down('right') ? 1 : 0);
        if (dir !== 0) {
          trayV += dir * 1400 * dt;
          trayTilt = Math.max(-1, Math.min(1, trayTilt + dir * dt * 3));
        } else {
          trayV *= 0.86;
          trayTilt *= 0.9;
        }
        trayV = Math.max(-420, Math.min(420, trayV));
        trayX += trayV * dt;
        if (trayX < 56) { trayX = 56; trayV = 0; }
        if (trayX > 424) { trayX = 424; trayV = 0; }

        for (let i = items.length - 1; i >= 0; i -= 1) {
          const it = items[i];
          it.ph += dt * 2;
          it.vy += GRAVITY * dt;
          it.y += it.vy * dt;
          it.x += (Math.sin(it.ph) * 8 + it.drift) * dt;
          if (it.y >= TRAY_Y - 6) {
            if (Math.abs(it.x - trayX) <= HALF) {
              catchItem(it);
            } else {
              dropped += 1;
              combo = 0;
              comboT = 0;
              shake = Math.min(1, shake + 0.7);
              label('DROPPED', it.x, 336, C.dim);
            }
            items.splice(i, 1);
          }
        }
        if (clock >= spawnAt && items.length < 4) {
          spawn();
          spawnAt = clock + Math.max(420, 760 - caught * 18);
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.t -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.93;
          p.vy = p.vy * 0.93 + 250 * dt;
          if (p.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 22;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 900);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        api.rect(0, 330, 480, 30, 'rgba(143,160,180,0.08)');
        for (let i = 0; i < 9; i += 1) {
          api.rect(i * 54 + Math.sin(clock / 1600 + i) * 6, 34, 1, 300, 'rgba(143,160,180,0.05)');
        }
        const sx = shake > 0 ? Math.sin(clock * 0.24) * shake * 5 : 0;

        for (let i = 0; i < items.length; i += 1) {
          const it = items[i];
          api.circle(it.x + sx, it.y + 3, it.r, 'rgba(0,0,0,0.22)');
          api.circle(it.x + sx, it.y, it.r, it.c);
          api.circle(it.x - it.r * 0.32 + sx, it.y - it.r * 0.32, it.r * 0.3, 'rgba(255,255,255,0.55)');
        }

        const tilt = trayTilt * 0.16;
        for (let i = -1; i <= 1; i += 2) {
          const t = (i * HALF) / 1;
          const ox = Math.cos(tilt) * t;
          const oy = Math.sin(tilt) * t;
          api.rect(trayX + ox - 5 + sx, TRAY_Y - 7 + oy, 10, 14, C.dim);
        }
        api.rect(trayX - HALF + sx, TRAY_Y - 4 + Math.sin(tilt) * 2, HALF * 2, 8, pulse > 0 ? C.good : C.accent2);
        api.rect(trayX - HALF + sx, TRAY_Y + 4 + Math.sin(tilt) * 2, HALF * 2, 3, 'rgba(0,0,0,0.35)');
        api.rect(trayX - 3 + sx, TRAY_Y + 8, 6, 12, C.dim);
        if (pulse > 0) api.rect(trayX - HALF - 6 + sx, TRAY_Y - 8, HALF * 2 + 12, 16, 'rgba(139,220,122,0.24)');

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y, p.r * (0.5 + p.t / p.max), p.t > 0.25 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 30, { size: 15, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(198, 41, 84 * Math.max(0, comboT / 1.6), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(caught), 30, 322, { size: 20, color: C.good, weight: 'bold' });
        api.text('CAUGHT', 30, 340, { size: 10, color: C.dim });
        api.text('DROP ' + dropped, 450, 322, { size: 12, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 450, 340, { size: 10, color: C.dim, align: 'right' });
        api.text('left / right to slide, or drag', 240, 352, { size: 10, color: C.dim, align: 'center' });
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
      },

      dispose() {
        offKey();
        offPointer();
      },
    };
  },
});
