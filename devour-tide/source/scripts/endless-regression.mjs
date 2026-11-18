import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.DT_URL || 'http://127.0.0.1:5173/?debug=1';
const browser = await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({
    viewport:{width:390,height:844}, deviceScaleFactor:3, hasTouch:true, isMobile:true,
  });
  const errors = [];
  page.on('pageerror',e => errors.push(e.message));
  await page.goto(url);
  await page.locator('#btnSingle').click();
  await page.locator('[data-choice="dive"]').click();
  await page.evaluate(() => {
    const { G, WORLD, cam } = __DT;
    advanceTime(1300);
    G.stage = 12;
    G.reefCleared = true;
    G.story.endless = true;
    G.story.ending = 'endless';
    WORLD.h = 130000;
    Object.assign(G.p,{x:1800,y:124000,size:389,maxSize:389});
    cam.y = G.p.y;
    dispatchEvent(new Event('devour-suspend'));
  });
  await page.reload();

  async function offer(randomValue, resume = false) {
    await page.evaluate(({value,resume}) => {
      const random = Math.random;
      Math.random = () => value;
      try {
        if (resume) {
          document.getElementById('btnResume').click();
          advanceTime(1300);
        } else {
          __DT.update(1/60);
        }
      } finally { Math.random = random; }
    },{value:randomValue,resume});
  }
  const pick = name => page.locator('#cardList button').filter({hasText:name}).click({timeout:6000});
  const state = () => page.evaluate(() => JSON.parse(render_game_to_text()));
  await page.waitForSelector('html[data-engine=phaser]');
  await offer(0,true);
  await pick('礁脊救援');
  assert.equal((await state()).rift.floor,1);
  assert.equal((await state()).rift.start,124000);
  await page.evaluate(() => {
    const { G } = __DT;
    G.p.y = G.story.rift.start+1500;
    advanceTime(17);
    if(G.p.y > G.story.rift.start+1400) throw Error('unfinished route exit opened');
    const site = G.expedition.site;
    for (const pt of site.points) {
      Object.assign(G.p,{x:site.x+pt.x*site.scale,y:site.y,dashT:.1,dashAng:0,vx:0,vy:0});
      advanceTime(17);
    }
  });
  assert.equal((await state()).rift.done,true);
  await page.reload();
  await page.locator('#btnResume').click();
  await page.evaluate(() => advanceTime(17));
  assert.equal((await state()).rift.done,true);

  await page.evaluate(() => { __DT.G.p.y = __DT.G.story.rift.start+1460; __DT.G.p.vy = 0; });
  await offer(.66);
  await pick('热泉围猎');
  assert.equal((await state()).rift.floor,2);
  const survival = await page.evaluate(() => {
    const { G, update, cam } = __DT;
    const startY = G.p.y;
    G.p.invuln = 60;
    for (let frame=0;frame<1100;frame++) {
      G.p.y = startY+260+Math.sin(frame/30)*110;
      update(1/60);
    }
    return {done:G.story.rift.done, zoom:cam.zoom, size:G.p.size};
  });
  assert.equal(survival.done,true);
  assert.ok(survival.zoom*3*survival.size <= 390*.48);
  if (process.env.DT_SHOT_DIR) {
    await page.evaluate(() => advanceTime(17));
    await page.screenshot({path:process.env.DT_SHOT_DIR+'/endless-mobile.png'});
  }

  await page.evaluate(() => { __DT.G.p.y = __DT.G.story.rift.start+1460; __DT.G.p.vy = 0; });
  await offer(0);
  assert.equal(await page.locator('#cardList button').count(),3);
  await pick('遗迹封锁');
  assert.equal((await state()).rift.floor,3);
  assert.equal((await state()).boss.name,'幽灵魟');
  await page.evaluate(() => {
    const { G } = __DT;
    G.boss.hp = 1;
    Object.assign(G.p,{x:G.boss.x,y:G.boss.y,dashT:0,chompCd:0,chompRecover:0,stunT:0});
  });
  await page.keyboard.down('j');
  await page.evaluate(() => advanceTime(80));
  await page.keyboard.up('j');
  const cleared = await state();
  assert.ok(cleared.rift.done && !cleared.boss && cleared.mode==='play');
  assert.deepEqual(errors,[]);
  console.log('Old 31 km checkpoint, net, route gate, reload, survival, third-floor guardian passed.');
} finally {
  await browser.close();
}
