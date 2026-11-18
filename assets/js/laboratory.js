function initializePreview(monitor) {
  const frames = [...monitor.querySelectorAll(".lab-frame")];
  const controls = monitor.querySelector(".lab-channel-list");
  const buttons = [...controls.querySelectorAll("button")];
  function show(button) {
    for (const frame of frames) frame.hidden = frame.id !== button.dataset.frame;
    for (const choice of buttons) {
      const active = choice === button;
      choice.setAttribute("aria-pressed", String(active));
      choice.tabIndex = active ? 0 : -1;
    }
  }
  controls.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (button) show(button);
  });
  controls.addEventListener("keydown", event => {
    const current = buttons.indexOf(event.target);
    if (current < 0) return;
    const indexes = {
      ArrowRight: (current + 1) % buttons.length,
      ArrowLeft: (current + buttons.length - 1) % buttons.length,
      Home: 0,
      End: buttons.length - 1
    };
    if (!(event.key in indexes)) return;
    event.preventDefault();
    const next = buttons[indexes[event.key]];
    show(next);
    next.focus();
  });
  show(buttons[0]);
  controls.hidden = false;
}

function initializeDirectory(directory) {
  const controls = directory.querySelector(".lab-filter");
  const buttons = [...controls.querySelectorAll("button")];
  const projects = [...directory.querySelectorAll("[data-kind]")];
  const status = directory.querySelector("[data-filter-status]");
  function filter(group) {
    const chosen = buttons.find(button => button.dataset.group === group) || buttons[0];
    for (const button of buttons) button.setAttribute("aria-pressed", String(button === chosen));
    let count = 0;
    for (const project of projects) {
      const included = chosen.dataset.group === "repositories" ? project.hasAttribute("data-repository") : project.dataset.kind === chosen.dataset.group;
      project.hidden = chosen.dataset.group !== "all" && !included;
      if (!project.hidden) count++;
    }
    status.textContent = "显示 " + count + " 个项目";
  }
  controls.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || button.getAttribute("aria-pressed") === "true") return;
    const url = new URL(window.location.href);
    const group = button.dataset.group;
    if (group === "all") url.searchParams.delete("group");
    else url.searchParams.set("group", group);
    window.history.pushState(null, "", url);
    filter(group);
  });
  function syncFilter() {
    filter(new URL(window.location.href).searchParams.get("group"));
  }
  syncFilter();
  window.addEventListener("popstate", syncFilter);
  controls.hidden = false;
}

function initializeComparison(figure) {
  const range = figure.querySelector("input");
  function update() {
    figure.style.setProperty("--split", range.value + "%");
    range.setAttribute("aria-valuetext", "经典星系占 " + range.value + "%");
  }
  figure.classList.add("is-interactive");
  figure.querySelector(".journal-divider").hidden = false;
  range.hidden = false;
  update();
  range.addEventListener("input", update);
  document.querySelector("[data-compare-help]").textContent = "拖动分界线，或用左右方向键对照两版首页。";
}

document.querySelectorAll("[data-preview]").forEach(initializePreview);
document.querySelectorAll("[data-directory]").forEach(initializeDirectory);
document.querySelectorAll("[data-compare]").forEach(initializeComparison);
