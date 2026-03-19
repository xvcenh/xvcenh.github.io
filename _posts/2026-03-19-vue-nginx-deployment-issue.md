---
layout: post
title: "Vue 项目部署到 Nginx 后页面空白的解决方案"
date: 2026-03-19 14:30:00 +0800
author: "张工程师"
categories: [软件, 部署]
keywords: [Vue, Nginx, 部署, 前端, history模式, 路由, 空白页面]
---

## 🚨 问题描述

在将 Vue 3 项目部署到生产环境的 Nginx 服务器后，访问页面时出现空白，控制台显示 404 错误。

**环境信息：**
- Vue 3 + Vite
- Nginx 1.18
- 使用 history 路由模式
- 部署到子目录 `/app/`

## 🔍 问题分析

经过排查，发现以下问题：

### 1. 路由模式问题
Vue Router 默认使用 history 模式，需要服务器端配置支持。

### 2. Nginx 配置缺失
缺少 `try_files` 配置来处理前端路由。

### 3. 资源路径错误
构建后的资源路径配置不正确。

## 🛠️ 解决方案

### 方案一：修改 Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 根目录配置
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 方案二：修改 Vue 配置

在 `vue.config.js` 中：

```javascript
module.exports = {
  // 生产环境路径
  publicPath: process.env.NODE_ENV === 'production' ? '/app/' : '/',
  
  // 关闭 source map
  productionSourceMap: false,
  
  // 构建输出目录
  outputDir: 'dist',
  
  // 开发服务器配置
  devServer: {
    historyApiFallback: true
  }
}
```

### 方案三：使用 Hash 模式（简单方案）

如果不想配置 Nginx，可以改用 hash 模式：

```javascript
// router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [...]
})
```

## 📝 部署步骤

1. **构建项目**
   ```bash
   npm run build
   ```

2. **上传文件**
   ```bash
   scp -r dist/* user@server:/var/www/html/
   ```

3. **重启 Nginx**
   ```bash
   sudo systemctl restart nginx
   ```

4. **验证部署**
   ```bash
   curl -I http://your-domain.com
   ```

## 🎯 验证结果

部署后测试：
- ✅ 首页正常加载
- ✅ 路由跳转正常
- ✅ 静态资源正常加载
- ✅ 刷新页面不报错

## 💡 预防措施

1. **本地测试生产环境**
   ```bash
   npm run build
   npx serve dist
   ```

2. **使用 Docker 统一环境**
   ```dockerfile
   FROM nginx:alpine
   COPY dist/ /usr/share/nginx/html/
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   ```

3. **自动化部署脚本**
   ```bash
   # deploy.sh
   npm run build
   rsync -avz dist/ user@server:/var/www/html/
   ssh user@server "sudo systemctl reload nginx"
   ```

## 📊 性能优化建议

1. **启用 Gzip 压缩**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript text/xml;
   ```

2. **配置浏览器缓存**
   ```nginx
   location ~* \.(js|css)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **使用 CDN 加速**

## 🎉 总结

Vue 项目部署到 Nginx 的关键点：
1. 正确配置 Nginx 的 `try_files`
2. 设置正确的 `publicPath`
3. 考虑使用 hash 模式简化部署
4. 做好本地测试和生产验证

通过以上配置，可以确保 Vue 项目在生产环境中稳定运行。

---

**📎 相关资源**
- [Vue Router 官方文档](https://router.vuejs.org/)
- [Nginx 配置指南](https://nginx.org/en/docs/)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)