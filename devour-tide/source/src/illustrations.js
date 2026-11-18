import heroes from './illustrations/fish.webp';
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
  if (motion && !upright && size>=13 && (Math.abs(motion.bend)>.018 || kick>.08)) {
    // Fit adjacent affine strips to one spine. The eye and jaw remain anchored.
    const segments=6, sw=f.cutWidth/segments, dw=width/segments;
    const tailAt=u=>Math.max(0,(.78-u)/.78)**1.8 *
      (motion.bend*height*.54 + Math.sin(phase-u*3)*kick*height*.075);
    for (let i=0;i<segments;i++) {
      const start=tailAt(i/segments), end=tailAt((i+1)/segments);
      ctx.save();ctx.translate(-width/2+i*dw,start);
      ctx.transform(1,(end-start)/dw,0,1,0,0);
      ctx.drawImage(f.source.image,f.cutX+i*sw,f.cutY,sw,f.cutHeight,0,-height/2,dw+.16,height);
      ctx.restore();
    }
  } else {
    const bob=upright ? Math.sin(phase)*height*.018 : 0;
    ctx.drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,-width/2,-height/2+bob,width,height);
  }
  ctx.restore();
  return true;
}

export function paintSea(ctx,art,w,h,cam,sea,time) {
  const frame = art.biomes.get('sea'+sea);
  if (art.landscape?.index !== sea) {
    const image = new Image();
    art.landscape = {index:sea,image};
    image.src = regionFiles['./illustrations/sea-'+regions[sea]+'.webp'];
  }
  const image=art.landscape.image;
  const full=image.complete && image.naturalWidth>0;
  const source=full ? image : frame.source.image;
  const srcW=full ? image.naturalWidth : frame.cutWidth;
  const srcH=full ? image.naturalHeight : frame.cutHeight;
  const scale = Math.max(w/srcW,h/srcH)*1.055;
  const width = srcW*scale, height = srcH*scale;
  const shift = Math.sin(cam.x*0.0008 + cam.y*0.00022)*Math.min(45,(width-w)*0.48);
  ctx.drawImage(source,full ? 0 : frame.cutX,full ? 0 : frame.cutY,srcW,srcH,
    (w-width)/2+shift,(h-height)/2+Math.sin(time*0.06)*Math.min(5,(height-h)/2),width,height);
  ctx.fillStyle=sea===0 ? 'rgba(5,28,39,.15)' : 'rgba(4,13,24,.14)';
  ctx.fillRect(0,0,w,h);
}
