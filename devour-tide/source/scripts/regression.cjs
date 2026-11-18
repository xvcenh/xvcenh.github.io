const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url=process.env.DT_URL || 'http://127.0.0.1:5173/?debug=1';
const result={sims:[],errors:[]};
(async()=>{
 const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:1080,height:640},deviceScaleFactor:1});
 page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto(url);await page.waitForSelector('html[data-engine=phaser]');
 async function play(fish=0,coop=false){
   await page.locator('#fishPick button').nth(fish).click();
   await page.locator(coop?'#btnCoop':'#btnSingle').click();
   await page.locator('#storyActions button').first().click();
   await page.evaluate(()=>advanceTime(1450));
 }
 async function home(){
   await page.reload();await page.waitForSelector('html[data-engine=phaser]');
 }
 await play();
 await page.evaluate(()=>{__DT.G.p.invuln=100;__DT.G.enemies=[];__DT.G.expedition.nextShoal=20;});await page.keyboard.down('ArrowRight');
 await page.evaluate(()=>advanceTime(550));
 const cruise=await page.evaluate(()=>({...__DT.G.p.swim}));
 assert.ok(cruise.effort>.65 && cruise.trail.length>4);
 await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowDown');
 await page.keyboard.down('Shift');await page.evaluate(()=>advanceTime(67));
 const dash=await page.evaluate(()=>({kick:__DT.G.p.swim.pulse,bend:__DT.G.p.swim.bend,a:__DT.G.p.dashAng,active:__DT.G.p.dashT>0}));
 assert.ok(dash.active&&dash.kick>.5&&Math.abs(dash.bend)>.04&&Math.abs(dash.a-Math.PI/2)<.01);
 await page.keyboard.up('Shift');await page.keyboard.up('ArrowDown');
 await page.evaluate(()=>advanceTime(2400));
 const idle=await page.evaluate(()=>__DT.G.p.swim.effort);
 assert.ok(idle<.05,'idle '+idle+' '+await page.evaluate(()=>render_game_to_text()));result.swimming={idle,cruising:cruise.effort,dash};
 result.pickups=await page.evaluate(()=>{
   const {G,items,cards,spawnItemFrom,releaseSeal,update}=__DT;
   const report=[];
   for(const type of items){
     const before=G.stats.items;spawnItemFrom(type,G.p.x,G.p.y);update(1/60);
     if(G.stats.items<=before)throw Error('missed '+type.id);
     if(type.sealed && !releaseSeal(G.p))throw Error('seal '+type.id);
     report.push(type.id);
   }
   for(const card of cards) card.apply(G.p);
   return {items:report,cards:cards.length};
 });
 await home();await play(6);
 result.missions=await page.evaluate(()=>{
   const {G,update}=__DT, p=G.p, done=[];
   for(const stage of [1,2,3]){
     G.stage=stage;p.y=(stage-1)*2600+320;p.x=1770;p.vx=p.vy=0;
     p.invuln=100;G.chase.y=-9000;G.reefCleared=true;G.expedition.site=null;update(1/60);
     const site=G.expedition.site;
     if(site.kind==='net'){
       for(const point of site.points){p.x=site.x+point.x;p.y=site.y+point.y;p.dashT=.15;p.dashAng=0;update(1/60);}
       p.dashT=0;p.vx=p.vy=0;
     } else if(site.kind==='relay'){
       for(const point of site.points){p.x=site.x+point.x;p.y=site.y+point.y;update(1/60);}
     } else {
       for(let i=0;i<250&&!site.done;i++){p.x=site.x+(Math.sin((site.phase+1/60)*1.45)>0?-42:42);p.y=site.y;update(1/60);}
     }
     if(!site.done)throw Error('mission '+site.kind);
     done.push(site.kind);
     if(stage===1){
       const s=G.expedition.shoals.find(s=>s.wakeLeft>0);if(!s)throw Error('missing released school');
       G.story.alert=12;
       for(let i=0;i<120&&!G.expedition.escorts;i++){p.x=s.x-s.heading*86;p.y=s.y;p.dashT=0;p.vx=s.heading*60;update(1/60);}
       if(!G.expedition.escorts||G.story.alert!==8)throw Error('escort not credited '+G.story.alert);
     }
   }
   return {done,escorts:G.expedition.escorts};
 });
 // Render each post-processing option at the same simulation time and sample the world.
 result.filters={};
 for(const mode of ['cel','ink','sunset','original']){
   await page.evaluate(m=>{const s=document.querySelector('[data-filter]');s.value=m;s.dispatchEvent(new Event('change'));advanceTime(1);},mode);
   result.filters[mode]=await page.evaluate(()=>{
     const c=document.querySelector('#cv'),ctx=c.getContext('2d'),a=ctx.getImageData(0,c.height/3|0,c.width,1).data;
     let h=0;for(let x=0;x<a.length;x+=4)h=(h*31+a[x]*5+a[x+1]*3+a[x+2])>>>0;return {...__DT.filterInfo(),hash:h};
   });
 }
 assert.equal(new Set(Object.values(result.filters).map(f=>f.hash)).size,4);
 await home();await play(7,true);
 assert.equal(await page.evaluate(()=>__DT.G.players.length),2);
 await page.keyboard.down('ArrowLeft');await page.evaluate(()=>advanceTime(450));await page.keyboard.up('ArrowLeft');
 assert.ok(await page.evaluate(()=>__DT.G.players[1].vx<0));
 await home();
 for(let fish=0;fish<8;fish++){
   await play(fish);
   const sample=await page.evaluate(()=>{
     const {G,update}=__DT;const p=G.p;p.invuln=200;p.shield=4;
     for(let i=0;i<1800;i++){
       if(i%45===0)p.y=320+45*Math.sin(i/200);
       update(1/60);
       if(!Number.isFinite(p.swim.phase)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||
          G.enemies.some(e=>!Number.isFinite(e.vx)||!Number.isFinite(e.vy)))throw Error('nonfinite movement');
     }
     return {species:p.fishId,simulatedSeconds:30,enemies:G.enemies.length,schoolCount:G.expedition.shoalId};
   });
   result.sims.push(sample);await home();
 }
 assert.deepEqual(result.errors,[]);
 console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
