---
layout: post
title: "MySQL 慢查询优化实战"
date: 2026-03-19 12:00:00 +0800
author: "王DBA"
categories: [数据库]
keywords: [MySQL, 慢查询, 性能优化, 索引, SQL优化]
---

## 问题描述

生产环境 MySQL 数据库出现大量慢查询，导致应用响应时间变长。

## 环境信息

- MySQL 8.0
- InnoDB 存储引擎
- 数据量：约 1000 万条记录
- 硬件：8核 CPU，32GB 内存

## 慢查询分析

### 1. 启用慢查询日志

```sql
-- 查看当前配置
SHOW VARIABLES LIKE 'slow_query_log%';
SHOW VARIABLES LIKE 'long_query_time';

-- 启用慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;  -- 2秒
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

### 2. 分析慢查询日志

```bash
# 使用 mysqldumpslow 分析
mysqldumpslow -s t /var/log/mysql/slow.log

# 使用 pt-query-digest 分析
pt-query-digest /var/log/mysql/slow.log
```

## 常见慢查询问题

### 1. 缺少索引

```sql
-- 问题查询
SELECT * FROM orders 
WHERE user_id = 123 
  AND status = 'completed' 
  AND created_at > '2026-01-01';

-- 解决方案：添加复合索引
CREATE INDEX idx_user_status_date ON orders(user_id, status, created_at);
```

### 2. 索引失效

```sql
-- 问题：使用函数导致索引失效
SELECT * FROM users 
WHERE DATE(created_at) = '2026-03-19';

-- 解决方案：避免在列上使用函数
SELECT * FROM users 
WHERE created_at >= '2026-03-19' 
  AND created_at < '2026-03-20';
```

### 3. 全表扫描

```sql
-- 问题：OR 条件导致全表扫描
SELECT * FROM products 
WHERE category_id = 1 
   OR price > 1000;

-- 解决方案：使用 UNION
SELECT * FROM products WHERE category_id = 1
UNION
SELECT * FROM products WHERE price > 1000;
```

## 优化方案

### 方案一：索引优化

```sql
-- 分析索引使用情况
EXPLAIN SELECT * FROM orders WHERE user_id = 123;

-- 创建合适的索引
CREATE INDEX idx_user_id ON orders(user_id);
CREATE INDEX idx_created_at ON orders(created_at);

-- 删除无用索引
DROP INDEX idx_unused ON orders;
```

### 方案二：查询重写

```sql
-- 优化前：子查询
SELECT * FROM users 
WHERE id IN (SELECT user_id FROM orders WHERE amount > 1000);

-- 优化后：JOIN 查询
SELECT u.* FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.amount > 1000;
```

### 方案三：分页优化

```sql
-- 优化前：OFFSET 分页
SELECT * FROM orders 
ORDER BY id 
LIMIT 1000 OFFSET 100000;  -- 性能差

-- 优化后：游标分页
SELECT * FROM orders 
WHERE id > 100000 
ORDER BY id 
LIMIT 1000;
```

## 性能监控

### 1. 实时监控

```sql
-- 查看当前连接和查询
SHOW PROCESSLIST;

-- 查看锁信息
SHOW ENGINE INNODB STATUS;

-- 查看索引统计
SHOW INDEX FROM orders;
```

### 2. 性能指标

```sql
-- 查询缓存命中率
SHOW STATUS LIKE 'Qcache%';

-- InnoDB 缓冲池命中率
SHOW STATUS LIKE 'Innodb_buffer_pool%';

-- 表扫描率
SHOW STATUS LIKE 'Handler_read%';
```

## 预防措施

1. **定期分析慢查询日志**
2. **实施 SQL 审核流程**
3. **使用查询缓存和连接池**
4. **定期优化表和索引**
5. **监控数据库性能指标**

## 相关工具

- [Percona Toolkit](https://www.percona.com/software/database-tools/percona-toolkit)
- [MySQLTuner](https://github.com/major/MySQLTuner-perl)
- [pt-query-digest](https://www.percona.com/doc/percona-toolkit/LATEST/pt-query-digest.html)
- [EXPLAIN ANALYZE](https://dev.mysql.com/doc/refman/8.0/en/explain.html)（MySQL 8.0+）