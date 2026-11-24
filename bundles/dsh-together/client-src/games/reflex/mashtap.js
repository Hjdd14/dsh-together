defineGame({
  id: 'mashtap',
  create(api) {
    const C = api.colors;
    const SPAN = 5000;
    const CX = 240;
    const CY = 176;
    const R = 104;
    let clock = 0;
    let roundUntil = SPAN;
    let taps = 0;
    let burst = 0;
    let bestBurst = 0;
    let pulse = 0;
    let heat = 0;
    let shake = 0;
    let lastTapAt = -999;
    let lastBurst = 0;
    let ringFlash = 0;
    const parts = [];
    const floats = [];

    function puff(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 60) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.35, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.25, 0.55), max: 0.55, r: api.rnd(1.6, 3.6), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 8) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.7, c: color });
    }

    function tap(x, y) {
      if (clock - lastTapAt < 40) return;
      lastTapAt = clock;
      taps += 1;
      burst += 1;
      heat = Math.min(1, heat + 0.05);
      if (burst > bestBurst) bestBurst = burst;
      pulse = 1;
      shake = Math.min(1, shake + 0.35);
      ringFlash = 1;
      api.progress(1);
      if (burst % 10 === 0) {
        label('x' + burst, CX, CY - R - 18, burst >= 40 ? C.accent2 : C.good);
        puff(CX, CY, burst >= 40 ? C.accent2 : C.good, 14, 210);
      } else {
        puff(x, y, 'rgba(255,255,255,0.55)', 3, 110);
      }
      if (burst === 40) label('OVERDRIVE', CX, CY + R + 26, C.accent2);
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type !== 'down') return;
      const dx = ev.x - CX;
      const dy = ev.y - CY;
      if (dx * dx + dy * dy <= (R + 34) * (R + 34)) tap(ev.x, ev.y);
      else {
        shake = Math.min(1, shake + 0.15);
        puff(ev.x, ev.y, 'rgba(143,160,180,0.4)', 3, 70);
      }
    });
    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      if (key === 'space' || key === 'enter' || key === 'a' || key === 'd') tap(CX, CY);
    });

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pulse = Math.max(0, pulse - dt * 5);
        shake = Math.max(0, shake - dt * 5);
        ringFlash = Math.max(0, ringFlash - dt * 3.4);
        heat = Math.max(0, heat - dt * 0.9);
        if (clock >= roundUntil) {
          roundUntil = clock + SPAN;
          lastBurst = burst;
          if (burst >= 10) label('BURST ' + burst, CX, CY + R + 26, C.dim);
          burst = 0;
          heat = 0;
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
          floats[i].y -= dt * 26;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const left = Math.max(0, roundUntil - clock) / SPAN;
        const k = 0.5 + 0.5 * Math.sin(clock / (300 - heat * 220));
        const hot = heat > 0.55;
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        api.rect(0, 250, 480, 110, 'rgba(255,207,92,' + (0.008 + 0.03 * heat).toFixed(3) + ')');
        const sx = shake > 0 ? Math.sin(clock * 0.4) * shake * 5 : 0;
        const sy = shake > 0 ? Math.cos(clock * 0.35) * shake * 3 : 0;

        api.rect(60, 20, 360, 10, C.panel);
        api.rect(60, 20, 360 * left, 10, left < 0.25 ? C.warn : C.accent);
        api.text('TAP THE DISC', 240, 44, { size: 12, color: C.dim, align: 'center' });

        const grow = pulse * 12;
        api.circle(CX + sx, CY + sy, R + 22 + pulse * 10, hot ? 'rgba(255,207,92,0.18)' : 'rgba(106,169,255,0.10)');
        api.circle(CX + sx, CY + sy, R + 10, C.panel);
        api.circle(CX + sx, CY + sy, R + grow, ringFlash > 0 ? C.good : hot ? C.accent2 : C.accent);
        api.circle(CX + sx, CY + sy, R - 14 - grow * 0.5, C.bg);

        for (let i = 0; i < 20; i += 1) {
          const a = (i / 20) * 6.2832 - clock / 2400;
          const on = i / 20 <= left;
          api.circle(CX + Math.cos(a) * (R + 16), CY + Math.sin(a) * (R + 16), on ? 2.4 : 1.6, on ? C.accent2 : 'rgba(143,160,180,0.25)');
        }

        api.text(String(taps), CX + sx, CY + sy - 14, { size: 54, color: C.fg, align: 'center', weight: 'bold' });
        api.text('TAPS', CX + sx, CY + sy + 26, { size: 13, color: C.dim, align: 'center' });
        api.text(burst + ' this burst', CX + sx, CY + sy + 52, { size: 12, color: hot ? C.accent2 : C.dim, align: 'center' });

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y + sy, p.r * (0.5 + p.t / p.max), p.t > 0.2 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y + sy, { size: 14, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        api.rect(180, 296, 120, 6, C.panel);
        api.rect(180, 296, 120 * heat, 6, hot ? C.accent2 : C.accent);
        api.text('HEAT', 240, 312, { size: 9, color: C.dim, align: 'center' });
        api.text('last burst ' + lastBurst, 240, 330, { size: 11, color: C.dim, align: 'center' });
        api.text('best burst ' + bestBurst, 240, 346, { size: 11, color: C.dim, align: 'center' });
      },

      dispose() {
        offPointer();
        offKey();
      },
    };
  },
});
