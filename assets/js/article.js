"use strict";

(() => {
  const article = document.querySelector(".article-content");
  const toc = document.querySelector(".toc");
  const headings = Array.from(article.querySelectorAll("h2[id]"));
  if (headings.length) {
    toc.hidden = false;
    toc.querySelector("details").open = !matchMedia("(max-width:900px)").matches;
    const links = new Map();
    for (const heading of headings) {
      const link = document.createElement("a");
      link.href = "#" + encodeURIComponent(heading.id);
      link.textContent = heading.textContent;
      toc.querySelector("nav").append(link);
      links.set(heading, link);
    }
    if ("IntersectionObserver" in window) {
      let current;
      const observer = new IntersectionObserver(entries => {
        const first = entries.find(entry => entry.isIntersecting);
        if (!first) return;
        current?.removeAttribute("aria-current");
        current = links.get(first.target);
        current.setAttribute("aria-current", "location");
      }, {rootMargin: "0px 0px -65% 0px"});
      headings.forEach(heading => observer.observe(heading));
    }
  }
  if (!navigator.clipboard) return;
  for (const pre of article.querySelectorAll("pre")) {
    const toolbar = document.createElement("div");
    toolbar.className = "code-tools";
    const button = document.createElement("button");
    button.className = "copy-code";
    button.type = "button";
    button.textContent = "复制代码";
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent);
        button.textContent = "已复制";
      } catch { button.textContent = "请选中代码复制"; }
      window.setTimeout(() => { button.textContent = "复制代码"; }, 1800);
    });
    toolbar.append(button);
    pre.before(toolbar);
  }
})();
