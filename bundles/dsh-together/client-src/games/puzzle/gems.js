defineGame({
  id: 'gems',
  create(api) {
    const C = api.colors;
    const COLS = 7;
    const ROWS = 7;
    const CELL = 44;
    const OX = 86;
    const OY = 18;
    const TYPE = ['rgba(106,169,255,1)', 'rgba(255,207,92,1)', 'rgba(139,220,122,1)', 'rgba(255,122,122,1)'];
    const RGB = ['106,169,255', '255,207,92', '139,220,122', '255,122,122'];
    const slot = [];
    for (let i = 0; i < COLS * ROWS; i += 1) slot.push(0);

    const fx = [];
    const pops = [];
    const rings = [];
    const notes = [];
    let shake = 0;
    let pick1 = -1;
    let hover = -1;
    let cleared = 0;

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function centre(i) {
      const x = i % COLS;
      const y = (i - x) / COLS;
      return { x: OX + x * CELL + CELL / 2, y: OY + y * CELL + CELL / 2 };
    }
    function sparkle(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 110) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-130, 130), vy: api.rnd(-150, 50),
          born: api.now(), life: api.rnd(240, 500), rgb: rgb, r: api.rnd(1.6, 4),
        });
      }
    }
    function pop(i, kind) {
      if (pops.length > 80) pops.shift();
      pops.push({ key: i, kind: kind, born: api.now(), life: kind === 'in' ? 170 : 200 });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 780 });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        if (pops[i].kind === 'in') s = Math.max(s, 0.5 + 0.5 * (1 - (1 - k) * (1 - k)));
        else s = Math.max(s, 1 + 0.3 * Math.sin(Math.PI * k));
      }
      return s;
    }

    function scan() {
      const hit = [];
      for (let i = 0; i < slot.length; i += 1) hit.push(0);
      let found = false;
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS - 2; x += 1) {
          const a = slot[y * COLS + x];
          if (a < 0) continue;
          if (a === slot[y * COLS + x + 1] && a === slot[y * COLS + x + 2]) {
            found = true;
            hit[y * COLS + x] = 1;
            hit[y * COLS + x + 1] = 1;
            hit[y * COLS + x + 2] = 1;
          }
        }
      }
      for (let x = 0; x < COLS; x += 1) {
        for (let y = 0; y < ROWS - 2; y += 1) {
          const a = slot[y * COLS + x];
          if (a < 0) continue;
          if (a === slot[(y + 1) * COLS + x] && a === slot[(y + 2) * COLS + x]) {
            found = true;
            hit[y * COLS + x] = 1;
            hit[(y + 1) * COLS + x] = 1;
            hit[(y + 2) * COLS + x] = 1;
          }
        }
      }
      return found ? hit : null;
    }

    function refill(fresh) {
      for (let x = 0; x < COLS; x += 1) {
        let write = ROWS - 1;
        for (let y = ROWS - 1; y >= 0; y -= 1) {
          if (slot[y * COLS + x] >= 0) {
            slot[write * COLS + x] = slot[y * COLS + x];
            write -= 1;
          }
        }
        while (write >= 0) {
          slot[write * COLS + x] = api.irnd(0, TYPE.length - 1);
          fresh.push(write * COLS + x);
          write -= 1;
        }
      }
    }

    function settle() {
      let count = 0;
      for (let round = 0; round < 24; round += 1) {
        const hit = scan();
        if (!hit) break;
        let n = 0;
        for (let i = 0; i < hit.length; i += 1) {
          if (!hit[i]) continue;
          const p = centre(i);
          sparkle(p.x, p.y, RGB[slot[i]] || '255,207,92', 5);
          slot[i] = -1;
          n += 1;
        }
        count += n;
        if (round >= 1) {
          note('COMBO x' + (round + 1), '255,207,92');
          if (rings.length > 20) rings.shift();
          rings.push({ x: 240, y: 180, born: api.now(), life: 380 });
        } else if (n >= 5) {
          note('CLEAR', '139,220,122');
        }
        const fresh = [];
        refill(fresh);
        for (let k = 0; k < fresh.length; k += 1) pop(fresh[k], 'in');
      }
      return count;
    }

    function movesLeft() {
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          const i = y * COLS + x;
          const pair = [];
          if (x + 1 < COLS) pair.push(i + 1);
          if (y + 1 < ROWS) pair.push(i + COLS);
          for (let k = 0; k < pair.length; k += 1) {
            const j = pair[k];
            const t = slot[i];
            slot[i] = slot[j];
            slot[j] = t;
            const ok = scan() !== null;
            const b = slot[i];
            slot[i] = slot[j];
            slot[j] = b;
            if (ok) return true;
          }
        }
      }
      return false;
    }

    function reset() {
      for (let tryAgain = 0; tryAgain < 40; tryAgain += 1) {
        for (let i = 0; i < slot.length; i += 1) slot[i] = api.irnd(0, TYPE.length - 1);
        for (let guard = 0; guard < 50; guard += 1) {
          const hit = scan();
          if (!hit) break;
          for (let i = 0; i < hit.length; i += 1) if (hit[i]) slot[i] = api.irnd(0, TYPE.length - 1);
        }
        if (movesLeft()) break;
      }
      for (let i = 0; i < slot.length; i += 1) pop(i, 'in');
    }

    reset();

    api.onPointer((p) => {
      if (p.type === 'move') {
        const gx = Math.floor((p.x - OX) / CELL);
        const gy = Math.floor((p.y - OY) / CELL);
        hover = gx >= 0 && gy >= 0 && gx < COLS && gy < ROWS ? gy * COLS + gx : -1;
        return;
      }
      if (p.type !== 'down') return;
      const gx = Math.floor((p.x - OX) / CELL);
      const gy = Math.floor((p.y - OY) / CELL);
      if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return;
      const at = gy * COLS + gx;
      if (pick1 < 0) {
        pick1 = at;
        return;
      }
      if (pick1 === at) {
        pick1 = -1;
        return;
      }
      const px = pick1 % COLS;
      const py = (pick1 - px) / COLS;
      if (Math.abs(px - gx) + Math.abs(py - gy) !== 1) {
        pick1 = at;
        return;
      }
      const a = pick1;
      const b = at;
      const t = slot[a];
      slot[a] = slot[b];
      slot[b] = t;
      if (scan()) {
        const n = settle();
        cleared += n;
        api.progress(n);
        if (!movesLeft()) {
          note('SHUFFLE', '143,160,180');
          reset();
        }
      } else {
        const back = slot[a];
        slot[a] = slot[b];
        slot[b] = back;
        shake = Math.min(1, shake + 0.5);
        note('MISS', '255,122,122');
      }
      pick1 = -1;
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
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(185,140,255,' + (0.012 + 0.026 * (0.5 + 0.5 * Math.sin(now / 1350))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 19) * amp, Math.cos(now / 25) * amp * 0.6);
        }
        api.rect(OX - 7, OY - 7, COLS * CELL + 14, ROWS * CELL + 14, 'rgba(255,255,255,0.04)');
        for (let y = 0; y < ROWS; y += 1) {
          for (let x = 0; x < COLS; x += 1) {
            const i = y * COLS + x;
            const cx = OX + x * CELL + CELL / 2;
            const cy = OY + y * CELL + CELL / 2;
            if (i === hover) api.circle(cx, cy, CELL * 0.46, 'rgba(232,238,246,0.10)');
            const v = slot[i];
            if (v < 0) continue;
            const s = scaleFor(i, now);
            const r = CELL * 0.36 * s;
            api.circle(cx, cy, r, TYPE[v]);
            api.circle(cx, cy, r * 0.55, 'rgba(16,20,24,0.5)');
            api.circle(cx - r * 0.28, cy - r * 0.3, r * 0.2, 'rgba(255,255,255,0.9)');
            if (i === pick1) {
              api.circle(cx, cy, r + 5, 'rgba(232,238,246,0.22)');
              api.circle(cx, cy, r + 1, 'rgba(16,20,24,0.35)');
            }
          }
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, 40 + 80 * k, rgba('185,140,255', 0.10 * (1 - k)));
        }
        for (let i = 0; i < fx.length; i += 1) {
          const p = fx[i];
          const k = 1 - (now - p.born) / p.life;
          if (k <= 0) continue;
          api.circle(p.x, p.y, p.r * k + 0.6, rgba(p.rgb, k * 0.9));
        }
        for (let i = 0; i < notes.length; i += 1) {
          const t = notes[i];
          const k = (now - t.born) / t.life;
          if (k >= 1) continue;
          api.text(t.text, 240, 152 - k * 12 - i * 20, { size: 22, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('gems ' + cleared + ' · swap adjacent gems', 240, 350, { size: 11, color: C.dim, align: 'center' });
      },
    };
  },
});
