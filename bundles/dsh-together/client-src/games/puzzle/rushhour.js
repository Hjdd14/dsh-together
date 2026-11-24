defineGame({
  id: 'rushhour',
  create(api) {
    const C = api.colors;
    const N = 6;
    const CELL = 52;
    const OX = 84;
    const OY = 32;
    const cars = [
      { r: 2, c: 0, len: 2, dir: 'h', red: 1 },
      { r: 0, c: 1, len: 2, dir: 'h', red: 0 },
      { r: 1, c: 2, len: 2, dir: 'v', red: 0 },
      { r: 2, c: 3, len: 2, dir: 'v', red: 0 },
      { r: 2, c: 4, len: 2, dir: 'v', red: 0 },
      { r: 5, c: 3, len: 3, dir: 'h', red: 0 },
    ];
    const COLOURS = ['255,207,92', '120,220,220', '185,140,255', '139,220,122', '255,170,90', '143,160,180'];
    let sel = -1;
    let hover = -1;
    let shake = 0;
    let moves = 0;
    let anim = null;
    let exit = null;
    let done = false;
    const fx = [];
    const rings = [];
    const notes = [];
    const pops = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function carAt(r, c) {
      for (let i = 0; i < cars.length; i += 1) {
        const k = cars[i];
        if (k.dir === 'h') {
          if (r === k.r && c >= k.c && c < k.c + k.len) return i;
        } else if (c === k.c && r >= k.r && r < k.r + k.len) return i;
      }
      return -1;
    }
    function blocked(r, c, skip) {
      if (r < 0 || c < 0 || r >= N || c >= N) return true;
      const hit = carAt(r, c);
      return hit >= 0 && hit !== skip;
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 80) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-110, 110), vy: api.rnd(-130, 40),
          born: api.now(), life: api.rnd(240, 480), rgb: rgb, r: api.rnd(1.8, 4),
        });
      }
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 800 });
    }
    function slide(i, dir) {
      const k = cars[i];
      if (!k || done) return;
      let steps = 0;
      if (k.dir === 'h') {
        if (dir !== 'left' && dir !== 'right') return;
        const s = dir === 'right' ? 1 : -1;
        while (steps < 6) {
          const nc = s > 0 ? k.c + k.len + steps : k.c - 1 - steps;
          if (blocked(k.r, nc, i)) break;
          steps += 1;
        }
        if (!steps) {
          shake = Math.min(1, shake + 0.5);
          note('BLOCKED', '255,122,122');
          return;
        }
        anim = { i: i, r0: k.r, c0: k.c, r1: k.r, c1: k.c + s * steps, born: api.now(), life: 170 };
        k.c += s * steps;
      } else {
        if (dir !== 'up' && dir !== 'down') return;
        const s = dir === 'down' ? 1 : -1;
        while (steps < 6) {
          const nr = s > 0 ? k.r + k.len + steps : k.r - 1 - steps;
          if (blocked(nr, k.c, i)) break;
          steps += 1;
        }
        if (!steps) {
          shake = Math.min(1, shake + 0.5);
          note('BLOCKED', '255,122,122');
          return;
        }
        anim = { i: i, r0: k.r, c0: k.c, r1: k.r + s * steps, c1: k.c, born: api.now(), life: 170 };
        k.r += s * steps;
      }
      moves += 1;
      if (pops.length > 20) pops.shift();
      pops.push({ key: i, born: api.now(), life: 200 });
      burst(OX + (k.c + k.len / 2) * CELL, OY + (k.r + k.len / 2) * CELL, k.red ? '255,122,122' : COLOURS[i], 5);
      if (k.red && k.c + k.len >= N) {
        exit = { i: i, born: api.now(), life: 520, c0: k.c };
        note('OUT!', '139,220,122');
      }
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 1 + 0.12 * Math.sin(Math.PI * k));
      }
      return s;
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const c = Math.floor((p.x - OX) / CELL);
        const r = Math.floor((p.y - OY) / CELL);
        hover = carAt(r, c);
        return;
      }
      if (p.type !== 'down') return;
      const c = Math.floor((p.x - OX) / CELL);
      const r = Math.floor((p.y - OY) / CELL);
      const hit = carAt(r, c);
      if (hit >= 0) {
        sel = hit;
        return;
      }
      if (sel < 0) return;
      const k = cars[sel];
      if (k.dir === 'h' && r === k.r) slide(sel, c > k.c ? 'right' : 'left');
      else if (k.dir === 'v' && c === k.c) slide(sel, r > k.r ? 'down' : 'up');
      else {
        sel = -1;
        shake = Math.min(1, shake + 0.25);
      }
    });

    api.onKey((key, isDown) => {
      if (!isDown || sel < 0) return;
      slide(sel, key);
    });

    return {
      update(dt) {
        const now = api.now();
        for (let i = fx.length - 1; i >= 0; i -= 1) {
          const p = fx[i];
          if (now - p.born >= p.life) {
            fx.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 230 * dt;
        }
        for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].born >= rings[i].life) rings.splice(i, 1);
        for (let i = pops.length - 1; i >= 0; i -= 1) if (now - pops[i].born >= pops[i].life) pops.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
        if (anim && now - anim.born >= anim.life) anim = null;
        if (exit && !done && now - exit.born >= exit.life) {
          done = true;
          api.progress(1);
          if (rings.length > 20) rings.shift();
          rings.push({ x: 480, y: OY + 2.5 * CELL, born: api.now(), life: 500 });
          note('SOLVED', '139,220,122');
        }
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(255,122,122,' + (0.01 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1200))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 18) * amp, Math.cos(now / 25) * amp * 0.6);
        }
        api.text('moves ' + moves, 240, 20, { size: 13, color: C.dim, align: 'center' });
        api.rect(OX - 6, OY - 6, N * CELL + 12, N * CELL + 12, C.panel);
        for (let y = 0; y < N; y += 1) {
          for (let x = 0; x < N; x += 1) {
            api.rect(OX + x * CELL + 1, OY + y * CELL + 1, CELL - 2, CELL - 2, 'rgba(255,255,255,0.035)');
          }
        }
        api.rect(OX + N * CELL, OY + 2 * CELL + 8, 10, CELL - 16, 'rgba(139,220,122,0.5)');
        api.text('>', OX + N * CELL + 22, OY + 2.5 * CELL, { size: 16, color: C.good, align: 'center' });
        for (let i = 0; i < cars.length; i += 1) {
          const k = cars[i];
          let r = k.r;
          let c = k.c;
          if (anim && anim.i === i) {
            const t = Math.min(1, (now - anim.born) / anim.life);
            const e = 1 - (1 - t) * (1 - t);
            r = anim.r0 + (anim.r1 - anim.r0) * e;
            c = anim.c0 + (anim.c1 - anim.c0) * e;
          }
          if (exit && exit.i === i) {
            const t = Math.min(1, (now - exit.born) / exit.life);
            c = exit.c0 + t * 3;
          }
          const s = scaleFor(i, now);
          const w = (k.dir === 'h' ? k.len : 1) * CELL * s;
          const h = (k.dir === 'v' ? k.len : 1) * CELL * s;
          const px = OX + c * CELL + (k.dir === 'h' ? (k.len * CELL - w) / 2 : (CELL - w) / 2);
          const py = OY + r * CELL + (k.dir === 'v' ? (k.len * CELL - h) / 2 : (CELL - h) / 2);
          const rgb = k.red ? '255,122,122' : COLOURS[i];
          api.rect(px + 4, py + 4, w - 8, h - 8, rgba(rgb, k.red ? 0.95 : 0.78));
          api.rect(px + 4, py + 4, w - 8, 4, 'rgba(255,255,255,0.28)');
          if (k.red) api.circle(OX + c * CELL + CELL, py + CELL / 2, 6, 'rgba(255,255,255,0.8)');
          if (i === sel) {
            api.rect(px + 2, py + 2, w - 4, 2, C.fg);
            api.rect(px + 2, py + h - 4, w - 4, 2, C.fg);
            api.rect(px + 2, py + 2, 2, h - 4, C.fg);
            api.rect(px + w - 4, py + 2, 2, h - 4, C.fg);
          }
          if (i === hover && i !== sel) api.rect(px + 4, py + 4, w - 8, h - 8, 'rgba(232,238,246,0.14)');
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CELL * (0.4 + 1.2 * k), rgba('139,220,122', 0.3 * (1 - k)));
        }
        for (let i = 0; i < fx.length; i += 1) {
          const p = fx[i];
          const k = 1 - (now - p.born) / p.life;
          if (k <= 0) continue;
          api.circle(p.x, p.y, p.r * k + 0.6, rgba(p.rgb, k * 0.85));
        }
        for (let i = 0; i < notes.length; i += 1) {
          const t = notes[i];
          const k = (now - t.born) / t.life;
          if (k >= 1) continue;
          api.text(t.text, 240, 170 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('click a car, then click its lane / arrows', 240, 350, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
