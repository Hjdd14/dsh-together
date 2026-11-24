defineGame({
  id: 'bbtan',
  create(api) {
    const C = api.colors;
    const LEFT = 10;
    const TOP = 56;
    const COLS = 10;
    const CELL = 46;
    const BW = 42;
    const BH = 22;
    const ROWH = 26;
    const FLOOR = 330;
    const LIMIT = 316;
    const SPEED = 430;
    const rows = [];
    let clock = 0;
    let aiming = false;
    let aimX = 240;
    let aimY = 180;
    let ball = null;
    let life = 0;
    let broke = 0;
    let missed = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let shots = 0;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    const parts = [];
    const floats = [];

    function makeRow() {
      const row = [];
      let count = 0;
      for (let c = 0; c < COLS; c += 1) {
        if (api.rng() < 0.62) {
          row.push(api.rng() < 0.24 ? 2 : 1);
          count += 1;
        } else row.push(0);
      }
      if (count < 3) {
        for (let i = 0; i < 3; i += 1) row[api.irnd(0, COLS - 1)] = 1;
      }
      return row;
    }

    for (let i = 0; i < 3; i += 1) rows.push(makeRow());

    function rowY(i) {
      return TOP + i * ROWH;
    }

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: api.rnd(0.28, 0.62), max: 0.62, r: api.rnd(1.5, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 7) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.8, c: color });
    }

    function cellAt(x, y) {
      if (y < TOP) return null;
      const i = Math.floor((y - TOP) / ROWH);
      if (i < 0 || i >= rows.length) return null;
      const c = Math.floor((x - LEFT) / CELL);
      if (c < 0 || c >= COLS) return null;
      if (!rows[i][c]) return null;
      return { i: i, c: c };
    }

    function lowest() {
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        for (let c = 0; c < COLS; c += 1) if (rows[i][c]) return rowY(i) + BH;
      }
      return 0;
    }

    function fire() {
      if (ball) return;
      let dx = aimX - 240;
      let dy = aimY - FLOOR;
      if (dy > -40) dy = -40;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      dx = (dx / len) * SPEED;
      dy = (dy / len) * SPEED;
      ball = { x: 240, y: FLOOR - 14, vx: dx, vy: dy };
      life = 9;
      shots += 1;
      pulse = 1;
    }

    function endShot(hitAny) {
      ball = null;
      if (!hitAny) {
        rows.unshift(makeRow());
        shake = 1;
        label('WALL PUSHED', 240, 90, C.warn);
      }
      if (lowest() > LIMIT) api.lose('the wall reached the floor');
    }

    function stepBall(dt) {
      if (!ball) return;
      life -= dt;
      if (life <= 0) { endShot(true); return; }
      let hitAny = false;
      const total = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * dt;
      const steps = Math.max(1, Math.ceil(total / 5));
      for (let s = 0; s < steps; s += 1) {
        ball.x += (ball.vx * dt) / steps;
        ball.y += (ball.vy * dt) / steps;
        if (ball.x < LEFT + 6) { ball.x = LEFT + 6; ball.vx = Math.abs(ball.vx); }
        if (ball.x > LEFT + COLS * CELL - 6) { ball.x = LEFT + COLS * CELL - 6; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < TOP - 6) { ball.y = TOP - 6; ball.vy = Math.abs(ball.vy); }
        const hit = cellAt(ball.x, ball.y);
        if (!hit) continue;
        hitAny = true;
        rows[hit.i][hit.c] -= 1;
        const cx = LEFT + hit.c * CELL;
        const cy = rowY(hit.i);
        const penL = ball.x - cx;
        const penR = cx + BW - ball.x;
        const penT = ball.y - cy;
        const penB = cy + BH - ball.y;
        const minPen = Math.min(penL, penR, penT, penB);
        if (minPen === penL || minPen === penR) ball.vx = -ball.vx;
        else ball.vy = -ball.vy;
        if (rows[hit.i][hit.c] <= 0) {
          broke += 1;
          combo += 1;
          comboT = 1.5;
          if (combo > best) best = combo;
          api.progress(1);
          api.score(10 * (1 + Math.floor(combo / 3)));
          pulse = 1;
          flash = 1;
          flashColor = C.good;
          burst(cx + BW / 2, cy + BH / 2, C.accent2, 10, 180);
          if (combo >= 4) label('COMBO x' + combo, cx + BW / 2, cy - 12, C.accent2);
        } else {
          burst(ball.x, ball.y, C.dim, 3, 90);
        }
        break;
      }
      if (ball && ball.y > FLOOR + 34) endShot(hitAny);
      else if (ball && (Math.abs(ball.vx) < 30 || life < 0.2)) endShot(hitAny);
    }

    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'down' && !ball) {
        aiming = true;
        aimX = ev.x;
        aimY = ev.y;
        return;
      }
      if (ev.type === 'move' && aiming) {
        aimX = ev.x;
        aimY = ev.y;
        return;
      }
      if (ev.type === 'up' && aiming) {
        aiming = false;
        fire();
      }
    });
    const offKey = api.onKey((key, isDown, ev) => {
      if (!isDown || (ev && ev.repeat)) return;
      if (key === 'space' || key === 'enter') {
        aimX = 240 + (api.rng() - 0.5) * 120;
        fire();
      }
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
        stepBall(dt);
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const q = parts[i];
          q.t -= dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.vx *= 0.93;
          q.vy = q.vy * 0.93 + 180 * dt;
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
        api.rect(LEFT - 4, TOP - 6, COLS * CELL + 8, 4, C.panel);
        api.rect(LEFT - 6, TOP, 4, FLOOR - TOP, C.panel);
        api.rect(LEFT + COLS * CELL + 2, TOP, 4, FLOOR - TOP, C.panel);
        api.rect(LEFT - 6, LIMIT, COLS * CELL + 12, 2, 'rgba(255,122,122,0.6)');
        const sx = shake > 0 ? Math.sin(clock * 0.26) * shake * 5 : 0;

        for (let i = 0; i < rows.length; i += 1) {
          const y = rowY(i) + sx * 0.4;
          if (y > FLOOR) continue;
          for (let c = 0; c < COLS; c += 1) {
            const hp = rows[i][c];
            if (!hp) continue;
            const x = LEFT + c * CELL;
            api.rect(x, y, BW, BH, hp > 1 ? C.accent : C.accent2);
            api.rect(x + 2, y + 2, BW - 4, 5, 'rgba(255,255,255,0.22)');
            if (hp > 1) api.circle(x + BW / 2, y + BH / 2, 3, C.bg);
          }
        }

        api.rect(232, FLOOR - 10, 16, 16, C.panel);
        api.circle(240, FLOOR - 4, 9, C.fg);
        if (!ball) {
          const len = 150;
          let dx = aimX - 240;
          let dy = aimY - FLOOR;
          if (dy > -40) dy = -40;
          const l = Math.sqrt(dx * dx + dy * dy) || 1;
          dx /= l;
          dy /= l;
          for (let i = 1; i <= 8; i += 1) {
            api.circle(240 + dx * len * (i / 8), FLOOR - 4 + dy * len * (i / 8), 2.5, 'rgba(255,255,255,' + (0.5 - i * 0.045).toFixed(2) + ')');
          }
          api.circle(240 + dx * len, FLOOR - 4 + dy * len, 5, aiming ? C.accent2 : C.dim);
          api.text(Math.round((Math.atan2(-dy, dx) * 180) / 3.14159) + 'deg', 240, FLOOR + 16, {
            size: 10,
            color: C.dim,
            align: 'center',
          });
        }
        if (ball) {
          api.circle(ball.x, ball.y, 8, C.fg);
          api.circle(ball.x, ball.y, 12 + pulse * 4, 'rgba(255,255,255,0.14)');
          for (let i = 1; i <= 4; i += 1) api.circle(ball.x - ball.vx * 0.004 * i, ball.y - ball.vy * 0.004 * i, 3 - i * 0.4, 'rgba(255,255,255,0.2)');
        }

        for (let i = 0; i < parts.length; i += 1) {
          const q = parts[i];
          api.circle(q.x, q.y, q.r * (0.5 + q.t / q.max), q.t > 0.25 ? q.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x, f.y, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        api.text('BRICKS ' + broke, 14, 22, { size: 13, color: C.good, weight: 'bold' });
        api.text('SHOTS ' + shots, 452, 22, { size: 12, color: C.dim, align: 'right' });
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 22, { size: 14, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(198, 33, 84 * Math.max(0, comboT / 1.5), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text('drag to aim, release to fire', 240, 348, { size: 10, color: C.dim, align: 'center' });
        api.text('BEST x' + best, 240, 336, { size: 9, color: C.dim, align: 'center' });
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
      },

      dispose() {
        offPointer();
        offKey();
      },
    };
  },
});
