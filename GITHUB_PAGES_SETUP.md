# GitHub Pages 部署指南

## 1. 启用 GitHub Pages

1. 访问您的仓库：https://github.com/xvcenh/xvcenh.github.io
2. 点击 "Settings"（设置）
3. 在左侧菜单中找到 "Pages"（页面）
4. 在 "Build and deployment"（构建和部署）部分：
   - 选择 "Deploy from a branch"（从分支部署）
   - 分支选择 "main"（主分支）
   - 文件夹选择 "/ (root)"（根目录）
5. 点击 "Save"（保存）

## 2. 配置自定义域名（可选）

如果您想使用自定义域名：
1. 在 Pages 设置中添加您的域名
2. 在您的 DNS 提供商处配置 CNAME 记录
3. 等待 DNS 传播（可能需要几分钟到几小时）

## 3. 自动部署

我已经配置了 GitHub Actions 工作流，当您推送更改到 main 分支时，会自动构建和部署。

工作流文件：`.github/workflows/jekyll.yml`

## 4. 本地测试

在推送前，建议先在本地测试：

```bash
# 安装依赖
bundle install

# 本地运行
bundle exec jekyll serve

# 访问 http://localhost:4000
```

## 5. 常见问题

### Q: 构建失败
- 检查 Gemfile 中的依赖是否正确
- 确保 _config.yml 格式正确
- 查看 GitHub Actions 日志获取详细信息

### Q: 页面显示 404
- 确保 index.html 文件存在
- 检查 baseurl 配置
- 等待几分钟让 GitHub Pages 完成构建

### Q: 样式不生效
- 检查 CSS 文件路径
- 确保 assets 目录结构正确
- 清除浏览器缓存

## 6. 监控部署状态

1. 访问仓库的 "Actions" 选项卡
2. 查看最新的工作流运行
3. 点击运行查看详细日志

## 7. 访问您的博客

部署成功后，访问：https://xvcenh.github.io

## 8. 钉钉集成

当团队成员通过钉钉上传文档时，系统会自动：
1. 创建新的博客文章
2. 提交到 Git 仓库
3. 推送到 GitHub
4. GitHub Actions 自动部署

## 9. 联系方式

如有问题，请查看 GitHub 仓库或联系团队成员。