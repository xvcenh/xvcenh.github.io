# xvcenh 的技术博客

个人技术博客，基于 **Jekyll + GitHub Pages**，主题在 minima 基础上深度自定义（暗色霓虹风）。

- 线上地址：<https://xvcenh.github.io>
- 作者：xvcenh（徐辰）
- 内容：软件开发、运维部署、数据库管理、硬件折腾、工具使用中的问题与解法

## 本地预览

```bash
bundle install      # 首次
./preview.sh        # 构建并监听 0.0.0.0:4000
./preview.sh 4001   # 换端口
./preview.sh 4000 --watch   # 额外参数透传给 jekyll
```

需要 Ruby 3.x + Bundler。Windows 上没有 Ruby 环境时，只能推送到远端由 CI 构建。

## 部署

推送 `main` 分支会自动触发 GitHub Actions（`.github/workflows/jekyll.yml`）构建并发布。
`./deploy.sh` 是本地一键 `add → commit → push` 的封装，只是图省事，不是必需。

> `Gemfile.lock` 刻意不入库：本机 bundler 4 生成的锁文件与 CI 的 Ruby 3.1 不兼容，让 CI 自行解析。

## 目录结构

```
.
├── _config.yml           站点配置（标题、分类、分页、插件）
├── _layouts/
│   ├── default.html      通用布局：导航、页脚、文章目录、相关推荐
│   └── post.html         文章页布局
├── _posts/               文章（Markdown）
├── assets/
│   ├── css/style.css     全站样式
│   └── js/               首页动画（xvcenh 拼字、galaxy 3D 星系）
├── index.html            首页（星空 + 3D 星系 + 文章列表）
├── about.md              关于
├── categories.html       分类总览        → /categories/
├── category-*.md         5 个分类详情页  → /categories/硬件/ 等
├── search.html           站内搜索        → /search/
├── projects.md           开源项目        → /projects/
├── tech-graph.html       技术图谱        → /tech-graph/
├── ai-build.html         AI 构建成果     → /ai-build/
├── fivebar-linkage.html  五连杆运动学演示 → /fivebar-linkage/
├── devour-tide/          网页游戏《吞噬之潮》
└── robots.txt
```

## 页面清单

| 路由 | 文件 | 说明 |
| --- | --- | --- |
| `/` | `index.html` | 首页，霓虹拼字 + Three.js 3D 星系 + 最新 8 篇 |
| `/about/` | `about.md` | 关于与分类入口 |
| `/categories/` | `categories.html` | 五大分类总览 |
| `/categories/{硬件,软件,数据库,部署,工具}/` | `category-*.md` | 分类详情 |
| `/search/` | `search.html` | 站内搜索 |
| `/projects/` | `projects.md` | 开源项目展示 |
| `/tech-graph/` | `tech-graph.html` | 技术图谱可视化 |
| `/ai-build/` | `ai-build.html` | AI 驱动构建成果 |
| `/fivebar-linkage/` | `fivebar-linkage.html` | 五连杆正逆解算交互演示 |
| `/devour-tide/` | `devour-tide/index.html` | 卡牌构筑 Roguelike 游戏 |

## 写文章

在 `_posts/` 下新建 `YYYY-MM-DD-slug.md`：

```markdown
---
layout: post
title: "文章标题"
date: 2026-11-06 14:00:00 +0800
author: "xvcenh"
categories: [软件]
keywords: [关键词1, 关键词2]
---

正文……
```

`layout` 必须是 `post`，否则不会套用文章页布局（目录、相关推荐、阅读进度都依赖它）。

### 分类约定

站内的分类详情页只认这五个：**硬件 / 软件 / 数据库 / 部署 / 工具**。
文章写到这五个分类里，才会出现在 `/categories/` 总览和对应详情页；
其他分类（如 `开源`、`AI`、`前端`）目前只在文章自身展示，不进分类体系。

## 游戏：吞噬之潮

`devour-tide/index.html` 是一个**单文件零依赖**的深海 Roguelike（176 KB，全部逻辑与样式内联），
双击即玩，也可直接静态托管。详见 [`devour-tide/README.md`](devour-tide/README.md)。

旧版多文件实现归档在 `devour-tide/classic/`，保留是因为它有豪华版尚未移植的「无尽生存」模式。

## 技术栈

- **Jekyll 3.x** + minima 主题，插件：`jekyll-feed` / `jekyll-sitemap` / `jekyll-paginate` / `jekyll-seo-tag`
- Markdown 引擎 kramdown，分页每页 12 篇
- 首页视觉：Canvas 星空 + Three.js 3D 星系（延迟 1 秒懒加载，避免阻塞首屏）
- 时区 `Asia/Shanghai`，页面语言 `zh-CN`

## 已知问题

- `/fivebar-linkage/` 之外，`/tech-graph/`、`/ai-build/` 目前只有首页标签一个入口。
- 部分文章使用了五分类以外的标签，不会进入分类体系。
