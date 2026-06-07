---
layout: default
title: 关于 xvcenh
permalink: /about/
description: "xvcenh(徐辰)的个人技术博客，记录软件开发、运维部署等领域的技术实践与经验分享。"
---

<style>
  /* About页面专属样式 */
  .about-hero {
    position: relative;
    padding: 6rem 2rem 4rem;
    text-align: center;
    overflow: hidden;
    background: linear-gradient(135deg, #000010 0%, #0a0a2e 50%, #000010 100%);
  }
  
  .about-hero::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(0, 212, 255, 0.15) 0%, transparent 70%);
    transform: translate(-50%, -50%);
    animation: heroPulse 4s ease-in-out infinite;
  }
  
  @keyframes heroPulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
  }
  
  .about-avatar {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00d4ff, #be0aff, #ff006e);
    margin: 0 auto 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
    box-shadow: 0 0 40px rgba(0, 212, 255, 0.4),
                0 0 80px rgba(190, 10, 255, 0.2),
                0 0 120px rgba(255, 0, 110, 0.1);
    animation: avatarFloat 3s ease-in-out infinite;
    position: relative;
    z-index: 1;
  }
  
  @keyframes avatarFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }
  
  .about-name {
    font-size: 3rem;
    font-weight: 800;
    background: linear-gradient(135deg, #00d4ff, #be0aff, #ff006e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
    position: relative;
    z-index: 1;
  }
  
  .about-tagline {
    font-size: 1.25rem;
    color: #8892b0;
    position: relative;
    z-index: 1;
  }
  
  .about-content {
    max-width: 900px;
    margin: 0 auto;
    padding: 3rem 2rem;
  }
  
  .about-card {
    background: rgba(17, 17, 40, 0.8);
    border: 1px solid rgba(0, 212, 255, 0.2);
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    backdrop-filter: blur(20px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .about-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #00d4ff, #be0aff, #ff006e);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.4s ease;
  }
  
  .about-card:hover {
    transform: translateY(-4px);
    border-color: rgba(0, 212, 255, 0.4);
    box-shadow: 0 0 30px rgba(0, 212, 255, 0.2),
                0 0 60px rgba(190, 10, 255, 0.1);
  }
  
  .about-card:hover::before {
    transform: scaleX(1);
  }
  
  .about-card h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #e8f0ff;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .about-card h2 .icon {
    font-size: 1.75rem;
  }
  
  .about-text {
    line-height: 1.8;
    color: #8892b0;
    font-size: 1rem;
  }
  
  .about-text strong {
    color: #e8f0ff;
  }
  
  .about-text .highlight-blue {
    color: #00d4ff;
    font-weight: 600;
  }
  
  .about-text .highlight-purple {
    color: #be0aff;
    font-weight: 600;
  }
  
  .about-text .highlight-pink {
    color: #ff006e;
    font-weight: 600;
  }
  
  .about-text .highlight-green {
    color: #00ff88;
    font-weight: 600;
  }
  
  /* 技能栈 - 霓虹风格 */
  .skills-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  
  .skill-chip {
    padding: 0.5rem 1.25rem;
    border-radius: 100px;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    border: 1px solid;
    transition: all 0.3s ease;
    cursor: default;
  }
  
  .skill-chip:hover {
    transform: translateY(-2px) scale(1.05);
  }
  
  .skill-chip.blue {
    background: rgba(0, 212, 255, 0.1);
    border-color: rgba(0, 212, 255, 0.3);
    color: #00d4ff;
  }
  
  .skill-chip.blue:hover {
    background: rgba(0, 212, 255, 0.2);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
  }
  
  .skill-chip.purple {
    background: rgba(190, 10, 255, 0.1);
    border-color: rgba(190, 10, 255, 0.3);
    color: #be0aff;
  }
  
  .skill-chip.purple:hover {
    background: rgba(190, 10, 255, 0.2);
    box-shadow: 0 0 20px rgba(190, 10, 255, 0.3);
  }
  
  .skill-chip.pink {
    background: rgba(255, 0, 110, 0.1);
    border-color: rgba(255, 0, 110, 0.3);
    color: #ff006e;
  }
  
  .skill-chip.pink:hover {
    background: rgba(255, 0, 110, 0.2);
    box-shadow: 0 0 20px rgba(255, 0, 110, 0.3);
  }
  
  .skill-chip.green {
    background: rgba(0, 255, 136, 0.1);
    border-color: rgba(0, 255, 136, 0.3);
    color: #00ff88;
  }
  
  .skill-chip.green:hover {
    background: rgba(0, 255, 136, 0.2);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
  }
  
  .skill-chip.yellow {
    background: rgba(255, 190, 11, 0.1);
    border-color: rgba(255, 190, 11, 0.3);
    color: #ffbe0b;
  }
  
  .skill-chip.yellow:hover {
    background: rgba(255, 190, 11, 0.2);
    box-shadow: 0 0 20px rgba(255, 190, 11, 0.3);
  }
  
  /* 分类卡片 - 重新设计 */
  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }
  
  .category-card {
    background: rgba(17, 17, 40, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1.5rem 1rem;
    text-align: center;
    text-decoration: none;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .category-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.05));
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .category-card:hover {
    transform: translateY(-4px) scale(1.02);
    border-color: rgba(0, 212, 255, 0.3);
  }
  
  .category-card:hover::before {
    opacity: 1;
  }
  
  .category-card .emoji {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
    display: block;
  }
  
  .category-card .name {
    font-weight: 700;
    color: #e8f0ff;
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }
  
  .category-card .desc {
    font-size: 0.75rem;
    color: #4a5568;
  }
  
  /* 联系方式 - 霓虹卡片 */
  .contact-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .contact-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: rgba(17, 17, 40, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    text-decoration: none;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .contact-card:hover {
    transform: translateY(-2px);
    border-color: rgba(0, 212, 255, 0.3);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.1);
  }
  
  .contact-card .icon {
    font-size: 2rem;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 212, 255, 0.1);
    border-radius: 12px;
  }
  
  .contact-card .info .label {
    font-weight: 600;
    color: #e8f0ff;
    font-size: 0.95rem;
  }
  
  .contact-card .info .value {
    color: #00d4ff;
    font-size: 0.85rem;
    font-family: 'JetBrains Mono', monospace;
  }
  
  /* 社交链接 */
  .social-links {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 3rem;
  }
  
  .social-link {
    padding: 0.75rem 1.5rem;
    background: rgba(17, 17, 40, 0.8);
    border: 1px solid rgba(0, 212, 255, 0.2);
    border-radius: 100px;
    color: #00d4ff;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .social-link:hover {
    background: rgba(0, 212, 255, 0.1);
    border-color: rgba(0, 212, 255, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
  }
  
  /* 动画 */
  .stagger-1 { animation-delay: 0.1s; }
  .stagger-2 { animation-delay: 0.2s; }
  .stagger-3 { animation-delay: 0.3s; }
  .stagger-4 { animation-delay: 0.4s; }
  
  .fade-in-up {
    opacity: 0;
    transform: translateY(30px);
    animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  
  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* 响应式 */
  @media (max-width: 768px) {
    .about-hero {
      padding: 4rem 1.5rem 3rem;
    }
    
    .about-avatar {
      width: 100px;
      height: 100px;
      font-size: 3rem;
    }
    
    .about-name {
      font-size: 2rem;
    }
    
    .about-tagline {
      font-size: 1rem;
    }
    
    .about-content {
      padding: 2rem 1rem;
    }
    
    .about-card {
      padding: 1.5rem;
    }
    
    .categories-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
    
    .contact-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<!-- Hero区域 -->
<div class="about-hero">
  <div class="about-avatar">👨‍💻</div>
  <h1 class="about-name">xvcenh</h1>
  <p class="about-tagline">🚀 全栈开发者 · 开源爱好者 · 终身学习者</p>
</div>

<!-- 社交链接 -->
<div class="about-content">
  <div class="social-links fade-in-up">
    <a href="https://github.com/xvcenh" target="_blank" rel="noopener" class="social-link">
      🐙 GitHub
    </a>
    <a href="mailto:xvcenh@gmail.com" class="social-link">
      📧 Email
    </a>
    <a href="https://xvcenh.github.io" class="social-link">
      🌐 博客
    </a>
  </div>

  <!-- 关于我 -->
  <div class="about-card fade-in-up stagger-1">
    <h2><span class="icon">🙋</span> 关于我</h2>
    <p class="about-text">
      我是 <strong>xvcenh（徐辰）</strong>，一名全栈开发者，专注于
      <span class="highlight-blue">软件架构</span>、
      <span class="highlight-purple">DevOps 运维</span> 和
      <span class="highlight-pink">数据库管理</span>。
    </p>
    <br>
    <p class="about-text">
      我相信知识的价值在于分享。每一个踩过的坑、每一个想通的方案，都值得被记录下来 ——
      帮助未来的自己，也帮助遇到同样问题的人。这个博客就是我的数字花园 🌱。
    </p>
  </div>

  <!-- 技能栈 -->
  <div class="about-card fade-in-up stagger-2">
    <h2><span class="icon">🛠️</span> 技能栈</h2>
    <div class="skills-grid">
      <span class="skill-chip blue">Python</span>
      <span class="skill-chip blue">JavaScript</span>
      <span class="skill-chip blue">TypeScript</span>
      <span class="skill-chip purple">Java</span>
      <span class="skill-chip blue">Vue</span>
      <span class="skill-chip blue">React</span>
      <span class="skill-chip pink">Docker</span>
      <span class="skill-chip pink">Kubernetes</span>
      <span class="skill-chip yellow">Nginx</span>
      <span class="skill-chip green">MySQL</span>
      <span class="skill-chip green">PostgreSQL</span>
      <span class="skill-chip purple">Redis</span>
      <span class="skill-chip purple">MongoDB</span>
      <span class="skill-chip blue">Git</span>
      <span class="skill-chip pink">CI/CD</span>
      <span class="skill-chip green">Linux</span>
    </div>
  </div>

  <!-- 博客内容涵盖 -->
  <div class="about-card fade-in-up stagger-3">
    <h2><span class="icon">📂</span> 博客内容涵盖</h2>
    <div class="categories-grid">
      <a href="/categories/软件/" class="category-card">
        <span class="emoji">💻</span>
        <div class="name">软件</div>
        <div class="desc">开发·调试</div>
      </a>
      <a href="/categories/硬件/" class="category-card">
        <span class="emoji">🔧</span>
        <div class="name">硬件</div>
        <div class="desc">配置·排查</div>
      </a>
      <a href="/categories/数据库/" class="category-card">
        <span class="emoji">🗄️</span>
        <div class="name">数据库</div>
        <div class="desc">SQL·调优</div>
      </a>
      <a href="/categories/部署/" class="category-card">
        <span class="emoji">🚀</span>
        <div class="name">部署</div>
        <div class="desc">CI/CD·容器</div>
      </a>
      <a href="/categories/工具/" class="category-card">
        <span class="emoji">🛠️</span>
        <div class="name">工具</div>
        <div class="desc">效率·自动化</div>
      </a>
    </div>
  </div>

  <!-- 联系方式 -->
  <div class="about-card fade-in-up stagger-4">
    <h2><span class="icon">📬</span> 找到我</h2>
    <div class="contact-grid">
      <a href="mailto:xvcenh@gmail.com" class="contact-card">
        <div class="icon">📧</div>
        <div class="info">
          <div class="label">邮箱</div>
          <div class="value">xvcenh@gmail.com</div>
        </div>
      </a>
      <a href="https://github.com/xvcenh" target="_blank" rel="noopener" class="contact-card">
        <div class="icon">🐙</div>
        <div class="info">
          <div class="label">GitHub</div>
          <div class="value">github.com/xvcenh</div>
        </div>
      </a>
    </div>
  </div>
</div>
