defineGame({
  id: 'whack',
  create(api) {
    const C = api.colors;
    const LIVES = 1300;
    const holes = [];
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        holes.push({ x: 90 + c * 150, y: 118 + r * 86, mole: false, rise: 0, until: 0, squash: 0, pop: 0 });
      }
    }
    let clock = 0;
    let cur = -1;
    let nextAt = 320;
    let hits = 0;
    let misses = 0;
    let escaped = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    let px = 240;
    let py = 180;
    let pointerIn = false;
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 90) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: api.rnd(0.32, 0.72), max: 0.72, r: api.rnd(1.5, 3.6), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 8) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function pop() {
      const pool = [];
      for (let i = 0; i < holes.length; i += 1) if (i !== cur) pool.push(i);
      cur = pool.length ? api.pick(pool) : 0;
      const h = holes[cur];
      h.mole = true;
      h.rise = 0;
      h.squash = 0;
      h.until = clock + LIVES;
    }

    function hide(h, kind) {
      h.mole = false;
      h.rise = 0;
      if (kind === 'hit') h.pop = 1;
      if (cur >= 0 && holes[cur] === h) cur = -1;
      nextAt = clock + (kind === 'hit' ? 140 : 300);
    }

    function whack(x, y) {
      let best2 = -1;
      let bd = 1e9;
      for (let i = 0; i < holes.length; i += 1) {
        const dx = x - holes[i].x;
        const dy = y - holes[i].y;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best2 = i; }
      }
      if (best2 < 0 || bd > 68 * 68) {
        burst(x, y, 'rgba(143,160,180,0.5)', 4, 70);
        return;
      }
      const h = holes[best2];
      if (h.mole && h.rise > 0.15) {
        hits += 1;
        combo += 1;
        comboT = 1.5;
        if (combo > best) best = combo;
        api.progress(1);
        api.score(15 * (1 + Math.floor(combo / 3)));
        h.squash = 1;
        flash = 1;
        flashColor = C.good;
        burst(h.x, h.y - 22, C.accent2, 16, 230);
        burst(h.x, h.y - 22, C.good, 6, 150);
        label(combo >= 4 ? 'COMBO ' + combo : 'WHACK', h.x, h.y - 56, combo >= 4 ? C.accent2 : C.good);
        hide(h, 'hit');
      } else {
        misses += 1;
        combo = 0;
        comboT = 0;
        shake = 1;
        flash = 1;
        flashColor = C.warn;
        burst(h.x, h.y, 'rgba(143,160,180,0.55)', 5, 90);
        label('MISS', h.x, h.y - 46, C.warn);
      }
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'move' || ev.type === 'down') {
        px = ev.x;
        py = ev.y;
        pointerIn = true;
      }
      if (ev.type === 'down') whack(ev.x, ev.y);
      if (ev.type === 'up') pointerIn = false;
    });
    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      if (key === 'space' || key === 'enter') whack(px, py);
    });

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        shake = Math.max(0, shake - dt * 4);
        flash = Math.max(0, flash - dt * 2.8);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        for (let i = holes.length - 1; i >= 0; i -= 1) {
          const h = holes[i];
          if (h.pop > 0) h.pop = Math.max(0, h.pop - dt * 2.2);
          if (h.squash > 0) h.squash = Math.max(0, h.squash - dt * 3.4);
          if (!h.mole) continue;
          h.rise = Math.min(1, h.rise + dt * 5.5);
          if (clock >= h.until) {
            if (h.rise > 0.6) {
              escaped += 1;
              combo = 0;
              comboT = 0;
              label('ESCAPED', h.x, h.y - 52, C.dim);
            }
            hide(h, 'down');
          }
        }
        if (cur < 0 && clock >= nextAt) pop();
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.t -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.93;
          p.vy = p.vy * 0.93 + 320 * dt;
          if (p.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 24;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 900);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.04 * k).toFixed(3) + ')');
        api.rect(0, 250, 480, 110, 'rgba(139,220,122,' + (0.01 + 0.03 * k).toFixed(3) + ')');
        const sx = shake > 0 ? Math.sin(clock * 0.19) * shake * 6 : 0;
        const sy = shake > 0 ? Math.cos(clock * 0.16) * shake * 4 : 0;

        for (let i = 0; i < holes.length; i += 1) {
          const h = holes[i];
          api.circle(h.x + sx, h.y + 16 + sy, 38, C.panel);
          api.circle(h.x + sx, h.y + 10 + sy, 31, 'rgba(0,0,0,0.6)');
          if (h.mole) {
            const ease = 1 - (1 - h.rise) * (1 - h.rise);
            const lift = 40 * ease;
            const my = h.y + 8 + sy - lift;
            const squash = 1 + h.squash * 0.28;
            api.circle(h.x + sx, my, 24 * squash, C.accent2);
            api.circle(h.x + sx - 9, my - 7, 7, C.accent2);
            api.circle(h.x + sx + 9, my - 7, 7, C.accent2);
            api.circle(h.x + sx - 8, my - 6, 4, C.bg);
            api.circle(h.x + sx + 8, my - 6, 4, C.bg);
            api.circle(h.x + sx, my + 8, 5, C.warn);
            if (h.squash > 0) api.circle(h.x + sx, my, 24 + 26 * (1 - h.squash), 'rgba(139,220,122,0.22)');
          }
          if (h.pop > 0) api.circle(h.x + sx, h.y + sy, 28 + 22 * (1 - h.pop), 'rgba(255,207,92,0.28)');
        }

        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          api.circle(p.x + sx, p.y + sy, p.r * (0.5 + p.t / p.max), p.t > 0.25 ? p.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x + sx, f.y + sy, { size: 13, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        if (pointerIn) {
          api.circle(px, py, 13, 'rgba(255,255,255,0.10)');
          api.circle(px, py, 5, C.fg);
        }
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 24, { size: 17, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(182, 36, 116 * Math.max(0, comboT / 1.5), 4, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(hits), 34, 40, { size: 26, color: C.accent2, weight: 'bold' });
        api.text('WHACKED', 34, 60, { size: 10, color: C.dim });
        api.text('MISS ' + misses + '  GONE ' + escaped, 446, 40, { size: 12, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 446, 58, { size: 11, color: C.dim, align: 'right' });
        if (flash > 0) api.rect(0, 356, 480, 4, flashColor);
      },

      dispose() {
        offPointer();
        offKey();
      },
    };
  },
});
