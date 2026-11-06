# 吞噬之潮 · Devour Tide

一款**大鱼吃小鱼**题材的 2D 动作进化游戏：精美矢量画面、6 大场景、Rogue 卡牌构筑、
深度捏鱼定制、双人同屏合作 / 竞争（含终局撕咬对决）。

> 全程序化渲染：零图片素材、零音频素材，单页 HTML5 + Canvas 2D。

## 🚀 快速开始

**方式一（最简单）**：双击 `index.html` 即可游玩（推荐 Chrome / Edge）。

**方式二**：双击 `启动游戏.bat`（Windows），或在本目录运行：

```bash
python3 -m http.server 8000   # 然后浏览器打开 http://localhost:8000
```

## 🎮 操作

| 动作 | P1 | P2 |
| --- | --- | --- |
| 移动 | W A S D | 方向键 |
| 冲刺 | 空格 | 回车 |
| 复活队友（合作模式） | F | 右 Shift |
| 暂停 / 静音 | Esc / M | 同左 |
| 选择卡牌 | 鼠标点击 或 数字键 1/2/3 | 同左 |

支持手柄：左摇杆移动，A 键冲刺，B 键互动。

## 🕹 游戏模式

- **🐟 单人远征**：6 关流程（吞食 / 生存 / 清波 / BOSS），3 条命，关间三选一进化
- **🤝 双人合作**：共享进化收益、牺牲体型复活队友、BOSS 需双人同咬弱点
- **⚔️ 双人竞争**：抢食抢点；当场上鱼被吃完 → **终局撕咬**：互咬撕肉，体型小者被吞
- **🌊 无尽生存**：场景每 2.5 分钟轮换、难度无限递增、本地纪录

## 🃏 Rogue 卡牌

35+ 张卡、5 大流派（速度 / 剧毒 / 巨兽 / 灵巧 / 诅咒），同流派 ≥3 张激活羁绊。
诅咒卡 = 高风险高收益（红卡）。

## 🌍 场景

浅滩珊瑚礁 → 荧光水母森林（电网水母）→ 沉船墓场（暗流）→ 冰海裂谷（浮冰白雾）
→ 火山热泉（喷发预警）→ 深渊（黑暗视野 + BOSS）

## 📦 打包成 exe（发给其他人双击即玩）

### 方案 A：Electron（简单，约 180MB）

需要 Node.js 18+：

```bash
cd packaging/electron
npm install
npm run dist        # 产出 dist/吞噬之潮-win32-x64/吞噬之潮.exe
```

想生成单文件安装包：`npm run dist -- --win nsis`（需要网络下载 NSIS 模板）。

### 方案 B：Tauri（轻量，约 8MB，推荐）

需要 Node.js 18+ 与 Rust 工具链（`rustup`）：

```bash
cd packaging/tauri
npm install
npm run build       # 产出 src-tauri/target/release/吞噬之潮.exe
```

### 方案 C：免安装绿色包

直接把整个 `devour-tide` 文件夹压缩发给对方，解压后双击 `index.html`
（或 `启动游戏.bat`）即可玩，无需安装任何东西。

## ⚙️ 性能

- 目标 60 FPS；设置里可调粒子质量（高/中/低）
- 性能技巧：精灵缓存、对象池、离屏剔除、分帧 AI、半分辨率光照遮罩
- 资源占用：无外部资源加载，内存 < 200MB

## 🗂 文件结构

```
devour-tide/
├── index.html      页面与 UI 结构
├── style.css       玻璃拟态界面样式
├── utils.js        数学/颜色/缓动工具
├── audio.js        WebAudio 全程序化音效与环境声
├── fish.js         程序化鱼类渲染（贝塞尔+渐变+辉光）+ 精灵缓存
├── data.js         6 大场景定义 + 35 张卡牌数据
├── game.js         游戏循环 / 模式 / 难度 / 双人 / BOSS
├── ui.js           菜单 / 捏鱼工坊 / HUD / 抽卡 / 结算
├── main.js         启动引导
└── packaging/      exe 打包工程（Electron / Tauri）
```
