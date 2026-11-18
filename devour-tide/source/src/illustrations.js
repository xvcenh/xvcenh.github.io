import heroes from './illustrations/fish.webp';
import {paintSkin} from './swim-spine.js';
import { SEA_SPAN, STAGE_DEPTH, WORLD } from './config.js';
import { RIFT_LENGTH } from './endless.js';
import fauna from './illustrations/wild.webp';
import guardians from './illustrations/guardians.webp';
import props from './illustrations/props.webp';
import biomes from './illustrations/biomes.webp';
const regionFiles = import.meta.glob('./illustrations/sea-*.webp',{eager:true,import:'default',query:'?url'});
const regions = ['reef','trench','ice','vents','ruins','abyss'];

const banks = {
  heroes:{ url:heroes, ids:'blue puffer sword lantern sardine eel seahorse ray'.split(' ') },
  fauna:{ url:fauna, ids:'round sunfish shark squid whale jelly anchovy chromis anthias wrasse needle cardinal'.split(' ') },
  guardians:{ url:guardians, ids:'boss_shark boss_whale boss_ray boss_eel boss_jelly boss_lava'.split(' ') }
};
export const guardianIds=banks.guardians.ids;
export const propsList = 'coral fan sponge anemone kelp grass polyps seafern vent crystal valve fossil buoy relay cache ampoule'.split(' ');

export function loadPaintings(scene) {
  for (const [key,bank] of Object.entries(banks)) scene.load.image(key,bank.url);
  scene.load.image('props',props);
  scene.load.image('biomes',biomes);
}

export function registerPaintings(scene){
  if (['heroes','fauna','guardians','props','biomes'].some(key=>!scene.textures.exists(key))) return null;
  const frames = new Map();
  for (const [key,bank] of Object.entries(banks)) {
    const texture = scene.textures.get(key);
    const width = texture.source[0].width / 8, height = texture.source[0].height / bank.ids.length;
    bank.ids.forEach((id,row) => {
      const poses = [];
      for (let col=0;col<8;col++) poses.push(texture.add(id+col,0,col*width,row*height,width,height));
      frames.set(id,poses);
    });
  }
  const props = scene.textures.get('props');
  propsList.forEach((id,i)=>props.add(id,0,i%4*132,Math.floor(i/4)*132,132,132));
  const biomes = scene.textures.get('biomes');
  const {width,height} = biomes.source[0];
  for (let i=0;i<6;i++){
    const x=i%2*width/2, row=Math.floor(i/2);
    const top=Math.round(height*row/3), bottom=Math.round(height*(row+1)/3);
    biomes.add('sea'+i,0,x+2,top+2,width/2-4,bottom-top-4);
  }
  return {frames,props,biomes};
}

export function paintAnimal(ctx, art, id, x, y, angle, size, time, alpha=1, flash=false, motion) {
  const poses = art?.frames.get(id);
  if (!poses) return false;
  const phase = motion?.phase ?? Math.abs(time)*Math.PI*2*1.25;
  const f = poses[Math.floor(phase*poses.length/(Math.PI*2)) % poses.length];
  const upright = id === 'seahorse' || id === 'jelly' || id === 'boss_jelly';
  const left = motion ? motion.facing < 0 : Math.cos(angle) < 0;
  const pitch = Math.asin(Math.sin(angle)) * (left ? -1 : 1);
  const width = size * (upright ? 3.15 : 3.0);
  const height = width * f.cutHeight/f.cutWidth;
  ctx.save();ctx.translate(x,y);
  const effort=motion?.effort ?? .4, kick=motion?.pulse || 0;
  const tilt=upright ? Math.sin(phase)*.035 + (left?-1:1)*Math.min(.18,effort*.09) : pitch*.9;
  ctx.rotate(tilt);
  const turnWidth=motion ? .5+Math.abs(motion.facing)*.5 : 1;
  ctx.scale((left?-1:1)*turnWidth*(1+kick*.06),1-kick*.035);
  ctx.globalAlpha *= alpha;
  if (flash) ctx.filter='brightness(1.65)';
  if (motion?.spine && size>=13) {
    if (motion.form==='wing')ctx.scale(1,1+Math.sin(phase)*(.028+.048*effort));
    paintSkin(ctx,f,width,height,motion);
  } else {
    const bob=upright ? Math.sin(phase)*height*.018 : 0;
    ctx.drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,-width/2,-height/2+bob,width,height);
  }
  ctx.restore();
  return true;
}

function paintPanorama(ctx,art,w,h,cam,{index,image,depth}){
  const frame=art.biomes.get('sea'+index);
  const full=image.complete && image.naturalWidth>0;
  const source=full ? image : frame.source.image;
  const srcW=full ? image.naturalWidth : frame.cutWidth;
  const srcH=full ? image.naturalHeight : frame.cutHeight;
  // Reserve image beyond the viewport so the camera can pan in both axes,
  // including tall displays and the low-resolution atlas used during loading.
  const travelX = w * .54;
  const travelY = h * .8;
  const scale = Math.max((w + travelX)/srcW,(h + travelY)/srcH);
  const width = srcW*scale, height = srcH*scale;
  const across = Math.max(0, Math.min(1, cam.x / WORLD.w));
  ctx.drawImage(source,full ? 0 : frame.cutX,full ? 0 : frame.cutY,srcW,srcH,
    (w-width)/2 + (.5-across)*travelX,
    (h-height)/2 + (.5-depth)*travelY,width,height);
}

export function paintSea(ctx,art,w,h,cam,sea,rift,time) {
  if (art.landscape?.index !== sea) {
    const image=new Image();
    art.previousSea=art.landscape;
    art.landscape={index:sea,image,entered:time,depth:0};
    image.src=regionFiles['./illustrations/sea-'+regions[sea]+'.webp'];
  }
  const seaDepth=rift ? RIFT_LENGTH : SEA_SPAN*STAGE_DEPTH;
  const seaStart=rift ? rift.start : sea*seaDepth;
  art.landscape.depth=Math.max(0,Math.min(1,(cam.y-seaStart)/seaDepth));
  const blend=Math.max(0,Math.min(1,(time-art.landscape.entered)/.75));
  ctx.save();
  if (art.previousSea && blend<1) {
    paintPanorama(ctx,art,w,h,cam,art.previousSea);
    ctx.globalAlpha=blend*blend*(3-2*blend);
  } else {
    art.previousSea=null;
  }
  paintPanorama(ctx,art,w,h,cam,art.landscape);
  ctx.restore();
  ctx.fillStyle=sea===0 ? 'rgba(5,28,39,.08)' : 'rgba(4,13,24,.09)';
  ctx.fillRect(0,0,w,h);
}
