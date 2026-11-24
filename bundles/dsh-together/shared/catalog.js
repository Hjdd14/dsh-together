/**
 * Authoritative game catalog for the `@hjdd14/dsh-together` bundle.
 *
 * This module is the single source of truth, read by three consumers:
 * - the Host half (`host/catalog.js`) decides the authoritative goal for a challenge;
 * - `build.mjs` embeds this file into the browser bundle so the overlay can render
 *   names, briefs and goals without a round trip;
 * - the game authors read the rows of their own pack while writing `create()`.
 *
 * Field contract (one object per game):
 *   id     unique kebab/lower-case identifier, also the game module's `defineGame` id
 *   pack   one of PACKS[].id
 *   goal   [type, target]; type is 'score' (points), 'count' (objective ticks) or
 *          'survive' (seconds that must elapse). The target is the RELAXED-NORMAL 1.0
 *          value; the Host multiplies it by the configured difficulty factor.
 *   zh/en  display name
 *   bz/be  one-line brief: what the player must do
 *   c      control code; the overlay localizes it. One of:
 *          'arrows' | 'space' | 'click' | 'drag' | 'keys' | 'type' | 'mixed'
 *
 * A game may never raise its own target: the gate is judged on the Host side.
 */

export const PACKS = [
  { id: 'arcade', zh: '经典街机', en: 'Arcade', ja: 'アーケード', es: 'Arcade', fr: 'Arcade', de: 'Arcade', ru: 'Аркада', pt: 'Arcade', ko: '아케이드' },
  { id: 'runner', zh: '跑酷闪避', en: 'Runner', ja: 'ランナー', es: 'Runner', fr: 'Course', de: 'Runner', ru: 'Раннер', pt: 'Corrida', ko: '러너' },
  { id: 'puzzle', zh: '益智拼图', en: 'Puzzle', ja: 'パズル', es: 'Puzle', fr: 'Puzzle', de: 'Puzzle', ru: 'Головоломки', pt: 'Quebra-cabeça', ko: '퍼즐' },
  { id: 'reflex', zh: '手速反应', en: 'Reflex', ja: '反射神経', es: 'Reflejos', fr: 'Réflexes', de: 'Reflexe', ru: 'Реакция', pt: 'Reflexo', ko: '반사신경' },
  { id: 'word', zh: '文字算术', en: 'Words & Numbers', ja: '文字と数字', es: 'Palabras', fr: 'Mots & nombres', de: 'Wort & Zahl', ru: 'Слова и числа', pt: 'Palavras', ko: '단어와 숫자' },
  { id: 'board', zh: '棋牌对局', en: 'Board Games', ja: 'ボードゲーム', es: 'Juegos de mesa', fr: 'Jeux de plateau', de: 'Brettspiele', ru: 'Настольные', pt: 'Tabuleiro', ko: '보드게임' },
  { id: 'rhythm', zh: '节奏弹幕', en: 'Rhythm & Shmup', ja: 'リズムと弾幕', es: 'Ritmo', fr: 'Rythme', de: 'Rhythmus', ru: 'Ритм и шмап', pt: 'Ritmo', ko: '리듬과 탄막' },
  { id: 'physics', zh: '物理弹跳', en: 'Physics', ja: '物理', es: 'Física', fr: 'Physique', de: 'Physik', ru: 'Физика', pt: 'Física', ko: '물리' },
  { id: '3d', zh: '立体 3D', en: '3D', ja: '3D', es: '3D', fr: '3D', de: '3D', ru: '3D', pt: '3D', ko: '3D' },
  { id: 'mobile', zh: '复古手机', en: 'Retro Mobile', ja: 'レトロ携帯', es: 'Móvil retro', fr: 'Mobile rétro', de: 'Retro-Handy', ru: 'Ретро-мобилки', pt: 'Celular retrô', ko: '레트로 모바일' },
]

