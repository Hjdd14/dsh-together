defineGame({
  id: 'zigzag',
  create(api) {
    const C = api.colors;
    const SEG = 78;
    const SX = 45;
    const SY = 64;
    const SPEED = 118;
    const WINDOW = 40;
    const GRACE = 6;
    const verts = [{ x: 0, y: 214, d: 1 }];
    let base = 0;
    let clock = 0;
    let p = 0;
    let turned = 0;
    let turns = 0;
    let combo = 0;
    let best = 0;
    let comboT = 0;
    let falling = false;
    let fallX = 0;
    let fallY = 0;
    let fallVX = 0;
    let fallVY = 0;
    let fallT = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    let pulse = 0;
    const parts = [];
    const floats = [];

    function grow(need) {
      while (verts.length <= need + 12) {
        const last = verts[verts.length - 1];
        const d = -last.d;
        verts.push({ x: last.x + SX, y: last.y + SY * d, d: d });
      }
    }
    grow(0);

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 70) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.28, 0.62), max: 0.62, r: api.rnd(1.5, 3.3), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 6) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.8, c: color });
    }

    function here() {
      const segG = Math.floor(p / SEG);
      const local = Math.max(0, Math.min(verts.length - 2, segG - base));
      const f = Math.max(0, Math.min(1, p / SEG - segG));
      const a = verts[local];
      const b = verts[local + 1];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, local: local, dir: a.d };
    }

    function detach(why) {
      const pos = here();
      falling = true;
      fallX = pos.x;
      fallY = pos.y;
      fallVX = (SX / SEG) * SPEED;
      fallVY = (SY / SEG) * SPEED * pos.dir;
      fallT = 0;
      shake = 1;
      flash = 1;
      flashColor = C.warn;
      label(why, pos.x, pos.y - 30, C.warn);
      burst(pos.x, pos.y, 'rgba(255,122,122,0.6)', 8, 150);
      api.setStatus(why.toLowerCase());
    }

    function press(dir) {
      if (falling) return;
      const segG = Math.floor(p / SEG);
      const vertexG = segG + 1;
      const dist = vertexG * SEG - p;
      if (dist > WINDOW || dist < -GRACE) return;
      if (vertexG <= turned) return;
      const want = -here().dir;
      if (dir !== want) {
        detach('WRONG TURN');
        return;
      }
      turned = vertexG;
      turns += 1;
      combo += 1;
      comboT = 1.4;
      if (combo > best) best = combo;
      pulse = 1;
      flash = 1;
      flashColor = C.good;
      const pos = here();
      burst(pos.x, pos.y, C.accent2, 8, 140);
      if (combo % 5 === 0) label('COMBO x' + combo, pos.x, pos.y - 34, C.accent2);
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      if (key === 'left' || key === 'up') press(-1);
      else if (key === 'right' || key === 'down') press(1);
    });
    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'down') press(ev.x < 240 ? -1 : 1);
    });

    return {
      update(dt) {
        if (!(dt > 0)) return;
        if (dt > 0.06) dt = 0.06;
        clock += dt * 1000;
        pulse = Math.max(0, pulse - dt * 3.6);
        shake = Math.max(0, shake - dt * 4);
        flash = Math.max(0, flash - dt * 2.8);
        comboT = Math.max(0, comboT - dt);
        if (comboT <= 0) combo = 0;
        if (falling) {
          fallT += dt;
          fallVY += 900 * dt;
          fallX += fallVX * dt;
          fallY += fallVY * dt;
          if (fallT > 0.45) api.lose('off the line');
        } else {
          p += SPEED * dt;
          if (p > (turned + 1) * SEG + GRACE) {
            detach('OFF THE LINE');
          } else {
            const segG = Math.floor(p / SEG);
            const local = segG - base;
            grow(local);
            if (local > 3) {
              const drop = local - 3;
              verts.splice(0, drop);
              base += drop;
            }
            api.setStatus('bends ' + turns);
          }
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const q = parts[i];
          q.t -= dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.vy += 260 * dt;
          if (q.t <= 0) parts.splice(i, 1);
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
        const pos = falling ? { x: fallX, y: fallY, local: 0, dir: 1 } : here();
        const camX = pos.x - 172;
        const camY = pos.y - 176;
        const sx = shake > 0 ? Math.sin(clock * 0.26) * shake * 6 : 0;

        for (let i = 0; i < verts.length - 1; i += 1) {
          const a = verts[i];
          const b = verts[i + 1];
          const segEnd = (base + i + 1) * SEG;
          for (let s = 0; s < 13; s += 1) {
            const f = s / 12;
            const x = a.x + (b.x - a.x) * f - camX + sx;
            const y = a.y + (b.y - a.y) * f - camY;
            if (x < -24 || x > 504) continue;
            const passed = segEnd - SEG * (1 - f) < p;
            api.circle(x, y, 9, passed ? C.panel : 'rgba(143,160,180,0.55)');
            api.circle(x, y, 4, passed ? 'rgba(106,169,255,0.5)' : C.dim);
          }
        }

        if (!falling) {
          const segG = Math.floor(p / SEG);
          const vertexP = (segG + 1) * SEG;
          const dist = vertexP - p;
          const local = Math.max(0, Math.min(verts.length - 2, segG - base));
          if (dist <= WINDOW && dist >= -GRACE && segG + 1 > turned) {
            const b = verts[local + 1];
            const want = -verts[local].d;
            const vx = b.x - camX + sx;
            const vy = b.y - camY;
            const open = 1 - Math.max(0, dist) / WINDOW;
            api.circle(vx, vy, 20 + 9 * open, 'rgba(255,207,92,' + (0.12 + 0.24 * open).toFixed(2) + ')');
            api.text(want < 0 ? '<' : '>', vx, vy, { size: 20, color: C.accent2, align: 'center', weight: 'bold' });
          }
        }

        const bx = pos.x - camX + sx;
        const by = pos.y - camY;
        api.circle(bx, by, 15 + pulse * 5, 'rgba(139,220,122,0.16)');
        api.circle(bx, by, 10, falling ? C.warn : C.fg);
        api.circle(bx - 3, by - 3, 3, 'rgba(255,255,255,0.7)');

        for (let i = 0; i < parts.length; i += 1) {
          const q = parts[i];
          api.circle(q.x - camX + sx, q.y - camY, q.r * (0.5 + q.t / q.max), q.t > 0.25 ? q.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x - camX + sx, f.y - camY, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        api.text('tap the arrow at every bend', 240, 20, { size: 11, color: C.dim, align: 'center' });
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 42, { size: 14, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(198, 53, 84 * Math.max(0, comboT / 1.4), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(turns), 30, 320, { size: 20, color: C.good, weight: 'bold' });
        api.text('BENDS', 30, 338, { size: 9, color: C.dim });
        api.text('BEST x' + best, 450, 320, { size: 11, color: C.dim, align: 'right' });
        api.text('LEFT = rise    RIGHT = dive', 240, 348, { size: 10, color: C.dim, align: 'center' });
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
        if (pulse > 0) api.circle(bx, by, 20 + pulse * 12, 'rgba(255,207,92,0.14)');
      },

      dispose() {
        offKey();
        offPointer();
      },
    };
  },
});
