---
layout: default
title: 数据库开发问题
permalink: /categories/数据库/
---

<div class="container">
  <div style="padding: 120px 0 var(--space-2xl);">
    
    <!-- 标题 -->
    <div style="text-align: center; margin-bottom: var(--space-2xl);">
      <h1 style="font-size: 2.5rem; margin-bottom: var(--space-md); color: var(--text-primary);">💾 数据库开发问题</h1>
      <p style="font-size: 1.125rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto; line-height: 1.7;">
        MySQL、PostgreSQL、MongoDB、Redis、SQL优化等数据库相关问题与解决方案
      </p>
    </div>
    
    <!-- 面包屑导航 -->
    <div style="margin-bottom: var(--space-xl);">
      <a href="/" style="color: var(--text-secondary); text-decoration: none;">首页</a>
      <span style="color: var(--text-light); margin: 0 0.5rem;">/</span>
      <a href="/categories/" style="color: var(--text-secondary); text-decoration: none;">分类</a>
      <span style="color: var(--text-light); margin: 0 0.5rem;">/</span>
      <span style="color: var(--primary); font-weight: 500;">数据库开发</span>
    </div>
    
    <!-- 问题列表 -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
        <h2 style="font-size: 1.75rem; color: var(--text-primary); margin: 0;">
          数据库问题记录
        </h2>
        <span style="color: var(--text-secondary); font-size: 0.875rem;">
          {% assign category_posts = site.categories.数据库 %}
          共 { category_posts.size } 篇
        </span>
      </div>
      
      {% assign category_posts = site.categories.数据库 %}
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
        <div class="empty-icon">💾</div>
        <h3 class="empty-title">暂无数据库问题记录</h3>
        <p class="empty-description">通过钉钉上传第一个数据库问题，开始积累数据库知识库</p>
        <div style="display: flex; gap: var(--space-sm); justify-content: center; margin-top: var(--space-md);">
          <a href="/" class="btn-primary">返回首页</a>
          <a href="/categories/" class="btn-primary" style="background: rgba(99, 102, 241, 0.1); color: var(--primary);">浏览其他分类</a>
        </div>
      </div>
      {% endif %}
    </div>
    
    <!-- 技术栈 -->
    <div style="margin-top: var(--space-2xl);">
      <h2 style="font-size: 1.75rem; margin-bottom: var(--space-lg); color: var(--text-primary); text-align: center;">🛠️ 数据库技术栈</h2>
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-sm); justify-content: center; margin-bottom: var(--space-lg);">
<span style="background: rgba(68, 121, 161, 0.1); color: #4479a1; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(68, 121, 161, 0.2);">MySQL</span>
<span style="background: rgba(51, 103, 145, 0.1); color: #336791; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(51, 103, 145, 0.2);">PostgreSQL</span>
<span style="background: rgba(71, 162, 72, 0.1); color: #47a248; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(71, 162, 72, 0.2);">MongoDB</span>
<span style="background: rgba(220, 56, 45, 0.1); color: #dc382d; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(220, 56, 45, 0.2);">Redis</span>
<span style="background: rgba(0, 59, 87, 0.1); color: #003b57; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(0, 59, 87, 0.2);">SQLite</span>
<span style="background: rgba(248, 0, 0, 0.1); color: #f80000; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(248, 0, 0, 0.2);">Oracle</span>
<span style="background: rgba(204, 41, 39, 0.1); color: #cc2927; padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 500; border: 1px solid rgba(204, 41, 39, 0.2);">SQL Server</span>

      </div>
    </div>
    
  </div>
</div>