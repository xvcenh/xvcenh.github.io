# GitHub Pages 发布

正式站点为 [xvcenh.github.io](https://xvcenh.github.io/)。在仓库的 **Settings → Pages → Build and deployment** 中选用 **GitHub Actions**。

推送到 `main` 后，工作流会按 `Gemfile.lock` 安装依赖，构建 `_site/` 并检查站内页面、资源及全文索引。检查通过后才上传和部署。Pull Request 使用同样的构建和检查步骤。

在 [Actions](https://github.com/xvcenh/xvcenh.github.io/actions) 中选择对应提交，部署成功后打开该次运行的环境链接。需要回退时，用 `git revert` 撤销对应提交，再推送到 `main`。
