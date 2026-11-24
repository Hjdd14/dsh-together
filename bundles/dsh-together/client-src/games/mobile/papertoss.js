defineGame({
  id: 'papertoss',
  create(api) {
    const C = api.colors;
    const BX = 366;
    const BY = 306;
    const MOUTH_Y = 246;
    const MOUTH_X1 = 72;
    const MOUTH_X2 = 140;
    let ball = { x: BX, y: BY, vx: 0, vy: 0, py: BY };
    let phase = 'aim';
    let drag = null;
    let wind = api.rnd(-55, 55);
    let windT = 3.5;
    let hold = 0;
    let scored = 0;
    let shakes = 0;
    let shake = 0;
    const fx = [];
    const rings = [];
    const notes = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 110) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-130, 130), vy: api.rnd(-160, 40),
          born: api.now(), life: api.rnd(240, 500), rgb: rgb, r: api.rnd(2, 4.2),
        });
      }
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }
    function ring(x, y, rgb) {
      if (rings.length > 20) rings.shift();
      rings.push({ x: x, y: y, born: api.now(), life: 380, rgb: rgb });
    }
    function throwVec() {
      if (!drag) return { vx: 0, vy: 0 };
      const dx = BX - drag.x;
      const dy = BY - drag.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 6) return { vx: 0, vy: 0 };
      const power = Math.min(760, len * 4.6);
      return { vx: (dx / len) * power, vy: (dy / len) * power };
    }
    function reset() {
      ball = { x: BX, y: BY, vx: 0, vy: 0, py: BY };
      phase = 'aim';
      drag = null;
    }

    api.onPointer((p) => {
      if (p.type === 'down') {
        if (phase !== 'aim') return;
        drag = { x: p.x, y: p.y };
        return;
      }
      if (p.type === 'move') {
        if (drag) {
          drag.x = p.x;
          drag.y = p.y;
        }
        return;
      }
      if (p.type !== 'up' || !drag) return;
      const v = throwVec();
      if (v.vx === 0 && v.vy === 0) {
        drag = null;
        shakes = Math.min(1, shakes + 0.4);
        note('PULL BACK', '143,160,180');
        return;
      }
      ball.vx = v.vx;
      ball.vy = v.vy;
      ball.py = ball.y;
      drag = null;
      phase = 'fly';
    });

    return {
      update(dt) {
        const now = api.now();
        if (phase === 'fly') {
          for (let s = 0; s < 4 && phase === 'fly'; s += 1) {
            const h = dt / 4;
            ball.py = ball.y;
            ball.vy += 380 * h;
            ball.vx += wind * h;
            ball.x += ball.vx * h;
            ball.y += ball.vy * h;
            if (ball.py < MOUTH_Y && ball.y >= MOUTH_Y && ball.vy > 0 && ball.x > MOUTH_X1 && ball.x < MOUTH_X2) {
              scored += 1;
              api.progress(1);
              burst(ball.x, MOUTH_Y, '139,220,122', 16);
              ring(ball.x, MOUTH_Y, '139,220,122');
              note(scored >= 5 ? 'PERFECT' : 'SWISH', '139,220,122');
              phase = 'hold';
              hold = 0.5;
              break;
            }
            if (ball.y > 344 || ball.x < -30 || ball.x > 520) {
              burst(ball.x, Math.min(ball.y, 344), '255,122,122', 8);
              note('MISS', '255,122,122');
              shakes = 1;
              phase = 'hold';
              hold = 0.45;
              break;
            }
            if (ball.y > 200) burst(ball.x, ball.y, '232,238,246', 1);
          }
        } else if (phase === 'aim') {
          windT -= dt;
          if (windT <= 0) {
            windT = 3.5;
            wind = api.rnd(-55, 55);
          }
        }
        if (phase === 'hold') {
          hold -= dt;
          if (hold <= 0) reset();
        }
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
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (shakes > 0) shakes = Math.max(0, shakes - dt * 3);
        shake = shakes;
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(120,220,220,' + (0.01 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1300))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 17) * amp, Math.cos(now / 24) * amp * 0.6);
        }
        api.text('sunk ' + scored + ' / 5', 240, 16, { size: 13, color: C.dim, align: 'center' });
        api.rect(0, 300, 480, 60, 'rgba(255,255,255,0.04)');
        api.rect(0, 300, 480, 3, 'rgba(232,238,246,0.14)');
        api.rect(66, 246, 80, 96, 'rgba(120,144,172,0.35)');
        api.rect(66, 246, 80, 8, 'rgba(232,238,246,0.32)');
        api.rect(74, 250, 64, 92, 'rgba(16,20,24,0.55)');
        api.text('IN', 106, 292, { size: 14, color: 'rgba(139,220,122,0.5)', align: 'center' });
        api.rect(420, 262, 44, 38, 'rgba(255,255,255,0.08)');
        api.circle(442, 281, 12, 'rgba(255,255,255,0.12)');
        for (let i = 0; i < 3; i += 1) {
          const bx = 414 - i * 4;
          api.rect(bx, 268 + i * 11, 14, 5, 'rgba(232,238,246,0.3)');
        }
        const wa = Math.abs(wind) / 55;
        api.rect(360, 344, 90, 6, 'rgba(255,255,255,0.10)');
        api.rect(wind >= 0 ? 360 + 45 : 360 + 45 - 45 * wa, 344, Math.max(2, 45 * wa), 6, C.accent);
        api.text('wind ' + Math.round(wind), 405, 334, { size: 10, color: C.dim, align: 'center' });
        if (drag) {
          const v = throwVec();
          let px = BX;
          let py = BY;
          let pvx = v.vx;
          let pvy = v.vy;
          for (let k = 0; k < 26; k += 1) {
            pvy += 380 * 0.045;
            pvx += wind * 0.045;
            px += pvx * 0.045;
            py += pvy * 0.045;
            if (py > 344) break;
            api.circle(px, py, 2.2, 'rgba(232,238,246,' + (0.5 - k * 0.015).toFixed(2) + ')');
          }
          api.circle(drag.x, drag.y, 9, 'rgba(255,207,92,0.35)');
        }
        api.circle(ball.x, ball.y, 9, 'rgba(232,238,246,0.92)');
        api.circle(ball.x - 3, ball.y - 3, 3, 'rgba(255,255,255,0.8)');
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, 14 * (1 + 1.8 * k), rgba(r.rgb, 0.3 * (1 - k)));
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
          api.text(t.text, 240, 180 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('drag back from the ball, release to throw', 240, 356, { size: 9, color: C.dim, align: 'center' });
      },
    };
  },
});
