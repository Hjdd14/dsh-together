defineGame({
  id: 'unblock',
  create(api) {
    const C = api.colors;
    const N = 5;
    const CELL = 58;
    const OX = 95;
    const OY = 44;
    const blocks = [
      { r: 2, c: 0, w: 2, h: 1, target: 1 },
      { r: 2, c: 2, w: 1, h: 2, target: 0 },
      { r: 2, c: 3, w: 1, h: 2, target: 0 },
      { r: 1, c: 4, w: 1, h: 2, target: 0 },
      { r: 0, c: 3, w: 2, h: 1, target: 0 },
      { r: 4, c: 0, w: 2, h: 1, target: 0 },
    ];
    const COLOURS = ['139,220,122', '255,207,92', '185,140,255', '120,220,220', '143,160,180', '255,170,90'];
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
    function covers(b, r, c) {
      return r >= b.r && r < b.r + b.h && c >= b.c && c < b.c + b.w;
    }
    function blockAt(r, c) {
      for (let i = 0; i < blocks.length; i += 1) if (covers(blocks[i], r, c)) return i;
      return -1;
    }
    function clearCell(r, c, skip) {
      if (r < 0 || c < 0 || r >= N || c >= N) return false;
      const hit = blockAt(r, c);
      return hit < 0 || hit === skip;
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 70) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-100, 100), vy: api.rnd(-120, 30),
          born: api.now(), life: api.rnd(240, 460), rgb: rgb, r: api.rnd(1.8, 3.8),
        });
      }
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 780 });
    }
    function step(i, dir) {
      const b = blocks[i];
      if (!b || done) return;
      const horiz = b.w > b.h;
      let dr = 0;
      let dc = 0;
      if (horiz) {
        if (dir === 'left') dc = -1;
        else if (dir === 'right') dc = 1;
        else return;
      } else {
        if (dir === 'up') dr = -1;
        else if (dir === 'down') dr = 1;
        else return;
      }
      const ok = horiz
        ? clearCell(b.r, dc > 0 ? b.c + b.w : b.c - 1, i)
        : clearCell(dr > 0 ? b.r + b.h : b.r - 1, b.c, i);
      if (!ok) {
        shake = Math.min(1, shake + 0.5);
        note('BLOCKED', '255,122,122');
        return;
      }
      anim = { i: i, r0: b.r, c0: b.c, r1: b.r + dr, c1: b.c + dc, born: api.now(), life: 150 };
      b.r += dr;
      b.c += dc;
      moves += 1;
      if (pops.length > 20) pops.shift();
      pops.push({ key: i, born: api.now(), life: 190 });
      burst(OX + (b.c + b.w / 2) * CELL, OY + (b.r + b.h / 2) * CELL, b.target ? '139,220,122' : COLOURS[i], 4);
      if (b.target && b.c + b.w >= N) {
        exit = { i: i, born: api.now(), life: 480, c0: b.c };
        note('FREE!', '139,220,122');
      }
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 1 + 0.1 * Math.sin(Math.PI * k));
      }
      return s;
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const c = Math.floor((p.x - OX) / CELL);
        const r = Math.floor((p.y - OY) / CELL);
        hover = blockAt(r, c);
        return;
      }
      if (p.type !== 'down') return;
      const c = Math.floor((p.x - OX) / CELL);
      const r = Math.floor((p.y - OY) / CELL);
      const hit = blockAt(r, c);
      if (hit >= 0) {
        sel = hit;
        return;
      }
      if (sel < 0) return;
      const b = blocks[sel];
      const horiz = b.w > b.h;
      if (horiz && r === b.r) step(sel, c > b.c ? 'right' : 'left');
      else if (!horiz && c === b.c) step(sel, r > b.r ? 'down' : 'up');
      else {
        sel = -1;
        shake = Math.min(1, shake + 0.25);
      }
    });

    api.onKey((key, isDown) => {
      if (!isDown || sel < 0) return;
      step(sel, key);
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
          p.vy += 220 * dt;
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
          rings.push({ x: 480, y: OY + 2.5 * CELL, born: api.now(), life: 520 });
          note('SOLVED', '139,220,122');
        }
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(139,220,122,' + (0.01 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1150))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 17) * amp, Math.cos(now / 24) * amp * 0.6);
        }
        api.text('moves ' + moves, 240, 22, { size: 13, color: C.dim, align: 'center' });
        api.rect(OX - 6, OY - 6, N * CELL + 12, N * CELL + 12, C.panel);
        for (let y = 0; y < N; y += 1) {
          for (let x = 0; x < N; x += 1) {
            api.rect(OX + x * CELL + 1, OY + y * CELL + 1, CELL - 2, CELL - 2, 'rgba(255,255,255,0.035)');
          }
        }
        api.rect(OX + N * CELL, OY + 2 * CELL + 10, 10, CELL - 20, 'rgba(139,220,122,0.55)');
        api.text('>', OX + N * CELL + 22, OY + 2.5 * CELL, { size: 16, color: C.good, align: 'center' });
        for (let i = 0; i < blocks.length; i += 1) {
          const b = blocks[i];
          let r = b.r;
          let c = b.c;
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
          const w = b.w * CELL * s;
          const h = b.h * CELL * s;
          const px = OX + c * CELL + (b.w * CELL - w) / 2;
          const py = OY + r * CELL + (b.h * CELL - h) / 2;
          const rgb = b.target ? '106,169,255' : COLOURS[i];
          api.rect(px + 5, py + 5, w - 10, h - 10, rgba(rgb, b.target ? 0.95 : 0.72));
          api.rect(px + 5, py + 5, w - 10, 4, 'rgba(255,255,255,0.3)');
          api.rect(px + 5, py + h - 9, w - 10, 4, 'rgba(0,0,0,0.3)');
          if (b.target) api.text('GO', px + w / 2, py + h / 2, { size: 15, color: C.bg, align: 'center', weight: 'bold' });
          if (i === sel) {
            api.rect(px + 2, py + 2, w - 4, 2, C.fg);
            api.rect(px + 2, py + h - 4, w - 4, 2, C.fg);
            api.rect(px + 2, py + 2, 2, h - 4, C.fg);
            api.rect(px + w - 4, py + 2, 2, h - 4, C.fg);
          }
          if (i === hover && i !== sel) api.rect(px + 5, py + 5, w - 10, h - 10, 'rgba(232,238,246,0.14)');
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
          api.text(t.text, 240, 168 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('one step per click · free the GO block', 240, 350, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
