---
layout: default
title: 分类浏览
permalink: /categories/
---

<header class="header">
  <div class="header-content">
    <div class="logo">
      <a href="/" style="text-decoration: none; color: white;">
        <span class="logo-icon">📚</span>
        <div>
          <div class="logo-text">项目问题库</div>
          <div class="logo-subtitle">团队知识积累 · 随时检索</div>
        </div>
      </a>
    </div>
    <nav class="nav">
      <a href="/">首页</a>
      <a href="/issues/">问题列表</a>
      <a href="/categories/">分类浏览</a>
      <a href="/search/" class="btn-upload">🔍 搜索</a>
    </nav>
  </div>
</header>

<main class="main-content">
  <section class="search-section">
    <h1 class="search-title">🏷️ 按分类浏览</h1>
    <p style="color: var(--text-secondary); margin-top: 0.5rem;">选择分类查看该类型的所有问题记录</p>
  </section>

  <section class="issues-grid">
    {% for category in site.categories %}
    <a href="/categories/{{ category[0] }}/" class="issue-card" style="text-decoration: none; display: block;">
      <div class="issue-header">
        <h2 class="issue-title">
          {% case category[0] %}
            {% when '前端' %}🎨 前端
            {% when '后端' %}⚙️ 后端
            {% when '数据库' %}💾 数据库
            {% when '部署' %}🚀 部署
            {% when '工具' %}🔧 工具
            {% when '其他' %}📦 其他
            {% else %}📂 {{ category[0] }}
          {% endcase %}
        </h2>
        <span class="issue-id">{{ category[1].size }} 篇</span>
      </div>
      <p class="issue-description">
        查看所有 {{ category[0] }} 类别的问题记录和解决方案
      </p>
    </a>
    {% endfor %}
  </section>
</main>

<footer class="footer">
  <div class="footer-content">
    <p>© 2026 xvcenh团队 · 基于 Jekyll + GitHub Pages 构建</p>
  </div>
</footer>