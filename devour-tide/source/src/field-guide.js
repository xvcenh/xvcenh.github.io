// Original field-guide silhouettes. All paths face right on a 128-unit canvas.
const specimens = {
  blue: ['#3887ae','#c1edf0','M30 64C33 37 64 31 90 41Q111 49 110 64Q109 83 83 88Q48 93 30 72Z','M33 63Q18 52 9 49Q13 66 8 82Q23 76 34 72Z',96,56],
  puffer: ['#be7352','#ffdda1','M31 65L27 55L36 53L34 44L45 44L49 33L57 39L68 30L74 37L86 34L89 43Q110 44 111 63Q110 85 87 92L83 98L75 93L63 98L57 92L46 94L44 85L34 84L36 76Z','M35 61L13 53Q18 66 11 79L35 73Z',96,54],
  sword: ['#527f9d','#d5eff3','M27 65Q43 52 57 50Q62 37 73 32L70 49Q90 48 101 57L125 61L100 65Q83 79 57 76L30 71Z','M30 65Q15 60 6 38Q5 60 19 67Q8 76 7 94Q22 83 31 70Z',93,57],
  lantern: ['#786181','#ffd4a4','M29 66Q40 46 66 44Q75 36 93 44Q110 48 115 60L106 65L116 70Q104 88 78 89Q48 87 29 72Z','M31 65L13 51Q17 63 10 80L31 72Z',98,54],
  sardine: ['#7197a4','#e5f3de','M29 65Q53 44 81 51Q104 53 114 62Q101 79 73 78Q46 76 29 70Z','M31 66L10 48L15 64L9 82L31 71Z',101,59],
  eel: ['#655684','#d7b6e5','M17 82Q37 63 58 56Q77 52 87 44Q105 36 118 48Q125 59 111 66Q90 62 75 72Q47 89 17 86Z','M21 81Q12 80 5 92Q15 92 25 86Z',110,48],
  seahorse: ['#637f68','#f1dab1','M86 24Q98 29 97 40L111 47L108 54L90 53L80 46Q74 47 73 59Q87 68 84 80Q82 93 68 96Q61 97 60 102Q59 108 66 108Q71 107 69 103Q77 105 74 113Q67 122 57 114Q48 107 52 98Q54 91 62 86Q53 72 57 59L62 49Q63 35 70 30L71 21L78 25L82 19Z','M61 64Q39 57 42 76Q48 84 62 75Z',88,36],
  ray: ['#4d7777','#c0e7ce','M22 65Q37 60 55 36Q65 26 78 23Q86 40 107 52L113 48L112 60Q123 65 119 73L107 76L109 83Q91 81 76 102Q64 98 55 84Q40 72 22 71Z','M31 65Q16 65 6 78Q19 73 35 71Z',107,65],
  round: ['#497f8e','#b4e9d8','M34 64Q41 48 62 44Q92 41 113 62Q97 85 63 84Q41 80 34 70Z','M36 64L15 53L18 67L13 80L36 72Z',101,59],
  sunfish: ['#6e7191','#e1d9b5','M43 60Q52 37 76 41Q84 20 96 16L95 43Q109 48 112 65Q109 83 91 87L85 109Q72 101 70 88Q52 85 43 71Z','M48 54L28 49L32 69L28 84L48 76Z',101,58],
  shark: ['#47647b','#bde5dd','M24 65Q40 52 60 49L75 27Q83 30 80 48Q101 48 121 60L114 68L95 70L107 76Q84 80 70 77L66 89L55 77Q40 76 24 70Z','M28 65L8 41L12 62L18 69L7 90L28 72Z',106,58],
  squid: ['#a65f67','#f5c5a0','M19 64L34 53L39 39L57 50Q88 50 102 60L103 72Q86 84 56 77L37 88L34 74Z','M91 57Q107 47 122 53L109 61L126 64L110 69L123 79Q107 81 91 73Z',94,61],
  whale: ['#426694','#b2e2e3','M24 66Q40 55 62 49Q87 42 109 48Q121 53 124 62L117 73Q96 86 68 82L52 91L49 79Q33 77 24 71Z','M29 64Q14 55 4 50L13 67L4 79Q17 80 30 71Z',112,57],
  jelly: ['#675f9d','#f0bfe5','M24 66Q27 42 47 32Q63 23 77 30Q100 40 105 66L92 72L77 69L64 75L50 70L37 73Z','M31 64L98 65L94 76L38 77Z',82,52]
};

