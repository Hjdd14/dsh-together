defineGame({
  id: 'sokoban',
  create(api) {
    const C = api.colors;
    const MAP = ['######', '#....#', '#....#', '#..#.#', '#....#', '######'];
    const W = 6;
    const H = 6;
    const CELL = 52;
    const OX = 84;
    const OY = 26;
    const goals = [{ x: 2, y: 4 }, { x: 4, y: 4 }];
    const credited = [0, 0];
    let crates = [];
    let player = { x: 3, y: 1 };
    let moves = 0;
    let stuck = 0;
    let hover = -1;

    const fx = [];
    const pops = [];
    const rings = [];
    const notes = [];
    let shake = 0;

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function cellX(x) {
      return OX + x * CELL + CELL / 2;
    }
    function cellY(y) {
      return OY + y * CELL + CELL / 2;
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 70) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-100, 100), vy: api.rnd(-130, 30),
          born: api.now(), life: api.rnd(260, 480), rgb: rgb, r: api.rnd(2, 4),
        });
      }
    }
    function pop(key) {
      if (pops.length > 24) pops.shift();
      pops.push({ key: key, born: api.now(), life: 180 });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 0.7 + 0.3 * (1 - (1 - k) * (1 - k)));
      }
      return s;
    }

    function reset(why) {
      crates = [{ x: 2, y: 2 }, { x: 4, y: 2 }];
      player = { x: 3, y: 1 };
      stuck = 0;
      note(why, why === 'STUCK' ? '255,122,122' : '143,160,180');
      if (why === 'STUCK') shake = Math.min(1, shake + 0.8);
    }

    function wall(x, y) {
      if (x < 0 || y < 0 || x >= W || y >= H) return true;
      return MAP[y].charAt(x) === '#';
    }
    function crateAt(x, y) {
      for (let i = 0; i < crates.length; i += 1) if (crates[i].x === x && crates[i].y === y) return i;
      return -1;
    }
    function goalAt(x, y) {
      for (let i = 0; i < goals.length; i += 1) if (goals[i].x === x && goals[i].y === y) return true;
      return false;
    }
    function checkGoals() {
      for (let i = 0; i < crates.length; i += 1) {
        if (goalAt(crates[i].x, crates[i].y)) {
          pop('c' + i);
          if (credited[i] === 0) {
            credited[i] = 1;
            api.progress(1);
            burst(cellX(crates[i].x), cellY(crates[i].y), '139,220,122', 10);
            note(credited[0] + credited[1] >= 2 ? 'PERFECT' : 'NICE', '139,220,122');
            if (rings.length > 20) rings.shift();
            rings.push({ x: cellX(crates[i].x), y: cellY(crates[i].y), born: api.now(), life: 420 });
          }
        }
      }
    }
    function checkStuck() {
      for (let i = 0; i < crates.length; i += 1) {
        const c = crates[i];
        if (goalAt(c.x, c.y)) continue;
        const vert = wall(c.x, c.y - 1) || wall(c.x, c.y + 1);
        const horz = wall(c.x - 1, c.y) || wall(c.x + 1, c.y);
        if (vert && horz) {
          stuck = 0.6;
          return;
        }
      }
    }

    reset('READY');

    api.onKey((key, isDown) => {
      if (!isDown) return;
      if (key === 'space') {
        reset('RESET');
        return;
      }
      let dx = 0;
      let dy = 0;
      if (key === 'left') dx = -1;
      else if (key === 'right') dx = 1;
      else if (key === 'up') dy = -1;
      else if (key === 'down') dy = 1;
      else return;
      const nx = player.x + dx;
      const ny = player.y + dy;
      if (wall(nx, ny)) {
        shake = Math.min(1, shake + 0.3);
        return;
      }
      const hit = crateAt(nx, ny);
      if (hit >= 0) {
        const bx = nx + dx;
        const by = ny + dy;
        if (wall(bx, by) || crateAt(bx, by) >= 0) {
          shake = Math.min(1, shake + 0.3);
          return;
        }
        crates[hit].x = bx;
        crates[hit].y = by;
        pop('c' + hit);
        checkGoals();
        checkStuck();
      }
      player.x = nx;
      player.y = ny;
      pop('p');
      moves += 1;
    });

    api.onPointer((p) => {
      if (p.type !== 'move') return;
      const gx = Math.floor((p.x - OX) / CELL);
      const gy = Math.floor((p.y - OY) / CELL);
      hover = gx >= 0 && gy >= 0 && gx < W && gy < H ? gy * W + gx : -1;
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
          p.vy += 250 * dt;
        }
        for (let i = rings.length - 1; i >= 0; i -= 1) if (now - rings[i].born >= rings[i].life) rings.splice(i, 1);
        for (let i = pops.length - 1; i >= 0; i -= 1) if (now - pops[i].born >= pops[i].life) pops.splice(i, 1);
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shake > 0) shake = Math.max(0, shake - dt * 3.2);
        if (stuck > 0) {
          stuck -= dt;
          if (stuck <= 0) reset('STUCK');
        }
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.012 + 0.024 * (0.5 + 0.5 * Math.sin(now / 1200))).toFixed(3) + ')');
        const amp = shake * 6;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 22) * amp, Math.cos(now / 30) * amp * 0.7);
        }
        for (let y = 0; y < H; y += 1) {
          for (let x = 0; x < W; x += 1) {
            const px = OX + x * CELL;
            const py = OY + y * CELL;
            if (wall(x, y)) {
              api.rect(px, py, CELL, CELL, 'rgba(120,144,172,0.30)');
              api.rect(px + 2, py + 2, CELL - 4, 3, 'rgba(232,238,246,0.28)');
            } else {
              api.rect(px, py, CELL, CELL, 'rgba(255,255,255,0.045)');
              if (y * W + x === hover) api.rect(px + 2, py + 2, CELL - 4, CELL - 4, 'rgba(232,238,246,0.07)');
            }
            if (goalAt(x, y)) {
              const pulse = 0.30 + 0.14 * Math.sin(now / 420 + x + y);
              api.circle(px + CELL / 2, py + CELL / 2, CELL * 0.2, rgba('139,220,122', pulse));
            }
          }
        }
        for (let i = 0; i < crates.length; i += 1) {
          const px = OX + crates[i].x * CELL;
          const py = OY + crates[i].y * CELL;
          const s = scaleFor('c' + i, now);
          const w = CELL * s;
          const off = (CELL - w) / 2;
          const done = goalAt(crates[i].x, crates[i].y);
          api.rect(px + off + 6, py + off + 6, w - 12, w - 12, done ? C.good : 'rgba(255,207,92,0.85)');
          api.rect(px + off + 16, py + off + 16, w - 32, w - 32, C.panel);
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, CELL * (0.3 + 0.6 * k), rgba('139,220,122', 0.35 * (1 - k)));
        }
        const ps = scaleFor('p', now);
        api.circle(cellX(player.x), cellY(player.y), CELL * 0.28 * ps, C.accent);
        api.circle(cellX(player.x), cellY(player.y), CELL * 0.12 * ps, 'rgba(16,20,24,0.45)');
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
        api.text('moves ' + moves + ' · arrows push · space restart', 240, 352, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
