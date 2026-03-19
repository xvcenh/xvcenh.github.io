#!/bin/bash
# 部署脚本 - 智能项目问题库

echo "🚀 开始部署智能项目问题库..."

# 切换到博客目录
cd /home/annisen/BLOG/xvcenh.github.io

# 检查Git状态
echo "📊 检查Git状态..."
git status

# 添加所有文件
echo "📝 添加所有文件..."
git add .

# 提交更改
echo "💾 提交更改..."
git commit -m "更新: $(date '+%Y-%m-%d %H:%M:%S')"

# 推送到GitHub
echo "🚀 推送到GitHub..."
git push origin main

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 下一步操作："
echo "1. 等待 GitHub Pages 自动构建（约1-2分钟）"
echo "2. 访问网站：https://xvcenh.github.io"
echo "3. 测试功能："
echo "   - 首页：https://xvcenh.github.io"
echo "   - 分类页面：https://xvcenh.github.io/categories/"
echo "   - 前端分类：https://xvcenh.github.io/categories/前端/"
echo "   - 搜索功能：https://xvcenh.github.io/search/"
echo "   - 关于页面：https://xvcenh.github.io/about/"
echo ""
echo "🔧 如有问题，请检查："
echo "   - GitHub Actions：https://github.com/xvcenh/xvcenh.github.io/actions"
echo "   - Pages 设置：https://github.com/xvcenh/xvcenh.github.io/settings/pages"
echo ""
echo "🎉 部署成功！现在可以通过钉钉上传问题文档了。"