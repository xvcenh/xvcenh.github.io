import { TAU, rand, pick, dist } from './utils.js';
import { GENE_GATE, WHALE } from './config.js';
import { Audio2 } from './audio.js';

export function createItems({ G, spawnEnemyNear, burst, floater, availSpecies, gainGene }) {
return [
  /* ── 普通：即时补给 ── */
  { id:'speed',  rarity:'common', name:'迅捷洋流', color:'#22d3ee', icon:'⚡', desc:'6 秒内移速 +35%',
    dur:6, apply:function(p){ p.itemSpdT = 6; } },
  { id:'shield', rarity:'common', name:'泡泡护盾', color:'#a78bfa', icon:'🛡', desc:'获得 1 层护盾',
    dur:0, apply:function(p){ p.shield = Math.min(4, p.shield + 1); } },
  { id:'magnet', rarity:'common', name:'磁力漩涡', color:'#f472b6', icon:'🧲', desc:'8 秒内拾取范围翻倍',
    dur:8, apply:function(p){ p.itemMagT = 8; } },
  { id:'heart',  rarity:'common', name:'成长之泉', color:'#f87171', icon:'❤', desc:'立即回复 14% 体型',
    dur:0, apply:function(p){ p.size = Math.min(p.maxSize, p.size * 1.14); } },
  { id:'star',   rarity:'common', name:'星辰碎片', color:'#fbbf24', icon:'★', desc:'立即获得 420 分',
    dur:0, apply:function(p){ p.score += Math.round(420 * p.comboScore); } },
  { id:'gut',    rarity:'common', name:'铁胃囊', color:'#34d399', icon:'🫧', desc:'立即 +2 层护盾',
    dur:0, apply:function(p){ p.shield = Math.min(4, p.shield + 2); } },
  { id:'nettle', rarity:'common', name:'水母刺丝', color:'#c4b5fd', icon:'✳', desc:'4 秒内贴身敌鱼被麻痹',
    dur:4, apply:function(p){ p.nettleT = 4; } },
  { id:'plankton', rarity:'common', name:'浮游群落', color:'#86efac', icon:'🌿', desc:'立刻在周围撒出 14 条小鱼',
    dur:0, apply:function(p){
      for (var i = 0; i < 14; i++){
        var pa = rand(0, TAU), pr = rand(90, 300);
        spawnEnemyNear(p.x + Math.cos(pa) * pr, p.y + Math.sin(pa) * pr, true);
      }
      burst(p.x, p.y, '#86efac', 18, 260);
    } },
  { id:'phosphor', rarity:'common', name:'磷光鳞片', color:'#67e8f9', icon:'✧', desc:'8 秒内透视：视野外的敌鱼也画出轮廓',
    dur:8, apply:function(p){ p.phosphorT = 8; } },
  { id:'harden', rarity:'common', name:'硬化鳞甲', color:'#94a3b8', icon:'⬢', desc:'本局永久减伤 +10%',
    dur:0, apply:function(p){ p.dr = Math.min(0.60, p.dr + 0.10); } },

  /* ── 稀有：改变一小段时间的玩法 ── */
  { id:'gene',   rarity:'rare', name:'进化孢子', color:'#34d399', icon:'🧬', desc:'立即获得 4 点可用物种基因',
    dur:0, apply:function(p){
      for (var i = 0; i < 4; i++){
        var av = availSpecies(p);
        if (!av.length) break;
        gainGene(p, pick(av), 1);
      }
    } },
  { id:'fang',   rarity:'rare', name:'嗜血利齿', color:'#fb7185', icon:'🦷', desc:'10 秒内啃咬伤害 +60%',
    dur:10, apply:function(p){ p.fangT = 10; } },
  { id:'frenzy', rarity:'rare', name:'狂潮之息', color:'#38bdf8', icon:'🌊', desc:'8 秒内啃咬冷却 -45%',
    dur:8, apply:function(p){ p.frenzyT = 8; } },
  { id:'inkbag', rarity:'rare', name:'拟态墨囊', color:'#94a3b8', icon:'🖤', desc:'3 秒隐身，敌鱼不再追你',
    dur:3, apply:function(p){ p.stealthT = 3; p.stealthOn = true; } },
  { id:'vortex', rarity:'rare', name:'磁暴核心', color:'#818cf8', icon:'🌀', desc:'把周围敌鱼吸到身边并麻痹 1 秒',
    dur:0, apply:function(p){
      for (var i = 0; i < G.enemies.length; i++){
        var e = G.enemies[i];
        if (dist(e.x, e.y, p.x, p.y) < 420){
          e.x = p.x + rand(-40, 40);
          e.y = p.y + rand(-40, 40);
          e.stunT = Math.max(e.stunT, 1);
          burst(e.x, e.y, '#818cf8', 8, 200);
        }
      }
      G.shockwave = { x:p.x, y:p.y, r:10, max:420, color:'#818cf8' };
      Audio2.zap();
    } },
  { id:'vent',   rarity:'rare', name:'深海热泉', color:'#ff8e53', icon:'♨', desc:'8 秒内贴身的敌鱼被持续灼伤、越啃越小',
    dur:8, apply:function(p){ p.hotT = 8; } },
  { id:'fear',   rarity:'rare', name:'恐惧信息素', color:'#fda4af', icon:'☣', desc:'9 秒内敌鱼不敢靠近你（连掠食者也会退）',
    dur:9, apply:function(p){
      p.fearT = 9;
      G.shockwave = { x:p.x, y:p.y, r:10, max:620, color:'#fda4af' };
    } },
  { id:'decoy',  rarity:'rare', name:'诱饵浮标', color:'#fcd34d', icon:'✦', desc:'扔出诱饵，12 秒内敌鱼全被它引走',
    dur:12, apply:function(p){
      G.decoy = { x:p.x + rand(-150, 150), y:p.y + rand(-150, 150), t:12, max:12, phase:0 };
      G.shockwave = { x:G.decoy.x, y:G.decoy.y, r:10, max:300, color:'#fcd34d' };
      floater(G.decoy.x, G.decoy.y - 24, '诱饵', '#fcd34d');
    } },
  { id:'chain',  rarity:'rare', name:'连锁吞噬', color:'#fb923c', icon:'✹', desc:'8 秒内每次吞食都炸开，把周围敌鱼撞小',
    dur:8, apply:function(p){ p.chainT = 8; } },
  { id:'blood',  rarity:'rare', name:'血怒腺', color:'#ef4444', icon:'🩸', desc:'失去 18% 体型，12 秒内啃咬伤害 ×2.4、冷却 -45%',
    dur:12, apply:function(p){
      p.size = Math.max(12, p.size * 0.82);
      p.bloodT = 12;
      burst(p.x, p.y, '#ef4444', 26, 300);
      floater(p.x, p.y - p.size - 28, '血怒！', '#ef4444', true);
      Audio2.mutate();
    } },
  { id:'crystal', rarity:'rare', name:'基因结晶', color:'#5eead4', icon:'◈', desc:'等级最高的那个物种直接 +1 级',
    dur:0, apply:function(p){
      var best = null, bl = -1, i;
      for (i = 0; i < p.slots.length; i++){
        var sid0 = p.slots[i];
        var eff = p.levels[sid0] + p.genes[sid0] / GENE_GATE[Math.min(2, p.levels[sid0])];
        if (eff > bl){ bl = eff; best = sid0; }
      }
      if (!best){
        var av0 = availSpecies(p);
        if (av0.length) best = pick(av0);
      }
      if (!best) return;
      if (p.slots.indexOf(best) < 0 && p.slots.length >= p.maxSlots) return;
      var lv0 = p.levels[best];
      if (lv0 >= 3) return;
      p.genes[best] = Math.max(p.genes[best], GENE_GATE[lv0]);
      gainGene(p, best, 0);
    } },

  /* ── 史诗：改写一小段规则（拾取后进封印槽，按 Q 自己选时机放） ── */
  { id:'shock',  rarity:'epic', name:'雷霆之核', color:'#ddd6fe', icon:'⚡', desc:'全屏敌鱼麻痹 1.3 秒',
    dur:0, sealed:true, apply:function(p){
      for (var i = 0; i < G.enemies.length; i++) G.enemies[i].stunT = Math.max(G.enemies[i].stunT, 1.3);
      G.shockwave = { x:p.x, y:p.y, r:10, max:1400, color:'#ddd6fe' };
      Audio2.boss();
    } },
  { id:'eye',    rarity:'epic', name:'深渊之眼', color:'#7dd3fc', icon:'👁', desc:'本段视野 +22%，宝箱鱼高亮',
    dur:0, sealed:true, apply:function(p){ p.eyeT = 9999; } },
  { id:'sacrifice', rarity:'epic', name:'献祭鳞片', color:'#fb7185', icon:'🩸', desc:'失去 10% 体型，换取 +9 点基因',
    dur:0, sealed:true, apply:function(p){
      p.size = Math.max(12, p.size * 0.9);
      for (var i = 0; i < 9; i++){
        var av = availSpecies(p);
        if (!av.length) break;
        gainGene(p, pick(av), 1);
      }
      burst(p.x, p.y, '#fb7185', 24, 300);
      floater(p.x, p.y - p.size - 26, '献祭 · 基因 +9', '#fb7185', true);
    } },
  { id:'crown',  rarity:'epic', name:'潮汐之冠', color:'#ffd166', icon:'👑', desc:'8 秒内体型 ×1.4 且免疫伤害',
    dur:8, sealed:true, apply:function(p){
      p.inflateMul = 1.4;
      p.inflateFrom = p.size;
      p.size = Math.min(p.maxSize, p.size * 1.4);
      p.inflateT = 8;
      burst(p.x, p.y, '#ffd166', 30, 340, 6);
      floater(p.x, p.y - p.size - 30, '潮汐之冠', '#ffd166', true);
      Audio2.mutate();
    } },
  { id:'stasis', rarity:'epic', name:'时间凝滞', color:'#38bdf8', icon:'⏳', desc:'4 秒慢动作：敌鱼与 Boss 慢到 30%，你照常',
    dur:4, sealed:true, apply:function(p){
      G.stasisT = 4;
      G.shockwave = { x:p.x, y:p.y, r:10, max:1500, color:'#38bdf8' };
      Audio2.boss();
    } },
  { id:'chamber', rarity:'epic', name:'深渊腔室', color:'#f0abfc', icon:'▣', desc:'本局器官槽位 +1（3 → 4）',
    dur:0, sealed:true, apply:function(p){
      p.maxSlots++;
      G.shockwave = { x:p.x, y:p.y, r:10, max:760, color:'#f0abfc' };
      floater(p.x, p.y - p.size - 32, '槽位 ' + p.maxSlots + ' 格', '#f0abfc', true);
      Audio2.mutate();
    } },
  { id:'ancient', rarity:'epic', name:'远古基因', color:'#34d399', icon:'❖', desc:'你已有的每个器官各 +1 级',
    dur:0, sealed:true, apply:function(p){
      var list = p.slots.slice();
      if (!list.length){
        var av = availSpecies(p);
        if (av.length) gainGene(p, pick(av), GENE_GATE[0]);
        return;
      }
      for (var i = 0; i < list.length; i++){
        var sid = list[i], lv = p.levels[sid];
        if (lv >= 3) continue;
        p.genes[sid] = Math.max(p.genes[sid], GENE_GATE[lv]);
        gainGene(p, sid, 0);
      }
      floater(p.x, p.y - p.size - 32, '远古基因觉醒', '#34d399', true);
    } },
  { id:'curse',  rarity:'epic', name:'深海诅咒', color:'#a78bfa', icon:'☠', desc:'本段敌鱼全部变大 25%，但所有吞食收益翻倍',
    dur:0, sealed:true, apply:function(p){
      G.curseStage = G.stage;
      for (var i = 0; i < G.enemies.length; i++){
        var ce = G.enemies[i];
        ce.size = Math.min(WHALE, ce.size * 1.25);
        burst(ce.x, ce.y, '#a78bfa', 6, 170);
      }
      floater(p.x, p.y - p.size - 32, '诅咒 · 吞食 ×2', '#a78bfa', true);
      Audio2.hurt();
    } }
];
}
