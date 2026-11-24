defineGame({
  id: 'boggle',
  create(api) {
    const C = api.colors
    const DICT = [
      'bag', 'bat', 'bed', 'bet', 'bid', 'big', 'bit', 'bog', 'bug', 'bus', 'but', 'cab',
      'cap', 'car', 'cat', 'cob', 'cod', 'cog', 'cop', 'cot', 'cup', 'cut', 'dad', 'dam',
      'den', 'did', 'dig', 'dim', 'dip', 'dog', 'dot', 'ear', 'eat', 'egg', 'end', 'era',
      'eye', 'fan', 'far', 'fat', 'fed', 'fee', 'few', 'fig', 'fin', 'fit', 'fix', 'fog',
      'fox', 'fun', 'fur', 'gap', 'gas', 'gem', 'get', 'got', 'gum', 'gun', 'hat', 'hen',
      'her', 'hid', 'him', 'hip', 'hit', 'hug', 'hut', 'ice', 'ink', 'jam', 'jar', 'jet',
      'job', 'jog', 'key', 'kid', 'kit', 'lab', 'lad', 'lap', 'law', 'leg', 'let', 'lid',
      'lip', 'log', 'lot', 'low', 'man', 'map', 'mat', 'men', 'met', 'mix', 'mob', 'mop',
      'mud', 'nap', 'net', 'new', 'nut', 'oak', 'oar', 'oat', 'odd', 'oil', 'old', 'one',
      'out', 'own', 'pad', 'pan', 'pat', 'pay', 'pen', 'pet', 'pie', 'pig', 'pin', 'pit',
      'pop', 'pot', 'pub', 'put', 'rag', 'ram', 'rap', 'rat', 'raw', 'red', 'rib', 'rid',
      'rig', 'rip', 'rob', 'rod', 'row', 'rub', 'rug', 'run', 'sad', 'sap', 'sat', 'saw',
      'say', 'sea', 'see', 'set', 'sip', 'sit', 'six', 'ski', 'sky', 'sob', 'son', 'sow',
      'spa', 'spy', 'sum', 'sun', 'tab', 'tag', 'tan', 'tap', 'tar', 'tea', 'ten', 'tie',
      'tin', 'tip', 'toe', 'ton', 'top', 'toy', 'try', 'tub', 'tug', 'two', 'use', 'van',
      'vat', 'vet', 'war', 'was', 'way', 'web', 'wet', 'who', 'why', 'wig', 'win', 'wit',
      'won', 'yak', 'yes', 'yet', 'you', 'zap', 'zip', 'zoo',
      'able', 'army', 'back', 'ball', 'band', 'bank', 'base', 'bear', 'beat', 'bell', 'belt',
      'best', 'bike', 'bird', 'blue', 'boat', 'body', 'bone', 'book', 'boot', 'bowl', 'cake',
      'call', 'calm', 'camp', 'card', 'care', 'case', 'cash', 'cast', 'cave', 'chat', 'chip',
      'city', 'club', 'coal', 'coat', 'code', 'cold', 'come', 'cook', 'copy', 'cord', 'core',
      'cost', 'dark', 'data', 'date', 'deal', 'dear', 'deep', 'desk', 'does', 'done', 'door',
      'down', 'draw', 'drop', 'dust', 'each', 'earn', 'east', 'easy', 'edge', 'even', 'fire',
      'fish', 'five', 'flat', 'food', 'foot', 'form', 'free', 'game', 'gate', 'gift', 'girl',
      'give', 'gold', 'good', 'grow', 'hair', 'half', 'hall', 'hand', 'hard', 'head', 'hear',
      'heat', 'help', 'here', 'hero', 'high', 'hill', 'home', 'hope', 'host', 'hour', 'huge',
      'idea', 'iron', 'item', 'join', 'jump', 'keep', 'kind', 'king', 'knee', 'know', 'lake',
      'land', 'lane', 'last', 'late', 'lead', 'life', 'lift', 'like', 'line', 'link', 'list',
      'live', 'load', 'lock', 'long', 'look', 'lose', 'love', 'luck', 'main', 'make', 'meal',
      'mean', 'meat', 'meet', 'menu', 'mile', 'milk', 'mind', 'mine', 'miss', 'moon', 'more',
      'move', 'name', 'near', 'neck', 'need', 'news', 'next', 'nice', 'nine', 'note', 'open',
      'over', 'page', 'pair', 'park', 'part', 'past', 'path', 'pick', 'plan', 'play', 'plot',
      'plus', 'poem', 'poet', 'pool', 'post', 'pull', 'rain', 'read', 'real', 'rent', 'rest',
      'rice', 'rich', 'ride', 'ring', 'rise', 'risk', 'road', 'rock', 'role', 'roof', 'room',
      'root', 'rose', 'rule', 'safe', 'salt', 'same', 'sand', 'save', 'seat', 'seed', 'sell',
      'send', 'ship', 'shop', 'shot', 'show', 'side', 'sign', 'silk', 'sing', 'sink', 'site',
      'size', 'skin', 'slow', 'snow', 'soft', 'soil', 'song', 'soon', 'sort', 'soul', 'spot',
      'star', 'step', 'stop', 'such', 'suit', 'sure', 'take', 'tale', 'talk', 'tall', 'tape',
      'team', 'tell', 'tend', 'term', 'test', 'text', 'then', 'thin', 'time', 'tiny', 'tone',
      'tool', 'town', 'tree', 'trip', 'true', 'tune', 'turn', 'type', 'unit', 'upon', 'user',
      'vast', 'very', 'view', 'vote', 'wait', 'walk', 'wall', 'want', 'warm', 'wash', 'wave',
      'weak', 'wear', 'week', 'well', 'west', 'what', 'when', 'wide', 'wild', 'wind', 'wine',
      'wing', 'wire', 'wise', 'wish', 'with', 'wood', 'word', 'work', 'yard', 'year', 'your',
    ]
    const ADJ = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
    const LETTERS = 'eeeeeaaaaiiioooouuunnnrrrsssttllldddccmmppbbggffhhvvwwyy'
    const PREFIX = new Set()
    const WORDSET = new Set(DICT)
    for (let i = 0; i < DICT.length; i += 1) {
      for (let k = 1; k <= DICT[i].length; k += 1) PREFIX.add(DICT[i].slice(0, k))
    }
    let cells = []
    let targets = []
    let found = []
    let input = ''
    let solved = 0
    let combo = 0
    let best = 0
    let t = 0
    let slide = 1
    let shakeT = 0
    let flashT = 0
    let okFlash = false
    let popT = 0
    let popMsg = ''
    let popColor = C.good
    let delT = 0
    const parts = []

    function burst(x, y, n) {
      for (let i = 0; i < n; i += 1) {
        const a = api.rnd(0, Math.PI * 2)
        const sp = api.rnd(55, 200)
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 55,
          life: api.rnd(0.45, 0.9), age: 0, r: api.rnd(1.5, 3.2),
        })
      }
      while (parts.length > 72) parts.shift()
    }
    function pop(msg, color) {
      popMsg = msg
      popColor = color
      popT = 0.7
    }

    function enumerate(board) {
      const out = []
      const seen = new Set()
      const walk = (i, path, word) => {
        if (word.length >= 3 && WORDSET.has(word) && !seen.has(word)) {
          seen.add(word)
          out.push(word)
        }
        if (word.length >= 5) return
        const r = Math.floor(i / 3)
        const c = i % 3
        for (let k = 0; k < 8; k += 1) {
          const nr = r + ADJ[k][0]
          const nc = c + ADJ[k][1]
          if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue
          const j = nr * 3 + nc
          if (path.indexOf(j) >= 0) continue
          const next = word + board[j]
          if (!PREFIX.has(next)) continue
          path.push(j)
          walk(j, path, next)
          path.pop()
        }
      }
      for (let i = 0; i < 9; i += 1) walk(i, [i], board[i])
      return out
    }

    function placeWord(board, word) {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const path = [api.irnd(0, 8)]
        let ok = true
        for (let k = 1; k < word.length; k += 1) {
          const i = path[path.length - 1]
          const r = Math.floor(i / 3)
          const c = i % 3
          const opts = []
          for (let d = 0; d < 8; d += 1) {
            const nr = r + ADJ[d][0]
            const nc = c + ADJ[d][1]
            if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue
            const j = nr * 3 + nc
            if (path.indexOf(j) < 0) opts.push(j)
          }
          if (!opts.length) { ok = false; break }
          path.push(opts[api.irnd(0, opts.length - 1)])
        }
        if (!ok) continue
        for (let k = 0; k < word.length; k += 1) board[path[k]] = word[k]
        return true
      }
      return false
    }

    function generate() {
      const fours = []
      for (let i = 0; i < DICT.length; i += 1) if (DICT[i].length === 4) fours.push(DICT[i])
      let fallback = null
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const board = ['', '', '', '', '', '', '', '', '']
        if (!placeWord(board, fours[api.irnd(0, fours.length - 1)])) continue
        for (let i = 0; i < 9; i += 1) {
          if (!board[i]) board[i] = LETTERS[api.irnd(0, LETTERS.length - 1)]
        }
        const words = enumerate(board)
        if (words.length >= 4) return { board, words }
        if (!fallback || words.length > fallback.words.length) fallback = { board, words }
      }
      const safe = ['c', 'a', 't', 'a', 'r', 't', 'e', 's', 'd']
      return fallback || { board: safe, words: enumerate(safe) }
    }

    function newBoard() {
      const made = generate()
      cells = made.board
      targets = made.words
      found = []
      input = ''
      slide = 1
    }
    newBoard()

    function accept(word) {
      found.push(word)
      solved += 1
      api.progress(1)
      combo += 1
      best = Math.max(best, combo)
      okFlash = true
      flashT = 0.3
      burst(130, 190, 12 + Math.min(12, combo * 2))
      pop(combo >= 5 ? 'STREAK x' + combo : 'NICE', C.good)
      if (found.length >= targets.length) {
        pop('CLEAR BOARD', C.accent2)
        newBoard()
      }
    }
    function reject(msg) {
      combo = 0
      okFlash = false
      flashT = 0.36
      shakeT = 0.36
      pop(msg, C.warn)
    }

    const heldKeys = {}
    api.onKey((key, isDown) => {
      if (!isDown) { heldKeys[key] = false; return }
      if (heldKeys[key]) return
      heldKeys[key] = true
      if (key.length === 1 && key >= 'a' && key <= 'z') {
        if (input.length < 5) input += key
        return
      }
      if (key === 'space') {
        if (input.length) { input = input.slice(0, -1); delT = 0.3 }
        return
      }
      if (key === 'escape') {
        if (input.length) { input = ''; delT = 0.3 }
        return
      }
      if (key !== 'enter' || input.length === 0) return
      const word = input
      input = ''
      if (found.indexOf(word) >= 0) { pop('ALREADY FOUND', C.dim); return }
      if (targets.indexOf(word) < 0) {
        reject(word.length < 3 ? 'MIN 3 LETTERS' : 'NOT ON BOARD')
        return
      }
      accept(word)
    })

    return {
      update(dt) {
        t += dt
        slide = Math.max(0, slide - dt * 5)
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt)
        if (flashT > 0) flashT = Math.max(0, flashT - dt)
        if (popT > 0) popT = Math.max(0, popT - dt)
        if (delT > 0) delT = Math.max(0, delT - dt)
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i]
          p.age += dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vy += 320 * dt
          if (p.age >= p.life) parts.splice(i, 1)
        }
      },
      draw() {
        api.clear(C.bg)
        for (let i = 0; i < 3; i += 1) {
          api.rect(0, ((t * 9 + i * 150) % 460) - 70, api.w, 110, 'rgba(139,220,122,0.04)')
        }
        api.rect(0, 0, api.w, 54, C.panel)
        api.text('BOGGLE', 18, 27, { size: 13, color: C.dim, weight: 'bold' })
        api.text('found ' + solved, api.w - 18, 27, { size: 15, color: C.accent2, align: 'right', weight: 'bold' })
        if (combo > 1) api.text('x' + combo, api.w - 92, 27, { size: 15, color: C.good, align: 'right', weight: 'bold' })
        const size = 80
        const gap = 6
        const sx = shakeT > 0 ? Math.sin(shakeT * 76) * 7 * (shakeT / 0.36) : 0
        for (let i = 0; i < 9; i += 1) {
          const x = 18 + (i % 3) * (size + gap) + sx + slide * 10
          const y = 62 + Math.floor(i / 3) * (size + gap)
          const hot = input.indexOf(cells[i]) >= 0
          api.rect(x, y, size, size, hot ? 'rgba(255,207,92,0.22)' : C.panel)
          api.rect(x, y, size, 3, hot ? C.accent2 : C.dim)
          api.text(cells[i].toUpperCase(), x + size / 2, y + size / 2 + 2, {
            size: 34, color: hot ? C.accent2 : C.fg, align: 'center', weight: 'bold',
          })
        }
        const px = 296
        api.text('TYPE', px, 70, { size: 12, color: C.dim, weight: 'bold' })
        api.rect(px, 82, 166, 48, flashT > 0 ? (okFlash ? C.good : C.warn) : C.dim)
        api.rect(px + 2, 84, 162, 44, C.panel)
        api.text(input.length ? input.toUpperCase() : '?', px + 83, 107, {
          size: 24, color: input.length ? C.fg : C.dim, align: 'center', weight: 'bold',
        })
        if (delT > 0) api.text('DEL', px + 83, 76, { size: 11, color: C.warn, align: 'center', weight: 'bold' })
        api.text('words here', px, 152, { size: 12, color: C.dim, weight: 'bold' })
        const left = []
        for (let i = 0; i < targets.length; i += 1) if (found.indexOf(targets[i]) < 0) left.push(targets[i])
        for (let i = 0; i < left.length && i < 4; i += 1) {
          let hint = left[i][0].toUpperCase()
          for (let k = 1; k < left[i].length; k += 1) hint += ' _'
          api.text(hint + ' ·' + left[i].length, px, 174 + i * 20, { size: 14, color: C.accent2 })
        }
        for (let i = 0; i < found.length && i < 4; i += 1) {
          api.text(found[i].toUpperCase(), px, 274 + i * 19, { size: 13, color: C.good, weight: 'bold' })
        }
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i]
          const k = 1 - p.age / p.life
          api.circle(p.x, p.y, p.r * (0.4 + k * 0.8), k > 0.4 ? C.good : C.accent2)
        }
        if (popT > 0) {
          api.text(popMsg, 240, 306, { size: 14 + popT * 9, color: popColor, align: 'center', weight: 'bold' })
        }
        api.rect(0, api.h - 22, api.w, 22, C.panel)
        api.text('a-z · enter · space del · ' + left.length + ' left', api.w / 2, api.h - 11, {
          size: 11, color: C.dim, align: 'center',
        })
      },
    }
  },
})