export const GAMES = [
  // ── arcade ────────────────────────────────────────────────────────────────
  { id: 'snake', pack: 'arcade', goal: ['count', 5], zh: '贪吃蛇', en: 'Snake', bz: '吃到 5 个苹果', be: 'Eat 5 apples', c: 'arrows' },
  { id: 'tetris', pack: 'arcade', goal: ['score', 300], zh: '俄罗斯方块', en: 'Tetris', bz: '拿到 300 分（约 2 行）', be: 'Score 300 (about 2 lines)', c: 'arrows' },
  { id: 'breakout', pack: 'arcade', goal: ['count', 12], zh: '打砖块', en: 'Breakout', bz: '打碎 12 块砖', be: 'Break 12 bricks', c: 'arrows' },
  { id: 'pong', pack: 'arcade', goal: ['score', 5], zh: '乒乓对 AI', en: 'Pong', bz: '先得 5 分', be: 'Reach 5 points', c: 'arrows' },
  { id: 'invaders', pack: 'arcade', goal: ['count', 8], zh: '太空侵略者', en: 'Space Invaders', bz: '击落 8 架敌机', be: 'Shoot down 8 invaders', c: 'arrows' },
  { id: 'asteroids', pack: 'arcade', goal: ['count', 6], zh: '陨石带', en: 'Asteroids', bz: '击碎 6 块陨石', be: 'Destroy 6 asteroids', c: 'arrows' },
  { id: 'frogger', pack: 'arcade', goal: ['count', 3], zh: '青蛙过河', en: 'Frogger', bz: '穿过 3 条车道', be: 'Cross 3 lanes', c: 'arrows' },
  { id: 'centipede', pack: 'arcade', goal: ['count', 5], zh: '蜈蚣', en: 'Centipede', bz: '击落 5 段蜈蚣', be: 'Hit 5 segments', c: 'arrows' },
  { id: 'missile', pack: 'arcade', goal: ['count', 10], zh: '导弹指挥官', en: 'Missile Command', bz: '拦截 10 枚导弹', be: 'Intercept 10 missiles', c: 'click' },
  { id: 'galaga', pack: 'arcade', goal: ['count', 6], zh: '小蜜蜂', en: 'Galaga', bz: '击落 6 架战机', be: 'Down 6 fighters', c: 'arrows' },
  { id: 'lander', pack: 'arcade', goal: ['count', 1], zh: '登月舱', en: 'Lunar Lander', bz: '平稳着陆 1 次', be: 'Land safely once', c: 'arrows' },
  { id: 'arkanoid', pack: 'arcade', goal: ['score', 250], zh: '方块弹球', en: 'Arkanoid', bz: '拿到 250 分', be: 'Score 250', c: 'arrows' },
  { id: 'tempest', pack: 'arcade', goal: ['count', 2], zh: '风暴隧道', en: 'Tempest', bz: '清掉 2 波敌人', be: 'Clear 2 waves', c: 'arrows' },
  { id: 'rescue', pack: 'arcade', goal: ['count', 2], zh: '救援者', en: 'Rescue', bz: '救回 2 个人', be: 'Rescue 2 people', c: 'arrows' },

  // ── runner ────────────────────────────────────────────────────────────────
  { id: 'dino', pack: 'runner', goal: ['survive', 12], zh: '小恐龙', en: 'Dino Run', bz: '活过 12 秒', be: 'Survive 12 seconds', c: 'space' },
  { id: 'flappy', pack: 'runner', goal: ['count', 3], zh: '小鸟穿管', en: 'Flappy', bz: '穿过 3 根管子', be: 'Pass 3 pipes', c: 'space' },
  { id: 'doodle', pack: 'runner', goal: ['score', 200], zh: '跳跳球', en: 'Doodle Jump', bz: '上升 200 高度', be: 'Climb 200 in height', c: 'arrows' },
  { id: 'helicopter', pack: 'runner', goal: ['survive', 15], zh: '直升机洞穴', en: 'Helicopter Cave', bz: '活过 15 秒', be: 'Survive 15 seconds', c: 'space' },
  { id: 'gravity', pack: 'runner', goal: ['count', 6], zh: '重力翻转', en: 'Gravity Flip', bz: '穿过 6 道门', be: 'Pass 6 gates', c: 'space' },
  { id: 'stairs', pack: 'runner', goal: ['count', 20], zh: '无尽台阶', en: 'Endless Stairs', bz: '上 20 层台阶', be: 'Climb 20 steps', c: 'arrows' },
  { id: 'caveride', pack: 'runner', goal: ['survive', 12], zh: '洞穴飞车', en: 'Cave Rider', bz: '活过 12 秒', be: 'Survive 12 seconds', c: 'space' },
  { id: 'jetpack', pack: 'runner', goal: ['score', 150], zh: '喷气背包', en: 'Jetpack', bz: '飞出 150 距离', be: 'Fly 150 distance', c: 'space' },
  { id: 'wallrun', pack: 'runner', goal: ['count', 8], zh: '侧墙跑', en: 'Wall Runner', bz: '越过 8 面墙', be: 'Clear 8 walls', c: 'space' },
  { id: 'dodge', pack: 'runner', goal: ['survive', 15], zh: '一键闪避', en: 'One Button Dodge', bz: '活过 15 秒', be: 'Survive 15 seconds', c: 'space' },
  { id: 'bulletdodge', pack: 'runner', goal: ['survive', 12], zh: '弹幕闪避', en: 'Bullet Dodge', bz: '活过 12 秒', be: 'Survive 12 seconds', c: 'arrows' },
  { id: 'hopper', pack: 'runner', goal: ['count', 10], zh: '连跳过障', en: 'Hopper', bz: '跳过 10 个障碍', be: 'Jump over 10 obstacles', c: 'space' },

  // ── puzzle ────────────────────────────────────────────────────────────────
  { id: 'g2048', pack: 'puzzle', goal: ['score', 64], zh: '2048', en: '2048', bz: '合成出 64', be: 'Make a 64 tile', c: 'arrows' },
  { id: 'lightsout', pack: 'puzzle', goal: ['count', 16], zh: '熄灯', en: 'Lights Out', bz: '关掉全部 16 盏灯', be: 'Turn off all 16 lights', c: 'click' },
  { id: 'sokoban', pack: 'puzzle', goal: ['count', 2], zh: '推箱子', en: 'Sokoban', bz: '把 2 个箱子推进点', be: 'Push 2 crates onto goals', c: 'arrows' },
  { id: 'fifteen', pack: 'puzzle', goal: ['count', 6], zh: '数字华容道', en: 'Sliding Puzzle', bz: '6 块归位', be: 'Slide 6 tiles home', c: 'click' },
  { id: 'pipes', pack: 'puzzle', goal: ['count', 3], zh: '接水管', en: 'Pipe Mania', bz: '连通 3 段水管', be: 'Connect 3 pipe runs', c: 'click' },
  { id: 'match3', pack: 'puzzle', goal: ['count', 30], zh: '三消', en: 'Match 3', bz: '消掉 30 个方块', be: 'Clear 30 tiles', c: 'click' },
  { id: 'gems', pack: 'puzzle', goal: ['count', 25], zh: '宝石迷阵', en: 'Gems', bz: '消掉 25 颗宝石', be: 'Clear 25 gems', c: 'click' },
  { id: 'mines', pack: 'puzzle', goal: ['count', 20], zh: '扫雷', en: 'Minesweeper', bz: '翻开 20 格且不踩雷', be: 'Open 20 safe cells', c: 'click' },
  { id: 'simon', pack: 'puzzle', goal: ['count', 4], zh: '西蒙记忆', en: 'Simon', bz: '跟对 4 步序列', be: 'Repeat a 4-step sequence', c: 'click' },
  { id: 'memory', pack: 'puzzle', goal: ['count', 4], zh: '翻牌配对', en: 'Memory', bz: '配成 4 对', be: 'Match 4 pairs', c: 'click' },
  { id: 'nonogram', pack: 'puzzle', goal: ['count', 10], zh: '数织', en: 'Nonogram', bz: '填对 10 格', be: 'Fill 10 correct cells', c: 'click' },
  { id: 'floorfill', pack: 'puzzle', goal: ['count', 80], zh: '铺地板', en: 'Floor Fill', bz: '铺满 80% 地板', be: 'Cover 80% of the floor', c: 'click' },

  // ── reflex ────────────────────────────────────────────────────────────────
  { id: 'reaction', pack: 'reflex', goal: ['count', 3], zh: '反应测试', en: 'Reaction', bz: '3 次反应快于 450ms', be: 'React under 450ms 3 times', c: 'click' },
  { id: 'whack', pack: 'reflex', goal: ['count', 12], zh: '打地鼠', en: 'Whack-a-Mole', bz: '敲中 12 只地鼠', be: 'Whack 12 moles', c: 'click' },
  { id: 'aim', pack: 'reflex', goal: ['count', 15], zh: '瞄准训练', en: 'Aim Trainer', bz: '命中 15 个靶子', be: 'Hit 15 targets', c: 'click' },
  { id: 'fruit', pack: 'reflex', goal: ['count', 10], zh: '切水果', en: 'Fruit Slice', bz: '切开 10 个水果', be: 'Slice 10 fruits', c: 'drag' },
  { id: 'colormatch', pack: 'reflex', goal: ['count', 12], zh: '颜色配对', en: 'Color Match', bz: '答对 12 次', be: 'Answer 12 correctly', c: 'keys' },
  { id: 'stopbar', pack: 'reflex', goal: ['count', 3], zh: '停表', en: 'Stop the Bar', bz: '3 次停进目标区', be: 'Stop in the zone 3 times', c: 'space' },
  { id: 'lockpick', pack: 'reflex', goal: ['count', 3], zh: '卡点开锁', en: 'Lockpick', bz: '3 次卡准开锁', be: 'Pick the lock 3 times', c: 'space' },
  { id: 'mashtap', pack: 'reflex', goal: ['count', 40], zh: '疯狂点击', en: 'Rapid Tap', bz: '5 秒内点 40 下', be: 'Tap 40 times in 5s', c: 'click' },
  { id: 'cursor', pack: 'reflex', goal: ['count', 5], zh: '精准光标', en: 'Precision Cursor', bz: '5 次停到目标点', be: 'Stop on the dot 5 times', c: 'drag' },
  { id: 'fastsimon', pack: 'reflex', goal: ['count', 5], zh: '快速西蒙', en: 'Fast Simon', bz: '跟对 5 步', be: 'Repeat 5 steps', c: 'click' },
  { id: 'hidden', pack: 'reflex', goal: ['count', 6], zh: '找隐藏目标', en: 'Hidden Target', bz: '找出 6 个目标', be: 'Find 6 targets', c: 'click' },
  { id: 'bubble', pack: 'reflex', goal: ['count', 15], zh: '戳泡泡', en: 'Bubble Pop', bz: '戳破 15 个泡泡', be: 'Pop 15 bubbles', c: 'click' },

  // ── word ──────────────────────────────────────────────────────────────────
  { id: 'typing', pack: 'word', goal: ['count', 30], zh: '打字冲刺', en: 'Typing Sprint', bz: '打对 30 个字符', be: 'Type 30 correct characters', c: 'type' },
  { id: 'wordguess', pack: 'word', goal: ['count', 1], zh: '猜词', en: 'Word Guess', bz: '5 次内猜中 1 个词', be: 'Guess a word within 5 tries', c: 'type' },
  { id: 'hangman', pack: 'word', goal: ['count', 1], zh: '猜字母', en: 'Hangman', bz: '猜中 1 个词', be: 'Solve one word', c: 'type' },
  { id: 'math', pack: 'word', goal: ['count', 8], zh: '算术冲刺', en: 'Math Sprint', bz: '答对 8 道题', be: 'Solve 8 problems', c: 'type' },
  { id: 'bullcow', pack: 'word', goal: ['count', 1], zh: '猜数字', en: 'Bull & Cow', bz: '猜中 1 个数字', be: 'Crack one number', c: 'type' },
  { id: 'anagram', pack: 'word', goal: ['count', 3], zh: '拆字重组', en: 'Anagram', bz: '解出 3 个词', be: 'Solve 3 words', c: 'type' },
  { id: 'morse', pack: 'word', goal: ['count', 8], zh: '摩斯点击', en: 'Morse Tap', bz: '按对 8 组摩斯码', be: 'Tap 8 Morse codes', c: 'space' },
  { id: 'countdots', pack: 'word', goal: ['count', 6], zh: '数点', en: 'Count Dots', bz: '数对 6 次', be: 'Count 6 times correctly', c: 'keys' },
  { id: 'prime', pack: 'word', goal: ['count', 5], zh: '找质数', en: 'Prime Hunt', bz: '点出 5 个质数', be: 'Tap 5 primes', c: 'click' },
  { id: 'balance', pack: 'word', goal: ['count', 3], zh: '等式配平', en: 'Equation Balance', bz: '配平 3 个等式', be: 'Balance 3 equations', c: 'type' },
  { id: 'missing', pack: 'word', goal: ['count', 4], zh: '缺数填空', en: 'Missing Number', bz: '填对 4 个数', be: 'Fill 4 missing numbers', c: 'type' },
  { id: 'sortalpha', pack: 'word', goal: ['count', 2], zh: '字母排序', en: 'Alphabet Sort', bz: '排好 2 组字母', be: 'Sort 2 letter groups', c: 'drag' },

  // ── board ─────────────────────────────────────────────────────────────────
  { id: 'tictactoe', pack: 'board', goal: ['count', 1], zh: '井字棋', en: 'Tic-Tac-Toe', bz: '一局不输', be: 'Survive one game unbeaten', c: 'click' },
  { id: 'connect4', pack: 'board', goal: ['count', 3], zh: '四子棋', en: 'Connect Four', bz: '连成 3 子', be: 'Connect 3 in a row', c: 'click' },
  { id: 'nim', pack: 'board', goal: ['count', 1], zh: '取子游戏', en: 'Nim', bz: '赢下 1 局', be: 'Win one game', c: 'click' },
  { id: 'hanoi', pack: 'board', goal: ['count', 3], zh: '汉诺塔', en: 'Hanoi', bz: '移动 3 次盘子', be: 'Move 3 discs', c: 'click' },
  { id: 'pegs', pack: 'board', goal: ['count', 3], zh: '独粒跳棋', en: 'Peg Solitaire', bz: '跳到只剩 3 子', be: 'Jump down to 3 pegs', c: 'click' },
  { id: 'mastermind', pack: 'board', goal: ['count', 1], zh: '猜色破译', en: 'Mastermind', bz: '猜中 1 组颜色', be: 'Crack one code', c: 'click' },
  { id: 'g2048small', pack: 'board', goal: ['score', 32], zh: '3×3 2048', en: '2048 3×3', bz: '合成出 32', be: 'Make a 32 tile', c: 'arrows' },
  { id: 'reversi', pack: 'board', goal: ['count', 1], zh: '黑白棋', en: 'Reversi', bz: '一局结束时领先', be: 'Lead when the game ends', c: 'click' },
  { id: 'gomoku', pack: 'board', goal: ['count', 5], zh: '五子棋', en: 'Gomoku', bz: '连成 5 子', be: 'Place 5 in a row', c: 'click' },
  { id: 'checkers', pack: 'board', goal: ['count', 2], zh: '跳棋', en: 'Checkers', bz: '吃掉 2 子', be: 'Capture 2 pieces', c: 'click' },
  { id: 'dice', pack: 'board', goal: ['count', 3], zh: '骰子计分', en: 'Dice Score', bz: '完成 3 回合计分', be: 'Score 3 rounds', c: 'click' },
  { id: 'blackjack', pack: 'board', goal: ['count', 1], zh: '21 点', en: 'Blackjack', bz: '赢下 1 手', be: 'Win one hand', c: 'click' },

  // ── rhythm ────────────────────────────────────────────────────────────────
  { id: 'rhythm', pack: 'rhythm', goal: ['count', 20], zh: '节奏点击', en: 'Rhythm Tap', bz: '踩中 20 拍', be: 'Hit 20 beats', c: 'space' },
  { id: 'piano', pack: 'rhythm', goal: ['count', 20], zh: '钢琴块', en: 'Piano Tiles', bz: '踩中 20 块', be: 'Hit 20 tiles', c: 'click' },
  { id: 'beatreact', pack: 'rhythm', goal: ['count', 10], zh: '节拍反应', en: 'Beat React', bz: '跟对 10 拍', be: 'Catch 10 beats', c: 'space' },
  { id: 'bullethell', pack: 'rhythm', goal: ['survive', 12], zh: '弹幕地狱', en: 'Bullet Hell', bz: '活过 12 秒', be: 'Survive 12 seconds', c: 'arrows' },
  { id: 'lasergrid', pack: 'rhythm', goal: ['survive', 10], zh: '激光网格', en: 'Laser Grid', bz: '活过 10 秒', be: 'Survive 10 seconds', c: 'arrows' },
  { id: 'orbit', pack: 'rhythm', goal: ['survive', 10], zh: '轨道生存', en: 'Orbit Survival', bz: '活过 10 秒', be: 'Survive 10 seconds', c: 'arrows' },
  { id: 'meteor', pack: 'rhythm', goal: ['survive', 10], zh: '陨石乱流', en: 'Meteor Shower', bz: '活过 10 秒', be: 'Survive 10 seconds', c: 'arrows' },
  { id: 'turret', pack: 'rhythm', goal: ['count', 3], zh: '炮塔防守', en: 'Turret Defense', bz: '守住 3 波', be: 'Hold 3 waves', c: 'click' },
  { id: 'lanes', pack: 'rhythm', goal: ['count', 6], zh: '太空航道', en: 'Space Lanes', bz: '穿过 6 档', be: 'Pass 6 gates', c: 'space' },
  { id: 'metronome', pack: 'rhythm', goal: ['count', 4], zh: '节拍器跟拍', en: 'Metronome', bz: '跟准 4 小节', be: 'Stay on 4 bars', c: 'space' },
  { id: 'rhythmsimon', pack: 'rhythm', goal: ['count', 4], zh: '节奏西蒙', en: 'Rhythm Simon', bz: '记住 4 段节奏', be: 'Repeat 4 patterns', c: 'click' },
  { id: 'rhythmbreak', pack: 'rhythm', goal: ['count', 8], zh: '节奏打砖', en: 'Rhythm Break', bz: '打碎 8 块砖', be: 'Break 8 bricks', c: 'arrows' },

  // ── physics ───────────────────────────────────────────────────────────────
  { id: 'stack', pack: 'physics', goal: ['count', 8], zh: '叠方块', en: 'Stack Tower', bz: '叠到 8 层', be: 'Stack 8 blocks', c: 'space' },
  { id: 'bounce', pack: 'physics', goal: ['count', 15], zh: '弹球', en: 'Bounce', bz: '弹起 15 下', be: 'Bounce 15 times', c: 'space' },
  { id: 'catapult', pack: 'physics', goal: ['count', 3], zh: '投石机', en: 'Catapult', bz: '命中 3 次', be: 'Hit 3 times', c: 'space' },
  { id: 'angrylite', pack: 'physics', goal: ['count', 2], zh: '怒鸟lite', en: 'Angry Lite', bz: '打中 2 个目标', be: 'Knock out 2 targets', c: 'drag' },
  { id: 'bowling', pack: 'physics', goal: ['count', 6], zh: '保龄球', en: 'Bowling', bz: '打倒 6 个瓶子', be: 'Knock down 6 pins', c: 'drag' },
  { id: 'pinball', pack: 'physics', goal: ['score', 200], zh: '弹珠', en: 'Pinball', bz: '拿到 200 分', be: 'Score 200', c: 'space' },
  { id: 'marble', pack: 'physics', goal: ['count', 1], zh: '滚珠迷宫', en: 'Marble Maze', bz: '把球滚到终点', be: 'Roll the ball home', c: 'drag' },
  { id: 'beam', pack: 'physics', goal: ['survive', 10], zh: '平衡木', en: 'Balance Beam', bz: '坚持 10 秒不掉下去', be: 'Stay on for 10 seconds', c: 'arrows' },
  { id: 'domino', pack: 'physics', goal: ['count', 12], zh: '多米诺', en: 'Domino', bz: '推倒 12 块骨牌', be: 'Topple 12 dominoes', c: 'click' },
  { id: 'jumpramp', pack: 'physics', goal: ['count', 3], zh: '斜坡飞跃', en: 'Ramp Jump', bz: '飞过 3 个坡', be: 'Clear 3 ramps', c: 'space' },
  { id: 'springs', pack: 'physics', goal: ['count', 10], zh: '弹簧跳', en: 'Springs', bz: '连续弹 10 次', be: 'Bounce 10 times', c: 'space' },
  { id: 'pendulum', pack: 'physics', goal: ['count', 5], zh: '接钟摆', en: 'Pendulum Catch', bz: '接住 5 次', be: 'Catch 5 times', c: 'arrows' },

  // ── 3d（真 WebGL，中型） ──────────────────────────────────────────────────
  { id: 'td3d', pack: '3d', goal: ['count', 3], zh: '立体塔防', en: 'Tower Defense 3D', bz: '建 2 座塔守住 3 波', be: 'Build 2 towers and hold 3 waves', c: 'click' },
  { id: 'brick3d', pack: '3d', goal: ['count', 12], zh: '立体打砖块', en: '3D Breakout', bz: '打碎 12 块砖', be: 'Break 12 bricks', c: 'arrows' },
  { id: 'maze3d', pack: '3d', goal: ['count', 1], zh: '立体滚珠迷宫', en: '3D Marble Maze', bz: '把球滚到终点', be: 'Roll the ball home', c: 'drag' },
  { id: 'stack3d', pack: '3d', goal: ['count', 8], zh: '立体叠塔', en: '3D Stack', bz: '叠到 8 层', be: 'Stack 8 blocks', c: 'space' },
  { id: 'snake3d', pack: '3d', goal: ['count', 5], zh: '立体贪吃蛇', en: '3D Snake', bz: '吃到 5 个方块', be: 'Eat 5 cubes', c: 'arrows' },
  { id: 'runner3d', pack: '3d', goal: ['survive', 15], zh: '立体跑酷', en: '3D Runner', bz: '活过 15 秒', be: 'Survive 15 seconds', c: 'space' },
  { id: 'race3d', pack: '3d', goal: ['count', 3], zh: '立体赛车', en: '3D Racer', bz: '跑过 3 个检查点', be: 'Pass 3 checkpoints', c: 'arrows' },
  { id: 'cubehunt', pack: '3d', goal: ['count', 6], zh: '立体收集', en: 'Cube Hunt', bz: '吃 6 个方块', be: 'Collect 6 cubes', c: 'arrows' },

  // ── arcade 追加 ───────────────────────────────────────────────────────────
  { id: 'mazechase', pack: 'arcade', goal: ['count', 15], zh: '迷宫吃豆', en: 'Maze Chase', bz: '吃掉 15 颗豆', be: 'Eat 15 dots', c: 'arrows' },
  { id: 'digger', pack: 'arcade', goal: ['count', 10], zh: '挖地', en: 'Digger', bz: '挖开 10 格土', be: 'Dig 10 tiles', c: 'arrows' },
  { id: 'qbert', pack: 'arcade', goal: ['count', 12], zh: '斜跳翻格', en: 'Q*bert', bz: '翻亮 12 格', be: 'Flip 12 tiles', c: 'arrows' },
  { id: 'joust', pack: 'arcade', goal: ['count', 4], zh: '空中对撞', en: 'Joust', bz: '击落 4 个飞行敌', be: 'Down 4 flyers', c: 'arrows' },
  { id: 'bomber', pack: 'arcade', goal: ['count', 3], zh: '炸弹人', en: 'Bomber', bz: '炸掉 3 个敌人', be: 'Blow up 3 enemies', c: 'arrows' },
  { id: 'elevator', pack: 'arcade', goal: ['count', 3], zh: '电梯行动', en: 'Elevator Action', bz: '救出 3 个人', be: 'Rescue 3 people', c: 'arrows' },
  { id: 'duel', pack: 'arcade', goal: ['score', 3], zh: '双人对射', en: 'Duel', bz: '先得 3 分', be: 'Reach 3 points', c: 'arrows' },
  { id: 'galaxian', pack: 'arcade', goal: ['count', 7], zh: '蜂群射击', en: 'Galaxian', bz: '击落 7 架敌机', be: 'Down 7 fighters', c: 'arrows' },

  // ── puzzle 追加 ───────────────────────────────────────────────────────────
  { id: 'klondike', pack: 'puzzle', goal: ['count', 1], zh: '纸牌接龙', en: 'Klondike', bz: '把 1 张 A 接到基础堆', be: 'Move one Ace to the foundation', c: 'click' },
  { id: 'mahjong', pack: 'puzzle', goal: ['count', 12], zh: '麻将连连看', en: 'Mahjong Match', bz: '消掉 12 对', be: 'Clear 12 pairs', c: 'click' },
  { id: 'sudoku4', pack: 'puzzle', goal: ['count', 16], zh: '4×4 数独', en: 'Sudoku 4×4', bz: '填满 16 格且合法', be: 'Fill 16 cells legally', c: 'click' },
  { id: 'wordsearch', pack: 'puzzle', goal: ['count', 3], zh: '找词格', en: 'Word Search', bz: '划出 3 个词', be: 'Circle 3 words', c: 'drag' },
  { id: 'rushhour', pack: 'puzzle', goal: ['count', 1], zh: '华容道堵车', en: 'Rush Hour', bz: '把红车开出出口', be: 'Drive the red car out', c: 'click' },
  { id: 'nonogram7', pack: 'puzzle', goal: ['count', 20], zh: '7×7 数织', en: 'Nonogram 7×7', bz: '填对 20 格', be: 'Fill 20 correct cells', c: 'click' },
  { id: 'unblock', pack: 'puzzle', goal: ['count', 1], zh: '滑块脱困', en: 'Unblock', bz: '把目标块移出', be: 'Free the target block', c: 'click' },
  { id: 'tetravex', pack: 'puzzle', goal: ['count', 6], zh: '四方块拼接', en: 'Tetravex', bz: '拼好 6 块', be: 'Place 6 tiles', c: 'click' },

  // ── runner 追加 ───────────────────────────────────────────────────────────
  { id: 'crossy', pack: 'runner', goal: ['count', 12], zh: '过马路', en: 'Crossy Road', bz: '前进 12 格', be: 'Advance 12 steps', c: 'space' },
  { id: 'lanesdodge', pack: 'runner', goal: ['survive', 15], zh: '三车道躲车', en: 'Lane Dodge', bz: '活过 15 秒', be: 'Survive 15 seconds', c: 'arrows' },
  { id: 'walljump', pack: 'runner', goal: ['count', 10], zh: '蹬墙跳', en: 'Wall Jump', bz: '上 10 层', be: 'Climb 10 floors', c: 'space' },
  { id: 'lavaclimb', pack: 'runner', goal: ['survive', 12], zh: '熔岩攀爬', en: 'Lava Climb', bz: '活过 12 秒', be: 'Survive 12 seconds', c: 'arrows' },
  { id: 'chariot', pack: 'runner', goal: ['count', 8], zh: '战车冲刺', en: 'Chariot', bz: '越过 8 个障碍', be: 'Clear 8 obstacles', c: 'space' },
  { id: 'tunneldash', pack: 'runner', goal: ['survive', 15], zh: '隧道冲刺', en: 'Tunnel Dash', bz: '活过 15 秒', be: 'Survive 15 seconds', c: 'arrows' },

  // ── reflex 追加 ───────────────────────────────────────────────────────────
  { id: 'rtlight', pack: 'reflex', goal: ['count', 5], zh: '反应灯', en: 'Reaction Light', bz: '5 次反应快于 500ms', be: 'React under 500ms five times', c: 'click' },
  { id: 'simonspeed', pack: 'reflex', goal: ['count', 6], zh: '加速西蒙', en: 'Speed Simon', bz: '跟对 6 步', be: 'Repeat 6 steps', c: 'click' },
  { id: 'duckjump', pack: 'reflex', goal: ['count', 10], zh: '见招拆招', en: 'Duck & Jump', bz: '正确应对 10 次', be: 'React correctly 10 times', c: 'space' },
  { id: 'balance2', pack: 'reflex', goal: ['count', 12], zh: '平衡托盘', en: 'Balance Tray', bz: '接住 12 个物体', be: 'Catch 12 objects', c: 'arrows' },
  { id: 'colorswitch', pack: 'reflex', goal: ['count', 15], zh: '颜色切换', en: 'Color Switch', bz: '答对 15 次', be: 'Answer 15 times', c: 'keys' },
  { id: 'aimline', pack: 'reflex', goal: ['count', 12], zh: '切线瞄准', en: 'Aim Line', bz: '命中 12 个靶', be: 'Hit 12 targets', c: 'click' },

  // ── word 追加 ─────────────────────────────────────────────────────────────
  { id: 'wordladder', pack: 'word', goal: ['count', 3], zh: '单词接龙', en: 'Word Ladder', bz: '接上 3 个词', be: 'Chain 3 words', c: 'type' },
  { id: 'boggle', pack: 'word', goal: ['count', 3], zh: '找词格', en: 'Boggle', bz: '找出 3 个词', be: 'Find 3 words', c: 'type' },
  { id: 'typingdefense', pack: 'word', goal: ['count', 10], zh: '打字防守', en: 'Typing Defense', bz: '打掉 10 个词', be: 'Type away 10 words', c: 'type' },
  { id: 'crossmini', pack: 'word', goal: ['count', 4], zh: '迷你填字', en: 'Mini Crossword', bz: '填对 4 个词', be: 'Fill 4 entries', c: 'type' },
  { id: 'synonym', pack: 'word', goal: ['count', 5], zh: '近义配对', en: 'Synonym Match', bz: '配成 5 对', be: 'Match 5 pairs', c: 'click' },
  { id: 'cipher', pack: 'word', goal: ['count', 1], zh: '字母解密', en: 'Cipher', bz: '解出 1 句话', be: 'Decode one line', c: 'type' },

  // ── board 追加 ────────────────────────────────────────────────────────────
  { id: 'battleship', pack: 'board', goal: ['count', 2], zh: '海战', en: 'Battleship', bz: '击沉 2 艘船', be: 'Sink 2 ships', c: 'click' },
  { id: 'dominoes', pack: 'board', goal: ['count', 5], zh: '骨牌接龙', en: 'Domino Tiles', bz: '接上 5 张牌', be: 'Play 5 tiles', c: 'click' },
  { id: 'chessonce', pack: 'board', goal: ['count', 1], zh: '一步杀', en: 'Mate in One', bz: '解出 1 道杀棋', be: 'Solve one mate', c: 'click' },
  { id: 'riskdice', pack: 'board', goal: ['count', 2], zh: '骰子攻城', en: 'Dice Siege', bz: '拿下 2 块地', be: 'Take 2 territories', c: 'click' },

  // ── rhythm 追加 ───────────────────────────────────────────────────────────
  { id: 'drumroll', pack: 'rhythm', goal: ['count', 30], zh: '鼓点连打', en: 'Drum Roll', bz: '连打 30 拍', be: 'Hit 30 beats', c: 'space' },
  { id: 'beatjump', pack: 'rhythm', goal: ['count', 15], zh: '踏点跳跃', en: 'Beat Jump', bz: '踏准 15 拍', be: 'Land 15 beats', c: 'space' },
  { id: 'wavegate', pack: 'rhythm', goal: ['survive', 15], zh: '波次闪避', en: 'Wave Gate', bz: '活过 15 秒', be: 'Survive 15 seconds', c: 'arrows' },
  { id: 'chordtap', pack: 'rhythm', goal: ['count', 8], zh: '和弦跟弹', en: 'Chord Tap', bz: '跟对 8 组', be: 'Match 8 chords', c: 'click' },
  { id: 'starlane', pack: 'rhythm', goal: ['survive', 12], zh: '星轨闪避', en: 'Star Lane', bz: '活过 12 秒', be: 'Survive 12 seconds', c: 'arrows' },

  // ── physics 追加 ──────────────────────────────────────────────────────────
  { id: 'slingbreak', pack: 'physics', goal: ['count', 3], zh: '弹弓拆塔', en: 'Sling Break', bz: '拆掉 3 层', be: 'Topple 3 layers', c: 'drag' },
  { id: 'rampbowl', pack: 'physics', goal: ['count', 8], zh: '坡道保龄', en: 'Ramp Bowling', bz: '打倒 8 个瓶', be: 'Knock down 8 pins', c: 'drag' },
  { id: 'flickball', pack: 'physics', goal: ['score', 300], zh: '弹球弹射', en: 'Flick Ball', bz: '拿到 300 分', be: 'Score 300', c: 'drag' },
  { id: 'cranefish', pack: 'physics', goal: ['count', 2], zh: '抓娃娃', en: 'Crane Grab', bz: '抓出 2 个奖品', be: 'Grab 2 prizes', c: 'click' },
  { id: 'rollbalance', pack: 'physics', goal: ['survive', 12], zh: '滚球平衡', en: 'Roll Balance', bz: '活过 12 秒', be: 'Survive 12 seconds', c: 'arrows' },

  // ── mobile：复古功能机 / 早期触屏经典 ─────────────────────────────────────
  { id: 'bouncering', pack: 'mobile', goal: ['count', 8], zh: '弹球闯关', en: 'Bounce', bz: '穿过 8 个圆环', be: 'Pass 8 rings', c: 'arrows' },
  { id: 'spaceimpact', pack: 'mobile', goal: ['count', 10], zh: '太空侵略', en: 'Space Impact', bz: '击落 10 个敌人', be: 'Destroy 10 enemies', c: 'arrows' },
  { id: 'snake2', pack: 'mobile', goal: ['count', 10], zh: '贪吃蛇 II', en: 'Snake II', bz: '吃到 10 个蛋', be: 'Eat 10 eggs', c: 'arrows' },
  { id: 'bantumi', pack: 'mobile', goal: ['count', 1], zh: '播种棋', en: 'Bantumi', bz: '赢下一局', be: 'Win one game', c: 'click' },
  { id: 'tiltmaze', pack: 'mobile', goal: ['count', 1], zh: '重力迷宫', en: 'Tilt Maze', bz: '把球滚到出口', be: 'Roll the ball to the exit', c: 'drag' },
  { id: 'xonix', pack: 'mobile', goal: ['count', 12], zh: '划地盘', en: 'Xonix', bz: '成功圈地 12 次', be: 'Enclose territory 12 times', c: 'arrows' },
  { id: 'balloons', pack: 'mobile', goal: ['count', 12], zh: '打气球', en: 'Balloons', bz: '打爆 12 个气球', be: 'Pop 12 balloons', c: 'click' },
  { id: 'pairs2', pack: 'mobile', goal: ['count', 6], zh: '记忆配对 II', en: 'Pairs II', bz: '配成 6 对', be: 'Match 6 pairs', c: 'click' },
  { id: 'stacker', pack: 'mobile', goal: ['count', 8], zh: '叠盒子', en: 'Stacker', bz: '叠到 8 层', be: 'Stack 8 layers', c: 'space' },
  { id: 'towerbloxx', pack: 'mobile', goal: ['count', 6], zh: '疯狂塔楼', en: 'Tower Bloxx', bz: '盖到 6 层', be: 'Build 6 floors', c: 'space' },
  { id: 'bubblepop', pack: 'mobile', goal: ['count', 12], zh: '泡泡龙', en: 'Bubble Pop', bz: '消掉 12 个泡泡', be: 'Clear 12 bubbles', c: 'click' },
  { id: 'zuma', pack: 'mobile', goal: ['count', 10], zh: '祖玛', en: 'Zuma', bz: '消掉 10 颗球', be: 'Clear 10 balls', c: 'click' },
  { id: 'papertoss', pack: 'mobile', goal: ['count', 5], zh: '纸团投篮', en: 'Paper Toss', bz: '投进 5 个', be: 'Sink 5 shots', c: 'drag' },
  { id: 'doodlejump', pack: 'mobile', goal: ['survive', 20], zh: '涂鸦跳跃', en: 'Doodle Jump', bz: '活过 20 秒', be: 'Survive 20 seconds', c: 'arrows' },
  { id: 'fruitninja', pack: 'mobile', goal: ['count', 15], zh: '水果忍者', en: 'Fruit Ninja', bz: '切开 15 个水果', be: 'Slice 15 fruits', c: 'drag' },
  { id: 'cutrope', pack: 'mobile', goal: ['count', 3], zh: '割绳子', en: 'Cut the Rope', bz: '喂到 3 颗糖', be: 'Feed 3 candies', c: 'drag' },
  { id: 'tinywings', pack: 'mobile', goal: ['survive', 20], zh: '小翅膀', en: 'Tiny Wings', bz: '活过 20 秒', be: 'Survive 20 seconds', c: 'space' },
  { id: 'skisafari', pack: 'mobile', goal: ['count', 8], zh: '滑雪冒险', en: 'Ski Safari', bz: '躲过 8 次落石', be: 'Dodge 8 hazards', c: 'space' },
  { id: 'water', pack: 'mobile', goal: ['count', 3], zh: '小鳄鱼洗澡', en: "Where's My Water", bz: '引 3 次水', be: 'Route water 3 times', c: 'drag' },
  { id: 'zigzag', pack: 'mobile', goal: ['survive', 20], zh: '之字球', en: 'ZigZag', bz: '活过 20 秒', be: 'Survive 20 seconds', c: 'arrows' },
  { id: 'helix', pack: 'mobile', goal: ['count', 10], zh: '螺旋跳', en: 'Helix Jump', bz: '穿过 10 层', be: 'Pass 10 layers', c: 'arrows' },
  { id: 'bbtan', pack: 'mobile', goal: ['count', 20], zh: '弹球破坏', en: 'BBTAN', bz: '打掉 20 个砖', be: 'Break 20 bricks', c: 'drag' },
  { id: 'hextris', pack: 'mobile', goal: ['score', 300], zh: '六边方块', en: 'Hextris', bz: '拿到 300 分', be: 'Score 300', c: 'arrows' },
  { id: 'pvz', pack: 'mobile', goal: ['survive', 45], zh: '植物防守', en: 'Plant Defense', bz: '守住 45 秒', be: 'Hold for 45 seconds', c: 'click' },

  // ── 3d 追加：早期触屏 3D 经典 ──────────────────────────────────────────────
  { id: 'templerun', pack: '3d', goal: ['survive', 20], zh: '神庙逃亡', en: 'Temple Run', bz: '活过 20 秒', be: 'Survive 20 seconds', c: 'arrows' },
  { id: 'subwaysurf', pack: '3d', goal: ['survive', 20], zh: '地铁跑酷', en: 'Subway Surfers', bz: '活过 20 秒', be: 'Survive 20 seconds', c: 'arrows' },
  { id: 'altos', pack: '3d', goal: ['survive', 20], zh: '阿尔托的冒险', en: "Alto's Adventure", bz: '活过 20 秒', be: 'Survive 20 seconds', c: 'space' },
  { id: 'smashhit', pack: '3d', goal: ['survive', 20], zh: '玻璃冲击', en: 'Smash Hit', bz: '活过 20 秒', be: 'Survive 20 seconds', c: 'click' },
  { id: 'minecart', pack: '3d', goal: ['count', 8], zh: '矿车狂奔', en: 'Mine Cart', bz: '过 8 段轨道', be: 'Clear 8 track pieces', c: 'space' },
  { id: 'monument', pack: '3d', goal: ['count', 1], zh: '纪念碑谷', en: 'Monument Valley', bz: '走到终点', be: 'Reach the goal', c: 'click' },

  // ── arcade 追加 ───────────────────────────────────────────────────────────
  { id: 'qix', pack: 'arcade', goal: ['count', 12], zh: '划地者', en: 'Qix', bz: '圈出 12 格', be: 'Claim 12 tiles', c: 'arrows' },
  { id: 'defender', pack: 'arcade', goal: ['count', 8], zh: '守卫者', en: 'Defender', bz: '击落 8 个入侵者', be: 'Down 8 invaders', c: 'arrows' },
  { id: 'paperboy', pack: 'arcade', goal: ['count', 6], zh: '送报童', en: 'Paperboy', bz: '投准 6 户', be: 'Deliver to 6 houses', c: 'arrows' },
  { id: 'jumpman', pack: 'arcade', goal: ['count', 8], zh: '跳跳人', en: 'Jumpman', bz: '爬过 8 层', be: 'Climb 8 levels', c: 'arrows' },
  { id: 'duckhunt', pack: 'arcade', goal: ['count', 6], zh: '打鸭子', en: 'Duck Hunt', bz: '打下 6 只', be: 'Shoot 6 ducks', c: 'click' },

  // ── puzzle 追加 ───────────────────────────────────────────────────────────
  { id: 'flow', pack: 'puzzle', goal: ['count', 12], zh: '一笔画', en: 'Flow Free', bz: '连好 12 段', be: 'Connect 12 segments', c: 'drag' },
  { id: 'blockfall', pack: 'puzzle', goal: ['count', 6], zh: '方块拼图', en: 'Block Puzzle', bz: '拼满 6 块', be: 'Place 6 pieces', c: 'drag' },
  { id: 'drop7', pack: 'puzzle', goal: ['score', 300], zh: '数字消除', en: 'Drop7', bz: '拿到 300 分', be: 'Score 300', c: 'click' },

  // ── rhythm 追加 ───────────────────────────────────────────────────────────
  { id: 'taiko', pack: 'rhythm', goal: ['count', 25], zh: '太鼓', en: 'Taiko', bz: '敲中 25 个鼓点', be: 'Hit 25 notes', c: 'space' },
  { id: 'guitar', pack: 'rhythm', goal: ['count', 20], zh: '吉他英雄', en: 'Guitar Hero', bz: '按下 20 个音符', be: 'Hit 20 notes', c: 'keys' },
]

