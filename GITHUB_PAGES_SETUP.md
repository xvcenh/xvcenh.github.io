# GitHub Pages 部署指南

## 📋 前提条件

1. 已创建 GitHub 仓库：`xvcenh/xvcenh.github.io`
2. 已配置 Git 远程仓库
3. 已安装 Git

## 🚀 部署步骤

### 1. 推送代码到 GitHub

```bash
cd /home/annisen/BLOG/xvcenh.github.io

# 添加所有文件
git add .

# 提交更改
git commit -m "初始化项目问题库：现代化界面设计"

# 推送到 GitHub
git push origin main
```

### 2. 配置 GitHub Pages

1. 访问 https://github.com/xvcenh/xvcenh.github.io
2. 点击 "Settings" → "Pages"
3. 在 "Build and deployment" 部分：
   - Source: "Deploy from a branch"
   - Branch: "main" → "/ (root)"
4. 点击 "Save"

### 3. 等待构建完成

GitHub Actions 会自动构建 Jekyll 站点，通常需要 1-2 分钟。

### 4. 访问网站

构建完成后，访问：https://xvcenh.github.io

## ⚙️ 配置说明

### Jekyll 配置 (`_config.yml`)
```yaml
title: "项目问题库"
baseurl: ""
url: "https://xvcenh.github.io"
theme: minima
plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-paginate
  - jekyll-seo-tag
```

### GitHub Actions 工作流 (`.github/workflows/jekyll.yml`)
已配置自动构建和部署工作流。

## 🔧 故障排除

### 问题 1：构建失败
- 检查 `_config.yml` 语法
- 查看 GitHub Actions 日志

### 问题 2：页面空白
- 检查 CSS/JS 路径
- 确认资源文件已上传

### 问题 3：样式不生效
- 清除浏览器缓存
- 检查 CSS 文件路径

## 📝 添加新文章

### 方法 1：手动创建
1. 在 `_posts/` 目录创建 Markdown 文件
2. 文件名格式：`YYYY-MM-DD-标题.md`
3. 推送更改到 GitHub

### 方法 2：通过钉钉自动上传
1. 在钉钉群中@机器人
2. 上传文档或发送问题描述
3. 系统自动创建文章并推送

## 🔄 更新网站

```bash
# 本地修改后
git add .
git commit -m "更新内容"
git push origin main
```

GitHub Pages 会自动重新构建。

## 📊 监控状态

1. **GitHub Actions**: https://github.com/xvcenh/xvcenh.github.io/actions
2. **Pages 状态**: https://github.com/xvcenh/xvcenh.github.io/settings/pages
3. **网站访问**: https://xvcenh.github.io

## 🎯 成功指标

- ✅ 网站可访问：https://xvcenh.github.io
- ✅ 样式正常加载
- ✅ 文章显示正常
- ✅ 搜索功能可用
- ✅ 响应式设计正常

## 💡 高级功能

### 自定义域名
1. 购买域名
2. 在 DNS 设置中添加 CNAME 记录
3. 在 GitHub Pages 设置中添加自定义域名

### 统计分析
1. 添加 Google Analytics
2. 配置在 `_config.yml` 中

### 评论系统
1. 集成 Disqus 或 Giscus
2. 添加到文章模板中

## 📞 支持

如有问题，请参考：
- [GitHub Pages 文档](https://docs.github.com/zh/pages)
- [Jekyll 文档](https://jekyllrb.com/docs/)
- [GitHub 社区](https://github.com/community)