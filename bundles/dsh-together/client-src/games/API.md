# 小游戏作者契约（冻结版 v1）

> 这份文件是 `@hjdd14/dsh-together` 的**唯一**游戏接口约定。所有 pack 必须严格照它写，不得自行扩展 API。
> 契约一旦冻结，改动只允许「新增可选能力」，不允许改已有语义。

## 1. 文件与注册

- 一个游戏一个文件：`client-src/games/<pack>/<id>.js`，**文件名必须等于游戏 id**。
- 文件是**普通脚本**，不是 ES 模块：**不允许** `import` / `export` / `require` / `module.exports` / `window` / `document` / `setTimeout` / `setInterval` / `fetch` / `Math.random`。
- 文件顶层只能调用一次：

```js
defineGame({
  id: 'snake',                 // 必须等于文件名与 shared/catalog.js 里的 id
  mode: '3d',                  // 可选；仅 3d 包的游戏写这一行（见 §7）
  create(api) {
    // 初始化局部状态
    return {
      update(dt) { /* dt 单位：秒，约 1/60 */ },
      draw(g) { /* 2D：g 是 2D context；3D：g 是 WebGL context */ },
      dispose() { /* 可选 */ },
    };
  },
});
```

- 名称、一句话说明、门槛、操作方式**不写在游戏文件里**：它们来自 `shared/catalog.js`，由框架注入。想改目标值就找 Lead 改 catalog，不要自己判分。
- 状态只能放 `create` 的闭包里；不要写模块级可变变量（同一页可能重开同一局）。

## 2. 画布与坐标

- 逻辑画布固定 **480×360**，坐标系原点左上，y 向下。框架负责 DPR 缩放，游戏只画逻辑坐标。
- 每帧顺序：`update(dt)` → `draw(g)`。`update` 不得画，`draw` 不得改游戏状态。
- 必须自己画满背景（`api.clear(api.colors.bg)`），不要依赖框架擦除。
- `dt` 已被限制在 0.05s 以内，可直接用；但不要假设固定 1/60。

## 3. api 全表（**只有这些**，读到其他属性会直接报错）

| 成员 | 说明 |
|---|---|
| `api.w` / `api.h` | 逻辑宽高，480 / 360 |
| `api.g` | 2D context（与 `draw(g)` 的 `g` 相同，便于提前测量文本） |
| `api.attemptSeconds` | 本局时限（默认 90），可用来调整难度曲线 |
| `api.rng()` | `[0,1)` 随机数（**唯一**允许的随机源，测试里是确定序列） |
| `api.rnd(min, max)` | 浮点随机 |
| `api.irnd(min, max)` | 整数随机，**含**两端 |
| `api.pick(arr)` | 随机取一个元素 |
| `api.now()` | 本局开始到现在，毫秒 |
| `api.dt` | 上一帧 dt（秒） |
| `api.colors` | `{ bg, panel, fg, dim, accent, accent2, warn, good }`，都是 CSS 颜色串 |
| `api.score(n)` | **score 类**游戏加 n 分（正数） |
| `api.progress(n = 1)` | **count 类**游戏推进 n 个目标计数 |
| `api.setStatus(text)` | HUD 副标题（纯字符串，建议英文或跟随界面语言之外的中性文本） |
| `api.win()` | 立刻判定通过（框架也会在达标时自动判） |
| `api.lose(reason)` | 结束本局（失败，玩家可以重来），之后 `update` 不再被调用 |
| `api.onKey(fn)` | 订阅键盘：`fn(key, isDown, ev)`；返回取消订阅函数（卸载自动清理） |
| `api.onPointer(fn)` | 订阅指针：`fn({ x, y, type: 'down' \| 'move' \| 'up', dragging })`，坐标已换算成逻辑坐标 |
| `api.down(key)` | 该键当前是否按住 |
| `api.storage.get(key, fallback)` / `.set(key, value)` | 本游戏自己的持久化小仓库（最高分之类） |
| `api.clear(color?)` | 用颜色填满画布 |
| `api.rect(x, y, w, h, color)` | 实心矩形 |
| `api.circle(x, y, r, color)` | 实心圆 |
| `api.text(str, x, y, opts?)` | 文本，`opts = { size=16, color=fg, align='left', weight='normal', baseline='middle' }` |
| `api.gl` | **仅 3D**：WebGL1 上下文；2D 游戏读到是 `null` |
| `api.gl3d` | **仅 3D**：下面 §7 的渲染助手 |
| `api.depth` | 伪 3D 投影助手（2D 也能用）：`{ horizon, project(x,y,z), scaleAt(z) }` |

### 归一化按键名
`'left' 'right' 'up' 'down'`（方向键与 WASD 都会映射到这 4 个）、`'space' 'enter' 'escape' 'shift'`、`'a'…'z'`、`'0'…'9'`。
**不要**直接判断 `e.key`；只用归一化名字。

