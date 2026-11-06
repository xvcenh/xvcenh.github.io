/* 吞噬之潮 · main.js — 启动引导 */
(function () {
  const DT = (window.DT = window.DT || {});
  window.addEventListener('load', () => {
    const canvas = document.getElementById('game');
    DT.ui.init();
    DT.game.init(canvas);
    // 首次交互解锁音频
    const unlock = () => {
      DT.audio.init();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  });
})();
