# xvcenh 超级博客界面 · Super Blog Interface

> 一个把「博客」当成「作品」来做的实验性界面。
> 10 种风格子页面 · 自研 Canvas 特效引擎 · 命令面板 · 彩蛋系统 · 零框架依赖。

灵感起点：[xvcenh.github.io](https://xvcenh.github.io)（Jekyll + three.js 星球主页）。
本项目在保留原站全部内容（五大分类、8 篇文章、4 个开源工具）的基础上，把界面重做为 10 个风格迥异的可玩页面。

## 页面导航

| 页面 | 文件 | 风格 | 记忆点 |
|---|---|---|---|
| 超级主页 | `index.html` | 深色仪表盘 | 星野+极光双层 Hero、逐字入场标题、⌘K 命令面板、明暗切换、Konami 彩蛋 |
| 赛博霓虹 | `cyber.html` | CYBERPUNK | 数字雨、glitch 标题、霓虹描边、扫描线 |
| 极光玻璃 | `glass.html` | GLASSMORPHISM | 磨砂玻璃卡片、极光背景、液态光斑 |
| 粗野主义 | `brutal.html` | NEO-BRUTALISM | 粗黑边框、硬阴影、荧光色块、旋转贴纸 |
| 黑客终端 | `terminal.html` | CRT TERMINAL | **可交互终端**：`help` `matrix` `party` `sudo`… |
| 蒸汽波 | `retro.html` | VAPORWAVE | 落日圆盘、透视网格、VHS 色差、霓虹灯管 |
| Win98 桌面 | `win98.html` | RETRO OS | **可拖动窗口**、开始菜单、任务栏时钟、BSOD 彩蛋 |
| 水墨自然 | `nature.html` | INK & PAPER | 宣纸纹理、竖排标题、朱红印章、花瓣飘落 |
| 瑞士排版 | `swiss.html` | SWISS DESIGN | 12 列栅格、红黑几何、精确排版、数字滚动 |
| 日系二次元 | `anime.html` | ANIME | 樱花粒子、角色对话框、打字机台词、撒花彩蛋 |
| 炫技实验室 | `lab.html` | FX PLAYGROUND | **13 个渲染器逐个把玩**、彩蛋挑战板、移植清单 |

## 架构

```
xvcenh-super-blog/
├── index.html            超级主页
├── *.html                9 个风格子页面 + 实验室
├── assets/
│   ├── fx.js             自研特效引擎（~37KB，13 个渲染器，零依赖）
│   ├── common.css        共享：自定义光标 / 滚动揭示 / 命令面板 / Toast
│   └── vendor/           本地化的开源库（离线可用）
│       ├── 98.css                 Win98 UI 框架
│       ├── canvas-confetti        彩纸/烟花粒子
│       ├── typed.umd.js           打字机
│       ├── vanilla-tilt.min.js    3D 倾斜卡片
│       ├── rough-notation.iife.js 手绘标注
│       └── nes.min.css            8-bit 风格
└── README.md
```

## fx.js 渲染器一览

| API | 效果 | 交互 |
|---|---|---|
| `FX.starfield` | 三层星野 + 流星 | 鼠标视差 |
| `FX.aurora` | 多频正弦极光带 | — |
| `FX.matrixRain` | 数字雨 | — |
| `FX.network` | 粒子星链 | 鼠标排斥 |
| `FX.warp` | 超空间跃迁 | 按住 3 倍速 |
| `FX.globe` | 点阵星球 | 鼠标改变转速 |
| `FX.fireworks` | 烟花（火箭+爆裂） | 点击发射 |
| `FX.petals` | 樱吹雪/落叶 | 鼠标带风 |
| `FX.bokeh` | 液态光斑 | — |
| `FX.rain` | 斜风雨丝 | — |
| `FX.scramble` | 文字扰乱 | hover/visible |
| `FX.typewriter` | 打字机 | — |
| `FX.palette` | ⌘K 命令面板 | 键盘导航 |
| `FX.counter / reveal / magnetic / cursor / konami / toast / confetti / ripple` | DOM 特效组 | — |

内建：DPR 自适应、离屏 IntersectionObserver 自动暂停、`document.hidden` 挂起、`prefers-reduced-motion` 降级。

## 移植的开源项目

| 项目 | 方式 | 用途 |
|---|---|---|
| [98.css](https://github.com/jdan/98.css) | 本地化 | win98.html 窗口系统 |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | 本地化 | 全站撒花彩蛋 |
| [Typed.js](https://github.com/mattboldt/typed.js) | 本地化 | 主页循环台词 |
| [vanilla-tilt.js](https://github.com/micku7zu/vanilla-tilt.js) | 本地化 | 3D 倾斜卡片 |
| [rough-notation](https://github.com/pshihn/rough-notation) | 本地化 | 手绘标注 |
| [NES.css](https://github.com/nostalgic-css/NES.css) | 本地化 | 像素风参考 |
| [tsParticles](https://github.com/tsparticles/tsparticles) | 思路重写 | fx.js 粒子参数体系 |
| text-scramble | 思路重写 | FX.scramble |

## 部署到 GitHub Pages

```bash
# 方式一：把 xvcenh-super-blog/ 的内容推到仓库根目录
cd xvcenh-super-blog
git init && git add . && git commit -m "super blog interface"
git remote add origin git@github.com:xvcenh/xvcenh.github.io.git
git push -f origin main   # 注意：会覆盖线上博客，请先备份

# 方式二：放到子目录作为独立站点
# 推到 gh-pages 分支或 /super-blog/ 路径即可，所有资源均为相对路径
```

## 彩蛋清单

1. 🎮 Konami Code `↑↑↓↓←→←→BA` → 派对模式
2. 🎆 实验室「全屏烟花」按钮 / 命令面板
3. 👑 终端页输入 `sudo` → 越权彩蛋
4. 💙 Win98 开始菜单「关机」→ BSOD 蓝屏
5. ⌨️ `⌘K` 命令面板
6. 🥚 主页 Logo 连点 5 次

---

© 2026 xvcenh · 手写 Canvas 引擎 · 离线可用 · MIT
