/**
 * The standalone players must embed the real game source and nothing else.
 *
 * Run: node --test test/play.test.mjs
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import { renderPlay3d } from '../host/play3d.js'
import { renderPlay, packOf } from '../host/play2d.js'
import { GAMES } from '../shared/catalog.js'

test('every game id resolves to its pack', () => {
  for (const game of GAMES) {
    assert.equal(packOf(game.id), game.pack, `${game.id} 的 pack 解析错了`)
  }
  assert.equal(packOf('nope'), undefined)
  assert.equal(packOf('../catalog'), undefined, '路径穿越必须被拒绝')
  assert.equal(packOf(''), undefined)
})

test('a 2D game renders a page that loads the game source', () => {
  const html = renderPlay('hextris')
  assert.ok(typeof html === 'string' && html.length > 5000)
  assert.match(html, /getContext\('2d'\)/, '2D 页面要有 2D 上下文')
  assert.ok(html.includes("defineGame({"), '必须内联真实游戏源码')
  assert.ok(html.includes('id: \'hextris\''), '内联的必须是这个游戏')
  assert.ok(!html.includes('tgCreateGl3d'), '2D 页面不该带 WebGL 层')
})

test('a 3D game renders a page with the WebGL layer', () => {
  const html = renderPlay3d('stack3d')
  assert.ok(typeof html === 'string' && html.length > 5000)
  assert.match(html, /getContext\('webgl'/)
  assert.ok(html.includes('tgCreateGl3d'))
  assert.ok(html.includes("id: 'stack3d'"))
})

test('the two players refuse each other\'s games and unknown ids', () => {
  assert.equal(renderPlay('stack3d'), undefined, '3D 游戏不走 2D 播放器')
  assert.equal(renderPlay3d('hextris'), undefined, '2D 游戏不走 3D 播放器')
  assert.equal(renderPlay('definitely-not-a-game'), undefined)
  assert.equal(renderPlay3d('definitely-not-a-game'), undefined)
})

test('every 3D game and a sample of 2D games render without throwing', () => {
  const threeD = GAMES.filter((game) => game.pack === '3d')
  assert.ok(threeD.length >= 14)
  for (const game of threeD) {
    const html = renderPlay3d(game.id)
    assert.ok(typeof html === 'string', `${game.id} 的 3D 页面渲染失败`)
    assert.ok(html.includes(`id: '${game.id}'`), `${game.id} 页面内容不对`)
  }
  const sample = GAMES.filter((game) => game.pack !== '3d').slice(0, 12)
  for (const game of sample) {
    const html = renderPlay(game.id)
    assert.ok(typeof html === 'string', `${game.id} 的 2D 页面渲染失败`)
    assert.ok(html.includes(`id: '${game.id}'`), `${game.id} 页面内容不对`)
  }
})
