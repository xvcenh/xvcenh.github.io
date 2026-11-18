// Seven stations run from the skull to the tail tip. Each joint follows the preceding
// joint and a travelling muscle wave. The root is fixed in local body coordinates.
const count=7;
const shapes={
  ribbon:{gain:.23,lag:5.2,rigidity:13},
  wing:{gain:.10,lag:2.1,rigidity:11},
  hover:{gain:.065,lag:2.7,rigidity:18},
  sprint:{gain:.105,lag:3.7,rigidity:24},
  cruise:{gain:.14,lag:3.8,rigidity:18}
};
const forms={eel:'ribbon',boss_eel:'ribbon',ray:'wing',boss_ray:'wing',seahorse:'hover',
  jelly:'hover',boss_jelly:'hover',sword:'sprint',sardine:'sprint',needle:'sprint'};

export function flexSpine(motion,id,dt) {
  const form=forms[id] || 'cruise', profile=shapes[form];
  const spine=motion.spine ||= {
    angles:Array(count).fill(0), rates:Array(count).fill(0), offsets:Array(count).fill(0)
  };
  motion.form=form;
  const drive=profile.gain*(.24+motion.effort*.8+motion.pulse*.72);
  // Small substeps keep the spring stable during a slow frame or a replay seek.
  const steps=Math.max(1,Math.ceil(dt*90)), h=dt/steps;
  for(let step=0;step<steps;step++){
    for(let i=1;i<count;i++){
      const u=i/(count-1), proximal=spine.angles[i-1];
      const muscle=Math.sin(motion.phase-profile.lag*u)*drive*(.3+u);
      const target=muscle+proximal*.31-motion.bend*u*.9;
      const w=profile.rigidity*(1.2-.32*u);
      const acceleration=w*w*(target-spine.angles[i])-1.62*w*spine.rates[i];
      spine.rates[i]+=acceleration*h;
      spine.angles[i]+=spine.rates[i]*h;
    }
  }
  for(let i=1;i<count;i++) spine.offsets[i]=spine.offsets[i-1]+Math.sin(spine.angles[i])/(count-1);
}

export function paintSkin(ctx,frame,width,height,motion) {
  const offsets=motion.spine.offsets,n=offsets.length-1;
  const image=frame.source.image, vertical=motion.form==='hover';
  // The two ends of a strip share the neighbouring strip's endpoints. A fractional
  // overlap closes subpixel gaps at high DPI without blending two animation frames.
  for(let i=0;i<n;i++) {
    ctx.save();
    if(vertical) {
      const sh=frame.cutHeight/n, dh=height/n;
      const start=offsets[i]*width*.72,end=offsets[i+1]*width*.72;
      ctx.translate(start,-height/2+i*dh);
      ctx.transform(1,0,(end-start)/dh,1,0,0);
      ctx.drawImage(image,frame.cutX,frame.cutY+i*sh,frame.cutWidth,sh,-width/2,0,width,dh+.15);
    } else {
      const sw=frame.cutWidth/n,dw=width/n;
      const start=offsets[n-i]*width,end=offsets[n-i-1]*width;
      ctx.translate(-width/2+i*dw,start);
      ctx.transform(1,(end-start)/dw,0,1,0,0);
      ctx.drawImage(image,frame.cutX+i*sw,frame.cutY,sw,frame.cutHeight,0,-height/2,dw+.15,height);
    }
    ctx.restore();
  }
}
