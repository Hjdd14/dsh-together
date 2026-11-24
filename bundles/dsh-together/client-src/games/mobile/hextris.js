defineGame({
  id: 'hextris',
  create(api) {
    const C = api.colors;
    const CX = 240;
    const CY = 196;
    const OUT = 172;
    const IN = 46;
    const PARK = 60;
    const SPEED = 78;
    const COLORS = [C.warn, C.good, C.accent];
    const ANG = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
    let clock = 0;
    let recv = [0, 1, 2];
    let spin = 0;
    let spinTo = 0;
    let spawnAt = 1200;
    let gap = 1500;
    let scored = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let clears = 0;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    const blocks = [];
    const parked = [];
    const stack = [0, 0, 0];
    const parts = [];
    const floats = [];

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.3, 0.7), max: 0.7, r: api.rnd(1.5, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 7) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function spawn() {
      const s = api.irnd(0, 2);
      blocks.push({ s: s, r: OUT, c: api.irnd(0, 2), pop: 0 });
    }

    function rotate(dir) {
      if (dir > 0) recv = [recv[2], recv[0], recv[1]];
      else recv = [recv[1], recv[2], recv[0]];
      spinTo += dir * (Math.PI / 3);
      pulse = Math.max(pulse, 0.6);
    }

    function clearBlock(b) {
      const a = ANG[b.s] + spin;
      const px = CX + Math.cos(a) * IN;
      const py = CY + Math.sin(a) * IN;
      clears += 1;
      combo += 1;
      comboT = 1.6;
      if (combo > best) best = combo;
      const add = 40 + Math.min(combo, 3) * 10;
      scored += add;
      api.score(add);
      pulse = 1;
      flash = 1;
      flashColor = C.good;
      burst(px, py, COLORS[b.c], 12, 190);
      label('+' + add, px, py - 18, C.good);
    }

    function park(b) {
      stack[b.s] += 1;
      parked.push({ s: b.s, r: PARK + stack[b.s] * 17, c: b.c, pop: 1 });
      shake = Math.min(1, shake + 0.6);
      combo = 0;
      comboT = 0;
      label('STUCK', CX, CY - OUT - 6, C.warn);
      if (stack[b.s] >= 3) {
        flash = 1;
        flashColor = C.warn;
        api.lose('the edge filled up');
      }
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      if (key === 'left') rotate(-1);
      else if (key === 'right') rotate(1);
    });
    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'down') rotate(ev.x < 240 ? -1 : 1);
    });

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pulse = Math.max(0, pulse - dt * 3.4);
        shake = Math.max(0, shake - dt * 4);
        flash = Math.max(0, flash - dt * 2.8);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        spin += (spinTo - spin) * Math.min(1, dt * 12);
        for (let i = 0; i < parked.length; i += 1) {
          if (parked[i].pop > 0) parked[i].pop = Math.max(0, parked[i].pop - dt * 2);
        }
        if (clock >= spawnAt && blocks.length < 4) {
          spawn();
          gap = Math.max(880, 1500 - clears * 60);
          spawnAt = clock + gap;
        }
        for (let i = blocks.length - 1; i >= 0; i -= 1) {
          const b = blocks[i];
          if (b.pop < 1) b.pop = Math.min(1, b.pop + dt * 5);
          b.r -= SPEED * dt;
          if (b.r > IN) continue;
          blocks.splice(i, 1);
          if (stack[b.s] === 0 && recv[b.s] === b.c) clearBlock(b);
          else park(b);
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const q = parts[i];
          q.t -= dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.vx *= 0.92;
          q.vy = q.vy * 0.92 + 150 * dt;
          if (q.t <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 22;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 860);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        const sx = shake > 0 ? Math.sin(clock * 0.24) * shake * 5 : 0;
        const cx = CX + sx;
        const cy = CY;

        for (let s = 0; s < 3; s += 1) {
          const a = ANG[s] + spin;
          for (let i = 1; i <= 9; i += 1) {
            const r = IN + ((OUT - IN) * i) / 9;
            api.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.6, 'rgba(143,160,180,0.28)');
          }
        }
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * 6.2832 + Math.PI / 6 + spin;
          api.circle(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34, 9, C.panel);
          api.circle(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34, 5, 'rgba(0,0,0,0.4)');
        }
        for (let s = 0; s < 3; s += 1) {
          const a = ANG[s] + spin;
          const rx = cx + Math.cos(a) * IN;
          const ry = cy + Math.sin(a) * IN;
          api.circle(rx, ry, 15 + pulse * 4, COLORS[recv[s]]);
          api.circle(rx, ry, 6, 'rgba(0,0,0,0.35)');
          if (stack[s] > 0) {
            api.text(String(stack[s]) + '/3', rx, ry + 26, { size: 10, color: C.warn, align: 'center', weight: 'bold' });
          }
        }
        api.circle(cx, cy, 22, C.panel);
        api.circle(cx, cy, 14 + scored / 40, 'rgba(106,169,255,0.25)');
        api.text(String(scored), cx, cy, { size: 14, color: C.fg, align: 'center', weight: 'bold' });

        for (let i = 0; i < parked.length; i += 1) {
          const b = parked[i];
          const a = ANG[b.s] + spin;
          const px = cx + Math.cos(a) * b.r;
          const py = cy + Math.sin(a) * b.r;
          api.circle(px, py, 11 + b.pop * 3, COLORS[b.c]);
          api.circle(px, py, 4, 'rgba(0,0,0,0.4)');
        }
        for (let i = 0; i < blocks.length; i += 1) {
          const b = blocks[i];
          const a = ANG[b.s] + spin;
          const px = cx + Math.cos(a) * b.r;
          const py = cy + Math.sin(a) * b.r;
          api.circle(px, py, 12 * (0.4 + 0.6 * b.pop), COLORS[b.c]);
          api.circle(px, py, 5, 'rgba(255,255,255,0.35)');
        }

        for (let i = 0; i < parts.length; i += 1) {
          const q = parts[i];
          api.circle(q.x, q.y, q.r * (0.5 + q.t / q.max), q.t > 0.25 ? q.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x, f.y, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        api.text('LEFT / RIGHT rotate the hexagon', 240, 22, { size: 11, color: C.dim, align: 'center' });
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 44, { size: 14, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(198, 55, 84 * Math.max(0, comboT / 1.6), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(scored), 30, 320, { size: 20, color: C.good, weight: 'bold' });
        api.text('SCORE', 30, 338, { size: 9, color: C.dim });
        api.text('CLEARS ' + clears, 450, 320, { size: 11, color: C.dim, align: 'right' });
        api.text('BEST x' + best, 450, 338, { size: 10, color: C.dim, align: 'right' });
        api.text('match the block to the rim colour', 240, 348, { size: 10, color: C.dim, align: 'center' });
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
      },

      dispose() {
        offKey();
        offPointer();
      },
    };
  },
});
