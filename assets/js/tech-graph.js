"use strict";

const CATEGORIES = {
  language:  { label: '编程语言', color: '#9cdbef' },
  framework: { label: '框架/库',  color: '#b9afd9' },
  tool:      { label: '工具',     color: '#a1dbb1' },
  platform:  { label: '平台',     color: '#f0cf8c' },
  concept:   { label: '概念/领域', color: '#e8aab6' },
};

const NODES = [
  // 语言
  { id: 'python',     label: 'Python',     cat: 'language',  size: 22 },
  { id: 'javascript', label: 'JavaScript', cat: 'language',  size: 20 },
  { id: 'html',       label: 'HTML/CSS',   cat: 'language',  size: 18 },
  { id: 'c-cpp', label: 'C / C++', cat: 'language', size: 17 },
  // 框架/库
  { id: 'svg',        label: 'SVG',        cat: 'framework', size: 20 },
  { id: 'smil',       label: 'SMIL',       cat: 'framework', size: 12 },
  { id: 'canvas',     label: 'Canvas',     cat: 'framework', size: 14 },
  { id: 'threejs',    label: 'Three.js',   cat: 'framework', size: 14 },
  { id: 'vue',        label: 'Vue',        cat: 'framework', size: 15 },
  { id: 'jekyll',     label: 'Jekyll',     cat: 'framework', size: 14 },
  // 工具
  { id: 'git',        label: 'Git',        cat: 'tool',      size: 16 },
  { id: 'docker',     label: 'Docker',     cat: 'tool',      size: 16 },
  { id: 'nginx',      label: 'Nginx',      cat: 'tool',      size: 14 },
  { id: 'cli',        label: 'CLI',        cat: 'tool',      size: 15 },
  { id: 'github',     label: 'GitHub',     cat: 'tool',      size: 16 },
  { id: 'cursor',     label: 'Cursor',     cat: 'tool',      size: 13 },
  { id: 'copilot',    label: 'Copilot',    cat: 'tool',      size: 13 },
  // 平台
  { id: 'ghpages',    label: 'GitHub Pages', cat: 'platform', size: 15 },
  { id: 'terminal',   label: 'Terminal',    cat: 'platform', size: 14 },
  { id: 'linux',      label: 'Linux',       cat: 'platform', size: 14 },
  { id: 'ros2', label: 'ROS 2', cat: 'framework', size: 18 },
  { id: 'stm32', label: 'STM32', cat: 'platform', size: 16 },
  { id: 'can', label: 'CAN', cat: 'concept', size: 13 },
  // 概念
  { id: 'ai',         label: 'AI/LLM',     cat: 'concept',   size: 22 },
  { id: 'scene',      label: '场景合成',    cat: 'concept',   size: 14 },
  { id: 'simulation', label: '社会模拟',    cat: 'concept',   size: 13 },
  { id: 'devtools',   label: 'DevTools',    cat: 'concept',   size: 13 },
  { id: 'game',       label: 'Game Dev',    cat: 'concept',   size: 13 },
  { id: 'seo',        label: 'SEO',         cat: 'concept',   size: 12 },
  { id: 'animation',  label: 'Animation',   cat: 'concept',   size: 13 },
];

const EDGES = [
  ['ros2','python'], ['ros2','linux'], ['ros2','c-cpp'],
  ['stm32','c-cpp'], ['stm32','can'], ['ros2','can'],
  // 语言间
  ['python', 'javascript'],
  ['javascript', 'html'],
  ['html', 'svg'],
  // 框架关联
  ['svg', 'smil'],
  ['svg', 'canvas'],
  ['canvas', 'animation'],
  ['threejs', 'javascript'],
  ['threejs', 'canvas'],
  ['threejs', 'animation'],
  ['vue', 'javascript'],
  ['vue', 'html'],
  ['jekyll', 'html'],
  ['jekyll', 'ghpages'],
  // 工具关联
  ['git', 'github'],
  ['github', 'ghpages'],
  ['docker', 'nginx'],
  ['docker', 'linux'],
  ['cli', 'terminal'],
  ['cli', 'python'],
  ['terminal', 'linux'],
  ['cursor', 'ai'],
  ['copilot', 'ai'],
  ['cursor', 'copilot'],
  // AI 关联
  ['ai', 'python'],
  ['ai', 'javascript'],
  ['ai', 'devtools'],
  // 概念关联
  ['scene', 'svg'],
  ['scene', 'ai'],
  ['simulation', 'ai'],
  ['simulation', 'python'],
  ['simulation', 'terminal'],
  ['devtools', 'cli'],
  ['game', 'svg'],
  ['game', 'canvas'],
  ['game', 'animation'],
  ['seo', 'jekyll'],
  ['seo', 'ghpages'],
];

