/* 吞噬之潮 · ui.js — 菜单 / 捏鱼 / HUD / 抽卡 / 结算 */
(function () {
  const DT = (window.DT = window.DT || {});
  const F = DT.fish, U = DT.util;
  const UI = (DT.ui = {});

  const $ = (id) => document.getElementById(id);
  let curTab = 0;
  let styles = [];
  let settingsReturn = 'menu';
  let hudT = 0;
  let previewCanvas, previewCtx;

  /* ================= 屏幕切换 ================= */
  const SCREENS = ['menu', 'custom', 'settings', 'howto', 'cards', 'results', 'pause'];
  UI.screen = function (name) {
    SCREENS.forEach((s) => {
      const el = $('scr-' + s);
      if (el) el.classList.toggle('hidden', s !== name);
    });
    $('hud').classList.toggle('hidden', !(DT.game && (DT.game.state === 'playing' || DT.game.paused)));
  };

  /* ================= 初始化 ================= */
  UI.init = function () {
    previewCanvas = $('fishPreview');
    previewCtx = previewCanvas.getContext('2d');

    // 捏鱼下拉框
    fillSelect($('fcFin'), F.fins);
    fillSelect($('fcTail'), F.tails);
    fillSelect($('fcEye'), F.eyes);
    fillSelect($('fcPattern'), F.patterns.map((p) => ({ none: '纯色', bars: '条纹', dots: '圆点', stars: '星点', stripes: '宽纹' })[p]));
    fillSelect($('fcGlow'), F.glows);
    fillSelect($('fcAcc'), F.accessories);

    // 样式存档
    styles = [loadStyle(0), loadStyle(1)];

    // 按钮
    document.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => action(btn.getAttribute('data-act')));
    });
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        curTab = parseInt(tab.getAttribute('data-tab'), 10);
        document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
        loadControls();
      });
    });

    // 捏鱼控件同步
    ['fcName', 'fcSpecies', 'fcColor1', 'fcColor2', 'fcHgt', 'fcFin', 'fcTail', 'fcEye', 'fcPattern', 'fcGlow', 'fcAcc'].forEach((id) => {
      $(id).addEventListener('input', () => {
        collectControls();
        $('fcHgtV').textContent = parseFloat($('fcHgt').value).toFixed(2);
      });
      $(id).addEventListener('change', collectControls);
    });

    // 设置控件
    const st = loadSettings();
    $('setVolume').value = st.volume;
    $('setVolumeV').textContent = Math.round(st.volume * 100) + '%';
    $('setQuality').value = st.quality;
    $('setShake').checked = st.shake;
    $('setFps').checked = st.fps;
    $('setTips').checked = st.tips;
    $('setVolume').addEventListener('input', () => {
      const v = parseFloat($('setVolume').value);
      $('setVolumeV').textContent = Math.round(v * 100) + '%';
      DT.audio.init();
      DT.audio.setVolume(v);
      saveSettings();
    });
    ['setQuality', 'setShake', 'setFps', 'setTips'].forEach((id) => {
      $(id).addEventListener('change', () => {
        DT.game.quality = parseInt($('setQuality').value, 10);
        DT.game.shakeOn = $('setShake').checked;
        saveSettings();
      });
    });

    DT.game.quality = st.quality;
    DT.game.shakeOn = st.shake;
    $('fpsTag').classList.toggle('hidden', !st.fps);
    loadControls();
    UI.screen('menu');
  };

  function fillSelect(sel, names) {
    sel.innerHTML = '';
    names.forEach((n, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = n;
      sel.appendChild(o);
    });
  }

  /* ================= 捏鱼 ================= */
  function loadControls() {
    const s = styles[curTab];
    $('fcName').value = s.name || '小鱼';
    $('fcSpecies').value = s.sp;
    $('fcColor1').value = s.c1;
    $('fcColor2').value = s.c2;
    $('fcHgt').value = s.hgt;
    $('fcHgtV').textContent = s.hgt.toFixed(2);
    $('fcFin').value = s.fin;
    $('fcTail').value = s.tail;
    $('fcEye').value = s.eye;
    $('fcPattern').value = F.patterns.indexOf(s.pattern);
    $('fcGlow').value = s.glow;
    $('fcAcc').value = F.accessories.indexOf(s.accessory);
  }

  function collectControls() {
    const s = styles[curTab];
    s.name = $('fcName').value.trim() || '小鱼';
    s.sp = parseInt($('fcSpecies').value, 10);
    s.c1 = $('fcColor1').value;
    s.c2 = $('fcColor2').value;
    s.hgt = parseFloat($('fcHgt').value);
    s.fin = parseInt($('fcFin').value, 10);
    s.tail = parseInt($('fcTail').value, 10);
    s.eye = parseInt($('fcEye').value, 10);
    s.pattern = F.patterns[parseInt($('fcPattern').value, 10)];
    s.glow = parseInt($('fcGlow').value, 10);
    s.accessory = F.accessories[parseInt($('fcAcc').value, 10)];
  }

  UI.getStyles = function () {
    return styles.map((s, i) => Object.assign({}, s, { name: s.name || 'P' + (i + 1) }));
  };

  function loadStyle(idx) {
    try {
      const raw = localStorage.getItem('dt_style_' + idx);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return F.makeStyle(idx, { name: idx === 0 ? '小蓝' : '小粉', c1: idx === 0 ? '#4facfe' : '#f472b6', c2: idx === 0 ? '#00f2fe' : '#fda4af' });
  }
  function saveStyle(idx) {
    try { localStorage.setItem('dt_style_' + idx, JSON.stringify(styles[idx])); } catch (e) {}
  }

  function drawPreview() {
    const ctx = previewCtx;
    const w = previewCanvas.width, h = previewCanvas.height;
    const t = performance.now() / 1000;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1d5b8f');
    g.addColorStop(1, '#071b31');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 光斑
    for (let i = 0; i < 4; i++) {
      const x = w * (0.2 + i * 0.22) + Math.sin(t * 0.7 + i) * 40;
      const rg = ctx.createRadialGradient(x, h * 0.3, 0, x, h * 0.3, 150);
      rg.addColorStop(0, 'rgba(140,220,255,0.14)');
      rg.addColorStop(1, 'rgba(140,220,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x - 150, 0, 300, h);
    }
    const bob = Math.sin(t * 1.6) * 10;
    const sway = Math.sin(t * 0.9) * 0.16;
    ctx.save();
    ctx.translate(w / 2, h / 2 + bob);
    ctx.rotate(sway);
    F.draw(styles[curTab], ctx, 210, Math.floor(t * 3));
    ctx.restore();
  }

  /* ================= 横幅 ================= */
  let bannerTimer = null;
  UI.banner = function (title, sub) {
    if (!loadSettings().tips) return;
    const el = $('banner');
    $('bannerTitle').textContent = title;
    $('bannerSub').textContent = sub || '';
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.add('hidden'), 2900);
  };

  /* ================= 抽卡 ================= */
  let cardCb = null, cardKeys = [];
  UI.showCards = function (cards, title, cb) {
    cardCb = cb;
    cardKeys = cards;
    $('cardTitle').textContent = title;
    const row = $('cardRow');
    row.innerHTML = '';
    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'card' + (card.curse ? ' curse' : '') + (card.rarity === 3 ? ' legendary' : '');
      const school = K.schools[card.school];
      el.innerHTML =
        '<div class="c-rarity" style="background:' + K.rarityColors[card.rarity] + '">' + K.rarityNames[card.rarity] + '</div>' +
        '<div class="c-ico">' + card.icon + '</div>' +
        '<div class="c-name">' + card.name + '</div>' +
        '<div class="c-desc">' + card.desc + '</div>' +
        '<div class="c-school" style="color:' + school.color + '">' + school.icon + ' ' + school.name + '</div>';
      el.addEventListener('click', () => pickCard(i));
      row.appendChild(el);
    });
    UI.screen('cards');
  };

  function pickCard(i) {
    if (!cardCb) return;
    const cb = cardCb;
    const card = cardKeys[i];
    cardCb = null;
    cb(card);
    if (DT.game.state === 'playing') UI.screen('none');
  }

  window.addEventListener('keydown', (e) => {
    if (cardCb && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
      pickCard(parseInt(e.code.slice(5), 10) - 1);
    }
  });

  const K = DT.cards;

  /* ================= 结算 ================= */
  UI.results = function (data) {
    $('resTitle').textContent = data.win ? '🏆 胜利！' : '💀 游戏结束';
    const modeNames = { solo: '单人远征', coop: '双人合作', versus: '双人竞争', endless: '无尽生存' };
    let html = '<div class="res-cols">';
    data.players.forEach((p, i) => {
      const winner = data.mode === 'versus' && data.win
        ? (data.vsScore[0] === data.vsScore[1] ? i === 0 : data.vsScore[i] > data.vsScore[1 - i])
        : true;
      html += '<div class="res-col"><h3>' + (i === 0 ? '🐟 ' : '🐠 ') + p.name +
        (data.mode === 'versus' ? (winner ? ' <span style="color:#fcd34d">👑</span>' : '') : '') + '</h3>' +
        '<div class="stat"><span>进化点</span><b>' + U.fmt(p.ep) + '</b></div>' +
        '<div class="stat"><span>进化等级</span><b>Lv.' + p.level + '</b></div>' +
        '<div class="stat"><span>吞食数量</span><b>' + p.eaten + '</b></div>' +
        '<div class="stat"><span>最大体型</span><b>' + p.maxLen + '</b></div>';
      if (data.mode === 'versus') html += '<div class="stat"><span>撕咬比分</span><b>' + data.vsScore[i] + '</b></div>';
      html += '<div class="res-cards">';
      const counts = {};
      (p.cards || []).forEach((c) => { counts[c.school] = (counts[c.school] || 0) + 1; });
      Object.keys(counts).forEach((s) => {
        html += '<span style="color:' + K.schools[s].color + '">' + K.schools[s].icon + ' ' + K.schools[s].name + ' ×' + counts[s] + '</span>';
      });
      if (!(p.cards || []).length) html += '<span>未获得卡牌</span>';
      html += '</div></div>';
    });
    html += '</div>';
    html += '<div class="stat" style="justify-content:center;gap:30px;margin-top:16px;color:#9fc9ee">' +
      '<span>模式：' + modeNames[data.mode] + '</span>' +
      '<span>用时：' + data.time + 's</span>' +
      (data.mode !== 'endless' ? '<span>到达关卡：' + data.level + ' / 6</span>' : '') +
      '</div>';
    if (data.newRecord) html += '<div class="record">🎉 新的无尽生存纪录：' + data.time + ' 秒！</div>';
    $('resBody').innerHTML = html;
  };

  /* ================= HUD ================= */
  UI.tick = function (fps) {
    hudT++;
    if (hudT % 6 === 0) UI.updateHUD(fps);
    if (!$('scr-custom').classList.contains('hidden')) drawPreview();
  };

  UI.updateHUD = function (fps) {
    const G = DT.game;
    if (!G) return;
    const info = G.getLevelInfo();
    $('objName').textContent = info.name;
    $('objTip').textContent = info.tip + (info.lives !== undefined && G.mode === 'solo' ? '　·　剩余生命 ' + info.lives : '');
    $('objFill').style.width = Math.round(info.progress * 100) + '%';

    const two = G.players.length > 1;
    $('pc1').style.display = two ? '' : 'none';

    G.players.forEach((p, i) => {
      const cap = p.sizeCap || 150;
      $('pc' + i + 'Size').style.width = Math.min(100, (p.size / cap) * 100) + '%';
      $('pc' + i + 'Xp').style.width = Math.min(100, (p.xp / p.xpNeed) * 100) + '%';
      $('pc' + i + 'Lv').textContent = 'Lv.' + p.level;
      $('pc' + i + 'Ep').textContent = U.fmt(p.ep) + ' EP';
      $('pc' + i + 'Combo').textContent = p.combo > 2 ? '🔥 ×' + p.combo : '';
      const names = $('pc' + i + 'Cards');
      const cardsHtml = p.cards.slice(-8).map((c) => '<span title="' + c.name + '">' + c.icon + '</span>').join('');
      if (names.innerHTML !== cardsHtml) names.innerHTML = cardsHtml;
      $('pc' + i).querySelector('.pc-name span').textContent = (i === 0 ? 'P1 · ' : 'P2 · ') + p.name + (p.ghost ? '（倒下）' : '');
    });

    // Boss 条
    const boss = G.world.boss;
    $('bossBar').classList.toggle('hidden', !boss);
    if (boss) $('bossFill').style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + '%';

    if (fps !== undefined) $('fpsTag').textContent = Math.round(fps) + ' FPS';
  };

  /* ================= 设置存取 ================= */
  function loadSettings() {
    try {
      const raw = localStorage.getItem('dt_settings');
      if (raw) return Object.assign({ volume: 0.7, quality: 1, shake: true, fps: false, tips: true }, JSON.parse(raw));
    } catch (e) {}
    return { volume: 0.7, quality: 1, shake: true, fps: false, tips: true };
  }
  function saveSettings() {
    const st = {
      volume: parseFloat($('setVolume').value),
      quality: parseInt($('setQuality').value, 10),
      shake: $('setShake').checked,
      fps: $('setFps').checked,
      tips: $('setTips').checked,
    };
    try { localStorage.setItem('dt_settings', JSON.stringify(st)); } catch (e) {}
    $('fpsTag').classList.toggle('hidden', !st.fps);
    if (DT.audio.ready) DT.audio.setVolume(st.volume);
    DT.game.shakeOn = st.shake;
    DT.game.quality = st.quality;
  }

  /* ================= 按钮动作 ================= */
  function action(act) {
    DT.audio.init();
    const st = loadSettings();
    DT.audio.setVolume(st.volume);
    switch (act) {
      case 'solo': case 'coop': case 'versus': case 'endless':
        DT.game.startMode(act);
        break;
      case 'customize':
        UI.screen('custom');
        break;
      case 'settings':
        settingsReturn = DT.game.paused ? 'pause' : 'menu';
        UI.screen('settings');
        break;
      case 'howto':
        UI.screen('howto');
        break;
      case 'howtoBack': case 'customBack':
        UI.screen('menu');
        break;
      case 'customSave':
        collectControls();
        saveStyle(0); saveStyle(1);
        UI.screen('menu');
        break;
      case 'settingsBack':
        UI.screen(settingsReturn);
        break;
      case 'savePreset':
        collectControls();
        saveStyle(curTab);
        UI.banner('💾 已保存', '预设已写入本地存档');
        break;
      case 'loadPreset':
        styles[curTab] = loadStyle(curTab);
        loadControls();
        break;
      case 'randomFish': {
        const s = F.makeStyle(U.randInt(0, 5), {
          name: styles[curTab].name,
          c1: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
          c2: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
          fin: U.randInt(0, 5), tail: U.randInt(0, 5), eye: U.randInt(0, 4),
          pattern: U.pick(F.patterns), glow: U.randInt(0, 2), accessory: U.pick(F.accessories),
        });
        styles[curTab] = s;
        loadControls();
        break;
      }
      case 'resume':
        DT.game.togglePause();
        break;
      case 'retry':
        DT.game.retry();
        break;
      case 'menu':
        DT.game.toMenu();
        break;
    }
  }
})();
