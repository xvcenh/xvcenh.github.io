---
layout: post
title: "Web 性能优化实战：从 Lighthouse 60 分到 95 分"
date: 2026-05-04 10:00:00 +0800
author: "xvcenh"
categories: [前端, 性能]
keywords: [Web性能, Core Web Vitals, LCP, CLS, INP, Lighthouse, 懒加载, 代码分割, 缓存]
---

## 引言

Web 性能直接影响用户体验、SEO 排名和转化率。Google 数据显示，页面加载时间每增加 1 秒，转化率下降 7%。本文以真实项目为例，分享从 Lighthouse 60 分优化到 95 分的完整过程。

## 1. 性能诊断：先测量，再优化

### 1.1 核心指标 (Core Web Vitals)

| 指标 | 含义 | 良好阈值 |
|------|------|----------|
| **LCP** (Largest Contentful Paint) | 最大内容绘制 | ≤ 2.5s |
| **INP** (Interaction to Next Paint) | 交互延迟 | ≤ 200ms |
| **CLS** (Cumulative Layout Shift) | 累计布局偏移 | ≤ 0.1 |

### 1.2 诊断工具

```bash
# 1. Chrome DevTools → Lighthouse 面板
# 2. 命令行 Lighthouse
npx lighthouse https://example.com --view --preset=desktop

# 3. 生产环境监控
npm install web-vitals
```

```typescript
// 上报 Core Web Vitals
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

## 2. LCP 优化：首屏加载从 5.2s 到 1.8s

### 2.1 问题诊断

```
❌ LCP 元素：首屏大图 (hero-banner.jpg, 直接 <img>)
❌ 资源体积：2.4MB 未压缩
❌ 加载方式：阻塞渲染的同步加载
❌ 服务器响应：TTFB 800ms
```

### 2.2 图片优化

```html
<!-- ❌ 之前 -->
<img src="/images/hero-banner.jpg" alt="banner" />

<!-- ✅ 之后 -->
<picture>
  <source
    srcset="/images/hero-banner.avif"
    type="image/avif" />
  <source
    srcset="/images/hero-banner.webp"
    type="image/webp" />
  <img
    src="/images/hero-banner.jpg"
    alt="banner"
    loading="eager"
    fetchpriority="high"
    decoding="async"
    width="1200"
    height="600" />
</picture>
```

**关键点：**
- 使用 AVIF/WebP 格式（体积减少 50-70%）
- `fetchpriority="high"` 提升 LCP 元素优先级
- 明确 `width/height` 防止 CLS
- `decoding="async"` 不阻塞主线程

### 2.3 关键 CSS 内联

```html
<head>
  <!-- 内联首屏关键 CSS -->
  <style>
    /* 首屏必需的样式：导航栏、Hero 区域 */
    .header { background: #fff; position: sticky; top: 0; }
    .hero { min-height: 60vh; display: flex; align-items: center; }
  </style>

  <!-- 非关键 CSS 延迟加载 -->
  <link
    rel="preload"
    href="/styles/main.css"
    as="style"
    onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/styles/main.css" /></noscript>
</head>
```

### 2.4 字体优化

```css
/* ❌ 之前：多个字体文件，阻塞渲染 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* ✅ 之后：精简字体 + font-display: swap */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-var.woff2') format('woff2');
  font-weight: 300 700;
  font-display: swap; /* 立即使用回退字体 */
  unicode-range: U+0000-00FF, U+0131, U+0152-0153; /* 只加载拉丁字符 */
}
```

## 3. JavaScript 优化

### 3.1 代码分割 (Code Splitting)

```typescript
// ❌ 同步导入 — 所有代码打包到主 bundle
import { heavyChart } from './chart';

// ✅ 动态导入 — 按需加载
const Chart = lazy(() => import('./Chart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Chart />
    </Suspense>
  );
}
```

### 3.2 Bundle 分析与瘦身

```bash
# 分析打包体积
npm install --save-dev @next/bundle-analyzer
# 或
npx vite-bundle-visualizer
```

```javascript
// vite.config.ts — 手动分包策略
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'charts': ['recharts', 'd3-scale'],
        },
      },
    },
  },
};
```

### 3.3 脚本加载策略

```html
<!-- 关键脚本：正常加载 -->
<script src="/js/main.js"></script>

<!-- 非关键脚本：延迟加载 -->
<script src="/js/analytics.js" defer></script>

<!-- 第三方脚本：异步加载 -->
<script src="https://third-party.com/widget.js" async></script>
```

## 4. CLS 优化：消灭布局偏移

### 4.1 常见 CLS 元凶

```html
<!-- ❌ 没有预留空间的图片 -->
<img src="banner.jpg" alt="" />  <!-- 加载后撑开布局 → CLS 飙升 -->

<!-- ✅ 预留宽高比 -->
<img
  src="banner.jpg"
  alt=""
  width="1200"
  height="600"
  style="aspect-ratio: 2/1; width: 100%; height: auto;" />

<!-- ❌ 动态注入的广告/横幅 -->
<div id="ad-container"></div>  <!-- 插入广告后撑开布局 -->

<!-- ✅ 预留最小高度 -->
<div id="ad-container" style="min-height: 250px;"></div>
```

### 4.2 骨架屏替代 Spinner

```tsx
// ✅ 骨架屏：保持布局稳定
<Skeleton variant="rectangular" width="100%" height={200} />
<Skeleton variant="text" width="60%" />
<Skeleton variant="text" width="40%" />

// ❌ 转圈加载：数据加载后布局突变
<CircularProgress />
```

## 5. 缓存策略

### 5.1 Nginx 缓存配置

```nginx
# 静态资源长期缓存（文件名带 hash）
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML 短期缓存
location / {
    expires 5m;
    add_header Cache-Control "public, must-revalidate";
}

# API 不缓存
location /api/ {
    add_header Cache-Control "no-store";
}
```

### 5.2 Service Worker 缓存

```javascript
// sw.js
const CACHE_NAME = 'v2';

self.addEventListener('fetch', (event) => {
  // 静态资源：缓存优先
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached || fetch(event.request)
      )
    );
  }
});
```

## 6. 优化效果对比

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| Lighthouse | 62 | 95 | +53% |
| LCP | 5.2s | 1.8s | -65% |
| CLS | 0.32 | 0.05 | -84% |
| INP | 380ms | 120ms | -68% |
| JS Bundle | 890KB | 245KB | -72% |
| 首屏图片 | 2.4MB | 320KB | -87% |

## 总结

性能优化的核心原则：

1. **先测量，再优化** — 不要凭感觉优化
2. **80/20 法则** — 优先解决 LCP 和 CLS
3. **图片是最大的优化空间** — 格式转换 + 懒加载 + CDN
4. **代码分割是必修课** — 不要让用户下载不必要的代码
5. **缓存是性能的放大器** — 合理配置能带来质变

性能优化不是一次性工程，建议将 Lighthouse 检查加入 CI 流程，每次 PR 自动审计，防止性能退化。