for (const [id, [dark, light, body, fin, eyeX, eyeY]] of Object.entries(specimens)) {
  specimens[id] = { dark, light, body: new Path2D(body), fin: new Path2D(fin), eyeX, eyeY };
}

export function drawSpecimen(ctx, id, x, y, angle, size, time, opacity = 1, flash = false) {
  const fish = specimens[id];
  if (!fish) return false;
  const { dark, light, body, fin, eyeX, eyeY } = fish;
  const phase = time * (id === 'seahorse' ? 20 : 9);
  const beat = Math.sin(phase);
  ctx.save();
  ctx.translate(x, y);
  if (id === 'seahorse') {
    ctx.scale(Math.cos(angle) < 0 ? -1 : 1, 1);
    ctx.rotate(Math.sin(time * 3) * 0.08);
  } else if (id !== 'jelly') {
    ctx.rotate(angle + beat * 0.035);
  }
  ctx.scale(size / 34, size / 34);
  ctx.translate(-64, -64);
  ctx.globalAlpha *= opacity;
  if (flash) ctx.filter = 'brightness(1.55)';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#18343a';

  const hinge = id === 'seahorse' ? 61 : 30;
  ctx.save();
  ctx.translate(hinge, 67);
  ctx.rotate(beat * (id === 'seahorse' ? 0.34 : 0.26));
  ctx.translate(-hinge, -67);
  const finWash = ctx.createLinearGradient(16, 47, 38, 79);
  finWash.addColorStop(0, light);
  finWash.addColorStop(1, dark);
  ctx.fillStyle = finWash;
  ctx.fill(fin);
  ctx.stroke(fin);
  ctx.save();
  ctx.clip(fin);
  ctx.strokeStyle = '#e7ffed88';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(35, 67);
    ctx.lineTo(6, 39 + i * 12);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();

  if (id === 'jelly') {
    ctx.strokeStyle = light;
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 6; i++) {
      const x = 32 + i * 13;
      const curl = Math.sin(phase * .6 + i) * 10;
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.bezierCurveTo(x + curl, 82, x - curl, 90, x + curl, 101 + i % 3 * 6);
      ctx.stroke();
    }
    ctx.strokeStyle = '#18343a';
  }
  if (id === 'ray') {
    ctx.translate(72, 66);
    ctx.scale(1, 0.91 + beat * 0.09);
    ctx.translate(-72, -66);
  }
  const wash = ctx.createLinearGradient(36, 38, 49, 91);
  wash.addColorStop(0, dark);
  wash.addColorStop(0.68, dark);
  wash.addColorStop(0.7, light);
  wash.addColorStop(1, light);
  ctx.fillStyle = wash;
  ctx.shadowColor = '#07162a';
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 2;
  ctx.fill(body);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke(body);
  ctx.save();
  ctx.clip(body);
  drawBodyCut(ctx, id, light, dark, eyeX, eyeY, beat);
  ctx.restore();

  if (id === 'lantern') {
    ctx.beginPath();
    ctx.moveTo(75, 46);
    ctx.quadraticCurveTo(75, 18, 101, 28 + beat * 3);
    ctx.stroke();
    ctx.fillStyle = '#ffd680';
    ctx.beginPath();
    ctx.arc(101, 28 + beat * 3, 4.8, 0, Math.PI * 2);
    ctx.fill();
  }
  if (id === 'jelly') { ctx.restore(); return true; }
  ctx.fillStyle = '#fff1ce';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 5.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#13282f';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 3.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4e5c8';
  ctx.beginPath();
  ctx.arc(eyeX + 1.1, eyeY - 1.2, 1.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
}

const cutHighlights = {
  narrow: new Path2D('M25 64 Q56 43 99 52 L123 59 Q79 53 43 68Z'),
  broad: new Path2D('M26 61 Q45 33 88 40 Q109 45 113 51 Q67 43 47 61Z'),
  wing: new Path2D('M25 66 Q54 51 78 25 L98 47 Q75 41 65 67Z'),
  horse: new Path2D('M61 72 Q60 41 74 26 L90 26 L96 33 Q72 34 68 76Z')
};

