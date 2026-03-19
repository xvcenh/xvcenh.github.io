---
layout: post
title: "Python 内存泄漏检测与修复"
date: 2026-03-19 11:00:00 +0800
author: "李开发"
categories: [软件]
keywords: [Python, 内存泄漏, 性能优化, 垃圾回收, 调试]
---

## 问题描述

在运行长时间任务时，Python 进程内存持续增长，最终导致内存不足错误。

## 环境信息

- Python 3.10
- Flask Web 应用
- 长时间运行的数据处理任务

## 内存泄漏检测

### 1. 使用 memory_profiler

```python
# 安装
pip install memory_profiler

# 使用装饰器
from memory_profiler import profile

@profile
def process_data(data):
    # 处理逻辑
    result = []
    for item in data:
        result.append(process_item(item))
    return result
```

### 2. 使用 objgraph 分析对象引用

```python
import objgraph

# 显示增长最快的对象类型
objgraph.show_growth(limit=10)

# 生成引用图
objgraph.show_backrefs(objgraph.by_type('dict')[0], max_depth=10)
```

## 常见内存泄漏原因

### 1. 循环引用

```python
# 错误示例
class Node:
    def __init__(self):
        self.parent = None
        self.children = []

node1 = Node()
node2 = Node()
node1.children.append(node2)
node2.parent = node1  # 循环引用
```

### 2. 全局变量累积

```python
# 错误示例
cache = {}

def process_request(data):
    result = heavy_computation(data)
    cache[data] = result  # 数据不断累积
    return result
```

### 3. 未关闭的资源

```python
# 错误示例
def read_files():
    files = []
    for filename in file_list:
        f = open(filename, 'r')  # 文件未关闭
        files.append(f)
    return files
```

## 解决方案

### 方案一：使用弱引用

```python
import weakref

class Node:
    def __init__(self):
        self.parent = None
        self.children = []

node1 = Node()
node2 = Node()
node1.children.append(node2)
node2.parent = weakref.ref(node1)  # 使用弱引用
```

### 方案二：定期清理缓存

```python
from functools import lru_cache
import time

@lru_cache(maxsize=128)
def expensive_computation(x):
    time.sleep(1)
    return x * x

# 定期清理
expensive_computation.cache_clear()
```

### 方案三：使用上下文管理器

```python
# 正确示例
def process_files():
    results = []
    for filename in file_list:
        with open(filename, 'r') as f:  # 自动关闭
            results.append(f.read())
    return results
```

## 性能监控

### 1. 实时监控脚本

```python
import psutil
import time

def monitor_memory(pid):
    process = psutil.Process(pid)
    while True:
        memory_info = process.memory_info()
        print(f"RSS: {memory_info.rss / 1024 / 1024:.2f} MB")
        time.sleep(5)
```

### 2. 使用 tracemalloc

```python
import tracemalloc

tracemalloc.start()

# 执行代码
# ...

snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')

for stat in top_stats[:10]:
    print(stat)
```

## 最佳实践

1. **定期重启长时间运行的服务**
2. **使用内存限制的容器**
3. **实施内存使用监控和告警**
4. **代码审查时关注资源管理**

## 相关工具

- [memory_profiler](https://pypi.org/project/memory-profiler/)
- [objgraph](https://pypi.org/project/objgraph/)
- [pympler](https://pypi.org/project/Pympler/)
- [guppy3](https://pypi.org/project/guppy3/)