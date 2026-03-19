---
layout: default
title: 前端开发问题
permalink: /categories/前端/
---

<div class="container">
  <div style="padding: 120px 0 var(--space-2xl);">
    
    <!-- 标题 -->
    <div style="text-align: center; margin-bottom: var(--space-2xl);">
      <h1 style="font-size: 2.5rem; margin-bottom: var(--space-md); color: var(--text-primary);">🎨 前端开发问题</h1>
      <p style="font-size: 1.125rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto; line-height: 1.7;">
        Vue、React、JavaScript、CSS、HTML、Webpack等前端相关问题与解决方案
      </p>
    </div>
    
    <!-- 面包屑导航 -->
    <div style="margin-bottom: var(--space-xl);">
      <a href="/" style="color: var(--text-secondary); text-decoration: none;">首页</a>
      <span style="color: var(--text-light); margin: 0 0.5rem;">/</span>
      <a href="/categories/" style="color: var(--text-secondary); text-decoration: none;">分类</a>
      <span style="color: var(--text-light); margin: 0 0.5rem;">/</span>
      <span style="color: var(--primary); font-weight: 500;">前端开发</span>
    </div>
    
    <!-- 问题列表 -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
        <h2 style="font-size: 1.75rem; color: var(--text-primary); margin: 0;">
          前端问题记录
        </h2>
        <span style="color: var(--text-secondary); font-size: 0.875rem;">
          {% assign category_posts = site.categories.前端 %}
          共 { category_posts.size } 篇
        </span>
      </div>
      
      {% assign category_posts = site.categories.前端 %}
      {% if category_posts.size > 0 %}
      <div class="issues-grid">
        {% for post in category_posts %}
        <article class="issue-card fade-in">
          <div class="issue-header">
            <h3 class="issue-title">
              <a href="{{ post.url }}">{{ post.title }}</a>
            </h3>
            <span class="issue-id">#{{ forloop.index }}</span>
          </div>
          
          <div class="issue-meta">
            <span class="meta-item">
              <span class="meta-icon">📅</span>
              {{ post.date | date: "%Y-%m-%d" }}
            </span>
            {% if post.author %}
            <span class="meta-item">
              <span class="meta-icon">👤</span>
              {{ post.author }}
            </span>
            {% endif %}
          </div>
          
          <p class="issue-description">{{ post.excerpt | strip_html | truncate: 150 }}</p>
          
          {% if post.keywords %}
          <div class="issue-keywords">
            {% for keyword in post.keywords limit: 4 %}
            <span class="keyword">{{ keyword }}</span>
            {% endfor %}
          </div>
          {% endif %}
        </article>
        {% endfor %}
      </div>
      {% else %}
      <div class="empty-state">
        <div class="empty-icon">🎨</div>
        <h3 class="empty-title">暂无前端问题记录</h3>
        <p class="empty-description">通过钉钉上传第一个前端问题，开始积累前端知识库</p>
        <div style="display: flex; gap: var(--space-sm); justify-content: center; margin-top: var(--space-md);">
          <a href="/" class="btn-primary">返回首页</a>
          <a href="/categories/" class="btn-primary" style="background: rgba(99, 102, 241, 0.1); color: var(--primary);">浏览其他分类</a>
        </div>
      </div>
      {% endif %}
    </div>
    
    <!-- 技术栈 -->
    <div style="margin-top: var(--space-2xl);">
      <h2 style="font-size: 1.75rem; margin-bottom: var(--space-lg); color: var(--text-primary); text-align: center;">🛠️ 前端技术栈</h2>
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-sm); justify-content: center; margin-bottom: var(--space-lg);">
<span style="background: rgba(66, 153, 225, 0.1); color: #4299e1; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(66, 153, 225, 0.2);">Vue.js</span>
<span style="background: rgba(97, 218, 251, 0.1); color: #61dafb; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(97, 218, 251, 0.2);">React</span>
<span style="background: rgba(247, 223, 30, 0.1); color: #f7df1e; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(247, 223, 30, 0.2);">JavaScript</span>
<span style="background: rgba(21, 114, 182, 0.1); color: #1572b6; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(21, 114, 182, 0.2);">CSS3</span>
<span style="background: rgba(228, 77, 38, 0.1); color: #e44d26; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(228, 77, 38, 0.2);">HTML5</span>
<span style="background: rgba(49, 120, 198, 0.1); color: #3178c6; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(49, 120, 198, 0.2);">TypeScript</span>
<span style="background: rgba(141, 214, 249, 0.1); color: #8dd6f9; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(141, 214, 249, 0.2);">Webpack</span>
<span style="background: rgba(100, 108, 255, 0.1); color: #646cff; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(100, 108, 255, 0.2);">Vite</span>

      </div>
    </div>
    
  </div>
</div>