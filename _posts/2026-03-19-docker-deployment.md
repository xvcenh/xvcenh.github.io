---
layout: post
title: "Docker 容器部署常见问题解决"
date: 2026-03-19 13:00:00 +0800
author: "陈运维"
categories: [部署]
keywords: [Docker, 容器, 部署, 镜像, 网络, 存储]
---

## 问题描述

在 Docker 容器化部署过程中，遇到容器启动失败、网络不通、存储卷挂载等问题。

## 环境信息

- Docker 20.10
- Docker Compose 2.0
- Ubuntu 20.04
- 多容器微服务架构

## 常见问题与解决方案

### 1. 容器启动失败

#### 问题现象
```
Error response from daemon: driver failed programming external connectivity
```

#### 解决方案
```bash
# 重启 Docker 服务
sudo systemctl restart docker

# 检查端口占用
sudo netstat -tulpn | grep :80

# 清理未使用的资源
docker system prune -a
```

### 2. 容器网络不通

#### 问题现象
容器之间无法通信，无法访问外部网络。

#### 解决方案
```bash
# 检查网络配置
docker network ls
docker network inspect bridge

# 创建自定义网络
docker network create my-network

# 运行容器时指定网络
docker run --network my-network my-app

# 使用 Docker Compose
version: '3'
services:
  app:
    networks:
      - my-network
networks:
  my-network:
    driver: bridge
```

### 3. 存储卷挂载失败

#### 问题现象
```
Error: failed to mount local volume: mount /host/path:/container/path: no such file or directory
```

#### 解决方案
```bash
# 确保主机目录存在
mkdir -p /host/path
chmod 755 /host/path

# 使用绝对路径
docker run -v /absolute/host/path:/container/path my-app

# 使用命名卷
docker volume create my-volume
docker run -v my-volume:/container/path my-app
```

## Docker Compose 配置优化

### 1. 资源限制

```yaml
version: '3'
services:
  app:
    image: my-app:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 2. 健康检查

```yaml
services:
  app:
    image: my-app:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 3. 日志配置

```yaml
services:
  app:
    image: my-app:latest
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 性能优化

### 1. 镜像优化

```dockerfile
# 多阶段构建
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. 构建缓存优化

```dockerfile
# 合理安排 COPY 顺序
COPY package.json package-lock.json ./
RUN npm ci
COPY . .  # 代码变更频繁，放在后面
```

### 3. 使用 .dockerignore

```
# .dockerignore
node_modules
.git
*.log
.env
Dockerfile
docker-compose.yml
```

## 监控与调试

### 1. 容器监控

```bash
# 查看容器资源使用
docker stats

# 查看容器日志
docker logs -f container_name

# 进入容器调试
docker exec -it container_name /bin/bash
```

### 2. 性能分析

```bash
# 查看容器详细信息
docker inspect container_name

# 分析镜像层
docker history image_name

# 检查镜像安全性
docker scan image_name
```

## 最佳实践

1. **使用官方基础镜像**
2. **实施镜像扫描和安全更新**
3. **使用多阶段构建减小镜像大小**
4. **配置资源限制防止资源耗尽**
5. **实施日志轮转和监控告警**

## 相关工具

- [Docker Bench Security](https://github.com/docker/docker-bench-security)
- [cAdvisor](https://github.com/google/cadvisor)（容器监控）
- [Portainer](https://www.portainer.io/)（Docker 管理界面）
- [Trivy](https://github.com/aquasecurity/trivy)（镜像漏洞扫描）