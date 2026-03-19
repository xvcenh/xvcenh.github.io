#!/bin/bash
# 测试 Jekyll 构建

echo "检查目录结构..."
ls -la

echo ""
echo "检查配置文件..."
cat _config.yml

echo ""
echo "检查文章..."
ls -la _posts/

echo ""
echo "检查布局文件..."
ls -la _layouts/

echo ""
echo "Git 状态..."
git status

echo ""
echo "✅ 博客结构检查完成"
echo "下一步："
echo "1. 安装 bundler: gem install bundler jekyll"
echo "2. 安装依赖: bundle install"
echo "3. 本地运行: bundle exec jekyll serve"
echo "4. 推送到 GitHub: git push origin main"