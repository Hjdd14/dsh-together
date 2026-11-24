defineGame({
  id: 'blackjack',
  create(api) {
    const C = api.colors
    const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11]
    const HIT = { x: 70, y: 286, w: 130, h: 48 }
    const STAND = { x: 280, y: 286, w: 130, h: 48 }
    const BANDS = ['rgba(106,169,255,0.06)', 'rgba(106,169,255,0.03)', 'rgba(255,207,92,0.035)', 'rgba(106,169,255,0.018)']
    let me = []
    let ai = []
    let phase = 'play'
    let msg = 'HIT OR STAND'
    let msgColor = C.dim
    let resetAt = 0
    let dealerAt = 0
    let scored = false
    let anim = null
    let flash = null
    let pop = null
    const fx = []

    function deal() {
      return api.pick(VALUES)
    }

    function sumOf(hand) {
      let s = 0
      let aces = 0
      for (let i = 0; i < hand.length; i += 1) {
        s += hand[i]
        if (hand[i] === 11) aces += 1
      }
      while (s > 21 && aces > 0) {
        s -= 10
        aces -= 1
      }
      return s
    }

    function burst(x, y, n, color) {
      for (let k = 0; k < n; k += 1) fx.push({ x: x, y: y, vx: api.rnd(-90, 90), vy: api.rnd(-130, -30), t: 0, c: color })
      while (fx.length > 26) fx.shift()
    }

    function newHand() {
      me = [deal(), deal()]
      ai = [deal(), deal()]
      phase = 'play'
      resetAt = 0
      dealerAt = 0
      scored = false
      anim = { who: 'me', t: 0 }
      flash = null
      pop = null
      fx.length = 0
      msg = 'HIT OR STAND'
      msgColor = C.dim
    }
    newHand()

    function tick(dt) {
      for (let k = fx.length - 1; k >= 0; k -= 1) {
        const p = fx[k]
        p.t += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 260 * dt
        if (p.t > 0.75) fx.splice(k, 1)
      }
      if (anim) { anim.t += dt; if (anim.t > 0.3) anim = null }
      if (flash) { flash.t += dt; if (flash.t > 0.6) flash = null }
      if (pop) { pop.t += dt; if (pop.t > 0.9) pop = null }
    }

    function finish() {
      phase = 'done'
      const mine = sumOf(me)
      const theirs = sumOf(ai)
      if (theirs > 21 || mine > theirs) {
        msg = 'WIN ' + mine + ' VS ' + theirs
        msgColor = C.good
        flash = { ok: true, t: 0 }
        pop = { text: 'WIN +1', color: C.good, t: 0 }
        for (let i = 0; i < me.length; i += 1) burst(230 + i * 20, 200, 3, C.good)
        if (!scored) { scored = true; api.progress(1) }
      } else if (mine === theirs) {
        msg = 'PUSH ' + mine + ' - NEW HAND'
        msgColor = C.accent
        resetAt = api.now() + 1300
      } else {
        msg = 'LOSE ' + mine + ' VS ' + theirs
        msgColor = C.warn
        flash = { ok: false, t: 0 }
        resetAt = api.now() + 1300
      }
    }

    function stand() {
      if (phase !== 'play') return
      phase = 'dealer'
      dealerAt = api.now() + 320
      msg = 'DEALER DRAWS...'
      msgColor = C.accent2
    }

    function hit() {
      if (phase !== 'play') return
      me.push(deal())
      anim = { who: 'me', t: 0 }
      const s = sumOf(me)
      if (s > 21) {
        phase = 'done'
        msg = 'BUST ' + s + ' - NEW HAND'
        msgColor = C.warn
        flash = { ok: false, t: 0 }
        pop = { text: 'BUST', color: C.warn, t: 0 }
        resetAt = api.now() + 1200
        return
      }
      if (s === 21) {
        stand()
        return
      }
      msg = 'YOUR TOTAL ' + s
      msgColor = C.fg
    }

    api.onPointer(function (ev) {
      if (ev.type !== 'down' || resetAt) return
      if (!(ev.x >= 0 && ev.x <= api.w && ev.y >= 0 && ev.y <= api.h)) return
      if (ev.x > HIT.x && ev.x < HIT.x + HIT.w && ev.y > HIT.y && ev.y < HIT.y + HIT.h) hit()
      else if (ev.x > STAND.x && ev.x < STAND.x + STAND.w && ev.y > STAND.y && ev.y < STAND.y + STAND.h) stand()
    })

    function cards(hand, y, color, who) {
      const total = hand.length * 54 - 8
      const x0 = 240 - total / 2
      for (let i = 0; i < hand.length; i += 1) {
        let dx = 0
        if (anim && anim.who === who && i === hand.length - 1) dx = 46 * (1 - Math.min(1, anim.t / 0.28))
        const x = x0 + i * 54 + dx
        api.rect(x, y, 46, 64, C.panel)
        api.rect(x + 3, y + 3, 40, 58, color)
        api.text(String(hand[i]), x + 23, y + 33, { size: 22, color: C.bg, align: 'center', weight: 'bold' })
      }
    }

    return {
      update(dt) {
        tick(dt)
        if (resetAt && api.now() >= resetAt) { newHand(); return }
        if (phase === 'dealer' && api.now() >= dealerAt) {
          if (sumOf(ai) < 17) {
            ai.push(deal())
            anim = { who: 'ai', t: 0 }
            dealerAt = api.now() + 340
          } else {
            finish()
          }
        }
      },
      draw() {
        api.clear(C.bg)
        const bk = Math.floor(api.now() / 800)
        api.rect(0, 0, api.w, 150, BANDS[bk % 4])
        api.rect(0, 210, api.w, 150, BANDS[(bk + 2) % 4])
        if (flash) {
          const a = flash.ok
            ? (flash.t < 0.25 ? 'rgba(139,220,122,0.20)' : 'rgba(139,220,122,0.07)')
            : (flash.t < 0.25 ? 'rgba(255,122,122,0.20)' : 'rgba(255,122,122,0.07)')
          api.rect(0, 0, api.w, api.h, a)
        }
        api.text('BLACKJACK - WIN ONE HAND', 16, 22, { size: 14, color: C.dim, weight: 'bold' })
        api.text('DEALER ' + sumOf(ai), 16, 44, { size: 13, color: C.accent2, weight: 'bold' })
        cards(ai, 56, 'rgba(255,207,92,0.85)', 'ai')
        api.text('YOU ' + sumOf(me), 16, 208, { size: 13, color: C.accent, weight: 'bold' })
        cards(me, 172, 'rgba(106,169,255,0.85)', 'me')
        const live = phase === 'play' && !resetAt
        api.rect(HIT.x, HIT.y, HIT.w, HIT.h, live ? C.good : C.panel)
        api.text('HIT', HIT.x + HIT.w / 2, HIT.y + HIT.h / 2, { size: 19, color: live ? C.bg : C.dim, align: 'center', weight: 'bold' })
        api.rect(STAND.x, STAND.y, STAND.w, STAND.h, live ? C.accent2 : C.panel)
        api.text('STAND', STAND.x + STAND.w / 2, STAND.y + STAND.h / 2, { size: 19, color: live ? C.bg : C.dim, align: 'center', weight: 'bold' })
        if (phase === 'dealer') {
          const on = Math.floor(api.now() / 200) % 3
          for (let k = 0; k < 3; k += 1) api.circle(240 + k * 12, 262, k === on ? 4 : 2.5, k === on ? C.accent2 : C.dim)
        }
        for (let k = 0; k < fx.length; k += 1) api.circle(fx[k].x, fx[k].y, 1 + 2.4 * (1 - fx[k].t / 0.75), fx[k].c)
        if (pop) api.text(pop.text, 240, 250 - pop.t * 12, { size: 22, color: pop.color, align: 'center', weight: 'bold' })
        api.text(msg, 240, 348, { size: 13, color: msgColor, align: 'center', weight: 'bold' })
      },
    }
  },
})
