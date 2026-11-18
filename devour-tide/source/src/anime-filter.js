// Composite at the game's backing resolution to preserve edges on high-DPI screens.
// For large frames the native Canvas 2D blend keeps that resolution without a GPU copy.
const modes = ['cel','ink','sunset','original'];
const labels = ['赛璐璐','蓝墨漫画','夕照剧场','原画'];
const vertex = 'attribute vec2 pos;varying vec2 uv;void main(){uv=vec2(pos.x*.5+.5,.5-pos.y*.5);gl_Position=vec4(pos,0.,1.);}';
const fragment = `
precision mediump float;
uniform sampler2D world;
uniform vec2 pixel;
uniform float mode;
varying vec2 uv;
float luma(vec3 c){return dot(c,vec3(.24,.62,.14));}
float lum(vec2 at){return luma(texture2D(world,at).rgb);}
void main(){
  vec3 c=texture2D(world,uv).rgb;
  float l=luma(c);
  float grad=abs(lum(uv+vec2(pixel.x,0.))-lum(uv-vec2(pixel.x,0.)))+
             abs(lum(uv+vec2(0.,pixel.y))-lum(uv-vec2(0.,pixel.y)));
  float edge=smoothstep(.12,.38,grad);
  float levels=mode<.5?8.:6.;
  float q=floor(l*levels)+smoothstep(.46,.58,fract(l*levels));
  vec3 color=c*((q/levels+.06)/(l+.06));
  if(mode<.5){
    color=mix(c,mix(vec3(l),color,1.04),.62);
    color=mix(color,vec3(.025,.082,.16),edge*.36);
  }else if(mode<1.5){
    color=mix(vec3(.035,.105,.19),vec3(.86,.94,.88),q/levels);
    float dotScreen=smoothstep(.74,.86,sin(gl_FragCoord.x*1.43)*sin(gl_FragCoord.y*1.43));
    color*=1.-dotScreen*(1.-l)*.25;
    color=mix(color,vec3(.02,.04,.10),edge*.8);
  }else{
    color=mix(color,color*vec3(1.17,.98,.78)+vec3(.06,.012,.02),.72);
    color+=smoothstep(.42,.9,l)*vec3(.085,.033,.009);
    color=mix(color,vec3(.13,.055,.15),edge*.37);
  }
  gl_FragColor=vec4(clamp(color,0.,1.),1.);
}`;

function makeGpu(surface){
  const gl=surface.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
  if (!gl) return null;
  function compile(type,source){
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program=gl.createProgram();
  gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'pos');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  for(const name of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,name,gl.LINEAR);
  for(const name of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,name,gl.CLAMP_TO_EDGE);
  const pixel=gl.getUniformLocation(program,'pixel'), mode=gl.getUniformLocation(program,'mode');
  return (source,index)=>{
    if (gl.isContextLost()) return false;
    gl.viewport(0,0,surface.width,surface.height);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.uniform2f(pixel,1/source.width,1/source.height);gl.uniform1f(mode,index);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    return true;
  };
}

export function createAnimeFilter(){
  let selected='cel', quality='auto', attempted=false, drawGpu=null, path='2D';
  try {
    const stored=localStorage.getItem('devour-tide.filter');
    if (modes.includes(stored)) selected=stored;
    if (localStorage.getItem('devour-tide.effects')==='light') quality='light';
  } catch {}
  const surface=document.createElement('canvas');
  surface.addEventListener('webglcontextlost',e=>{e.preventDefault();drawGpu=null;});
  surface.addEventListener('webglcontextrestored',()=>{attempted=false;});
  const tile=document.createElement('canvas');tile.width=tile.height=5;
  const pen=tile.getContext('2d');pen.fillStyle='#0c2747';pen.fillRect(1,1,1,1);pen.fillRect(3,3,1,1);
  let pattern;
  const selects=[...document.querySelectorAll('[data-filter]')];
  const qualities=[...document.querySelectorAll('[data-quality]')];
  function sync(){
    for (const select of selects) select.value=selected;
    for (const select of qualities) select.value=quality;
  }
  for(const select of selects){
    modes.forEach((value,i)=>select.add(new Option(labels[i],value)));
    select.onchange=()=>set(select.value);
  }
  for(const select of qualities) select.onchange=()=>{
    quality=select.value;sync();try{localStorage.setItem('devour-tide.effects',quality);}catch{}
  };
  function set(value){
    if (!modes.includes(value)) return;
    selected=value; sync();try{localStorage.setItem('devour-tide.filter',value);}catch{}
  }
  sync();
  return {
    cycle(){set(modes[(modes.indexOf(selected)+1)%modes.length]);return labels[modes.indexOf(selected)];},
    info(){return {mode:selected,quality,path};},
    render(ctx,w,h,low){
      if(selected==='original'){path='原画';return;}
      const {width:sw,height:sh}=ctx.canvas;
      if(quality==='auto' && !low && sw*sh<=2000000){
        if(!attempted){
          attempted=true;try{drawGpu=makeGpu(surface);}catch{drawGpu=null;}
        }
        if(drawGpu){
          if(surface.width!==sw || surface.height!==sh){surface.width=sw;surface.height=sh;}
          try{
            if(drawGpu(ctx.canvas,modes.indexOf(selected))){
              ctx.save();ctx.setTransform(1,0,0,1,0,0);
              ctx.drawImage(surface,0,0);ctx.restore();path='WebGL';return;
            }
          }catch{drawGpu=null;}
        }
      }
      // Native blend operations need neither a GPU readback nor a second full-size buffer.
      path='2D';ctx.save();
      if(selected==='ink'){
        ctx.globalCompositeOperation='color';ctx.fillStyle='#386784';ctx.fillRect(0,0,w,h);
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.30;
        pattern ||= ctx.createPattern(tile,'repeat');ctx.fillStyle=pattern;ctx.fillRect(0,0,w,h);
      }else{
        ctx.globalCompositeOperation='soft-light';
        ctx.fillStyle=selected==='sunset'?'#ecaa82':'#6f99ad';ctx.fillRect(0,0,w,h);
        if(selected==='sunset'){ctx.globalCompositeOperation='screen';ctx.fillStyle='#5a29191f';ctx.fillRect(0,0,w,h);}
      }
      ctx.restore();
    }
  };
}
