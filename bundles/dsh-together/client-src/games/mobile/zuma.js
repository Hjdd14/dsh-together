defineGame({
  id: 'zuma',
  create(api) {
    const C = api.colors;
    const SHX = 240;
    const SHY = 320;
    const HUES = [C.accent, C.accent2, C.good, 'rgba(255,122,122,1)'];
    const RGB = ['106,169,255', '255,207,92', '139,220,122', '255,122,122'];
    const SPACING = 13;
    const SPEED = 5;
    const path = [];
    for (let x = 470; x >= 26; x -= 2) {
      path.push({ x: x, y: 118 + 54 * Math.sin((x - 26) / 74) });
    }
    const balls = [];
    for (let i = 0; i < 14; i += 1) balls.push(api.irnd(0, 3));

    let head = 62;
    let cleared = 0;
    let dead = false;
    let shake = 0;
    let aimX = SHX;
    let aimY = 120;
    let shot = null;
    let nextColor = api.irnd(0, 3);
    const fx = [];
    const rings = [];
    const notes = [];
    const pops = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function posAt(d) {
      const i = Math.round(d);
      if (i < 0) return path[0];
      if (i >= path.length) return path[path.length - 1];
      return path[i];
    }
    function ballPos(i) {
      return posAt(head - i * SPACING);
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 110) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-140, 140), vy: api.rnd(-160, 40),
          born: api.now(), life: api.rnd(260, 520), rgb: rgb, r: api.rnd(2, 4.4),
        });
      }
      if (rings.length > 24) rings.shift();
      rings.push({ x: x, y: y, born: api.now(), life: 360 });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 780 });
    }
    function pop(i) {
      if (pops.length > 40) pops.shift();
      pops.push({ key: i, born: api.now(), life: 200 });
    }
    function scaleFor(key, now) {
      let s = 1;
      for (let i = 0; i < pops.length; i += 1) {
        if (pops[i].key !== key) continue;
        const k = (now - pops[i].born) / pops[i].life;
        if (k < 0 || k >= 1) continue;
        s = Math.max(s, 0.5 + 0.5 * (1 - (1 - k) * (1 - k)));
      }
      return s;
    }

    function clearRun(idx) {
      if (idx < 0 || idx >= balls.length) return;
      const hue = balls[idx];
      let lo = idx;
      while (lo > 0 && balls[lo - 1] === hue) lo -= 1;
      let hi = idx;
      while (hi + 1 < balls.length && balls[hi + 1] === hue) hi += 1;
      const run = hi - lo + 1;
      if (run < 3) return;
      for (let k = lo; k <= hi; k += 1) {
        const p = ballPos(k);
        burst(p.x, p.y, RGB[hue], 7);
      }
      balls.splice(lo, run);
      cleared += run;
      for (let k = 0; k < run; k += 1) api.progress(1);
      note(cleared >= 10 ? 'PERFECT' : 'CLEAR +' + run, '139,220,122');
      if (lo < balls.length) clearRun(lo);
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        aimX = p.x;
        aimY = p.y;
        return;
      }
      if (p.type !== 'down' || shot || dead) return;
      const dx = p.x - SHX;
      const dy = p.y - SHY;
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      shot = { x: SHX, y: SHY, vx: (dx / len) * 760, vy: (dy / len) * 760, color: nextColor };
      nextColor = api.irnd(0, 3);
    });

    return {
      update(dt) {
        const now = api.now();
        if (!dead) {
          head += SPEED * dt;
          if (head >= path.length - 2) {
            dead = true;
            shake = 1;
            note('TOO LATE', '255,122,122');
            api.lose('chain reached the hole');
          }
        }
        if (shot) {
          for (let s = 0; s < 3 && shot; s += 1) {
            const h = dt / 3;
            shot.x += shot.vx * h;
            shot.y += shot.vy * h;
            let hit = -1;
            for (let i = 0; i < balls.length; i += 1) {
              if (head - i * SPACING < 0) continue;
              const p = ballPos(i);
              const dx = p.x - shot.x;
              const dy = p.y - shot.y;
              if (dx * dx + dy * dy < 210) {
                hit = i;
                break;
              }
            }
            if (hit >= 0) {
              const color = shot.color;
              shot = null;
              balls.splice(hit, 0, color);
              pop(hit);
              const p = ballPos(hit);
              burst(p.x, p.y, RGB[color], 4);
              clearRun(hit);
              break;
            }
            if (shot.x < -40 || shot.x > 520 || shot.y < -40 || shot.y > 380) shot = null;
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
        api.rect(0, 0, 480, 360, 'rgba(255,207,92,' + (0.012 + 0.024 * (0.5 + 0.5 * Math.sin(now / 1300))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 18) * amp, Math.cos(now / 25) * amp * 0.6);
        }
        api.text('cleared ' + cleared + ' / 10', 240, 14, { size: 12, color: C.dim, align: 'center' });
        for (let i = 0; i < path.length; i += 3) {
          api.rect(path[i].x - 6, path[i].y - 6, 12, 12, 'rgba(255,255,255,0.035)');
        }
        api.circle(path[path.length - 1].x, path[path.length - 1].y, 20, 'rgba(255,122,122,0.5)');
        api.text('!', path[path.length - 1].x, path[path.length - 1].y, {
          size: 16, color: C.bg, align: 'center', weight: 'bold',
        });
        for (let i = balls.length - 1; i >= 0; i -= 1) {
          if (head - i * SPACING < 0) continue;
          const p = ballPos(i);
          const s = scaleFor(i, now);
          api.circle(p.x, p.y, 12 * s, HUES[balls[i]]);
          api.circle(p.x - 4 * s, p.y - 4 * s, 4 * s, 'rgba(255,255,255,0.55)');
        }
        if (shot) {
          api.circle(shot.x, shot.y, 11, HUES[shot.color]);
          api.circle(shot.x - 3, shot.y - 3, 3.5, 'rgba(255,255,255,0.6)');
        }
        const dl = Math.max(1, Math.hypot(aimX - SHX, aimY - SHY));
        for (let i = 1; i <= 10; i += 1) {
          const t = i * 14 / dl;
          if (t > 1) break;
          api.circle(SHX + (aimX - SHX) * t, SHY + (aimY - SHY) * t, 1.8, 'rgba(232,238,246,0.3)');
        }
        api.rect(SHX - 28, SHY + 2, 56, 12, C.panel);
        api.circle(SHX, SHY, 16, HUES[nextColor]);
        api.circle(SHX - 5, SHY - 5, 5, 'rgba(255,255,255,0.6)');
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, 12 * (1 + 1.6 * k), rgba('139,220,122', 0.28 * (1 - k)));
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
          api.text(t.text, 240, 286 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('click where the ball should fly', 240, 350, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
