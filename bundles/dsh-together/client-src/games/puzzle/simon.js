defineGame({
  id: 'simon',
  create(api) {
    const C = api.colors;
    const PW = 168;
    const PH = 136;
    const GAP = 12;
    const OX = 66;
    const OY = 52;
    const TONE = ['rgba(106,169,255,1)', 'rgba(255,207,92,1)', 'rgba(139,220,122,1)', 'rgba(255,122,122,1)'];
    const DIM = ['rgba(106,169,255,0.52)', 'rgba(255,207,92,0.52)', 'rgba(139,220,122,0.52)', 'rgba(255,122,122,0.52)'];
    const RGB = ['106,169,255', '255,207,92', '139,220,122', '255,122,122'];
    let seq = [];
    let phase = 'show';
    let t = 0;
    let lit = -1;
    let step = 0;
    let best = 0;
    let flash = 0;
    let shake = 0;
    let hover = -1;

    const fx = [];
    const rings = [];
    const notes = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function padRect(pad) {
      const col = pad % 2;
      const row = (pad - col) / 2;
      return { x: OX + col * (PW + GAP), y: OY + row * (PH + GAP) };
    }
    function burst(pad, n) {
      const r = padRect(pad);
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 70) fx.shift();
        fx.push({
          x: r.x + PW / 2, y: r.y + PH / 2,
          vx: api.rnd(-130, 130), vy: api.rnd(-150, 60),
          born: api.now(), life: api.rnd(240, 480), rgb: RGB[pad], r: api.rnd(2, 4),
        });
      }
    }
    function ring(pad) {
      if (rings.length > 16) rings.shift();
      const r = padRect(pad);
      rings.push({ x: r.x + PW / 2, y: r.y + PH / 2, born: api.now(), life: 380, rgb: RGB[pad] });
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 760 });
    }
    function makeSeq(n) {
      const out = [];
      for (let i = 0; i < n; i += 1) {
        let v = api.irnd(0, 3);
        if (i > 0 && v === out[i - 1]) v = (v + 1) % 4;
        out.push(v);
      }
      return out;
    }
    function replay() {
      phase = 'show';
      t = 0;
      step = 0;
      lit = -1;
    }

    seq = makeSeq(4);

    api.onPointer((p) => {
      if (p.type === 'move') {
        const col = Math.floor((p.x - OX) / (PW + GAP));
        const row = Math.floor((p.y - OY) / (PH + GAP));
        hover = col >= 0 && row >= 0 && col < 2 && row < 2 ? row * 2 + col : -1;
        return;
      }
      if (p.type !== 'down' || phase !== 'input') return;
      const col = Math.floor((p.x - OX) / (PW + GAP));
      const row = Math.floor((p.y - OY) / (PH + GAP));
      if (col < 0 || row < 0 || col > 1 || row > 1) return;
      if (p.x - OX - col * (PW + GAP) > PW) return;
      if (p.y - OY - row * (PH + GAP) > PH) return;
      const pad = row * 2 + col;
      if (pad === seq[step]) {
        step += 1;
        lit = pad;
        flash = 0.22;
        burst(pad, 6);
        ring(pad);
        if (step > best) {
          best = step;
          api.progress(1);
        }
        note(step >= seq.length ? 'NICE' : 'GOOD', '139,220,122');
        if (step >= seq.length) {
          seq = makeSeq(Math.min(seq.length + 1, 6));
          replay();
        }
      } else {
        shake = 1;
        note('WRONG', '255,122,122');
        lit = pad;
        flash = 0.4;
        burst(pad, 10);
        replay();
      }
    });

    return {
      update(dt) {
        const now = api.now();
        if (flash > 0) {
          flash -= dt;
          if (flash <= 0 && phase === 'input') lit = -1;
        }
        if (shake > 0) shake = Math.max(0, shake - dt * 3);
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
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].born >= notes[i].life) notes.splice(i, 1);
        if (phase !== 'show') return;
        t += dt;
        const slot = 0.6;
        const idx = Math.floor(t / slot);
        if (idx >= seq.length) {
          phase = 'input';
          lit = -1;
          t = 0;
          flash = 0;
          return;
        }
        const frac = t - idx * slot;
        lit = frac < 0.42 ? seq[idx] : -1;
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(106,169,255,' + (0.012 + 0.024 * (0.5 + 0.5 * Math.sin(now / 1250))).toFixed(3) + ')');
        const amp = shake * 6;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 16) * amp, 0);
        }
        api.text(phase === 'show' ? 'watch the flashes' : 'your turn ' + step + ' / ' + seq.length, 240, 24, {
          size: 14, color: C.dim, align: 'center',
        });
        for (let pad = 0; pad < 4; pad += 1) {
          const r = padRect(pad);
          const on = pad === lit;
          api.rect(r.x, r.y, PW, PH, on ? TONE[pad] : 'rgba(255,255,255,0.05)');
          api.circle(r.x + PW / 2, r.y + PH / 2, 26, on ? 'rgba(16,20,24,0.5)' : DIM[pad]);
          if (pad === hover && phase === 'input') {
            api.rect(r.x + 3, r.y + 3, PW - 6, 3, 'rgba(232,238,246,0.5)');
            api.rect(r.x + 3, r.y + PH - 6, PW - 6, 3, 'rgba(232,238,246,0.5)');
          }
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, 40 + 80 * k, rgba(r.rgb, 0.28 * (1 - k)));
        }
        for (let i = 0; i < fx.length; i += 1) {
          const p = fx[i];
          const k = 1 - (now - p.born) / p.life;
          if (k <= 0) continue;
          api.circle(p.x, p.y, p.r * k + 0.6, rgba(p.rgb, k * 0.85));
        }
        const dots = seq.length;
        for (let i = 0; i < dots; i += 1) {
          const cx = 240 + (i - (dots - 1) / 2) * 18;
          api.circle(cx, 40, 5, i < step ? C.good : 'rgba(255,255,255,0.16)');
        }
        for (let i = 0; i < notes.length; i += 1) {
          const t2 = notes[i];
          const k = (now - t2.born) / t2.life;
          if (k >= 1) continue;
          api.text(t2.text, 240, 152 - k * 12 - i * 20, { size: 22, color: rgba(t2.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('repeat the flashes', 240, 356, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
