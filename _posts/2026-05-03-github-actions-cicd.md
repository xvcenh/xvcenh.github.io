---
layout: post
title: "GitHub Actions 自动化 CI/CD 实战：从零搭建生产级流水线"
date: 2026-05-03 14:00:00 +0800
author: "xvcenh"
categories: [部署, DevOps]
keywords: [GitHub Actions, CI/CD, 自动化部署, Docker, 测试, 持续集成, 持续部署]
---

## 引言

GitHub Actions 已经成为开源项目和团队协作中 CI/CD 的事实标准。2000 分钟/月的免费额度（公开仓库无限）让个人开发者也能零成本搭建自动化流水线。本文从实战出发，带你搭建一套覆盖测试、构建、部署的完整 CI/CD 流水线。

## 1. 基础概念

### 1.1 核心组件

```yaml
name: CI Pipeline          # 工作流名称
on:                        # 触发条件
  push:
    branches: [main]
jobs:                      # 任务集合
  test:                    # 单个任务
    runs-on: ubuntu-latest # 运行环境
    steps:                 # 执行步骤
      - uses: actions/checkout@v4
      - run: npm test
```

### 1.2 触发条件（on）详解

```yaml
on:
  # 推送到 main 分支时触发
  push:
    branches: [main, develop]

  # 创建 Pull Request 时触发
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

  # 定时触发（UTC 时间，每天 8:00）
  schedule:
    - cron: '0 8 * * *'

  # 手动触发
  workflow_dispatch:
    inputs:
      environment:
        description: '部署环境'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
```

## 2. 实战：Node.js 项目完整流水线

### 2.1 项目结构

```
.github/
└── workflows/
    ├── ci.yml          # 持续集成（测试 + 构建）
    ├── deploy.yml      # 持续部署
    └── security.yml    # 安全扫描
```

### 2.2 CI 流水线：测试 + 构建 + 缓存

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Unit tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.node-version }}
          path: coverage/

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t my-app:${{ github.sha }} .
          docker tag my-app:${{ github.sha }} my-app:latest
```

**矩阵策略 (matrix)** 是关键技巧：一套配置，自动并行测试多个 Node.js 版本。

### 2.3 CD 流水线：自动部署到服务器

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: '部署环境'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker image
        run: |
          docker build -t ghcr.io/${{ github.repository }}:${{ github.sha }} .
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/my-app
            docker compose pull
            docker compose up -d --force-recreate
            docker system prune -f
```

## 3. 安全扫描流水线

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * 0'  # 每周日凌晨 2 点

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'HIGH,CRITICAL'

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Dependency review
        uses: actions/dependency-review-action@v4
```

## 4. 高级技巧

### 4.1 条件执行与动态矩阵

```yaml
jobs:
  deploy:
    # 仅在 main 分支且不是 PR 时执行
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying..."

  e2e:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # 分片并行运行
    steps:
      - run: npm run test:e2e -- --shard=${{ matrix.shard }}/${{ strategy.job-total }}
```

### 4.2 复用工作流 (Reusable Workflows)

```yaml
# .github/workflows/_build.yml（可复用工作流）
name: Reusable Build

on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string
    secrets:
      NPM_TOKEN:
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - run: npm run build
```

```yaml
# 调用复用工作流
jobs:
  build-app:
    uses: ./.github/workflows/_build.yml
    with:
      node-version: '20'
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 4.3 通告与通知

```yaml
      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "❌ CI 失败: ${{ github.repository }} [${{ github.ref_name }}]\n提交: ${{ github.event.head_commit.message }}\n详情: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Notify on success
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ 部署成功: ${{ github.repository }} -> ${{ github.event.inputs.environment }}"}'
```

## 5. 成本优化

```yaml
# 使用自托管 Runner 节省额度
runs-on: self-hosted  # 无时间限制

# 合理使用缓存减少重复安装
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

# 使用 path 过滤避免不必要的触发
on:
  push:
    paths:
      - 'src/**'
      - 'package.json'
    # 忽略文档和配置文件的变更
    paths-ignore:
      - '**.md'
      - '.github/**'
```

## 总结

GitHub Actions 的核心优势：

1. **零成本起步**：公开仓库免费无限使用
2. **生态丰富**：数千个社区 Action 可直接使用
3. **与 GitHub 深度集成**：PR 状态检查、环境保护规则
4. **Matrix 策略**：一套配置，并行测试多环境
5. **可复用工作流**：减少重复配置

建议从简单的 lint + test 开始，逐步添加构建、安全扫描和自动部署。不要一开始就追求「完美流水线」—— 持续迭代才是正道。
