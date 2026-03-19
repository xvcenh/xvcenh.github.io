---
layout: default
title: 其他开发问题
permalink: /categories/其他/
---

<div class="container">
  <div style="padding: 120px 0 var(--space-2xl);">
    
    <!-- 标题 -->
    <div style="text-align: center; margin-bottom: var(--space-2xl);">
      <h1 style="font-size: 2.5rem; margin-bottom: var(--space-md); color: var(--text-primary);">📦 其他开发问题</h1>
      <p style="font-size: 1.125rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto; line-height: 1.7;">
        团队协作、项目管理、学习资源等其他类型问题与解决方案
      </p>
    </div>
    
    <!-- 面包屑导航 -->
    <div style="margin-bottom: var(--space-xl);">
      <a href="/" style="color: var(--text-secondary); text-decoration: none;">首页</a>
      <span style="color: var(--text-light); margin: 0 0.5rem;">/</span>
      <a href="/categories/" style="color: var(--text-secondary); text-decoration: none;">分类</a>
      <span style="color: var(--text-light); margin: 0 0.5rem;">/</span>
      <span style="color: var(--primary); font-weight: 500;">其他开发</span>
    </div>
    
    <!-- 问题列表 -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
        <h2 style="font-size: 1.75rem; color: var(--text-primary); margin: 0;">
          其他问题记录
        </h2>
        <span style="color: var(--text-secondary); font-size: 0.875rem;">
          {% assign category_posts = site.categories.其他 %}
          共 { category_posts.size } 篇
        </span>
      </div>
      
      {% assign category_posts = site.categories.其他 %}
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
        <div class="empty-icon">📦</div>
        <h3 class="empty-title">暂无其他问题记录</h3>
        <p class="empty-description">通过钉钉上传第一个其他问题，开始积累其他知识库</p>
        <div style="display: flex; gap: var(--space-sm); justify-content: center; margin-top: var(--space-md);">
          <a href="/" class="btn-primary">返回首页</a>
          <a href="/categories/" class="btn-primary" style="background: rgba(99, 102, 241, 0.1); color: var(--primary);">浏览其他分类</a>
        </div>
      </div>
      {% endif %}
    </div>
    
    <!-- 技术栈 -->
    <div style="margin-top: var(--space-2xl);">
      <h2 style="font-size: 1.75rem; margin-bottom: var(--space-lg); color: var(--text-primary); text-align: center;">🛠️ 其他技术栈</h2>
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-sm); justify-content: center; margin-bottom: var(--space-lg);">
<span style="background: rgba(123, 104, 238, 0.1); color: #7b68ee; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(123, 104, 238, 0.2);">项目管理</span>
<span style="background: rgba(0, 184, 148, 0.1); color: #00b894; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(0, 184, 148, 0.2);">团队协作</span>
<span style="background: rgba(9, 132, 227, 0.1); color: #0984e3; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(9, 132, 227, 0.2);">文档编写</span>
<span style="background: rgba(253, 121, 168, 0.1); color: #fd79a8; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(253, 121, 168, 0.2);">学习资源</span>
<span style="background: rgba(253, 203, 110, 0.1); color: #fdcb6e; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(253, 203, 110, 0.2);">最佳实践</span>

      </div>
    </div>
    
  </div>
</div>