function drawBodyCut(ctx, id, light, dark, eyeX, eyeY, beat) {
  const cut = id === 'ray' ? cutHighlights.wing : id === 'seahorse' ? cutHighlights.horse
    : ['puffer','blue','round','jelly','sunfish','lantern'].includes(id) ? cutHighlights.broad : cutHighlights.narrow;
  ctx.fillStyle = light;
  ctx.globalAlpha *= .42;
  ctx.fill(cut);
  ctx.strokeStyle = '#e6fff0';
  ctx.lineWidth = 1.35;
  for (let i = 0; i < 7; i++) {
    const x = id === 'seahorse' ? 61 : 35 + i * 7.5;
    const y = id === 'seahorse' ? 49 + i * 6 : 58 + Math.sin(i * 1.3) * 4;
    ctx.beginPath();
    if (id === 'blue' || id === 'puffer'){
      ctx.arc(x + (i % 2) * 2, y + (i % 3) * 2.5, 1.3 + i % 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 6, y + 1, x + 3, y + 6);
      ctx.stroke();
    }
  }
  if (!['jelly','seahorse','ray','squid'].includes(id)) {
    const x = eyeX - 19, y = eyeY + 13;
    ctx.strokeStyle = '#092b44';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 8);
    ctx.quadraticCurveTo(x + 7, y - 1, x + 2, y + 6);
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 8, y + 1, x - 20, y + 12 + beat * 5);
    ctx.quadraticCurveTo(x - 7, y + 13, x + 1, y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = light;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

const seaPaper = [
  [['#206188','#16717b','#104759'], ['#398494','#53a49c','#dc795f']],
  [['#183d60','#132e54','#122643'], ['#285372','#235b72','#37616e']],
  [['#294a66','#234360','#19324c'], ['#54758c','#82aeba','#b5ded0']],
  [['#453249','#422538','#2c1d38'], ['#8c555b','#bd6f58','#ed9a64']],
  [['#4b425b','#38384f','#282b40'], ['#7e6874','#a78578','#dec09b']],
  [['#182644','#15203d','#111a31'], ['#33496b','#496588','#78b8b4']]
];

export function drawReef(ctx, width, height, depth, cameraX, time) {
  const [colors, foliage] = seaPaper[Math.min(seaPaper.length - 1, Math.max(0, Math.floor(depth / 5200)))];
  ctx.save();
  drawPaperCanyon(ctx, width, height, colors, foliage, time, cameraX);
  drawPaperFibers(ctx, width, height);
  if (depth < 960) {
    const escapeFade = Math.max(0, 1 - Math.max(0, depth - 370) / 590);
    const hullX = width * .8 + Math.sin(time * .36) * width * .11;
    const lampX = width * .62 + Math.sin(time * .36 - .5) * width * .24;
    ctx.globalAlpha = escapeFade * .48;
    const beam = ctx.createLinearGradient(hullX, 0, lampX, height * .66);
    beam.addColorStop(0, '#ffca8c');
    beam.addColorStop(1, '#ffca8c00');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(hullX - 4, 0);
    ctx.lineTo(hullX + 5, 0);
    ctx.lineTo(lampX + width * .11, height * .69);
    ctx.lineTo(lampX - width * .11, height * .69);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    drawLabRemnant(ctx, width, height, escapeFade, time);
  }
  for (let layer = 0; layer < 3; layer++) {
    const baseline = height * (0.74 + layer * 0.115);
    const offset = cameraX * (.05 + layer * .054);
    ctx.fillStyle = colors[layer];
    ctx.shadowColor = '#04122b';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 18; x += 18) {
      const y = baseline + Math.sin((x + offset) / 106 + layer * 2) * 19
        + Math.sin((x + offset) / 42 + layer) * 12 + Math.sin(x * 1.39) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    for (let i = -1; i < width / 164 + 2; i++) {
      const x = i * 164 - offset % 164 + layer * 47;
      const y = baseline + 26;
      const tall = 30 + (Math.cos(i * 1.7 + layer) + 1) * 23;
      if (layer === 2 && i % 2 === 0) {
        drawCoralCut(ctx, x, y + 9, tall, foliage[layer], time + i);
        continue;
      }
      for (let leaf = -1; leaf <= 1; leaf++) {
        const curve = leaf * 23 + Math.sin(time * 1.35 + i + layer) * 8;
        ctx.fillStyle = foliage[layer];
        ctx.beginPath();
        ctx.moveTo(x - 4, y + 9);
        ctx.quadraticCurveTo(x + curve * .18 - 12, y - tall * .43, x + curve, y - tall);
        ctx.quadraticCurveTo(x + curve * .75 + 13, y - tall * .58, x + 4, y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#d6f2c72e';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x, y + 7);
        ctx.quadraticCurveTo(x + curve * .32, y - tall * .41, x + curve, y - tall + 4);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

const coralCut = new Path2D('M-9 4 -12 -16 -26 -24 -35 -43 -30 -48 -21 -38 -16 -31 -14 -45 -17 -65 -10 -69 -5 -58 -2 -44 5 -56 10 -66 16 -62 13 -47 6 -31 16 -35 24 -51 31 -49 28 -38 22 -26 11 -17 10 4Z');
const coralVeins = new Path2D('M0 0 Q-2 -24 -11 -62 M-4 -25 Q-19 -29 -28 -43 M4 -18 Q16 -22 26 -46 M-1 -37 Q8 -45 14 -59');

function drawCoralCut(ctx, x, y, size, color, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * .75) * .035);
  ctx.scale(size / 71, size / 71);
  ctx.fillStyle = color;
  ctx.shadowColor = '#091c36';
  ctx.shadowOffsetY = 4;
  ctx.shadowBlur = 4;
  ctx.fill(coralCut);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#ffe0ac64';
  ctx.lineWidth = 1.6;
  ctx.stroke(coralVeins);
  ctx.restore();
}

let fiberPattern;
function drawPaperFibers(ctx, width, height) {
  if (!fiberPattern) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 128;
    const ink = tile.getContext('2d');
    for (let i = 0; i < 2150; i++) {
      ink.fillStyle = i % 4 ? '#03152a' : '#d3f8dc';
      ink.globalAlpha = .19 + (i % 5) * .06;
      ink.fillRect((i * 137 + (i * i % 257)) % 128, (i * 97 + (i * i % 251)) % 128, i % 6 === 0 ? 2 : 1, 1);
    }
    fiberPattern = ctx.createPattern(tile, 'repeat');
  }
  if (!fiberPattern) return;
  ctx.save();
  ctx.globalAlpha = .34;
  ctx.fillStyle = fiberPattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

const shelfCut = new Path2D('M0 0 42 17 58 45 88 66 103 93 82 107 131 150 129 171 182 207 197 249 248 278 289 330 330 360 0 360Z');

function drawPaperCanyon(ctx, width, height, palette, leaves, time, cameraX) {
  ctx.save();
  const glow = ctx.createRadialGradient(width * .57, height * .27, height * .04, width * .54, height * .31, Math.max(width, height) * .68);
  glow.addColorStop(0, leaves[0] + '42');
  glow.addColorStop(.55, palette[0] + '22');
  glow.addColorStop(1, '#040e29a0');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  for (let side = 0; side < 2; side++) {
    for (let layer = 0; layer < 3; layer++) {
      const span = Math.min(width * .2, 240) * (1 - .19 * layer);
      const drift = (cameraX - 1800) * (.004 + layer * .004);
      ctx.save();
      ctx.translate(side === 0 ? -17 + drift : width + 17 + drift, height * (.12 + layer * .13));
      ctx.scale((side === 0 ? 1 : -1) * span / 330, height * .83 / 360);
      ctx.fillStyle = palette[layer];
      ctx.globalAlpha = .26 + layer * .15;
      ctx.fill(shelfCut);
      ctx.lineWidth = 3;
      ctx.strokeStyle = leaves[layer];
      ctx.stroke(shelfCut);
      ctx.restore();
    }
  }
  for (let i = 0; i < 22; i++) {
    const x = (((i * 263 + time * (3 + i % 3)) % (width + 80)) + width + 80) % (width + 80) - 40;
    const y = height * (.12 + ((i * 31) % 74) / 100) + Math.sin(time * .65 + i) * 16;
    ctx.globalAlpha = .13 + .19 * (Math.sin(time * 1.1 + i) + 1) / 2;
    ctx.fillStyle = i % 5 ? leaves[1] : '#ffc88e';
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 1);
    ctx.lineTo(x, y - 3);
    ctx.lineTo(x + 2.5, y + .7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawLabRemnant(ctx, width, height, fade, time) {
  ctx.save();
  ctx.globalAlpha = fade * .73;
  ctx.translate(width * .105, height * .55);
  const scale = Math.min(1, width / 830);
  ctx.scale(scale, scale);
  ctx.rotate(-.17);
  ctx.fillStyle = '#102a49';
  ctx.beginPath();
  ctx.moveTo(-77, 56);
  ctx.lineTo(-69, -54);
  ctx.lineTo(46, -54);
  ctx.lineTo(63, 64);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#79b9bb';
  ctx.lineWidth = 3;
  ctx.strokeRect(-56, -37, 87, 67);
  ctx.fillStyle = '#82e6d162';
  ctx.beginPath();
  ctx.moveTo(-55, -36);
  ctx.lineTo(31, -36);
  ctx.lineTo(3, -12);
  ctx.lineTo(20, 3);
  ctx.lineTo(-2, 29);
  ctx.lineTo(-55, 29);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d7f1d2a8';
  ctx.beginPath();
  ctx.moveTo(3, -12);
  ctx.lineTo(-24, 5);
  ctx.lineTo(-34, 29);
  ctx.moveTo(3, -12);
  ctx.lineTo(-11, -35);
  ctx.stroke();
  ctx.fillStyle = Math.sin(time * 5) > -.25 ? '#ff986c' : '#8c4849';
  ctx.fillRect(-61, -46, 12, 4);
  ctx.restore();
}


const guardianPlates = [
  ['#aa5852', '#ffd398', 0],
  ['#5d84b1', '#bbece2', 1],
  ['#7386aa', '#cfcdf5', 2],
  ['#4f9288', '#c0f1dd', 3],
  ['#9f6f97', '#f9c5d4', 4],
  ['#bc6652', '#ffd4a0', 5]
];
const hullCut = new Path2D('M8 4 53 3 71 10 124 5 124 21 8 28Z');
const guardianHulls = [
  new Path2D('M7 2 28 -12 59 -9 77 -19 74 -8 111 -3 123 7 111 18 77 17 62 26 48 19 25 15 10 26 15 12Z'),
  new Path2D('M5 5 29 -9 37 -17 68 -17 79 -9 111 -6 124 6 115 21 32 25 7 19 19 13Z'),
  new Path2D('M10 6 41 -2 61 -29 80 -18 92 -7 116 -7 124 5 114 14 94 15 70 32 51 17 20 16Z'),
  new Path2D('M7 10 29 2 44 -14 65 -18 85 -12 99 -16 121 -7 124 3 112 11 94 9 75 6 61 12 46 20 24 20 7 29Z'),
  new Path2D('M8 13 18 -6 43 -22 72 -24 100 -13 117 4 119 16 93 20 76 16 56 21 35 16Z'),
  new Path2D('M5 -4 28 -29 42 -18 56 -25 65 -15 78 -16 93 -25 119 -9 124 17 106 31 84 22 66 28 42 22 16 31Z')
];

export function drawPaperGuardian(ctx, index, x, y, angle, size, time, opacity = 1, flash = false) {
  const [plate, trim, id] = guardianPlates[index];
  const beat = Math.sin(time * 6);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const scale = size / 42;
  ctx.scale(scale, scale);
  ctx.translate(-63, 0);
  ctx.globalAlpha *= opacity;
  ctx.lineJoin = 'round';
  if (flash) ctx.filter = 'brightness(1.6)';
  ctx.fillStyle = trim;
  ctx.globalAlpha *= .68;
  ctx.beginPath();
  ctx.moveTo(21, 7);
  ctx.lineTo(4 - beat * 5, -1);
  ctx.lineTo(0, 10);
  ctx.lineTo(5 - beat * 4, 20);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha /= .68;

  ctx.fillStyle = '#102c43';
  ctx.save();
  ctx.translate(0, 5);
  ctx.fill(guardianHulls[id]);
  ctx.restore();
  ctx.fillStyle = plate;
  ctx.strokeStyle = '#122b3d';
  ctx.lineWidth = 2.7;
  ctx.fill(guardianHulls[id]);
  ctx.stroke(guardianHulls[id]);

  ctx.save();
  ctx.clip(guardianHulls[id]);
  ctx.fillStyle = trim;
  ctx.globalAlpha *= .44;
  ctx.fill(hullCut);
  ctx.restore();
  ctx.strokeStyle = '#182e41';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++){
    const x = 30 + 14 * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 4, 10);
    ctx.stroke();
  }
  ctx.fillStyle = '#142a43';
  ctx.fillRect(94, -3, 18, 9);
  ctx.fillStyle = trim;
  ctx.fillRect(98, -1, 5 + beat * 2, 5);
  ctx.fillRect(106, -1, 3, 5);

  ctx.save();
  ctx.clip(guardianHulls[id]);
  ctx.strokeStyle = trim;
  ctx.globalAlpha *= .84;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(18, 2);
  ctx.lineTo(32, -5);
  ctx.lineTo(60, -4);
  ctx.lineTo(82, 1);
  ctx.stroke();
  for (let i = 0; i < 4; i++){
    ctx.fillStyle = trim;
    ctx.fillRect(24 + 14 * i, 13, 3, 2);
  }
  ctx.fillStyle = '#172d40';
  ctx.fillRect(67, 6, 14, 7);
  ctx.fillStyle = '#f5ca88';
  ctx.fillRect(70, 8, 3, 3);
  ctx.fillRect(75, 8, 3, 3);
  ctx.restore();
  ctx.restore();
}

const pickupMarks = {
  common: new Path2D('M0 -7 5 0 0 7 -5 0Z'),
  rare: new Path2D('M0 -8 3 -3 8 0 3 3 0 8 -3 3 -8 0 -3 -3Z'),
  epic: new Path2D('M0 -9 7 -4 6 5 0 9 -6 5 -7 -4Z')
};

export function drawPaperPickup(ctx, x, y, size, color, rarity = 'common', angle = 0, alpha = 1) {
  const shape = pickupMarks[rarity] || pickupMarks.common;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size / 8, size / 8);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#102f43';
  ctx.save();
  ctx.translate(1.5, 2);
  ctx.fill(shape);
  ctx.restore();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#e1ffee';
  ctx.lineWidth = 1;
  ctx.fill(shape);
  ctx.stroke(shape);
  ctx.fillStyle = '#fff4d0';
  ctx.fillRect(-1.5, -3, 2.5, 2.5);
  ctx.restore();
}

export function drawPaperPursuit(ctx, view, y, type, time) {
  const [back, mid, rim] = type === 'lava' ? ['#2c182e','#733342','#ff9b69']
    : type === 'poll' ? ['#172a2b','#425a3c','#c8df85'] : ['#0b182f','#21516c','#83e7df'];
  const start = Math.floor(view.x / 74) * 74 - 74, end = view.x + view.w + 76;
  ctx.save();
  for (let layer = 0; layer < 3; layer++) {
    const offset = -35 + layer * 29;
    ctx.fillStyle = [back, mid, rim][layer];
    ctx.beginPath();
    ctx.moveTo(start, layer === 0 ? view.y - 60 : y - 125);
    ctx.lineTo(end, layer === 0 ? view.y - 60 : y - 125);
    for (let x = end; x >= start - 2; x -= layer === 2 ? 16 : 27) {
      const notch = Math.sin(x * .063 + layer) * (layer === 2 ? 3 : 7);
      const wave = Math.sin(x * .015 + time * .92 + layer) * 11;
      const edge = y + offset + notch + wave;
      ctx.lineTo(x, layer === 2 ? edge : edge + 5);
    }
    ctx.closePath();
    ctx.globalAlpha = layer === 0 ? .97 : layer === 1 ? .9 : .62;
    ctx.fill();
  }
  ctx.globalAlpha = .84;
  ctx.fillStyle = rim;
  for (let x = start; x < end; x += 148) {
    const flicker = Math.sin(time * 4 + x * .021) * 3;
    ctx.fillRect(x + 38, y - 50, 15 + flicker, 5);
    ctx.fillRect(x + 60, y - 50, 5, 5);
  }
  ctx.restore();
}
