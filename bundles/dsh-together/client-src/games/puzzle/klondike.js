defineGame({
  id: 'klondike',
  create(api) {
    const C = api.colors;
    const COLS = 7;
    const CW = 62;
    const CH = 52;
    const STEP_X = 66;
    const OX = 14;
    const OY = 58;
    const STEP_Y = 22;
    const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8'];
    const SUIT = ['\u2660', '\u2665', '\u2666', '\u2663'];
    const cols = [];
    for (let i = 0; i < COLS; i += 1) cols.push([]);

    function deal() {
      for (let i = 0; i < COLS; i += 1) cols[i] = [];
      const aCol = api.irnd(0, COLS - 1);
      const others = [];
      for (let i = 0; i < COLS; i += 1) if (i !== aCol) others.push(i);
      for (let i = others.length - 1; i > 0; i -= 1) {
        const j = api.irnd(0, i);
        const t = others[i];
        others[i] = others[j];
        others[j] = t;
      }
      const bury = [3, 5, 7];
      for (let k = 0; k < 4; k += 1) {
        cols[aCol].push({ r: k === 0 ? 1 : bury[k - 1], s: api.irnd(0, 3) });
      }
      for (let k = 0; k < 3; k += 1) {
        const col = cols[others[k]];
        col.push({ r: api.irnd(2, 8), s: api.irnd(0, 3) });
        col.push({ r: bury[k] + 1, s: api.irnd(0, 3) });
      }
      for (let k = 3; k < 6; k += 1) {
        cols[others[k]].push({ r: api.irnd(2, 8), s: api.irnd(0, 3) });
      }
    }
    deal();

    let sel = -1;
    let hover = -1;
    let shake = 0;
    let moves = 0;
    let anim = null;
    let flight = null;
    let done = false;
    let deadT = 0;
    const fx = [];
    const rings = [];
    const pops = [];
    const notes = [];

    function rgba(rgb, a) {
      return 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    }
    function topOf(i) { return cols[i].length ? cols[i][cols[i].length - 1] : null; }
    function cardX(i) {
      return OX + i * STEP_X;
    }
    function cardY(i, k) {
      return OY + k * STEP_Y;
    }
    function isRed(card) { return card.s === 1 || card.s === 2; }
    function burst(x, y, rgb, n) {
      for (let i = 0; i < n; i += 1) {
        if (fx.length > 90) fx.shift();
        fx.push({
          x: x, y: y,
          vx: api.rnd(-130, 130), vy: api.rnd(-150, 40),
          born: api.now(), life: api.rnd(250, 520), rgb: rgb, r: api.rnd(2, 4.4),
        });
      }
    }
    function note(text, rgb) {
      notes.length = 0;
      notes.push({ text: text, rgb: rgb, born: api.now(), life: 820 });
    }
    function deadEnd() {
      const tops = [];
      for (let i = 0; i < COLS; i += 1) {
        const t = topOf(i);
        tops.push(t ? t.r : 0);
      }
      for (let i = 0; i < COLS; i += 1) {
        if (tops[i] === 0) continue;
        if (tops[i] === 1) return false;
        for (let j = 0; j < COLS; j += 1) {
          if (i !== j && tops[j] === tops[i] + 1) return false;
        }
      }
      return true;
    }
    function pop(i) {
      if (pops.length > 24) pops.shift();
      pops.push({ key: i, born: api.now(), life: 200 });
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
    function tryMove(from, to) {
      const card = topOf(from);
      const dest = topOf(to);
      if (!card) return;
      if (dest && dest.r !== card.r + 1) {
        shake = Math.min(1, shake + 0.45);
        note('NO FIT', '255,122,122');
        return;
      }
      if (!dest) return;
      cols[from].pop();
      cols[to].push(card);
      moves += 1;
      anim = { from: from, to: to, born: api.now(), life: 160, card: card };
      pop(to);
      burst(cardX(to) + CW / 2, cardY(to, cols[to].length - 1) + CH / 2, isRed(card) ? '255,122,122' : '106,169,255', 5);
      note('MOVE', '143,160,180');
    }
    function sendAce(from) {
      const card = topOf(from);
      if (!card || card.r !== 1 || done) return;
      cols[from].pop();
      done = true;
      anim = null;
      flight = { from: from, card: card, born: api.now(), life: 380 };
      burst(cardX(from) + CW / 2, cardY(from, cols[from].length) + CH / 2, '255,207,92', 16);
      if (rings.length > 20) rings.shift();
      rings.push({ x: 430, y: 30, born: api.now(), life: 520 });
      note('ACE!', '255,207,92');
    }

    api.onPointer((p) => {
      if (p.type === 'move') {
        const c = Math.floor((p.x - OX) / STEP_X);
        hover = c >= 0 && c < COLS ? c : -1;
        return;
      }
      if (p.type !== 'down') return;
      const c = Math.floor((p.x - OX) / STEP_X);
      if (c < 0 || c >= COLS) return;
      if (p.x - OX - c * STEP_X > CW) return;
      const top = topOf(c);
      if (top && top.r === 1) {
        sendAce(c);
        return;
      }
      if (sel >= 0 && sel !== c) {
        tryMove(sel, c);
        sel = -1;
        return;
      }
      if (sel === c) {
        sel = -1;
        return;
      }
      if (!top) {
        shake = Math.min(1, shake + 0.3);
        return;
      }
      sel = c;
    });

    api.onKey((key, isDown) => {
      if (!isDown) return;
      if (key === 'escape') sel = -1;
      if (key === 'space') {
        deal();
        sel = -1;
        anim = null;
        deadT = 0;
        note('NEW DEAL', '143,160,180');
      }
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
        if (!done && !flight && !anim && deadEnd()) {
          if (deadT === 0) deadT = now + 900;
          if (now >= deadT) {
            deadT = 0;
            deal();
            sel = -1;
            shake = Math.min(1, shake + 0.6);
            note('NEW DEAL', '255,122,122');
          }
        }
        if (flight && !flight.done && now - flight.born >= flight.life) {
          flight.done = true;
          api.progress(1);
        }
      },
      draw(g) {
        const now = api.now();
        api.clear(C.bg);
        api.rect(0, 0, 480, 360, 'rgba(139,220,122,' + (0.01 + 0.022 * (0.5 + 0.5 * Math.sin(now / 1300))).toFixed(3) + ')');
        const amp = shake * 5;
        if (amp > 0.2) {
          g.save();
          g.translate(Math.sin(now / 18) * amp, Math.cos(now / 25) * amp * 0.5);
        }
        api.rect(396, 8, 70, 44, 'rgba(255,255,255,0.05)');
        api.text('A', 431, 30, { size: 18, color: C.accent2, align: 'center', weight: 'bold' });
        api.text('moves ' + moves, 240, 30, { size: 12, color: C.dim, align: 'center' });
        for (let i = 0; i < COLS; i += 1) {
          const px = cardX(i);
          api.rect(px, OY, CW, CH, 'rgba(255,255,255,0.03)');
          if (i === hover) api.rect(px, OY, CW, CH, 'rgba(232,238,246,0.07)');
          if (i === sel) {
            api.rect(px, OY, CW, 2, C.fg);
            api.rect(px, OY + CH - 2, CW, 2, C.fg);
          }
          const list = cols[i];
          for (let k = 0; k < list.length; k += 1) {
            const card = list[k];
            const s = scaleFor(i, now);
            const w = CW * s;
            const x = px + (CW - w) / 2;
            const y = cardY(i, k) + (CH - CH * s) / 2;
            const col = isRed(card) ? 'rgba(255,122,122,0.92)' : 'rgba(232,238,246,0.92)';
            api.rect(x, y, w, CH * s, C.panel);
            api.rect(x + 2, y + 2, w - 4, CH * s - 4, 'rgba(255,255,255,0.06)');
            if (k === list.length - 1) api.rect(x + 2, y + 2, w - 4, 2, col);
            api.text(RANK[card.r], x + 10, y + 14, { size: 15, color: col, weight: 'bold' });
            api.text(SUIT[card.s], x + 10, y + 32, { size: 14, color: col });
            if (k === list.length - 1) api.text(SUIT[card.s], x + w - 14, y + CH * s - 14, { size: 14, color: col, align: 'center' });
          }
        }
        if (anim) {
          const t = Math.min(1, (now - anim.born) / anim.life);
          const e = 1 - (1 - t) * (1 - t);
          const x0 = cardX(anim.from);
          const x1 = cardX(anim.to);
          const x = x0 + (x1 - x0) * e;
          const y = cardY(anim.from, cols[anim.from].length) + (CH - CH) / 2;
          const col = isRed(anim.card) ? 'rgba(255,122,122,0.92)' : 'rgba(232,238,246,0.92)';
          api.rect(x, y, CW, CH, C.panel);
          api.rect(x + 2, y + 2, CW - 4, CH - 4, 'rgba(255,255,255,0.07)');
          api.text(RANK[anim.card.r], x + 10, y + 14, { size: 15, color: col, weight: 'bold' });
          api.text(SUIT[anim.card.s], x + 10, y + 32, { size: 14, color: col });
        }
        if (flight) {
          const t = Math.min(1, (now - flight.born) / flight.life);
          const e = 1 - (1 - t) * (1 - t);
          const x = cardX(flight.from) + (396 - cardX(flight.from)) * e;
          const y = cardY(flight.from, 0) + (8 - cardY(flight.from, 0)) * e;
          api.rect(x, y, CW, CH, 'rgba(255,207,92,0.9)');
          api.text(RANK[flight.card.r], x + 10, y + 14, { size: 15, color: C.bg, weight: 'bold' });
        }
        for (let i = 0; i < rings.length; i += 1) {
          const r = rings[i];
          const k = (now - r.born) / r.life;
          if (k >= 1) continue;
          api.circle(r.x, r.y, 40 * (1 + 2 * k), rgba('255,207,92', 0.3 * (1 - k)));
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
          api.text(t.text, 240, 176 - k * 12, { size: 20, color: rgba(t.rgb, 1 - k), align: 'center', weight: 'bold' });
        }
        if (amp > 0.2) g.restore();
        api.text('click a top card, then a column (rank +1) · space = new deal', 240, 348, { size: 10, color: C.dim, align: 'center' });
      },
    };
  },
});
