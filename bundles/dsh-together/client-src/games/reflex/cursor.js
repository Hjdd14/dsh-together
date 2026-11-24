defineGame({
  id: 'cursor',
  create(api) {
    const C = api.colors;
    const RANGE = 26;
    const TIGHT = 8;
    let clock = 0;
    let puckX = 240;
    let puckY = 200;
    let offX = 0;
    let offY = 0;
    let grab = false;
    let missUp = 0;
    let idleX = 240;
    let idleY = 200;
    let tx = 366;
    let ty = 118;
    let pop = 1;
    let done = 0;
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
    const trail = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 70) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.28, 0.6), max: 0.6, r: api.rnd(1.5, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 6) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function placeTarget() {
      let nx = 240;
      let ny = 180;
      for (let i = 0; i < 12; i += 1) {
        nx = api.rnd(52, 428);
        ny = api.rnd(70, 298);
        const dx = nx - puckX;
        const dy = ny - puckY;
        if (dx * dx + dy * dy > 130 * 130) break;
      }
      tx = nx;
      ty = ny;
      pop = 0;
    }

    function clampPuck() {
      puckX = Math.max(14, Math.min(466, puckX));
      puckY = Math.max(52, Math.min(336, puckY));
    }

    function release() {
      if (!grab) return;
      grab = false;
      trail.length = 0;
      const dx = puckX - tx;
      const dy = puckY - ty;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= RANGE) {
        const tight = d <= TIGHT;
        done += 1;
        combo += 1;
        comboT = 1.6;
        if (combo > best) best = combo;
        api.progress(1);
        api.score((tight ? 26 : 15) * (1 + Math.floor(combo / 3)));
        flash = 1;
        flashColor = C.good;
        pulse = 1;
        burst(tx, ty, tight ? C.accent2 : C.good, tight ? 16 : 10, 200);
        label(tight ? 'PERFECT' : 'NICE', tx, ty - 34, tight ? C.accent2 : C.good);
        placeTarget();
      } else {
        bad += 1;
        combo = 0;
        comboT = 0;
        shake = 1;
        flash = 1;
        flashColor = C.warn;
        burst(puckX, puckY, 'rgba(255,122,122,0.5)', 6, 100);
        label('OFF BY ' + Math.round(d), puckX, puckY - 26, C.warn);
      }
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'down') {
        grab = true;
        offX = Math.max(-60, Math.min(60, puckX - ev.x));
        offY = Math.max(-60, Math.min(60, puckY - ev.y));
        idleX = ev.x + offX;
        idleY = ev.y + offY;
        trail.length = 0;
        return;
      }
      if (ev.type === 'up') {
        missUp = 0;
        release();
        return;
      }
      if (!grab) return;
      if (!ev.dragging) {
        missUp += 1;
        if (missUp >= 2) release();
        return;
      }
      missUp = 0;
      idleX = ev.x + offX;
      idleY = ev.y + offY;
      if (trail.length >= 10) trail.shift();
      trail.push({ x: puckX, y: puckY, t: 0.2 });
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
        pop = Math.min(1, pop + dt * 5);
        if (grab) {
          const k = Math.min(1, dt * 40);
          puckX += (idleX - puckX) * k;
          puckY += (idleY - puckY) * k;
          clampPuck();
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
        for (let i = trail.length - 1; i >= 0; i -= 1) {
          trail[i].t -= dt;
          if (trail[i].t <= 0) trail.splice(i, 1);
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
        api.rect(0, 296, 480, 64, 'rgba(255,207,92,' + (0.008 + 0.02 * k).toFixed(3) + ')');
        for (let i = 0; i < 7; i += 1) {
          api.rect(0, 60 + i * 40 + Math.sin(clock / 1500 + i) * 2, 480, 1, 'rgba(143,160,180,0.06)');
        }
        const sx = shake > 0 ? Math.sin(clock * 0.24) * shake * 5 : 0;
        const sy = shake > 0 ? Math.cos(clock * 0.2) * shake * 3 : 0;

        const dx = puckX - tx;
        const dy = puckY - ty;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const near = dist <= RANGE;
        const grow = 0.6 + 0.4 * (1 - (1 - pop) * (1 - pop));
        api.circle(tx + sx, ty + sy, (RANGE + 9) * grow, C.panel);
        api.circle(tx + sx, ty + sy, RANGE * grow, near ? C.accent2 : C.dim);
        api.circle(tx + sx, ty + sy, (RANGE - 9) * grow, C.bg);
        api.circle(tx + sx, ty + sy, 4, near ? C.accent2 : C.accent);
        if (near) api.circle(tx + sx, ty + sy, RANGE + 6 + 5 * Math.sin(clock / 120), 'rgba(255,207,92,0.16)');
        api.circle(tx + sx, ty + sy, TIGHT + 2, 'rgba(255,255,255,0.08)');

        for (let i = 0; i < trail.length; i += 1) {
          const t = trail[i];
          api.circle(t.x, t.y, 2 + 5 * (t.t / 0.2), 'rgba(255,255,255,0.12)');
        }
        api.circle(puckX + sx, puckY + sy, grab ? 15 : 13, flash > 0 ? flashColor : C.accent);
        api.circle(puckX + sx, puckY + sy, 5, C.bg);
        api.circle(puckX + sx, puckY + sy, 20 + pulse * 12, 'rgba(106,169,255,0.10)');

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y + sy, p.r * (0.5 + p.t / p.max), p.t > 0.2 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y + sy, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        if (grab) {
          api.text(near ? 'RELEASE' : 'dist ' + Math.round(dist), puckX + sx, puckY + sy + 30, {
            size: 11,
            color: near ? C.accent2 : C.dim,
            align: 'center',
            weight: 'bold',
          });
        }
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 24, { size: 15, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(196, 36, 88 * Math.max(0, comboT / 1.6), 4, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(done), 32, 320, { size: 24, color: C.good, weight: 'bold' });
        api.text('PLACED', 32, 340, { size: 10, color: C.dim });
        api.text('OFF ' + bad, 450, 320, { size: 12, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 450, 338, { size: 10, color: C.dim, align: 'right' });
        api.text('drag, then let go on the dot', 240, 350, { size: 10, color: C.dim, align: 'center' });
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
      },

      dispose() {
        offPointer();
      },
    };
  },
});
