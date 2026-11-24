defineGame({
  id: 'helix',
  create(api) {
    const C = api.colors;
    const W = 480;
    const BX = 240;
    const LAYER_H = 52;
    const GAP = 86;
    const RED = 22;
    const RAD = 10;
    const layers = [];
    let baseLayer = 0;
    let clock = 0;
    let ballY = -40;
    let vy = 60;
    let rot = 0;
    let rotV = 0;
    let resting = false;
    let restLayer = 0;
    let floorLayer = 0;
    let clank = 0;
    let passed = 0;
    let combo = 0;
    let comboT = 0;
    let best = 0;
    let pulse = 0;
    let shake = 0;
    let flash = 0;
    let flashColor = C.good;
    const parts = [];
    const floats = [];
    const trail = [];

    function wrapX(v) {
      let x = v % W;
      if (x < 0) x += W;
      return x;
    }

    function relX(gx) {
      let d = BX - gx;
      if (d > W / 2) d -= W;
      if (d < -W / 2) d += W;
      return d;
    }

    function ensure(upto) {
      while (baseLayer + layers.length <= upto) {
        const idx = baseLayer + layers.length;
        const prev = layers.length ? layers[layers.length - 1].gx : api.rnd(80, 400);
        layers.push({
          gx: idx === 1 ? 240 : wrapX(prev + api.rnd(-1, 1) * 78),
          redSide: api.rng() < 0.5 ? 1 : -1,
          passed: false,
        });
      }
    }

    function at(globalIndex) {
      return layers[globalIndex - baseLayer];
    }

    ensure(14);

    function burst(x, y, color, n, spd) {
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= 80) break;
        const a = api.rnd(0, 6.2832);
        const s = api.rnd(spd * 0.3, spd);
        parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: api.rnd(0.3, 0.68), max: 0.68, r: api.rnd(1.5, 3.4), c: color });
      }
    }

    function label(text, x, y, color) {
      if (floats.length > 7) floats.shift();
      floats.push({ text: text, x: x, y: y, t: 0.85, c: color });
    }

    function passedLayer(globalIndex) {
      const L = at(globalIndex);
      if (!L || L.passed) return;
      L.passed = true;
      passed += 1;
      combo += 1;
      comboT = 1.5;
      if (combo > best) best = combo;
      api.progress(1);
      api.score(12 * (1 + Math.floor(combo / 3)));
      pulse = 1;
      flash = 1;
      flashColor = C.good;
      burst(BX, globalIndex * LAYER_H, C.accent2, 10, 190);
      label(combo >= 3 ? 'LAYER ' + passed + ' x' + combo : 'LAYER ' + passed, BX, globalIndex * LAYER_H - 22, C.good);
    }

    function die(why) {
      shake = 1;
      flash = 1;
      flashColor = C.warn;
      burst(BX, ballY, 'rgba(255,122,122,0.7)', 14, 210);
      label(why, BX, ballY - 30, C.warn);
      api.lose(why);
    }

    function probe(globalIndex) {
      const L = at(globalIndex);
      if (!L) return { inGap: true, dead: false, sd: 0 };
      const sd = relX(wrapX(L.gx + rot));
      const ad = Math.abs(sd);
      const inGap = ad < GAP / 2;
      const side = sd > 0 ? 1 : -1;
      return { inGap: inGap, dead: !inGap && ad < GAP / 2 + RED && side === L.redSide, sd: sd };
    }

    const offKey = api.onKey((key, isDown, ev) => {
      if (ev && ev.repeat) return;
      if (key === 'left') rotV = isDown ? -300 : rotV * 0.3;
      else if (key === 'right') rotV = isDown ? 300 : rotV * 0.3;
    });
    const offPointer = api.onPointer((ev) => {
      if (ev.type === 'down') rotV = ev.x < 240 ? -300 : 300;
      if (ev.type === 'up') rotV *= 0.3;
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
        clank = Math.max(0, clank - dt * 2.2);
        if (comboT <= 0) combo = 0;

        const held = (api.down('left') ? -1 : 0) + (api.down('right') ? 1 : 0);
        if (held !== 0) rotV = held * 300;
        rot = wrapX(rot + rotV * dt);
        rotV *= 0.9;

        const ballLayer = Math.floor(ballY / LAYER_H);
        ensure(ballLayer + 14);
        while (baseLayer + 2 < ballLayer - 2) {
          layers.shift();
          baseLayer += 1;
        }

        if (resting) {
          if (at(restLayer)) {
            const p = probe(restLayer);
            if (p.inGap) {
              resting = false;
              vy = 80;
              passedLayer(restLayer);
              floorLayer = restLayer;
            } else {
              ballY = restLayer * LAYER_H - RAD;
            }
          }
        } else {
          const prevY = ballY;
          const nextLayerY = (Math.floor(ballY / LAYER_H) + 1) * LAYER_H;
          const band = nextLayerY - ballY;
          vy = Math.min(300, vy + 460 * dt);
          if (band < 44) vy = Math.min(vy, 58);
          ballY += vy * dt;
          const low = Math.floor(prevY / LAYER_H);
          const high = Math.floor(ballY / LAYER_H);
          for (let i = Math.max(floorLayer + 1, low + 1); i <= high; i += 1) {
            const p = probe(i);
            if (p.inGap) {
              passedLayer(i);
              floorLayer = i;
            } else {
              resting = true;
              restLayer = i;
              ballY = i * LAYER_H - RAD;
              vy = 0;
              if (p.dead) {
                die('SPIKED');
                return;
              }
              clank = 1;
              shake = Math.min(1, shake + 0.4);
              label('LANDED', BX, i * LAYER_H - 26, C.accent2);
              break;
            }
          }
          if (trail.length >= 10) trail.shift();
          trail.push({ y: ballY, t: 0.3 });
        }

        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const q = parts[i];
          q.t -= dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.vx *= 0.93;
          q.vy = q.vy * 0.93 + 220 * dt;
          if (q.t <= 0) parts.splice(i, 1);
        }
        for (let i = trail.length - 1; i >= 0; i -= 1) {
          trail[i].t -= dt;
          if (trail[i].t <= 0) trail.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i -= 1) {
          floats[i].t -= dt;
          floats[i].y -= dt * 22;
          if (floats[i].t <= 0) floats.splice(i, 1);
        }
      },

      draw(g) {
        const k = 0.5 + 0.5 * Math.sin(clock / 880);
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.015 + 0.05 * k).toFixed(3) + ')');
        const camY = ballY - 148;
        const sx = shake > 0 ? Math.sin(clock * 0.24) * shake * 7 : 0;

        for (let i = 0; i < layers.length; i += 1) {
          const gi = baseLayer + i;
          const L = layers[i];
          const y = gi * LAYER_H - camY;
          if (y < -70 || y > 430) continue;
          const gx = wrapX(L.gx + rot);
          const leftW = Math.max(0, gx - GAP / 2);
          const rightX = gx + GAP / 2;
          const rightW = Math.max(0, W - rightX);
          api.rect(0, y - 8 + sx * 0.4, leftW, 16, 'rgba(143,160,180,0.42)');
          api.rect(rightX, y - 8 + sx * 0.4, rightW, 16, 'rgba(143,160,180,0.42)');
          for (let s = 0; s * 26 < GAP / 2 + RED; s += 1) {
            const off = GAP / 2 + 6 + s * 18;
            if (L.redSide === 1 && leftW - off > -8) api.circle(leftW - off, y - 10 + sx * 0.4, 5, C.warn);
            if (L.redSide === -1 && rightX + off < W + 8) api.circle(rightX + off, y - 10 + sx * 0.4, 5, C.warn);
          }
          api.circle(gx, y, GAP / 2, 'rgba(0,0,0,0.35)');
          api.circle(gx, y, GAP / 2 - 3, 'rgba(106,169,255,0.10)');
        }

        for (let i = 0; i < trail.length; i += 1) {
          const t = trail[i];
          api.circle(BX, t.y - camY, 4 + 6 * (t.t / 0.3), 'rgba(255,255,255,0.07)');
        }
        const by = ballY - camY;
        api.circle(BX, by, RAD + 8 + pulse * 6, 'rgba(255,207,92,0.16)');
        api.circle(BX, by, RAD, resting ? C.accent2 : C.fg);
        api.circle(BX - 3, by - 3, 3, 'rgba(255,255,255,0.7)');

        for (let i = 0; i < parts.length; i += 1) {
          const q = parts[i];
          api.circle(q.x, q.y - camY, q.r * (0.5 + q.t / q.max), q.t > 0.25 ? q.c : 'rgba(255,255,255,0.2)');
        }
        for (let i = 0; i < floats.length; i += 1) {
          const f = floats[i];
          api.text(f.text, f.x, f.y - camY, { size: 12, color: f.t > 0.3 ? f.c : C.dim, align: 'center', weight: 'bold' });
        }

        api.text('LEFT / RIGHT rotate the tower', 240, 22, { size: 11, color: C.dim, align: 'center' });
        if (combo >= 2) {
          api.text('COMBO x' + combo, 240, 44, { size: 14, color: comboT > 0.5 ? C.accent2 : C.dim, align: 'center', weight: 'bold' });
          api.rect(198, 55, 84 * Math.max(0, comboT / 1.5), 3, comboT > 0.5 ? C.good : C.warn);
        }
        api.text(String(passed), 30, 320, { size: 20, color: C.good, weight: 'bold' });
        api.text('LAYERS', 30, 338, { size: 9, color: C.dim });
        api.text('BEST x' + best, 450, 320, { size: 11, color: C.dim, align: 'right' });
        if (clank > 0) api.text('THUD', BX, 300, { size: 13, color: C.warn, align: 'center', weight: 'bold' });
        api.text(resting ? 'rotate the gap under the ball' : 'falling', 240, 346, {
          size: 10,
          color: resting ? C.accent2 : C.dim,
          align: 'center',
        });
        if (flash > 0) api.rect(0, 357, 480, 3, flashColor);
      },

      dispose() {
        offKey();
        offPointer();
      },
    };
  },
});
