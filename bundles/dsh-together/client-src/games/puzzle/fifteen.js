defineGame({
  id: 'fifteen',
  create(api) {
    const C = api.colors;
    const COLS = 4;
    const ROWS = 2;
    const CELL = 100;
    const GAP = 8;
    const STEP = CELL + GAP;
    const OX = 28;
    const OY = 66;
    const slots = [];
    const credited = [];
    for (let i = 0; i < COLS * ROWS; i += 1) {
      slots.push(i < 6 ? i + 1 : 0);
      credited.push(0);
    }

    const fx = [];
    const pops = [];
    const rings = [];
    const notes = [];
    let shake = 0;
    let hover = -1;
    let anim = null;

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function rectOf(slot) {
      const x = slot % COLS;
      const y = (slot - x) / COLS;
      return { x: OX + x * STEP, y: OY + y * STEP };
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 60) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-90, 90), vy: api.rnd(-120, 20),
          born: api.now(), life: api.rnd(250, 460), rgb: rgb, r: api.rnd(2, 4),
        });
      }
    }
    function pop(slot) {
      if (pops.length > 24) pops.shift();
      pops.push({ key: slot, born: api.now(), life: 190 });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }
    function scaleFor(slot, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== slot) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 0.82 + 0.18 * (1 - (1 - k) * (1 - k)));
      }
      return s;
    }

    function around(slot) {
      const x = slot % COLS;
      const y = (slot - x) / COLS;
      const out = [];
      if (x > 0) out.push(slot - 1);
      if (x < COLS - 1) out.push(slot + 1);
      if (y > 0) out.push(slot - COLS);
      if (y < ROWS - 1) out.push(slot + COLS);
      return out;
    }
    function blanks() {
      const out = [];
      for (let i = 0; i < slots.length; i += 1) if (slots[i] === 0) out.push(i);
      return out;
    }
    function shuffleSteps(count) {
      for (let step = 0; step < count; step += 1) {
        const hole = api.pick(blanks());
        const near = around(hole).filter((s) => slots[s] !== 0);
        if (near.length === 0) continue;
        const from = api.pick(near);
        slots[hole] = slots[from];
        slots[from] = 0;
      }
    }
    function allHome() {
      for (let i = 0; i < 6; i += 1) if (slots[i] !== i + 1) return false;
      return true;
    }

    shuffleSteps(26);
    if (allHome()) shuffleSteps(7);

    api.onPointer((p) => {
      if (p.type === 'move') {
        const gx = Math.floor((p.x - OX) / STEP);
        const gy = Math.floor((p.y - OY) / STEP);
        const inX = p.x - OX - gx * STEP;
        const inY = p.y - OY - gy * STEP;
        hover = gx >= 0 && gy >= 0 && gx < COLS && gy < ROWS && inX <= CELL && inY <= CELL ? gy * COLS + gx : -1;
        return;
      }
      if (p.type !== 'down') return;
      const gx = Math.floor((p.x - OX) / STEP);
      const gy = Math.floor((p.y - OY) / STEP);
      if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return;
      if (p.x - OX - gx * STEP > CELL) return;
      if (p.y - OY - gy * STEP > CELL) return;
      const slot = gy * COLS + gx;
      const face = slots[slot];
      if (face === 0) return;
      const near = around(slot);
      let hole = -1;
      for (let i = 0; i < near.length; i += 1) if (slots[near[i]] === 0) hole = near[i];
      if (hole < 0) {
        shake = Math.min(1, shake + 0.35);
        note('NO GAP', '143,160,180');
        return;
      }
      slots[hole] = face;
      slots[slot] = 0;
      anim = { face: face, from: slot, to: hole, born: api.now(), life: 150 };
      pop(hole);
      if (face === hole + 1 && credited[face - 1] === 0) {
        credited[face - 1] = 1;
        api.progress(1);
        const r = rectOf(hole);
        burst(r.x + CELL / 2, r.y + CELL / 2, '139,220,122', 9);
        if (rings.length > 20) rings.shift();
        rings.push({ x: r.x + CELL / 2, y: r.y + CELL / 2, born: api.now(), life: 400 });
        note('HOME', '139,220,122');
      }
      if (allHome()) {
        for (let i = 0; i < 6; i += 1) {
          if (credited[i] === 0) {
            credited[i] = 1;
            api.progress(1);
          }
        }
        note('PERFECT', '255,207,92');
      }
    });

    api.onKey((key, isDown) => {
      if (!isDown || key !== 'space') return;
      for (let i = 0; i < COLS * ROWS; i += 1) slots[i] = i < 6 ? i + 1 : 0;
      shuffleSteps(26);
      anim = null;
      note('SHUFFLE', '143,160,180');
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
          p.vy += 240 * dt;
        }
        for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].born >= rings[i].life) rings.splice(i, 1);
        for (let i = pops.length - 1; i >= 0; i -= 1) if (now - pops[i].born >= pops[i].life) pops.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
        if (anim && now - anim.born >= anim.life) anim = null;
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.012 + 0.024 * (0.5 + 0.5 * Math.sin(now / 1150))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 20) * amp, 0);
        }
        let home = 0;
        for (let s = 0; s < 6; s += 1) if (credited[s]) home += 1;
        api.text('home ' + home + ' / 6', 240, 24, { size: 13, color: C.dim, align: 'center' });
        for (let y = 0; y < ROWS; y += 1) {
          for (let x = 0; x < COLS; x += 1) {
            const slot = y * COLS + x;
            const px = OX + x * STEP;
            const py = OY + y * STEP;
            const v = slots[slot];
            const hidden = anim && anim.to === slot;
            api.rect(px, py, CELL, CELL, v === 0 || hidden ? 'rgba(255,255,255,0.04)' : C.panel);
            if (slot === hover) api.rect(px + 2, py + 2, CELL - 4, CELL - 4, 'rgba(232,238,246,0.07)');
            if (v === 0 || hidden) continue;
            const s = scaleFor(slot, now);
            const w = CELL * s;
            const off = (CELL - w) / 2;
            const isHome = v === slot + 1;
            api.rect(px + off + 4, py + off + 4, w - 8, 4, isHome ? C.good : 'rgba(106,169,255,0.7)');
            api.text(String(v), px + CELL / 2, py + CELL / 2, {
              size: 40 * s,
              color: isHome ? C.good : C.fg,
              align: 'center',
              weight: 'bold',
            });
          }
        }
        if (anim) {
          const k = Math.min(1, (now - anim.born) / anim.life);
          const ease = 1 - (1 - k) * (1 - k);
          const a = rectOf(anim.from);
          const b = rectOf(anim.to);
          api.rect(a.x + (b.x - a.x) * ease, a.y + (b.y - a.y) * ease, CELL, CELL, C.panel);
          api.text(String(anim.face), a.x + (b.x - a.x) * ease + CELL / 2, a.y + (b.y - a.y) * ease + CELL / 2, {
            size: 40,
            color: anim.face === anim.to + 1 ? C.good : C.fg,
            align: 'center',
            weight: 'bold',
          });
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CELL * (0.25 + 0.55 * k), rgba('139,220,122', 0.32 * (1 - k)));
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
          api.text(t.text, 240, 152 - k * 12 - i * 20, { size: 22, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('slide a tile into a gap', 240, 352, { size: 11, color: C.dim, align: 'center' });
      },
    };
  },
});
