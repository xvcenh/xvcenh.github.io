const slot = 'devour-tide.dive.v1';
const keys = [
  'time','stage','stageT','eatenStage','stageStartSize','stageDmg','stageBites','stageEvo','stageSea',
  'stageBestCombo','chase','zones','bossDelay','stasisT','decoy','curseStage','enemies','hazards','foods',
  'inks','stats','chestT','spawnT','hazT','mileIdx','reefCleared','expedition'
];
const savedArrays=['zones','hazards','foods','inks','stageEvo'];
const point=entity=>entity && Number.isFinite(entity.x) && Number.isFinite(entity.y);

function validExpedition(expedition) {
  if(!expedition || !Array.isArray(expedition.shoals) || !expedition.shoals.every(point))return false;
  const site=expedition.site;
  return !site || (point(site) && ['net','relay','cache'].includes(site.kind) &&
    Array.isArray(site.hits) && Array.isArray(site.points) && site.points.length>0 && site.points.every(point) &&
    Number.isInteger(site.cursor) && site.cursor>=0 && (site.done || site.cursor<site.points.length));
}

export function readCheckpoint(){
  try {
    const data = JSON.parse(localStorage.getItem(slot));
    if (!data || data.version !== 1 || !Number.isInteger(data.state?.stage) ||
        data.state.stage < 1 || data.state.stage > 12 || !Number.isFinite(data.player?.size) ||
        !Number.isFinite(data.player.y) || !Number.isFinite(data.player.x) ||
        !Array.isArray(data.story?.seen) || !Array.isArray(data.story.defeated) ||
        !Array.isArray(data.player.slots) || !data.player.levels || !data.state.stats ||
        !Number.isFinite(data.state.time) || !savedArrays.every(k=>Array.isArray(data.state[k])) ||
        !Array.isArray(data.state.enemies) || !data.state.enemies.every(point) ||
        !validExpedition(data.state.expedition) || !Array.isArray(data.items) ||
        !data.items.every(point) || !Number.isFinite(data.height)) return null;
    return data;
  } catch { return null; }
}

export function clearCheckpoint(){
  try { localStorage.removeItem(slot); } catch { /* Private browsing can disable storage. */ }
}

export function writeCheckpoint(G,height){
  if (G.coop || G.mode !== 'play' || !G.p || G.p.dead || (G.trans && !G.trans.fired) || G.chestAnim) return;
  const { fish, sealed, swim, ...player } = G.p;
  const state = {};
  for (const key of keys) state[key]=G[key];
  // Poses are regenerated from physical state on the next tick. Excluding joints and
  // trails keeps synchronous mobile storage writes small as the ecosystem fills.
  state.enemies=G.enemies.map(({swim,...enemy})=>enemy);
  const story = { ...G.story, seen:[...G.story.seen], defeated:[...G.story.defeated] };
  const items = G.items.map(({type,...item}) => ({ ...item, type:type.id }));
  const boss = G.boss ? { ...G.boss, def:undefined, swim:undefined } : null;
  try {
    localStorage.setItem(slot,JSON.stringify({
      version:1,height,state,story,player,items,boss,sealed:sealed?.id ?? null
    }));
  } catch { /* Full or unavailable storage must never interrupt a dive. */ }
}

export function hydrateCheckpoint(data,G,types,bosses){
  const lookup = new Map(types.map(t=>[t.id,t]));
  for (const k of keys) if (k in data.state) G[k] = data.state[k];
  Object.assign(G.p,data.player);
  G.p.sealed = lookup.get(data.sealed) ?? null;
  G.story = { ...data.story, seen:new Set(data.story.seen), defeated:new Set(data.story.defeated) };
  G.boss = data.boss && bosses[data.boss.idx] ? { ...data.boss, def:bosses[data.boss.idx] } : null;
  G.items = data.items.filter(i=>lookup.has(i.type)).map(i=>({ ...i, type:lookup.get(i.type) }));
  G.p.invuln = Math.max(1.5,G.p.invuln);
  G.p.dashT = 0; G.p.vx = 0; G.p.vy = 0;
  G.trans = null; G.mode = 'play'; G.paused = false;
}
