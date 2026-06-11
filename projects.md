---
layout: default
title: 开源项目
permalink: /projects/
description: "xvcenh 的开源项目 — AI 驱动的交互式应用与开发工具"
---

<style>
  /* Projects页面专属样式 */
  .projects-hero {
    position: relative;
    padding: 5rem 2rem 3rem;
    text-align: center;
    overflow: hidden;
    background: linear-gradient(135deg, #000010 0%, #1a0a2e 50%, #000010 100%);
  }
  
  .projects-hero::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
    transform: translate(-50%, -50%);
    animation: projPulse 6s ease-in-out infinite;
  }
  
  @keyframes projPulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.5; }
    50% { transform: translate(-50%, -50%) scale(1.15) rotate(-5deg); opacity: 0.8; }
  }
  
  .projects-icon {
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: linear-gradient(135deg, #8b5cf6, #ec4899, #f59e0b);
    margin: 0 auto 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3.5rem;
    box-shadow: 0 0 50px rgba(139, 92, 246, 0.5),
                0 0 100px rgba(236, 72, 153, 0.2);
    animation: iconFloat 4s ease-in-out infinite;
    position: relative;
    z-index: 1;
  }
  
  @keyframes iconFloat {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-15px) scale(1.05); }
  }
  
  .projects-title {
    font-size: 2.75rem;
    font-weight: 800;
    background: linear-gradient(135deg, #8b5cf6, #ec4899, #f59e0b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.75rem;
    position: relative;
    z-index: 1;
  }
  
  .projects-subtitle {
    font-size: 1.15rem;
    color: #8892b0;
    position: relative;
    z-index: 1;
  }
  
  .projects-content {
    max-width: 900px;
    margin: 0 auto;
    padding: 3rem 2rem;
  }
  
  /* 项目卡片 - 大卡片设计 */
  .project-card {
    background: rgba(17, 17, 40, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 2.5rem;
    margin-bottom: 2rem;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(20px);
  }
  
  .project-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.5s ease;
  }
  
  .project-card:hover {
    transform: translateY(-8px);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .project-card:hover::before {
    transform: scaleX(1);
  }
  
  .project-card.purple::before { background: linear-gradient(90deg, #8b5cf6, #6366f1); }
  .project-card.yellow::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
  .project-card.pink::before { background: linear-gradient(90deg, #ec4899, #db2777); }
  .project-card.green::before { background: linear-gradient(90deg, #10b981, #059669); }
  
  .project-card.purple:hover { box-shadow: 0 0 40px rgba(139, 92, 246, 0.25); }
  .project-card.yellow:hover { box-shadow: 0 0 40px rgba(245, 158, 11, 0.25); }
  .project-card.pink:hover { box-shadow: 0 0 40px rgba(236, 72, 153, 0.25); }
  .project-card.green:hover { box-shadow: 0 0 40px rgba(16, 185, 129, 0.25); }
  
  .project-inner {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
  }
  
  .project-icon {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.25rem;
    flex-shrink: 0;
    transition: transform 0.3s ease;
  }
  
  .project-card:hover .project-icon {
    transform: scale(1.1) rotate(5deg);
  }
  
  .project-icon.purple { background: linear-gradient(135deg, #8b5cf6, #6366f1); box-shadow: 0 0 25px rgba(139, 92, 246, 0.4); }
  .project-icon.yellow { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 0 25px rgba(245, 158, 11, 0.4); }
  .project-icon.pink { background: linear-gradient(135deg, #ec4899, #db2777); box-shadow: 0 0 25px rgba(236, 72, 153, 0.4); }
  .project-icon.green { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 0 25px rgba(16, 185, 129, 0.4); }
  
  .project-info {
    flex: 1;
  }
  
  .project-name {
    font-size: 1.6rem;
    font-weight: 700;
    color: #e8f0ff;
    margin-bottom: 0.25rem;
  }
  
  .project-tagline {
    color: #8b5cf6;
    font-size: 0.95rem;
    font-weight: 500;
    margin-bottom: 1rem;
  }
  
  .project-desc {
    color: #8892b0;
    font-size: 1rem;
    line-height: 1.8;
    margin-bottom: 1.5rem;
  }
  
  .project-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .project-tag {
    padding: 0.35rem 0.9rem;
    border-radius: 100px;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }
  
  .project-tag.blue { background: rgba(0, 212, 255, 0.15); color: #00d4ff; border: 1px solid rgba(0, 212, 255, 0.3); }
  .project-tag.green { background: rgba(0, 255, 136, 0.15); color: #00ff88; border: 1px solid rgba(0, 255, 136, 0.3); }
  .project-tag.purple { background: rgba(190, 10, 255, 0.15); color: #be0aff; border: 1px solid rgba(190, 10, 255, 0.3); }
  .project-tag.pink { background: rgba(255, 0, 110, 0.15); color: #ff006e; border: 1px solid rgba(255, 0, 110, 0.3); }
  .project-tag.yellow { background: rgba(255, 190, 11, 0.15); color: #ffbe0b; border: 1px solid rgba(255, 190, 11, 0.3); }
  
  .project-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.75rem;
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    color: white;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.3s ease;
  }
  
  .project-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 25px rgba(139, 92, 246, 0.5);
  }
  
  /* CTA区域 */
  .projects-cta {
    background: rgba(17, 17, 40, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 3rem;
    text-align: center;
    backdrop-filter: blur(20px);
  }
  
  .cta-text {
    font-size: 1.2rem;
    color: #8892b0;
    margin-bottom: 1.5rem;
  }
  
  .cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 2.5rem;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border-radius: 100px;
    text-decoration: none;
    font-weight: 700;
    font-size: 1.1rem;
    transition: all 0.3s ease;
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.3);
  }
  
  .cta-btn:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 0 50px rgba(16, 185, 129, 0.5);
  }
  
  /* 动画 */
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
  
  .stagger-1 { animation-delay: 0.1s; }
  .stagger-2 { animation-delay: 0.2s; }
  .stagger-3 { animation-delay: 0.3s; }
  .stagger-4 { animation-delay: 0.4s; }
  .stagger-5 { animation-delay: 0.5s; }
  
  /* 响应式 */
  @media (max-width: 768px) {
    .projects-hero {
      padding: 3rem 1.5rem 2rem;
    }
    
    .projects-icon {
      width: 80px;
      height: 80px;
      font-size: 2.5rem;
    }
    
    .projects-title {
      font-size: 2rem;
    }
    
    .projects-subtitle {
      font-size: 1rem;
    }
    
    .projects-content {
      padding: 2rem 1rem;
    }
    
    .project-card {
      padding: 1.5rem;
    }
    
    .project-inner {
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .project-icon {
      width: 56px;
      height: 56px;
      font-size: 1.75rem;
    }
    
    .project-name {
      font-size: 1.3rem;
    }
    
    .projects-cta {
      padding: 2rem;
    }
  }
</style>

<!-- Hero区域 -->
<div class="projects-hero">
  <div class="projects-icon">🚀</div>
  <h1 class="projects-title">开源项目</h1>
  <p class="projects-subtitle">AI 驱动的交互式应用与开发工具，欢迎 ⭐ Star & 贡献！</p>
</div>

<!-- 项目内容 -->
<div class="projects-content">

  <!-- Project 1: svg-scene-engine -->
  <div class="project-card purple fade-in-up stagger-1">
    <div class="project-inner">
      <div class="project-icon purple">🎭</div>
      <div class="project-info">
        <h2 class="project-name">svg-scene-engine</h2>
        <p class="project-tagline">SVG Scene Engine — AI 驱动的 2D 场景合成引擎</p>
        <p class="project-desc">
          用自然语言描述场景，引擎自动匹配 SVG 资源并组合成可视化画面。
          支持中世纪奇幻主题，包含背景、角色、物品、特效等 400+ 可组合对象。
          零依赖纯前端实现，内置 Scene DSL 用于精确控制场景结构。
        </p>
        <div class="project-tags">
          <span class="project-tag blue">HTML/CSS</span>
          <span class="project-tag green">JavaScript</span>
          <span class="project-tag purple">SVG</span>
          <span class="project-tag yellow">AI/LLM</span>
        </div>
        <a href="https://github.com/xvcenh/svg-scene-engine" target="_blank" rel="noopener" class="project-link">
          🔗 GitHub
        </a>
      </div>
    </div>
  </div>

  <!-- Project 2: claudescan -->
  <div class="project-card yellow fade-in-up stagger-2">
    <div class="project-inner">
      <div class="project-icon yellow">🔍</div>
      <div class="project-info">
        <h2 class="project-name">claudescan</h2>
        <p class="project-tagline">AI Config Generator — 扫描代码仓库，自动生成 AI 编程助手配置</p>
        <p class="project-desc">
          智能扫描任意代码仓库，自动检测语言、框架、构建系统、测试工具等，
          生成优化的 CLAUDE.md、AGENTS.md、.cursorrules 配置文件。
          让 AI 编程助手更好地理解你的项目，提升代码生成质量。
        </p>
        <div class="project-tags">
          <span class="project-tag blue">Python</span>
          <span class="project-tag green">CLI</span>
          <span class="project-tag purple">AI/LLM</span>
          <span class="project-tag pink">DevTools</span>
        </div>
        <a href="https://github.com/xvcenh/claudescan" target="_blank" rel="noopener" class="project-link">
          🔗 GitHub
        </a>
      </div>
    </div>
  </div>

  <!-- Project 3: svg-asset-library -->
  <div class="project-card pink fade-in-up stagger-3">
    <div class="project-inner">
      <div class="project-icon pink">🎨</div>
      <div class="project-info">
        <h2 class="project-name">svg-asset-library</h2>
        <p class="project-tagline">SVG Scene Asset Library — 中世纪奇幻风格 SVG 素材库</p>
        <p class="project-desc">
          50+ 手绘风格 SVG 矢量图形素材，按背景、角色、生物、物品、特效分类。
          遵循统一的 asset-spec 规范，支持 SMIL 动画（idle 呼吸、火焰闪烁等）。
          提供在线浏览界面，可按分类筛选、搜索和预览。
        </p>
        <div class="project-tags">
          <span class="project-tag purple">SVG</span>
          <span class="project-tag blue">HTML/CSS</span>
          <span class="project-tag yellow">Game</span>
        </div>
        <a href="https://github.com/xvcenh/svg-asset-library" target="_blank" rel="noopener" class="project-link">
          🔗 GitHub
        </a>
      </div>
    </div>
  </div>

  <!-- Project 4: liltown -->
  <div class="project-card green fade-in-up stagger-4">
    <div class="project-inner">
      <div class="project-icon green">🏘️</div>
      <div class="project-info">
        <h2 class="project-name">liltown</h2>
        <p class="project-tagline">Terminal AI Village — 终端里的 AI 村庄模拟器</p>
        <p class="project-desc">
          一个运行在终端中的 AI 村庄，多个 AI 角色在文本界面中自主生活、互动和对话。
          受斯坦福 Generative Agents 论文启发，在极简的终端环境中复现了 AI 社会模拟的魔力。
          适合喜欢 CLI 的黑客和 AI 研究者，用最少的资源探索最多的可能性。
        </p>
        <div class="project-tags">
          <span class="project-tag blue">Python</span>
          <span class="project-tag green">Terminal</span>
          <span class="project-tag purple">AI/LLM</span>
          <span class="project-tag pink">CLI</span>
        </div>
        <a href="https://github.com/xvcenh/liltown" target="_blank" rel="noopener" class="project-link">
          🔗 GitHub
        </a>
      </div>
    </div>
  </div>

  <!-- Project 5: fivebar-linkage -->
  <div class="project-card green fade-in-up stagger-5">
    <div class="project-inner">
      <div class="project-icon green">🤖</div>
      <div class="project-info">
        <h2 class="project-name">五连杆并联机构 · 交互式可视化</h2>
        <p class="project-tagline">五连杆闭环 → 串联臂等效 (髋2+膝2) · 正向/逆向运动学实时解算</p>
        <p class="project-desc">
          双轮足机器人的五连杆并联腿部机构可视化。左侧展示完整五连杆闭环链 (A→B→C→D→E)，
          右侧展示串联等效臂 (E→D→C)。支持正向运动学（调髋1髋2角度→算C点位置）
          和逆向运动学（调髋2+膝2相对角→反算髋1），实时 Canvas 渲染，拖滑块即时反馈。
        </p>
        <div class="project-tags">
          <span class="project-tag blue">JavaScript</span>
          <span class="project-tag green">Canvas</span>
          <span class="project-tag purple">Robotics</span>
          <span class="project-tag yellow">Kinematics</span>
        </div>
        <a href="/fivebar-linkage/" class="project-link">
          🔗 在线演示
        </a>
      </div>
    </div>
  </div>

  <!-- CTA -->
  <div class="projects-cta fade-in-up stagger-6">
    <p class="cta-text">🌟 喜欢这些项目？去 GitHub 给个 Star 吧！</p>
    <a href="https://github.com/xvcenh" target="_blank" rel="noopener" class="cta-btn">
      🐙 github.com/xvcenh
    </a>
  </div>

</div>