const PROJECTS = {
  'wheel-leg': { color: '#c7e9ae', techs: ['python','linux','ros2','stm32','can','c-cpp','javascript'] },
  'svg-scene-engine': { color: '#8b5cf6', techs: ['html', 'javascript', 'svg', 'ai', 'scene', 'animation', 'canvas'] },
  'svg-asset-library': { color: '#ec4899', techs: ['svg', 'html', 'smil', 'game', 'animation'] },
  'claudescan':        { color: '#f59e0b', techs: ['python', 'cli', 'ai', 'devtools', 'git'] },
  'liltown':           { color: '#10b981', techs: ['python', 'terminal', 'ai', 'simulation', 'cli'] },
  'xvcenh.github.io':  { color: '#9cdbef', techs: ['html', 'javascript', 'jekyll', 'ghpages', 'threejs', 'canvas', 'seo', 'animation'] },
};

// ══════════════════════════════════════════════
// 图引擎
// ══════════════════════════════════════════════
const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');
const selector = document.getElementById('atlas-node');
const panel = document.getElementById('atlas-panel');
let selectedNode = null;
let W, H, dpr;

// 视图变换
let viewX = 0, viewY = 0, viewScale = 1;

// 交互状态
let hoveredNode = null;
let draggedNode = null;
let press = null;
let isPanning = false;
let panStartX, panStartY, viewStartX, viewStartY;
let lastTouchDist = 0;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener('resize', resize);

// 初始化节点位置
const nodes = NODES.map((n, i) => {
  const angle = (i / NODES.length) * Math.PI * 2;
  const radius = 180 + Math.random() * 120;
  return {
    ...n,
    x: W / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 60,
    y: H / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 60,
    vx: 0, vy: 0,
    color: CATEGORIES[n.cat].color,
    // 找出所属项目
    projects: Object.entries(PROJECTS)
      .filter(([, p]) => p.techs.includes(n.id))
      .map(([name]) => name),
  };
});

const nodeMap = {};
nodes.forEach(n => nodeMap[n.id] = n);

const edges = EDGES.map(([a, b]) => ({
  source: nodeMap[a],
  target: nodeMap[b],
}));

// ── 力导向模拟 ──
const DAMPING = 0.85;
const REPULSION = 8000;
const ATTRACTION = 0.008;
const EDGE_LENGTH = 160;
const CENTER_PULL = 0.0008;

function simulate() {
  const cx = W >= 850 ? (W + 250) / 2 : W / 2, cy = H / 2;

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (a === draggedNode) continue;

    // 排斥力
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let force = REPULSION / (dist * dist);
      let fx = (dx / dist) * force, fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      if (b !== draggedNode) { b.vx -= fx; b.vy -= fy; }
    }

    // 中心引力
    a.vx += (cx - a.x) * CENTER_PULL;
    a.vy += (cy - a.y) * CENTER_PULL;
  }

  // 边引力
  for (const e of edges) {
    let dx = e.target.x - e.source.x, dy = e.target.y - e.source.y;
    let dist = Math.sqrt(dx * dx + dy * dy) || 1;
    let force = (dist - EDGE_LENGTH) * ATTRACTION;
    let fx = (dx / dist) * force, fy = (dy / dist) * force;
    if (e.source !== draggedNode) { e.source.vx += fx; e.source.vy += fy; }
    if (e.target !== draggedNode) { e.target.vx -= fx; e.target.vy -= fy; }
  }

  // 更新位置
  for (const n of nodes) {
    if (n === draggedNode) continue;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
    // 边界
    const margin = 80;
    n.x = Math.max(W >= 850 ? 274 : 28, Math.min(W - (W >= 850 ? margin : 28), n.x));
    n.y = Math.max(104, Math.min(H - margin, n.y));
  }
}

