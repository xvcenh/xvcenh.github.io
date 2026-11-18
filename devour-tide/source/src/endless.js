export const RIFT_LENGTH = 1400;
const unlock = 'devour-tide.endless';

export function unlockEndless() {
  try { localStorage.setItem(unlock,'1'); } catch {}
}

export function endlessUnlocked() {
  try { return localStorage.getItem(unlock) === '1'; } catch { return false; }
}

const routes = [
  { id:'net', name:'礁脊救援', sea:0, goal:'撞断两个网扣', reward:'立刻获得一层护盾' },
  { id:'relay', name:'裂冰航道', sea:2, goal:'避开浮冰，连续穿过三个亮环', reward:'冲刺冷却缩短 8%' },
  { id:'cache', name:'遗迹黑匣', sea:4, goal:'避开扫描，下载黑匣记录', reward:'啃咬伤害提高 12%' },
  { id:'survive', name:'热泉围猎', sea:3, goal:'在熔岩和猎群中存活 18 秒', reward:'恢复 20% 体型' },
  { id:'guard', name:'幽沟守卫', sea:1, boss:1, goal:'击败霜鲸守卫', reward:'对守卫伤害提高 15%' },
];

const guardians = [
  routes[4],
  { ...routes[4], id:'ghost', sea:4, boss:2, name:'遗迹封锁', goal:'击败会隐没的幽灵魟' },
  { ...routes[4], id:'abyss', sea:5, boss:5, name:'深渊封锁', goal:'击败熔岩巨兽' },
];

export function riftChoices(floor, previous) {
  if (floor % 3 === 0) return guardians;
  const pool = routes.filter(route => route.id !== previous);
  return Array.from({length:3}, () => pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
}

const routeById = new Map([...routes,...guardians].map(route => [route.id,route]));
export const riftRoute = id => routeById.get(id);

export function riftObjective(rift) {
  const route = riftRoute(rift.id);
  if (rift.done) return '目标完成 · 继续下潜';
  return route.id === 'survive' ? '存活 ' + Math.ceil(rift.remaining) + ' 秒' : route.goal;
}

export function isGuardRoute(route) {
  return route.id === 'guard' || route.id === 'ghost' || route.id === 'abyss';
}
