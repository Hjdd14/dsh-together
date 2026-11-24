defineGame({
  id: 'sortalpha',
  create(api) {
    const C = api.colors
    const ALPHA = 'abcdefghijklmnopqrstuvwxyz'
    const TW = 78
    const GAP = 14
    const TY = 118
    const TH = 78
    const X0 = 63
    let cards = []
    let dragIdx = -1
    let dragX = 0
    let dragY = 0
    let done = 0
    let combo = 0
    let best = 0
    let pace = 0
    let t = 0
    let slide = 1
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let timer = 0
    let swaps = 0
    const parts = []

    function paceMax() {
      return Math.max(3.5, 9 - combo * 0.6)
    }

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(50, 190)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
          life: api.rnd(0.45, 0.95), age: 0, r: api.rnd(1.5, 3.2),
        })
      }
      while (parts.length > 72) parts.shift()
    }

    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.75
    }

    function slotX(i) {
      return X0 + i * (TW + GAP)
    }

    function order() {
      let out = ''
      for (let i = 0; i < cards.length; i += 1) out += cards[i].ch
      return out
    }

    function sortedOrder() {
      const arr = []
      for (let i = 0; i < cards.length; i += 1) arr.push(cards[i].ch)
      arr.sort()
      return arr.join('')
    }

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = api.irnd(0, i)
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
      }
      return arr
    }

    function newGroup() {
      const pool = shuffle(ALPHA.split('')).slice(0, 4)
      if (pool.join('') === pool.slice().sort().join('')) {
        const tmp = pool[0]
        pool[0] = pool[1]
        pool[1] = tmp
      }
      cards = []
      for (let i = 0; i < pool.length; i += 1) cards.push({ ch: pool[i], bounce: 0 })
      dragIdx = -1
      timer = 0
      swaps = 0
      slide = 1
      pace = 0
    }

    newGroup()

    function hit(px, py) {
      if (py < TY || py > TY + TH) return -1
      const idx = Math.floor((px - X0) / (TW + GAP))
      if (idx < 0 || idx > 3) return -1
      if (px - X0 - idx * (TW + GAP) > TW) return -1
      return idx
    }

    function nearest(px) {
      const i = Math.round((px - X0 - TW / 2) / (TW + GAP))
      return i < 0 ? 0 : i > 3 ? 3 : i
    }

    function settle() {
      if (order() !== sortedOrder()) return
      done += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      pace = 0
      okFlash = true
      flashT = 0.55
      timer = 0.9
      pop(combo >= 6 ? 'PERFECT' : combo >= 3 ? 'STREAK x' + combo : 'SORTED', C.good)
      burst(240, TY + TH / 2, 16 + Math.min(14, combo * 2))
    }

    api.onPointer((ev) => {
      if (timer > 0) return
      if (ev.type === 'down') {
        const idx = hit(ev.x, ev.y)
        if (idx < 0) return
        dragIdx = idx
        dragX = ev.x
        dragY = ev.y
        return
      }
      if (ev.type === 'move') {
        if (dragIdx < 0) return
        dragX = ev.x
        dragY = ev.y
        return
      }
      if (ev.type !== 'up' || dragIdx < 0) return
      let idx = hit(ev.x, ev.y)
      if (idx < 0 && ev.y > TY - 40 && ev.y < TY + TH + 40) idx = nearest(ev.x)
      if (idx >= 0 && idx !== dragIdx) {
        const tmp = cards[dragIdx]
        cards[dragIdx] = cards[idx]
        cards[idx] = tmp
        cards[dragIdx].bounce = 1
        cards[idx].bounce = 1
        swaps += 1
        flashT = 0.18
        okFlash = true
      }
      dragIdx = -1
      settle()
    })

    function bands() {
      for (let i = 0; i < 3; i += 1) {
        const y = ((t * 8 + i * 150) % 460) - 70
        api.rect(0, y, api.w, 110, 'rgba(106,169,255,0.04)')
      }
    }

    return {
      update(dt) {
        t += dt
        slide = Math.max(0, slide - dt * 4.5)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        if (timer > 0) {
          timer = Math.max(0, timer - dt)
          if (timer === 0) newGroup()
        }
        pace += dt
        if (pace > paceMax()) {
          pace = 0
          combo = 0
          pop('TOO SLOW', C.dim)
        }
        for (let i = 0; i < cards.length; i += 1) {
          if (cards[i].bounce > 0) cards[i].bounce = Math.max(0, cards[i].bounce - dt * 3.2)
        }
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 320 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw(g) {
        api.clear(C.bg)
        bands()
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('SORT A-Z', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('groups ' + done, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 90, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        const target = sortedOrder()
        const hover = dragIdx >= 0 && dragY > TY - 40 && dragY < TY + TH + 40 ? nearest(dragX) : -1
        for (let i = 0; i < cards.length; i += 1) {
          const card = cards[i]
          const baseX = slotX(i)
          api.rect(baseX, TY, TW, TH, i === hover ? 'rgba(106,169,255,0.18)' : C.panel)
          api.rect(baseX, TY, TW, 3, i === dragIdx ? C.accent2 : i === hover ? C.accent2 : flashT > 0 && okFlash ? C.good : C.dim)
          if (i !== dragIdx) {
            const lift = -Math.sin(Math.PI * card.bounce) * 9
            api.text(card.ch.toUpperCase(), baseX + TW / 2, TY + TH / 2 + 1 - lift, {
              size: 34, color: C.fg, align: 'center', weight: 'bold',
            })
          }
          if (target.indexOf(card.ch) === i) api.circle(baseX + TW / 2, TY + TH + 16, 5, C.good)
        }
        if (dragIdx >= 0) {
          const ch = cards[dragIdx].ch
          api.rect(dragX - TW / 2, dragY - TH / 2, TW, TH, C.accent)
          api.text(ch.toUpperCase(), dragX, dragY + 1, { size: 34, color: '#0d1218', align: 'center', weight: 'bold' })
        }
        const mid = (slotX(0) + slotX(3) + TW) / 2
        api.text('drag one tile onto another to swap', mid, 236, { size: 13, color: C.dim, align: 'center' })
        api.text('a → z', mid, 262, { size: 16, color: C.accent2, align: 'center', weight: 'bold' })
        g.strokeStyle = C.dim
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(slotX(0), TY + TH + 30)
        g.lineTo(slotX(3) + TW, TY + TH + 30)
        g.stroke()
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, mid, 292, {
            size: 15 + popT * 11, color: popColor, align: 'center', weight: 'bold',
          })
        }
        api.rect(140, 316, 200, 6, C.panel)
        api.rect(140, 316, 200 * Math.min(1, pace / paceMax()), 6, pace / paceMax() > 0.7 ? C.warn : C.accent)
        api.rect(0, api.h - 24, api.w, 24, C.panel)
        let foot = 'swaps ' + swaps + ' · combo ' + combo + ' · best ' + best
        let col = C.dim
        if (timer > 0) {
          foot = 'SORTED'
          col = C.good
        }
        api.text(foot, api.w / 2, api.h - 12, { size: 11, color: col, align: 'center', weight: 'bold' })
      },
    }
  },
})
