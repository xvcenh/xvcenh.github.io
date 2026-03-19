---
layout: post
title: "Git 工作流最佳实践与常见问题"
date: 2026-03-19 14:00:00 +0800
author: "赵开发"
categories: [工具]
keywords: [Git, 版本控制, 工作流, 分支管理, 合并冲突]
---

## 问题描述

团队在使用 Git 进行协作开发时，经常遇到分支混乱、合并冲突、提交历史不清晰等问题。

## 环境信息

- Git 2.35
- GitHub / GitLab
- 团队规模：10人
- 项目类型：微服务架构

## Git 工作流选择

### 1. Git Flow（适合发布周期固定的项目）

```bash
# 主要分支
main        # 生产环境代码
develop     # 开发分支

# 支持分支
feature/*   # 功能分支
release/*   # 发布分支
hotfix/*    # 热修复分支
```

### 2. GitHub Flow（适合持续部署）

```bash
# 简单的工作流
main        # 部署分支
feature/*   # 功能分支

# 每个功能一个 PR，合并后立即部署
```

### 3. GitLab Flow（适合环境分支）

```bash
# 环境分支
main        # 主干
staging     # 预发布环境
production  # 生产环境

# 功能分支合并到 main，然后 cherry-pick 到环境分支
```

## 常见问题与解决方案

### 1. 合并冲突

#### 问题现象
```
Auto-merging src/app.js
CONFLICT (content): Merge conflict in src/app.js
```

#### 解决方案
```bash
# 拉取最新代码
git pull origin main

# 解决冲突
git mergetool
# 或手动编辑冲突文件

# 标记冲突已解决
git add src/app.js
git commit -m "Resolve merge conflict"
```

### 2. 提交历史混乱

#### 问题：过多的无意义提交

```bash
# 交互式变基
git rebase -i HEAD~5

# 合并提交
pick e4a2c3a feat: add user login
squash 1b2c3d4 fix: typo
squash 2c3d4e5 style: format code

# 重写提交信息
git commit --amend
```

### 3. 分支管理混乱

#### 解决方案：定期清理分支

```bash
# 查看已合并的分支
git branch --merged main

# 删除本地已合并分支
git branch --merged main | grep -v "^\*" | xargs -n 1 git branch -d

# 删除远程已合并分支
git push origin --delete feature/old-branch
```

## Git 配置优化

### 1. 全局配置

```bash
# 用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 别名配置
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status

# 颜色配置
git config --global color.ui auto
```

### 2. 提交模板

```bash
# 创建提交模板
echo "\
# 类型: feat|fix|docs|style|refactor|test|chore
# 影响范围: 模块或文件
# 关联问题: #issue_number
# 
# 提交说明（必填）:
# 
# 详细描述（可选）:
" > ~/.gitmessage

# 使用模板
git config --global commit.template ~/.gitmessage
```

## 高级技巧

### 1. 暂存修改

```bash
# 临时保存修改
git stash
git stash save "WIP: working on feature"

# 恢复修改
git stash pop
git stash apply stash@{0}

# 查看暂存列表
git stash list
```

### 2. 查找问题提交

```bash
# 二分查找引入 bug 的提交
git bisect start
git bisect bad HEAD
git bisect good v1.0
# 测试当前版本，标记 good 或 bad
git bisect good
git bisect reset
```

### 3. 重写历史

```bash
# 修改最近一次提交
git commit --amend

# 修改多个提交
git rebase -i HEAD~3

# 强制推送（谨慎使用）
git push --force-with-lease
```

## 团队协作规范

### 1. 提交信息规范

```
类型(范围): 简要说明

详细描述

关联问题: #123
```

类型包括：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具

### 2. 分支命名规范

```
# 功能分支
feature/user-authentication
feature/add-payment

# 修复分支
fix/login-error
fix/security-vulnerability

# 发布分支
release/v1.2.0

# 热修复分支
hotfix/critical-bug
```

### 3. PR/MR 规范

1. **清晰的标题**：说明修改内容
2. **详细描述**：包括修改原因、测试方法
3. **关联问题**：链接到相关 issue
4. **代码审查**：至少需要一人 review
5. **CI 通过**：所有测试必须通过

## 相关工具

- [GitHub Desktop](https://desktop.github.com/)（图形界面）
- [SourceTree](https://www.sourcetreeapp.com/)（Git 客户端）
- [GitKraken](https://www.gitkraken.com/)（Git 客户端）
- [pre-commit](https://pre-commit.com/)（提交前检查）
- [commitlint](https://commitlint.js.org/)（提交信息规范检查）