## 4. 计分 / 通关语义

- `goal[0]` 决定计分方式：
  - `'score'`：玩家动作累计分数，`api.score(n)`；框架比较 `累计分 ≥ 目标`。
  - `'count'`：目标计数，`api.progress(1)` 每完成一个目标元素调一次（吃到苹果 / 打碎一块砖 / 配成一对……）。
  - `'survive'`：**不用调用任何东西**，框架用存活秒数判定；玩家死了就 `api.lose()`。
- 门槛已按「普通玩家 30–60 秒内可达」设定（默认难度 ×1，另有 relaxed ×0.7 / strict ×1.3）。因此：
  - 前 5 秒必须已经能拿到第一分/第一个目标；
  - 不要在目标值之外再叠一层硬难度（例如要求连续无失误）；
  - 失误只应损失时间或局部进度，不应直接一局清零——除非是 `survive` 类（死了本来就要重来）。
- `api.win()` / `api.lose()` 一局只会生效一次，重复调用无害。

## 5. 质量要求（QA 会逐条检查）

1. **可玩性**：按键/点击后 1 帧内有可见反馈；有明确的失败条件与重来体验。
2. **确定性**：随机只走 `api.rng()`；同 seed 同输入序列应产生同结果（冒烟测试依赖它）。
3. **健壮性**：600 帧随机输入 + 极端输入不抛错、不产生 `NaN`/`Infinity` 坐标；不得无限堆积数组（旧实体要回收）。
4. **性能**：单帧绘制元素 ≤ 约 400 个；不要每帧 `new` 大对象几百次。
5. **风格**：只用 `api.colors` 或 `rgba(...)`，不引入外部字体/图片/音频文件；不要读 `localStorage`。
6. **界面语言**：游戏内文本尽量用符号/数字；必要的词保持短英文（全站可读），不要写死中文长句。
7. **范围**：单文件 ≤ 220 行；只做 catalog 里写明的那件事，不要加存档、设置、排行榜。

## 6. 自检（提交前必须绿）

```bash
cd bundles/dsh-together
TG_PACK=<你的 pack> node --test test/games.smoke.test.mjs
```

它会：
- 检查文件是否越界（import/export/定时器/`Math.random`/全局变量）；
- 用假 canvas 和确定性 rng 跑 600 帧随机输入，任何异常都会指出文件名与帧号；
- 检查 `create()` 返回 `{ update, draw }`、id 与文件名/目录/catalog 一致；
- 检查 api 里**不存在**的成员没被读取。

其它 pack 并行开发中时整包可能红，用 `TG_PACK` 只跑自己那一组。

## 7. 3D 游戏（WebGL，仅 `3d` 包）

`shared/catalog.js` 里 `pack: '3d'` 的游戏**必须**在 `defineGame` 里写 `mode: '3d'`，其它 pack 一律不写（冒烟测试会断言这两者一一对应）。

- 引擎会为 `mode: '3d'` 的游戏创建 **WebGL1** 上下文，`draw(g)` 收到的 `g` 就是它；`api.g` 为 `null`。
- **不要调用 `api.rect / api.circle / api.text`**：WebGL 画布没有 2D 上下文，这些在 3D 下是空实现，冒烟测试会判失败。进度/提示用 `api.setStatus`（框架的 HUD 会显示）。
- 渲染助手（`api.gl3d`）：

```js
api.gl3d.camera({ fov = 55, eye = [x,y,z], target = [x,y,z], up = [0,1,0] })
api.gl3d.clear('#0b1016')                       // 清屏（含深度）
const box = api.gl3d.mesh('box')                // 'box' | 'plane' | 'sphere'
api.gl3d.draw(box, { x, y, z, rx, ry, rz, s, sy, sz }, '#4f8ef7')  // 单位立方体 1×1×1
```

- 坐标系：y 向上，相机默认在 +z 方向；`draw` 的 `s` 是统一缩放，`sy/sz` 可单独覆盖。
- 光照固定一束方向光（`api.gl3d.light([x,y,z])` 可改），无阴影、无贴图、无后处理。
- 性能预算：**每帧 ≤150 次 `draw`**、球体分段 ≤12、不要每帧新建几何体（`mesh()` 内部会缓存）。
- 参考实现：`client-src/games/3d/stack3d.js`（照它的结构写，最省事）。
- 无 WebGL 的环境：框架会显示提示并按一次"故障"上报，**你的代码不需要自己判**。
- 3D 单文件上限 340 行（2D 仍是 300）。

### 伪 3D（模式 7）

不想用 WebGL 时，可以用 `api.depth` 在 2D canvas 上做透视投影（赛道/隧道/迷宫），同样算"立体感"，且能在任何环境跑：

```js
const p = api.depth.project(x, y, z)   // z 越大越远；返回 { x, y, scale }
api.circle(p.x, p.y, 20 * p.scale, '#ffcf5c')
```
