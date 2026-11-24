defineGame({
  id: 'bubblepop',
  create(api) {
    const C = api.colors;
    const COLS = 10;
    const ROWS = 10;
    const D = 28;
    const R = D / 2;
    const OX = 100;
    const OY = 22;
    const CX = 240;
    const CY = 330;
    const HUES = [C.accent, C.accent2, C.good, 'rgba(185,140,255,1)'];
    const RGB = ['106,169,255', '255,207,92', '139,220,122', '185,140,255'];
    const grid = [];
    for (let r = 0; r < ROWS; r += 1) {
      grid.push([]);
      for (let c = 0; c < COLS; c += 1) grid[r].push(-1);
    }
    for (let r = 0; r < 2; r += 1) {
      let c = 0;
      while (c < COLS) {
        const hue = api.irnd(0, 3);
        const len = Math.min(COLS - c, api.irnd(2, 4));
        for (let k = 0; k < len; k += 1) grid[r][c + k] = hue;
        c += len;
      }
    }

    let aim = 0;
    let shot = null;
    function pickColor() {
      const seen = [];
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          const h = grid[r][c];
          if (h >= 0 && seen.indexOf(h) < 0) seen.push(h);
        }
      }
      return seen.length ? api.pick(seen) : api.irnd(0, 3);
    }
    let nextColor = pickColor();
    let fired = 0;
    let cleared = 0;
    let dead = false;
    let shake = 0;
    const fx = [];
    const rings = [];
    const notes = [];
    const pops = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function cx(c) {
      return OX + c * D + R;
    }
    function cy(r) {
      return OY + r * D + R;
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 110) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-130, 130), vy: api.rnd(-150, 50),
          born: api.now(), life: api.rnd(250, 520), rgb: rgb, r: api.rnd(2, 4.4),
        });
      }
      if (rings.length > 24) rings.shift();
      rings.push({ x: x, y: y, born: api.now(), life: 360 });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 800 });
    }
    function pop(r, c) {
      if (pops.length > 40) pops.shift();
      pops.push({ key: r * COLS + c, born: api.now(), life: 200 });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 0.55 + 0.45 * (1 - (1 - k) * (1 - k)));
      }
      return s;
    }
    function cluster(r0, c0) {
      const hue = grid[r0][c0];
      const seen = {};
      const stack = [[r0, c0]];
      const out = [];
      while (stack.length) {
        const cur = stack.pop();
        const r = cur[0];
        const c = cur[1];
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
        if (grid[r][c] !== hue) continue;
        const key = r * COLS + c;
        if (seen[key]) continue;
        seen[key] = 1;
        out.push([r, c]);
        stack.push([r - 1, c]);
        stack.push([r + 1, c]);
        stack.push([r, c - 1]);
        stack.push([r, c + 1]);
      }
      return out;
    }
    function place(x, y, color) {
      let best = null;
      let bestD = 1e9;
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          if (grid[r][c] >= 0) continue;
          const d = (cx(c) - x) * (cx(c) - x) + (cy(r) - y) * (cy(r) - y);
          if (d < bestD) {
            bestD = d;
            best = [r, c];
          }
        }
      }
      if (!best) return;
      const r = best[0];
      const c = best[1];
      grid[r][c] = color;
      pop(r, c);
      fired += 1;
      const group = cluster(r, c);
      if (group.length >= 3) {
        for (let i = 0; i < group.length; i += 1) {
          const gr = group[i][0];
          const gc = group[i][1];
          burst(cx(gc), cy(gr), RGB[grid[gr][gc]], 6);
          grid[gr][gc] = -1;
          cleared += 1;
          api.progress(1);
        }
        note(cleared >= 12 ? 'PERFECT' : 'POP +' + group.length, '139,220,122');
      }
      if (fired % 8 === 0) {
        let bottom = false;
        for (let c2 = 0; c2 < COLS; c2 += 1) if (grid[ROWS - 1][c2] >= 0) bottom = true;
        for (let rr = ROWS - 1; rr > 0; rr -= 1) grid[rr] = grid[rr - 1].slice();
        grid[0] = [];
        for (let c3 = 0; c3 < COLS; c3 += 1) grid[0].push(api.irnd(0, 3));
        note('WALL DOWN', '255,207,92'); shake = Math.min(1, shake + 0.3);
        if (bottom) {
          dead = true;
          api.lose('wall reached the floor');
        }
      }
      for (let c4 = 0; c4 < COLS; c4 += 1) {
        if (grid[ROWS - 1][c4] >= 0) dead = true;
      }
      if (dead) api.lose('wall reached the floor');
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const dx = p.x - CX;
        const dy = p.y - CY;
        const a = Math.atan2(dx, Math.max(-dy, 0.001));
        aim = Math.max(-1.15, Math.min(1.15, a));
        return;
      }
      if (p.type !== 'down' || shot || dead) return;
      shot = { x: CX, y: CY - 8, vx: Math.sin(aim) * 620, vy: -Math.cos(aim) * 620, color: nextColor };
      nextColor = pickColor();
    });

    api.onKey((key, isDown) => {
      if (!isDown || dead) return;
      if (key === 'left') aim = Math.max(-1.15, aim - 0.12);
      else if (key === 'right') aim = Math.min(1.15, aim + 0.12);
      else if (key === 'space' && !shot) {
        shot = { x: CX, y: CY - 8, vx: Math.sin(aim) * 620, vy: -Math.cos(aim) * 620, color: nextColor };
        nextColor = pickColor();
      }
    });

    return {
      update(dt) {
        const now = api.now();
        if (shot) {
          const steps = 4;
          for (let s = 0; s < steps && shot; s += 1) {
            const h = dt / steps;
            shot.x += shot.vx * h;
            shot.y += shot.vy * h;
            if (shot.x < OX + R) {
              shot.x = OX + R;
              shot.vx = -shot.vx;
            } else if (shot.x > OX + COLS * D - R) {
              shot.x = OX + COLS * D - R;
              shot.vx = -shot.vx;
            }
            let hit = shot.y <= OY + R;
            if (!hit) {
              for (let r = 0; r < ROWS && !hit; r += 1) {
                for (let c = 0; c < COLS; c += 1) {
                  if (grid[r][c] < 0) continue;
                  const dx = cx(c) - shot.x;
                  const dy = cy(r) - shot.y;
                  if (dx * dx + dy * dy < D * D * 0.8) {
                    hit = true;
                    break;
                  }
                }
              }
            }
            if (hit) {
              const sx = shot.x;
              const sy = shot.y;
              const hue = shot.color;
              shot = null;
              place(sx, sy, hue);
              break;
            }
          }
        }
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
        if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.012 + 0.024 * (0.5 + 0.5 * Math.sin(now / 1250))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 19) * amp, Math.cos(now / 26) * amp * 0.6);
        }
        api.text('cleared ' + cleared + ' / 12 · drop in ' + (8 - (fired % 8)), 240, 12, {
          size: 12, color: C.dim, align: 'center',
        });
        for (let r = 0; r < ROWS; r += 1) {
          for (let c = 0; c < COLS; c += 1) {
            const hue = grid[r][c];
            if (hue < 0) continue;
            const s = scaleFor(r * COLS + c, now);
            const x = cx(c);
            const y = cy(r);
            api.circle(x, y, R * s, HUES[hue]);
            api.circle(x - R * 0.3 * s, y - R * 0.3 * s, R * 0.3 * s, 'rgba(255,255,255,0.55)');
          }
        }
        if (shot) {
          api.circle(shot.x, shot.y, R - 1, HUES[shot.color]);
          api.circle(shot.x - 4, shot.y - 4, R * 0.3, 'rgba(255,255,255,0.6)');
        }
        for (let i = 1; i <= 16; i += 1) {
          let dx = CX + Math.sin(aim) * i * 15;
          let dy = CY - 8 - Math.cos(aim) * i * 15;
          if (dx < OX + R || dx > OX + COLS * D - R) break;
          if (dy < OY + R) break;
          api.circle(dx, dy, 2, 'rgba(232,238,246,0.35)');
        }
        api.rect(CX - 26, CY - 4, 52, 12, C.panel);
        api.rect(CX - 3, CY - 20, 6, 20, C.accent);
        api.circle(CX, CY - 8, 7, HUES[nextColor]);
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, D * (0.4 + 0.9 * k), rgba('139,220,122', 0.26 * (1 - k)));
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
          api.text(t.text, 240, 168 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('aim with the pointer, click to fire', 240, 350, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
