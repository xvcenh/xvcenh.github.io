---
layout: default
title: 部署问题
permalink: /categories/部署/
---

<div class="subpage-hero">
  <div class="subpage-hero-icon" style="background: linear-gradient(135deg, #f8717133, #f8717111); border: 1px solid #f8717144;">
    🚀
  </div>
  <h1>🚀 部署</h1>
  <p>Docker、Kubernetes、Nginx、CI/CD、服务器配置等部署相关问题与解决方案</p>
</div>

<div class="subpage-body">

  <!-- 面包屑 -->
  <div class="breadcrumb" style="margin-bottom: 2rem;">
    <a href="/">首页</a>
    <span class="breadcrumb-sep">/</span>
    <a href="/categories/">分类</a>
    <span class="breadcrumb-sep">/</span>
    <span style="color: var(--primary); font-weight: 500;">部署</span>
  </div>

  <!-- 文章列表 -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem;">
    <h2 style="font-size: 1.3rem; color: var(--text-primary); margin: 0;">全部文章</h2>
    <span style="color: var(--text-light); font-size: 0.85rem;">
      %{% assign cat_posts = site.categories["部署"] %}
      共 %{{ cat_posts.size }} 篇
    </span>
  </div>

  %{% assign cat_posts = site.categories["部署"] %}
  %{% if cat_posts.size > 0 %}
  <div class="category-grid">
    %{% for post in cat_posts %}
    <a href="%{{ post.url }}" class="glass-card stagger-%{{ forloop.index | modulo: 5 | plus: 1 }}" style="text-decoration: none; display: block;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
        <h3 style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin: 0; flex: 1; line-height: 1.5;">
          %{{ post.title }}
        </h3>
        <span style="font-size: 0.72rem; color: var(--text-light); white-space: nowrap; margin-left: 0.75rem; margin-top: 0.15rem;">
          %{{ post.date | date: "%m-%d" }}
        </span>
      </div>
      <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.6; margin: 0.5rem 0;">
        %{{ post.excerpt | strip_html | truncate: 100 }}
      </p>
      %{% if post.keywords %}
      <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.75rem;">
        %{% for keyword in post.keywords limit: 3 %}
        <span style="background: var(--bg-secondary); color: var(--primary); padding: 0.15rem 0.5rem; border-radius: var(--radius-sm); font-size: 0.72rem;">%{{ keyword }}</span>
        %{% endfor %}
      </div>
      %{% endif %}
    </a>
    %{% endfor %}
  </div>
  %{% else %}
  <div class="glass-card" style="text-align: center; padding: 3rem;">
    <div style="font-size: 2.5rem; margin-bottom: 1rem;">🚀</div>
    <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: var(--text-primary);">暂无部署文章</h3>
    <p style="color: var(--text-light); font-size: 0.9rem;">开始记录第一个部署问题吧 ✨</p>
  </div>
  %{% endif %}

  <!-- 返回链接 -->
  <div style="margin-top: 2.5rem; text-align: center;">
    <a href="/categories/" class="social-link">← 返回分类浏览</a>
  </div>

</div>
