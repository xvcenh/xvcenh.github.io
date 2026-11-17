// Original field-guide silhouettes. All paths face right on a 128-unit canvas.
const specimens = {
  blue: ['#3887ae','#c1edf0','M30 64C33 37 64 31 90 41Q111 49 110 64Q109 83 83 88Q48 93 30 72Z','M33 63Q18 52 9 49Q13 66 8 82Q23 76 34 72Z',96,56],
  puffer: ['#be7352','#ffdda1','M31 65L27 55L36 53L34 44L45 44L49 33L57 39L68 30L74 37L86 34L89 43Q110 44 111 63Q110 85 87 92L83 98L75 93L63 98L57 92L46 94L44 85L34 84L36 76Z','M35 61L13 53Q18 66 11 79L35 73Z',96,54],
  sword: ['#527f9d','#d5eff3','M27 65Q43 52 57 50Q62 37 73 32L70 49Q90 48 101 57L125 61L100 65Q83 79 57 76L30 71Z','M30 65Q15 60 6 38Q5 60 19 67Q8 76 7 94Q22 83 31 70Z',93,57],
  lantern: ['#786181','#ffd4a4','M29 66Q40 46 66 44Q75 36 93 44Q110 48 115 60L106 65L116 70Q104 88 78 89Q48 87 29 72Z','M31 65L13 51Q17 63 10 80L31 72Z',98,54],
  sardine: ['#7197a4','#e5f3de','M29 65Q53 44 81 51Q104 53 114 62Q101 79 73 78Q46 76 29 70Z','M31 66L10 48L15 64L9 82L31 71Z',101,59],
  eel: ['#655684','#d7b6e5','M17 82Q37 63 58 56Q77 52 87 44Q105 36 118 48Q125 59 111 66Q90 62 75 72Q47 89 17 86Z','M21 81Q12 80 5 92Q15 92 25 86Z',110,48],
  seahorse: ['#637f68','#f1dab1','M86 24Q98 29 97 40L111 47L108 54L90 53L80 46Q74 47 73 59Q87 68 84 80Q82 93 68 96Q61 97 60 102Q59 108 66 108Q71 107 69 103Q77 105 74 113Q67 122 57 114Q48 107 52 98Q54 91 62 86Q53 72 57 59L62 49Q63 35 70 30L71 21L78 25L82 19Z','M61 64Q39 57 42 76Q48 84 62 75Z',88,36],
  ray: ['#4d7777','#c0e7ce','M22 65Q37 60 55 36Q65 26 78 23Q86 40 107 52L113 48L112 60Q123 65 119 73L107 76L109 83Q91 81 76 102Q64 98 55 84Q40 72 22 71Z','M31 65Q16 65 6 78Q19 73 35 71Z',107,65]
};

for (const [id, [dark, light, body, fin, eyeX, eyeY]] of Object.entries(specimens)) {
  specimens[id] = { dark, light, body: new Path2D(body), fin: new Path2D(fin), eyeX, eyeY };
}

export function drawSpecimen(ctx, id, x, y, angle, size, time, opacity) {
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
  } else {
    ctx.rotate(angle + beat * 0.035);
  }
  ctx.scale(size / 34, size / 34);
  ctx.translate(-64, -64);
  ctx.globalAlpha *= opacity;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#18343a';

  const hinge = id === 'seahorse' ? 61 : 30;
  ctx.save();
  ctx.translate(hinge, 67);
  ctx.rotate(beat * (id === 'seahorse' ? 0.34 : 0.26));
  ctx.translate(-hinge, -67);
  ctx.fillStyle = dark;
  ctx.fill(fin);
  ctx.stroke(fin);
  ctx.restore();

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
  ctx.fillStyle = light;
  ctx.globalAlpha *= 0.52;
  for (let i = 0; i < 5; i++) {
    const markX = id === 'seahorse' ? 61 + (i % 2) : 41 + i * 10;
    const markY = id === 'seahorse' ? 48 + i * 7 : 55 + Math.sin(i * 1.3) * 4;
    ctx.beginPath();
    ctx.moveTo(markX, markY);
    ctx.lineTo(markX + 8, markY + 1);
    ctx.lineTo(markX + 5, markY + 5);
    ctx.fill();
  }
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

export function drawReef(ctx, width, height, depth, cameraX, time) {
  const deep = depth > 5200;
  const colors = deep ? ['#183d60', '#132e54', '#122643'] : ['#206188', '#16717b', '#104759'];
  ctx.save();
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
      for (let leaf = -1; leaf <= 1; leaf++) {
        const curve = leaf * 23 + Math.sin(time * 1.35 + i + layer) * 8;
        ctx.fillStyle = (deep ? ['#285372','#235b72','#37616e'] : ['#398494','#53a49c','#dc795f'])[layer];
        ctx.beginPath();
        ctx.moveTo(x - 4, y + 9);
        ctx.quadraticCurveTo(x + curve * .18 - 12, y - tall * .43, x + curve, y - tall);
        ctx.quadraticCurveTo(x + curve * .75 + 13, y - tall * .58, x + 4, y + 8);
        ctx.closePath();
        ctx.fill();
      }
    }
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
