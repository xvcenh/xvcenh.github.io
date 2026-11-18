"use strict";

(async () => {
  if (location.protocol === "file:") return;
  try {
    const response = await fetch("../search-index.json");
    if (!response.ok) return;
    const posts = await response.json();
    if (!posts.length) return;
    const topics = new Set(posts.flatMap(post => post.categories));
    for (const [id,total] of [["journal-total",posts.length],["journal-topics",topics.size]]) {
      const counter = document.getElementById(id);
      counter.dataset.target = total;
      counter.textContent = total;
    }
    const cards = document.querySelectorAll("#posts .post-card[href^='https://xvcenh.github.io/']");
    for (const [i,card] of Array.from(cards).entries()) {
      const post = posts[i];
      if (!post) { card.hidden = true; continue; }
      card.href = post.url;
      card.querySelector("h3").textContent = post.title;
      card.querySelector(".post-top").lastChild.textContent = post.date;
      card.querySelector(".excerpt").textContent = (post.keywords || []).join(" · ");
      const tags = post.categories.map(topic => {
        const tag = document.createElement("span");
        tag.className = "tag"; tag.textContent = topic; return tag;
      });
      card.querySelector(".tags").replaceChildren(...tags);
    }
  } catch { /* Standalone copies retain their built-in reading list. */ }
})();
