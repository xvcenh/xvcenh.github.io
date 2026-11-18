import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.DT_URL || 'http://127.0.0.1:5173/?debug=1';
const routes = [
  { whale: 'pass', ending: 'rest', alert: 8 },
  { whale: 'resonate', ending: 'symbiosis', alert: 30 },
  { whale: 'devour', ending: 'revenge', alert: 75 },
  { whale: 'pass', ending: 'endless', alert: 45 },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of routes) {
    await page.goto(base);
    await page.waitForSelector('html[data-engine=phaser]');
    await page.locator('#btnSingle').click();
    await page.locator('[data-choice="dive"]').click();
    await page.evaluate(({ whale, alert }) => {
      const { G, cam } = window.__DT;
      window.advanceTime(1000);
      // Position a late-game checkpoint on either side of the whale choice gates.
      G.stage = 11;
      G.reefCleared = true;
      Object.assign(G.p, { x: 1700, y: 26400, invuln: 60, size: whale === 'devour' ? 900 : 32 });
      Object.assign(G.story, {
        seen: new Set(['prologue', 'boat', 'net', 'ice', 'venom', 'ruins']),
        defeated: new Set([0, 1, 2, 3, 4]), alert,
        bypassed: whale === 'resonate' ? 3 : 0,
        ruinsSecond: whale === 'devour', huntedLarge: whale === 'devour',
      });
      G.chase.y = G.p.y - 1800;
      cam.x = G.p.x;
      cam.y = G.p.y;
      window.advanceTime(50);
    }, route);
    const whaleMenu = page.locator('#ovStory[data-scene="whale"]');
    const choices = await whaleMenu.locator('button').evaluateAll(buttons => buttons.map(b => b.dataset.choice));
    assert.equal(choices.includes('resonate'), route.whale === 'resonate');
    assert.equal(choices.includes('devour'), route.whale === 'devour');
    await whaleMenu.locator('[data-choice="' + route.whale + '"]').click();
    await page.waitForFunction(whale => window.__DT.G.story.whale === whale, route.whale);
    await page.evaluate(() => {
      const { G, cam } = window.__DT;
      G.stage = 12;
      G.boss = null;
      G.bossDelay = .02;
      G.p.y = 29450;
      G.chase.y = G.p.y - 1800;
      cam.y = G.p.y;
      window.advanceTime(900);
      if (G.boss?.idx !== 5) throw Error('The final guardian did not spawn.');
      // Leave the last exchange to ordinary input and the production contact system.
      G.boss.hp = 1;
      Object.assign(G.p, { x: G.boss.x, y: G.boss.y, chompCd: 0, stunT: 0, dashT: 0 });
    });
    await page.keyboard.down('j');
    await page.evaluate(() => window.advanceTime(80));
    await page.keyboard.up('j');
    const endingMenu = page.locator('#ovStory[data-scene="ending"]');
    const endings = await endingMenu.locator('button').evaluateAll(buttons => buttons.map(b => b.dataset.choice));
    assert.deepEqual(endings, route.ending === 'endless' ? ['endless'] : ['endless', route.ending]);
    await endingMenu.locator('[data-choice="' + route.ending + '"]').click();
    const state = await page.evaluate(() => ({
      ending: window.__DT.G.story.ending, endless: window.__DT.G.story.endless, mode: window.__DT.G.mode,
    }));
    assert.equal(state.ending, route.ending);
    assert.equal(state.endless, route.ending === 'endless');
    assert.equal(state.mode === 'play', state.endless);
    console.log(route.whale, route.ending, state.mode);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