// ── 绘制 ──
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(viewX, viewY);
  ctx.scale(viewScale, viewScale);

  const focus = hoveredNode || selectedNode;
  const highlightSet = new Set();
  if (focus) {
    highlightSet.add(focus.id);
    for (const e of edges) {
      if (e.source === focus) highlightSet.add(e.target.id);
      if (e.target === focus) highlightSet.add(e.source.id);
    }
  }

  // 绘制边
  for (const e of edges) {
    const isHl = focus && (e.source === focus || e.target === focus);
    ctx.beginPath();
    ctx.moveTo(e.source.x, e.source.y);
    ctx.lineTo(e.target.x, e.target.y);
    ctx.strokeStyle = isHl
      ? 'rgba(196,240,181,0.56)'
      : 'rgba(168,214,190,0.19)';
    ctx.lineWidth = isHl ? 2 : 1;
    ctx.stroke();

    // 连线上的小粒子动画
    if (isHl && !reducedMotion.matches) {
      const t = (Date.now() % 2000) / 2000;
      const px = e.source.x + (e.target.x - e.source.x) * t;
      const py = e.source.y + (e.target.y - e.source.y) * t;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#dcffc2';
      ctx.fill();
    }
  }

  // 绘制节点
  for (const n of nodes) {
    const isHl = highlightSet.has(n.id);
    const isDimmed = focus && !isHl;

    const r = n.size * (isHl ? .64 : .52);

    // 光晕
    if (isHl || !focus) {
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.5);
      glow.addColorStop(0, n.color + (isHl ? '88' : '4a'));
      glow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }

    // 节点圆
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isDimmed ? n.color + '33' : n.color + 'cc';
    ctx.fill();
    ctx.strokeStyle = isHl ? '#fff' : n.color + '66';
    ctx.lineWidth = isHl ? 2.5 : 1;
    ctx.stroke();

    if (!isDimmed) {
      ctx.beginPath();
      ctx.arc(n.x - r*.17, n.y - r*.2, Math.max(1.1,r*.28), 0, Math.PI*2);
      ctx.fillStyle = "#f4ffed";
      ctx.fill();
    }
    if (n === selectedNode) {
      ctx.beginPath();
      ctx.arc(n.x,n.y,r+6,0,Math.PI*2);
      ctx.strokeStyle = "#d2efaa";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 标签
    ctx.font = `${isHl ? '600' : '500'} ${isHl ? 13 : 11}px 'Segoe UI','PingFang SC',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDimmed ? 'rgba(226,232,240,0.15)' : 'rgba(226,232,240,0.9)';
    ctx.fillText(n.label, n.x, n.y + r + 14);
  }

  ctx.restore();
}

// ── 主循环 ──
let simSteps = 0;
let scheduled = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function wake() {
  if (!scheduled && !document.hidden) scheduled = requestAnimationFrame(loop);
}
function loop() {
  scheduled = 0;
  if (document.hidden) return;
  const steps = reducedMotion.matches ? 180 : 1;
  for (let i = 0; i < steps && simSteps < 180; i++, simSteps++) simulate();
  draw();
  if (simSteps < 180 || (hoveredNode && !reducedMotion.matches)) wake();
}
for (const event of ['mousemove','mousedown','mouseup','mouseleave','wheel','touchstart','touchmove','touchend']) {
  canvas.addEventListener(event, wake, {passive:true});
}
window.addEventListener('resize', () => { simSteps = 0; wake(); });
document.addEventListener('visibilitychange', wake);
wake();

// ══════════════════════════════════════════════
// 交互
// ══════════════════════════════════════════════
function screenToWorld(sx, sy) {
  return { x: (sx - viewX) / viewScale, y: (sy - viewY) / viewScale };
}

function findNode(sx, sy) {
  const { x, y } = screenToWorld(sx, sy);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const dx = x - n.x, dy = y - n.y;
    if (dx * dx + dy * dy < (n.size + 8) * (n.size + 8)) return n;
  }
  return null;
}

function selectNode(node, center = false, updateUrl = true) {
  selectedNode = node;
  if (node && updateUrl) panel.open = true;
  selector.value = node?.id || "";
  const title = document.getElementById("atlas-title");
  const meta = document.getElementById("atlas-type");
  const connections = document.getElementById("atlas-connections");
  const projects = document.getElementById("atlas-projects");
  connections.replaceChildren();
  projects.replaceChildren();
  title.textContent = node?.label || "技术图谱";
  meta.textContent = node ? CATEGORIES[node.cat].label : nodes.length + " 个节点 · " + edges.length + " 条连线";
  const neighbors = node ? edges.filter(edge => edge.source === node || edge.target === node)
    .map(edge => edge.source === node ? edge.target : edge.source) : [];
  for (const neighbor of neighbors) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = neighbor.label;
    button.onclick = () => selectNode(neighbor, true);
    connections.append(button);
  }
  const links = node ? node.projects : Object.keys(PROJECTS);
  for (const project of links) {
    const link = document.createElement("a");
    link.href = "https://github.com/xvcenh/" + project;
    link.textContent = project + " ↗";
    projects.append(link);
  }
  document.getElementById("atlas-related").hidden = !neighbors.length;
  document.getElementById("atlas-project-section").hidden = !links.length;
  if (center && node) {
    viewX = (W >= 850 ? (W+250)/2 : W/2) - node.x*viewScale;
    viewY = H*.5 - node.y*viewScale;
  }
  if (updateUrl) {
    const url = new URL(location.href);
    if (node) url.searchParams.set("node",node.id);
    else url.searchParams.delete("node");
    history.replaceState(null, "", url);
  }
  wake();
}

// 鼠标事件
canvas.addEventListener('mousemove', (e) => {
  if (draggedNode) {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    draggedNode.x = x;
    draggedNode.y = y;
    draggedNode.vx = 0;
    draggedNode.vy = 0;
    simSteps = 0; // 重新激活模拟
    return;
  }
  if (isPanning) {
    viewX = viewStartX + (e.clientX - panStartX);
    viewY = viewStartY + (e.clientY - panStartY);
    return;
  }
  const n = findNode(e.clientX, e.clientY);
  hoveredNode = n;
  canvas.style.cursor = n ? 'pointer' : 'grab';
});

canvas.addEventListener('mousedown', (e) => {
  const n = findNode(e.clientX, e.clientY);
  press = {node:n, x:e.clientX, y:e.clientY};
  if (n) {
    draggedNode = n;
    simSteps = 0;
  } else {
    isPanning = true;
    panStartX = e.clientX; panStartY = e.clientY;
    viewStartX = viewX; viewStartY = viewY;
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('mouseup', e => {
  if (press?.node && Math.hypot(e.clientX-press.x,e.clientY-press.y) < 7) selectNode(press.node);
  press = null;
  draggedNode = null;
  isPanning = false;
  canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
});

canvas.addEventListener('mouseleave', () => {
  press = null;
  hoveredNode = null;
  draggedNode = null;
  isPanning = false;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoom = e.deltaY > 0 ? 0.92 : 1.08;
  const newScale = Math.max(0.3, Math.min(3, viewScale * zoom));
  const ratio = newScale / viewScale;
  viewX = e.clientX - (e.clientX - viewX) * ratio;
  viewY = e.clientY - (e.clientY - viewY) * ratio;
  viewScale = newScale;
}, { passive: false });

// 触摸事件
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    const n = findNode(t.clientX, t.clientY);
    press = {node:n, x:t.clientX, y:t.clientY};
    if (n) {
      draggedNode = n;
      simSteps = 0;
    } else {
      isPanning = true;
      panStartX = t.clientX; panStartY = t.clientY;
      viewStartX = viewX; viewStartY = viewY;
    }
  } else if (e.touches.length === 2) {
    press = null;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastTouchDist = Math.sqrt(dx * dx + dy * dy);
  }
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    if (draggedNode) {
      const { x, y } = screenToWorld(t.clientX, t.clientY);
      draggedNode.x = x; draggedNode.y = y;
      draggedNode.vx = 0; draggedNode.vy = 0;
      simSteps = 0;
    } else if (isPanning) {
      viewX = viewStartX + (t.clientX - panStartX);
      viewY = viewStartY + (t.clientY - panStartY);
    }
  } else if (e.touches.length === 2) {
    press = null;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (lastTouchDist > 0) {
      const zoom = dist / lastTouchDist;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const newScale = Math.max(0.3, Math.min(3, viewScale * zoom));
      const ratio = newScale / viewScale;
      viewX = cx - (cx - viewX) * ratio;
      viewY = cy - (cy - viewY) * ratio;
      viewScale = newScale;
    }
    lastTouchDist = dist;
  }
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (e.touches.length === 0) {
    const touch = e.changedTouches[0];
    if (press?.node && touch && Math.hypot(touch.clientX-press.x,touch.clientY-press.y) < 9) selectNode(press.node);
    press = null;
    draggedNode = null;
    isPanning = false;
    lastTouchDist = 0;
    }
});


for (const [category, config] of Object.entries(CATEGORIES)) {
  const group = document.createElement("optgroup");
  group.label = config.label;
  for (const node of nodes.filter(node => node.cat === category)) group.append(new Option(node.label, node.id));
  selector.append(group);
  const key = document.createElement("span");
  key.style.setProperty("--swatch", config.color);
  key.textContent = config.label;
  document.getElementById("atlas-legend").append(key);
}
function zoomBy(factor) {
  const newScale = Math.max(.3, Math.min(3, viewScale*factor));
  const ratio = newScale/viewScale;
  viewX = W/2 - (W/2-viewX)*ratio;
  viewY = H/2 - (H/2-viewY)*ratio;
  viewScale = newScale;
  wake();
}
document.getElementById("atlas-in").onclick = () => zoomBy(1.25);
document.getElementById("atlas-out").onclick = () => zoomBy(.8);
document.getElementById("atlas-reset").onclick = () => {
  viewX = viewY = 0;
  viewScale = 1;
  selectNode(null);
};
selector.addEventListener("change", () => selectNode(nodeMap[selector.value] || null, true));
panel.open = W >= 850 || nodeMap[new URLSearchParams(location.search).get("node")] !== undefined;
selectNode(nodeMap[new URLSearchParams(location.search).get("node")] || null, false, false);
