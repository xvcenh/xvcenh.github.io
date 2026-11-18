"use strict";

(() => {
  const text = document.querySelector(".post-text");
  if (!text) return;

  const rail = document.querySelector(".reading-rail");
  if (rail) {
    const details = rail.querySelector("details");
    const links = Array.from(rail.querySelectorAll("nav a"));
    const headings = links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1))));
    const meter = rail.querySelector(".reading-meter");
    const bar = meter.querySelector("progress");
    const number = meter.querySelector(".reading-percent");
    const compact = window.matchMedia("(max-width:900px)");
    let active = -1;
    let scheduled = false;

    const fitRail = () => { details.open = !compact.matches; };
    fitRail();
    compact.addEventListener("change", fitRail);

    function updatePosition() {
      scheduled = false;
      const target = Math.min(145, window.innerHeight * .22);
      let current = 0;
      for (let index = 0; index < headings.length; index++) {
        if (headings[index] && headings[index].getBoundingClientRect().top <= target) current = index;
      }
      if (current !== active) {
        links[active]?.removeAttribute("aria-current");
        links[current]?.setAttribute("aria-current", "location");
        active = current;
      }
      const bounds = text.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const span = Math.max(1, bounds.height - Math.min(bounds.height * .55, windowHeight * .72));
      const percent = Math.round(Math.max(0, Math.min(1, (target - bounds.top) / span)) * 100);
      if (bar.value !== percent) {
        bar.value = percent;
        number.textContent = percent + "%";
      }
    }

    function scheduleUpdate() {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(updatePosition);
      }
    }

    meter.hidden = false;
    updatePosition();
    window.addEventListener("scroll", scheduleUpdate, {passive: true});
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("pageshow", scheduleUpdate);
    document.fonts?.ready.then(scheduleUpdate);
    if ("ResizeObserver" in window) new ResizeObserver(scheduleUpdate).observe(text);
  }

  for (const pre of text.querySelectorAll("pre")) {
    pre.tabIndex = 0;
    if (!navigator.clipboard?.writeText) continue;
    const enclosing = pre.closest("[class*='language-']");
    const language = enclosing?.className.match(/(?:^|\s)language-([\w+-]+)/)?.[1];
    const toolbar = document.createElement("div");
    toolbar.className = "code-tools";
    const label = document.createElement("span");
    label.textContent = language && language !== "plaintext" ? language.toUpperCase() : "代码";
    const button = document.createElement("button");
    button.className = "copy-code";
    button.type = "button";
    button.textContent = "复制代码";
    const feedback = document.createElement("span");
    feedback.className = "sr-only";
    feedback.setAttribute("role", "status");
    let reset;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent);
        button.textContent = feedback.textContent = "已复制";
      } catch {
        button.textContent = feedback.textContent = "请选中代码复制";
      }
      clearTimeout(reset);
      reset = setTimeout(() => {
        button.textContent = "复制代码";
        feedback.textContent = "";
      }, 1800);
    });
    toolbar.append(label, feedback, button);
    pre.before(toolbar);
  }
})();