/** @type {Map<string, typeof GAMES[number]>} */
export const GAME_BY_ID = new Map(GAMES.map((game) => [game.id, game]))

/** @type {Map<string, typeof PACKS[number]>} */
export const PACK_BY_ID = new Map(PACKS.map((pack) => [pack.id, pack]))

/** Goal types the gate understands. */
export const GOAL_TYPES = ['score', 'count', 'survive']

/** Control codes the overlay localizes. */
export const CONTROL_CODES = ['arrows', 'space', 'click', 'drag', 'keys', 'type', 'mixed']

/**
 * One short "how to play" line per game, as `[zh, en]`.
 *
 * It is shown above the game window, so it must stay to one readable line: name the
 * control and the action that scores, nothing else. Read through {@link howTo}, which
 * returns the `{ zh, en }` shape the overlay and the settings preview both consume.
 */
export const HOW_TO = {
  // arcade
  snake: ['方向键转向吃苹果，撞墙或撞到自己就结束', 'Arrows to steer and eat apples; hitting a wall or yourself ends it'],
  tetris: ['方向键移动、↑旋转、空格速降，消行得分', 'Arrows move, ↑ rotates, Space hard-drops; clearing lines scores'],
  breakout: ['左右移动挡板接球，别让球落底，打碎砖块', 'Slide the paddle to return the ball and break bricks; do not drop it'],
  pong: ['上下移动球拍把球打回去，先得 5 分', 'Move your paddle to return the ball and reach 5 points first'],
  invaders: ['左右移动、空格射击，击落 8 架敌机', 'Arrows to move, Space to fire, shoot down 8 invaders'],
  asteroids: ['方向键旋转与推进，空格开火击碎陨石', 'Arrows rotate and thrust, Space fires; break the asteroids'],
  frogger: ['方向键按格前进，躲开车流穿过 3 条车道', 'Step forward with the arrows, dodge the traffic, cross 3 lanes'],
  centipede: ['左右移动、空格射击，击落 5 段蜈蚣', 'Move sideways, Space to fire, hit 5 centipede segments'],
  missile: ['点击屏幕引爆拦截弹，炸掉来袭导弹', 'Click to detonate an interceptor and destroy incoming missiles'],
  galaga: ['左右移动、空格射击，击落俯冲的敌机', 'Move sideways, Space to fire, down 6 fighters'],
  lander: ['方向键控制推力与姿态，平稳落到平台', 'Arrows control thrust and attitude; touch down softly'],
  arkanoid: ['移动挡板接球打砖，按住空格可接球再发', 'Return the ball to break bricks; hold Space to catch and re-launch'],
  tempest: ['左右换道、空格射击，挡住冲上来的敌人', 'Switch lanes with the arrows, Space to fire, hold the tunnel'],
  rescue: ['方向键驾船躲落石，接人后回基地交付', 'Steer the boat past falling rocks, pick people up and return to base'],

  // runner
  dino: ['空格或↑起跳躲开仙人掌，活过 12 秒', 'Space or ↑ to jump over cacti and survive 12 seconds'],
  flappy: ['空格拍翼保持高度，从管缝中穿过', 'Tap Space to flap and slip through the pipe gaps'],
  doodle: ['自动弹跳，←→控制落点一直往上爬', 'You bounce automatically; ←→ aim the landing and climb'],
  helicopter: ['按住空格上升、松开下降，穿过洞穴缝隙', 'Hold Space to rise, release to sink; thread the cave gaps'],
  gravity: ['空格翻转重力，上下切换穿过 6 道门', 'Space flips gravity; switch sides to pass 6 gates'],
  stairs: ['↑或空格在台阶贴近时起跳，一级级往上', 'Press ↑ or Space as a step arrives to climb higher'],
  caveride: ['空格起跳越过岩石与坑洞，别停下', 'Space jumps over rocks and pits; keep moving'],
  jetpack: ['按住空格上升、松开下落，穿过横杆缝隙', 'Hold Space to rise, release to fall, pass the bars'],
  wallrun: ['空格起跳（可二段跳）越过迎面而来的墙', 'Space to jump (twice in the air) over oncoming walls'],
  dodge: ['空格触发短暂无敌闪过障碍，卡好时机', 'Space gives a short invincible dash; time it well'],
  bulletdodge: ['方向键移动躲开追踪弹幕，活过 12 秒', 'Move with the arrows to dodge homing bullets for 12 seconds'],
  hopper: ['空格按节奏跳过一个个箱子', 'Tap Space in rhythm to hop over each crate'],

  // puzzle
  g2048: ['方向键整体滑动，相同数字合并，合成 64', 'Arrows slide the board; merge equal tiles up to 64'],
  lightsout: ['点击格子翻转自己与上下左右，把灯全关掉', 'Clicking flips a cell and its neighbours; turn every light off'],
  sokoban: ['方向键推箱子到目标点，空格重开本关', 'Push both crates onto the goals; Space restarts the level'],
  fifteen: ['点击空格旁的滑块移动，把 6 块放回原位', 'Click a tile next to the gap to slide it home'],
  pipes: ['点击旋转水管，把水源一路接通出去', 'Click to rotate pipes and connect the water to the exit'],
  match3: ['交换相邻两块凑成三连消除，累计 30 个', 'Swap neighbouring tiles to match 3 and clear 30 tiles'],
  gems: ['点击相邻宝石交换，凑成三连消除', 'Swap adjacent gems to line up three and clear them'],
  mines: ['点击翻格，数字是周围雷数，别踩雷', 'Click to open cells; numbers count nearby mines'],
  simon: ['记住 4 步闪光顺序，再照顺序点亮', 'Watch the 4-step flash sequence, then repeat it'],
  memory: ['翻牌记住位置，配成 4 对', 'Flip cards, remember positions and match 4 pairs'],
  nonogram: ['按行列数字提示填格，填对 10 格', 'Fill cells to satisfy the row and column counts'],
  floorfill: ['点击颜色把左上角区域染色吞并，铺满 80%', 'Click colours to flood-fill from the corner and cover 80%'],

  // reflex
  reaction: ['变绿立刻点击，3 次都要快于 450ms', 'Click the moment it turns green; beat 450ms three times'],
  whack: ['点击冒出来的地鼠，敲中 12 只', 'Click the moles as they pop up; whack 12 of them'],
  aim: ['快速点击出现的靶心，命中 15 个', 'Click the targets as they appear; hit 15'],
  fruit: ['按住拖动划过水果把它切开，切 10 个', 'Drag across the fruit to slice it; slice 10'],
  colormatch: ['按提示用键盘选出正确颜色，答对 12 次', 'Use the keys to answer the colour prompts correctly 12 times'],
  stopbar: ['空格让指针停下，停进目标区 3 次', 'Space stops the pointer; land in the target zone 3 times'],
  lockpick: ['指针扫到缺口时按空格，成功 3 次', 'Press Space as the pointer crosses the notch, 3 times'],
  mashtap: ['疯狂点击（或按空格）攒够 40 下', 'Mash click or Space to build up 40 taps'],
  cursor: ['拖动光标对准目标点后松手，成功 5 次', 'Drag the cursor onto the dot and release, 5 times'],
  fastsimon: ['记住并复现 5 步序列', 'Watch and repeat a 5-step sequence'],
  hidden: ['在格子里找出隐藏的目标，找到 6 个', 'Spot the hidden targets among the cells; find 6'],
  bubble: ['点击戳破泡泡，戳 15 个', 'Click the bubbles to pop 15 of them'],

  // word
  typing: ['按高亮字母依次输入，打对 30 个字符', 'Type the highlighted letters; 30 correct characters'],
  wordguess: ['输入 5 个字母回车，按绿黄提示 5 次内猜中', 'Type a 5-letter word and press Enter; solve it within 5 tries'],
  hangman: ['按字母键猜词，错 6 次这题就失败', 'Guess letters by key; six misses fail the word'],
  math: ['用小键盘输入答案并回车，答对 8 题', 'Type the answer and press Enter; solve 8 problems'],
  bullcow: ['输入 4 位不重复数字，按 B/C 提示猜中', 'Type 4 distinct digits and use the B/C hints to crack it'],
  anagram: ['重排打乱的字母拼出单词，解出 3 个', 'Rearrange the scrambled letters to spell 3 words'],
  morse: ['空格短按是点、长按是划，按对 8 组', 'Tap Space for a dot, hold for a dash; send 8 codes'],
  countdots: ['数清点阵数量，用数字键作答 6 次', 'Count the dots and answer with number keys 6 times'],
  prime: ['点出格子里的质数，找齐 5 个', 'Click the prime numbers; find 5 of them'],
  balance: ['输入让等式两边相等的数，配平 3 题', 'Type the number that balances the equation, 3 times'],
  missing: ['输入数列里缺的那个数，答对 4 题', 'Type the missing number in the sequence, 4 times'],
  sortalpha: ['拖动字母按字母表顺序排好，2 组', 'Drag the letters into alphabetical order, 2 groups'],

  // board
  tictactoe: ['点击落子，一局不输给 AI 就过', 'Click to place; survive one game against the AI'],
  connect4: ['点击列落子，先连成 3 子（成线即清空继续）', 'Click a column and connect 3; a finished line clears for the next'],
  nim: ['点击石堆取子，拿走最后一颗就赢', 'Click a pile to take stones; taking the last one wins'],
  hanoi: ['点柱取盘、再点柱放下，移动 3 次', 'Click a peg to lift a disc, click another to drop it; 3 moves'],
  pegs: ['点击棋子跳过相邻棋子吃掉它，跳到剩 3 子', 'Click a peg to jump a neighbour and capture it; leave 3'],
  mastermind: ['逐槽选色再提交，按绿黄提示破解', 'Pick colours per slot and submit; use the hints to crack the code'],
  g2048small: ['方向键滑动合并，合成 32', 'Arrows slide and merge tiles up to 32'],
  reversi: ['点击落子夹住对方棋子翻面，终局领先即过', 'Place to bracket and flip discs; lead when the game ends'],
  gomoku: ['点击落子，先连成 5 子', 'Click to place stones; make 5 in a row'],
  checkers: ['点己方棋子再点落点，跳过对方棋子吃掉 2 子', 'Click your piece then the destination; capture 2 pieces'],
  dice: ['掷骰后点 HOLD 保住想要的，计分 3 回合', 'Roll, hold what you want to keep, and bank 3 rounds'],
  blackjack: ['HIT 摸牌、STAND 停牌，点数接近 21 赢一手', 'HIT to draw, STAND to stop; win one hand close to 21'],

  // rhythm
  rhythm: ['节拍条进入判定区时按空格，踩中 20 拍', 'Press Space as the beat bar hits the zone; 20 hits'],
  piano: ['点击下落到判定线的方块，踩 20 块', 'Click the tiles as they reach the line; hit 20'],
  beatreact: ['指针进入目标弧时按空格，跟对 10 拍', 'Press Space when the hand enters the arc; 10 beats'],
  bullethell: ['方向键移动躲开弹幕，活过 12 秒', 'Move with the arrows to dodge bullets for 12 seconds'],
  lasergrid: ['看预警格，在激光发射前离开那一行', 'Read the warning grid and leave the row before it fires'],
  orbit: ['方向键改变绕行半径，躲开轨道障碍', 'Arrows change your orbit radius to dodge obstacles'],
  meteor: ['方向键躲开坠落陨石，注意顶部预警', 'Arrows dodge falling meteors; watch the top warnings'],
  turret: ['点击击毁冲来的敌人，守住 3 波', 'Click to destroy attackers and hold for 3 waves'],
  lanes: ['空格前进、左右调整航线，穿过 6 道门', 'Space moves forward, arrows adjust; pass 6 gates'],
  metronome: ['每小节 4 拍，按空格踩准至少 3 拍', 'Four beats per bar; press Space on at least 3 of them'],
  rhythmsimon: ['看 4 段节奏，然后照顺序点回去', 'Watch the rhythm, then tap it back in order'],
  rhythmbreak: ['左右移动挡板反弹球，打碎 8 块砖', 'Slide the paddle to bounce the ball and break 8 bricks'],

  // physics
  stack: ['方块左右移动，空格或点击放下，叠 8 层', 'The block sweeps; press Space or click to drop it, stack 8'],
  bounce: ['鼠标或左右键移动挡板接球，接住 15 次', 'Move the paddle with the mouse or arrows; return 15 balls'],
  catapult: ['角度自动摆动，空格发射命中目标塔 3 次', 'The arm sweeps; Space launches, hit the tower 3 times'],
  angrylite: ['从弹弓往后拖动再松手，打掉 2 个目标', 'Drag back from the slingshot and release; knock out 2 targets'],
  bowling: ['从球往后拖动瞄准、松手投出，打倒 6 瓶', 'Drag back from the ball to aim and release; knock down 6 pins'],
  pinball: ['左右键抬挡板，把球打回场内刷 200 分', 'Use ←→ flippers to keep the ball alive and score 200'],
  marble: ['拖动倾斜桌面，让球滚到终点', 'Drag to tilt the table and roll the ball home'],
  beam: ['按住左右抵消风力，在平衡木上坚持 10 秒', 'Hold ←→ against the wind and stay on for 10 seconds'],
  domino: ['点击任意骨牌，让连锁推倒 8 块以上', 'Click a domino and let the chain topple 8 or more'],
  jumpramp: ['空格在坡前起跳，飞过 3 个坡', 'Press Space before each ramp and clear 3 of them'],
  springs: ['移动让球落在弹簧上，弹 10 次', 'Steer the ball onto the springs; bounce 10 times'],
  pendulum: ['用方向键或鼠标移动接杯，接住 5 个', 'Move the cup with the arrows or mouse; catch 5'],

  // 3d
  td3d: ['点击地面放塔，守住 3 波进攻', 'Click the ground to place towers and hold 3 waves'],
  brick3d: ['左右移动挡板接球，打碎 12 块砖', 'Slide the paddle to return the ball and break 12 bricks'],
  maze3d: ['拖动倾斜盘面，把球滚到发光终点', 'Drag to tilt the board and roll the ball to the glowing goal'],
  stack3d: ['方块来回移动，空格或点击落下叠 8 层', 'The block sweeps; Space or click drops it, stack 8 layers'],
  snake3d: ['方向键在立体场地转向吃方块，撞墙结束', 'Arrows steer the snake to eat cubes; walls end the run'],
  runner3d: ['空格起跳躲开路障，活过 15 秒', 'Space jumps over obstacles; survive 15 seconds'],
  race3d: ['左右打方向、空格减速，冲过 3 个检查点', 'Steer with ←→, brake with Space, pass 3 checkpoints'],
  cubehunt: ['方向键移动收集 6 个发光方块', 'Arrows move you to collect 6 glowing cubes'],

  // arcade 追加
  mazechase: ['方向键走迷宫吃豆，躲开追你的幽灵', 'Arrows move through the maze eating dots; avoid the ghosts'],
  digger: ['方向键挖土前进，挖开 10 格', 'Arrows dig through the soil; dig 10 tiles'],
  qbert: ['方向键斜向跳格，把 12 格翻亮', 'Arrows hop diagonally and flip 12 tiles'],
  joust: ['连按空格扇翅飞行，从上方撞落 4 个敌人', 'Tap Space to fly and strike down 4 enemies from above'],
  bomber: ['方向键移动、空格放炸弹，炸掉 3 个敌人', 'Arrows move, Space drops a bomb; blow up 3 enemies'],
  elevator: ['方向键进出电梯，救出 3 个人到出口', 'Arrows ride the elevator and bring 3 people to the exit'],
  duel: ['上下移动对射，先命中 3 次', 'Move up and down to outshoot the rival; land 3 hits'],
  galaxian: ['左右移动、空格射击，击落 7 架蜂群', 'Move sideways, Space fires; down 7 swarm fighters'],

  // puzzle 追加
  klondike: ['点击翻牌与拖动接牌，把一张 A 送上基础堆', 'Click to draw and drag to build; send one Ace to the foundation'],
  mahjong: ['点击两张相同的明牌消掉，消 12 对', 'Click two matching exposed tiles to clear 12 pairs'],
  sudoku4: ['点击格子循环填 1–4，每行每列每宫不重复', 'Click cells to cycle 1–4; no repeats per row, column or box'],
  wordsearch: ['按住拖动划出隐藏的单词，找出 3 个', 'Drag across letters to circle 3 hidden words'],
  rushhour: ['点击车辆后按方向滑动，把红车开出出口', 'Click a car then slide it along its lane to free the red car'],
  nonogram7: ['按行列数字提示填格，填对 20 格', 'Fill cells to satisfy the row and column counts'],
  unblock: ['滑动挡路的方块，让目标块移出右侧', 'Slide blocking pieces aside so the target escapes right'],
  tetravex: ['点击两块交换位置，让相邻边数字相同', 'Click two tiles to swap until touching edges match'],

  // runner 追加
  crossy: ['空格或方向键一跳一格，前进 12 格别被撞', 'Space or arrows hop one lane at a time; advance 12 steps'],
  lanesdodge: ['左右换道躲开迎面车辆，活过 15 秒', 'Switch lanes to dodge traffic for 15 seconds'],
  walljump: ['空格起跳，贴墙时再按一次蹬墙上升，上 10 层', 'Space jumps; press again on a wall to climb 10 floors'],
  lavaclimb: ['左右移动躲开上升的熔岩，活过 12 秒', 'Move sideways to stay above the lava for 12 seconds'],
  chariot: ['空格跳过迎面障碍，越过 8 个', 'Space jumps the obstacles; clear 8 of them'],
  tunneldash: ['左右操控穿越隧道障碍，活过 15 秒', 'Steer through the tunnel hazards for 15 seconds'],

  // reflex 追加
  rtlight: ['灯亮立刻点击，5 次快于 500ms', 'Click the instant the light turns on; beat 500ms five times'],
  simonspeed: ['记住并复现 6 步序列', 'Watch and repeat a 6-step sequence'],
  duckjump: ['高处来的躲（下键），低处来的跳（空格）', 'Duck under high attacks, jump over low ones'],
  balance2: ['左右移动托盘接住掉落物，接 12 个', 'Slide the tray to catch 12 falling objects'],
  colorswitch: ['按提示用数字键选颜色，答对 15 次', 'Use number keys to pick the colour; 15 correct answers'],
  aimline: ['点击出现的靶子命中 12 个', 'Click the targets that appear; hit 12'],

  // word 追加
  wordladder: ['每次只改一个字母接成新词，接 3 步', 'Change one letter per step to chain 3 words'],
  boggle: ['在 3×3 字母格里打字拼词，找出 3 个', 'Type words from the 3×3 grid; find 3'],
  typingdefense: ['打出靠近的词把它打掉，打掉 10 个', 'Type each approaching word to destroy it; clear 10'],
  crossmini: ['看提示输入单词，填对 4 个', 'Read the clues and type the answers; fill 4 entries'],
  synonym: ['点击意思相近的两张卡配对，配成 5 对', 'Click two cards with close meanings; match 5 pairs'],
  cipher: ['按已给出的字母映射替换，解出整句', 'Use the given letter mapping to decode the line'],

  // board 追加
  battleship: ['点击格子开炮，击沉 2 艘船', 'Click cells to fire and sink 2 ships'],
  dominoes: ['点击手里的牌接到两端数字相同的牌上，接 5 张', 'Click a tile that matches an open end; play 5 tiles'],
  chessonce: ['点击棋子走一步完成将杀', 'Click the piece that delivers mate in one'],
  riskdice: ['点击领地进攻，掷骰比大小拿下 2 块地', 'Click a territory to attack; win dice rolls and take 2'],

  // rhythm 追加
  drumroll: ['按空格跟着鼓点连打 30 下', 'Press Space with the drum and land 30 hits'],
  beatjump: ['踩到节拍点时按空格起跳，踏准 15 拍', 'Press Space on the beat to jump; land 15 beats'],
  wavegate: ['左右移动穿过波次缝隙，活过 15 秒', 'Move sideways through the wave gaps for 15 seconds'],
  chordtap: ['点击亮起的和弦组合，跟对 8 组', 'Click the chord that lit up; match 8 chords'],
  starlane: ['左右移动躲开星轨障碍，活过 12 秒', 'Move sideways to dodge the star lanes for 12 seconds'],

  // physics 追加
  slingbreak: ['从弹弓拖动瞄准松手，拆掉 3 层塔', 'Drag back from the slingshot to topple 3 layers'],
  rampbowl: ['从球拖动瞄准坡道，打倒 8 个瓶子', 'Drag from the ball to aim up the ramp; knock down 8 pins'],
  flickball: ['拖动弹射小球，撞出 300 分', 'Drag to flick the ball and score 300'],
  cranefish: ['点击放下爪子，抓出 2 个奖品', 'Click to drop the claw and grab 2 prizes'],
  rollbalance: ['左右移动保持球在轨道上，活过 12 秒', 'Move sideways to keep the ball on the rail for 12 seconds'],

  // mobile
  bouncering: ['方向键控制弹球，穿过 8 个圆环', 'Steer the ball through 8 rings'],
  spaceimpact: ['上下移动、空格射击，击落 10 个敌人', 'Move up and down, Space fires; destroy 10 enemies'],
  snake2: ['方向键转向吃蛋，吃掉 10 个', 'Arrows steer the snake; eat 10 eggs'],
  bantumi: ['点击自己的坑播种，结束时石多者胜', 'Click your own pit to sow; the fuller side wins'],
  tiltmaze: ['拖动倾斜盘面，把球滚到出口', 'Drag to tilt the board and roll the ball to the exit'],
  xonix: ['按住方向键跑出边界再合围，成功圈地 12 次', 'Run out from the edge and close the loop; enclose 12 times'],
  balloons: ['点击打爆气球，打 12 个', 'Click balloons to pop 12 of them'],
  pairs2: ['翻牌记住位置，配成 6 对', 'Flip cards and match 6 pairs'],
  stacker: ['方块左右移动，空格落下叠 8 层', 'The block sweeps; Space drops it, stack 8 layers'],
  towerbloxx: ['按空格吊起楼层落下，盖 6 层', 'Press Space to drop each floor; build 6'],
  bubblepop: ['点击发射同色泡泡，消掉 12 个', 'Click to shoot a matching bubble; clear 12'],
  zuma: ['点击把彩球射进队列，消掉 10 颗', 'Click to fire balls into the line; clear 10'],
  papertoss: ['往后拖动瞄准松手，投进 5 个', 'Drag back to aim and release; sink 5 shots'],
  doodlejump: ['左右移动踩着平台往上跳，活 20 秒', 'Move sideways, bounce upward, survive 20 seconds'],
  fruitninja: ['按住划过水果切开，切 15 个', 'Drag across fruit to slice 15'],
  cutrope: ['划过绳子切断它，把糖喂到 3 次', 'Slice the ropes to feed the candy 3 times'],
  tinywings: ['按住加速、松开抬升，顺着坡飞 20 秒', 'Hold to dive, release to rise; fly 20 seconds'],
  skisafari: ['空格跳跃躲开落石，躲 8 次', 'Space jumps over hazards; dodge 8 of them'],
  water: ['拖开泥土引水，引 3 次', 'Drag the dirt to route water, 3 times'],
  zigzag: ['左右切换方向球沿折线前行，活 20 秒', 'Switch direction to follow the zigzag; survive 20 seconds'],
  helix: ['左右转动让球从缺口落下，过 10 层', 'Rotate so the ball falls through the gap; 10 layers'],
  bbtan: ['拖动瞄准发射弹球，打掉 20 个砖', 'Drag to aim and fire balls; break 20 bricks'],
  hextris: ['方向键旋转六边形接住落块，拿 300 分', 'Arrows rotate the hexagon; score 300'],
  pvz: ['点击种下射手，守住 45 秒', 'Click to plant shooters and hold for 45 seconds'],

  // 3d 追加
  templerun: ['左右换道、上滑跳跃，活过 20 秒', 'Switch lanes and jump; survive 20 seconds'],
  subwaysurf: ['左右换道、空格跳跃，活过 20 秒', 'Switch lanes, Space to jump; survive 20 seconds'],
  altos: ['按住翻转、松开落地，活过 20 秒', 'Hold to flip, release to land; survive 20 seconds'],
  smashhit: ['点击击碎迎面玻璃，活过 20 秒', 'Click to shatter the glass; survive 20 seconds'],
  minecart: ['空格跳跃、左右换轨，过 8 段', 'Space jumps, arrows switch rails; clear 8 pieces'],
  monument: ['点击转动视角，把小人走到终点', 'Click the mechanisms and walk the figure to the goal'],

  // arcade 追加
  qix: ['按住方向键拖出轨迹再合围，圈出 12 格', 'Drag a trail then close it; claim 12 tiles'],
  defender: ['上下移动、空格射击，击落 8 个', 'Move, Space fires; down 8 invaders'],
  paperboy: ['左右移动、空格投报，投准 6 户', 'Move and press Space to deliver to 6 houses'],
  jumpman: ['方向键跳跃爬层，别碰到滚桶，爬 8 层', 'Arrows climb while dodging barrels; 8 levels'],
  duckhunt: ['点击飞过的鸭子，打下 6 只', 'Click the flying ducks; shoot 6'],

  // puzzle 追加
  flow: ['按住拖动把同色连起来，连 12 段', 'Drag to connect matching colours; 12 segments'],
  blockfall: ['拖动方块填格子，拼满 6 块', 'Drag pieces into the grid; place 6'],
  drop7: ['点击列投下数字，凑成 7 消掉，拿 300 分', 'Click a column to drop numbers; clear with 7s for 300'],

  // rhythm 追加
  taiko: ['按空格跟着鼓点击打，敲中 25 个', 'Press Space with the drum; hit 25 notes'],
  guitar: ['按对应字母键接住音符，接 20 个', 'Press the matching keys; hit 20 notes'],
}

/** The `{ zh, en }` how-to line for one game, or undefined. */
export function howTo(gameId) {
  const entry = HOW_TO[gameId]
  if (!Array.isArray(entry)) return undefined
  return { zh: entry[0], en: entry[1] }
}
