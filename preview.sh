#!/bin/bash
# 本机预览站点：构建后在 0.0.0.0:4000 提供服务（Ctrl+C 停止）
# 用法： ./preview.sh              浏览器打开 http://<本机IP>:4000
#        ./preview.sh 4001         指定端口
#        ./preview.sh 4000 --watch 额外参数原样传给 jekyll（自动重建）
set -e
cd "$(dirname "$0")"
PORT="${1:-4000}"
shift || true
echo "预览地址： http://$(hostname -I | awk '{print $1}'):${PORT}    （Ctrl+C 停止）"
exec bundle exec jekyll serve --host 0.0.0.0 --port "$PORT" "$@"
