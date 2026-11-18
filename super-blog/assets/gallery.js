"use strict";

(() => {
  const preview = document.querySelector(".mode-preview");
  const cards = Array.from(document.querySelectorAll(".style-card"));
  if (!preview || !cards.length) return;
  const open = preview.querySelector(".mode-open");
  const image = open.querySelector("img");
  const link = preview.querySelector(".mode-name");
  const count = preview.querySelector(".mode-count");
  const controls = preview.querySelector(".mode-step");
  let current = 0;

  function select(index) {
    current = (index + cards.length) % cards.length;
    const card = cards[current];
    const name = card.querySelector("h4").textContent;
    image.src = card.querySelector("img").src;
    image.alt = name + "界面预览";
    open.href = link.href = card.href;
    open.setAttribute("aria-label", "体验" + name + "界面");
    link.textContent = name + " ↗";
    count.textContent = String(current + 1).padStart(2, "0") + " / " + cards.length;
  }
  preview.querySelector(".mode-caption").setAttribute("aria-live", "polite");
  controls.hidden = false;
  controls.addEventListener("click", event => {
    const button = event.target.closest("button[data-step]");
    if (button) select(current + Number(button.dataset.step));
  });
})();
