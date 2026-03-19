#!/bin/bash

# 自动推送脚本 - 每小时检查并提交更改到GitHub

# 设置工作目录
cd /home/annisen/BLOG/xvcenh.github.io

# 记录日志
log_file="/tmp/auto-push-$(date +%Y-%m-%d).log"
echo "====== $(date '+%Y-%m-%d %H:%M:%S') ======" >> "$log_file"

# 检查是否有未提交的更改
if [[ -n $(git status --porcelain) ]]; then
    echo "检测到未提交的更改：" >> "$log_file"
    git status --short >> "$log_file"
    
    # 添加所有更改
    git add . >> "$log_file" 2>&1
    
    # 提交更改
    commit_msg="自动提交: $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$commit_msg" >> "$log_file" 2>&1
    
    # 推送到GitHub
    if git push origin main >> "$log_file" 2>&1; then
        echo "✅ 推送成功" >> "$log_file"
        
        # 记录最后更新时间
        mkdir -p assets/data
        last_updated_file="assets/data/last_updated.txt"
        echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$last_updated_file"
        echo "更新时间已记录到 $last_updated_file" >> "$log_file"
        
        # 添加并提交更新时间文件
        git add "$last_updated_file" >> "$log_file" 2>&1
        git commit -m "更新最后修改时间" >> "$log_file" 2>&1
        git push origin main >> "$log_file" 2>&1
        
        echo "更改已推送到 GitHub，GitHub Pages 将在几分钟内更新。"
    else
        echo "❌ 推送失败，请检查网络连接和权限" >> "$log_file"
        echo "推送失败，请查看日志: $log_file"
    fi
else
    echo "没有检测到更改，跳过提交" >> "$log_file"
    echo "没有需要提交的更改。"
fi

echo "" >> "$log_file"