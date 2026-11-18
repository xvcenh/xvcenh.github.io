"use strict";

const rootPath = document.body.dataset.root;
const menu = document.querySelector(".menu-btn");
const navigation = document.querySelector("#primary-nav");
document.documentElement.classList.add("enhanced");
menu.hidden = false;

function setMenu(open) {
  navigation.classList.toggle("is-open", open);
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "关闭导航" : "展开导航");
}
menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") !== "true"));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }
  const editing = event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
  if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || editing || document.querySelector("dialog[open]")) return;
  event.preventDefault();
  const search = document.querySelector("#query");
  if (search) search.focus();
  else window.location.assign(rootPath + "search/");
});

const machine = document.querySelector(".machine");
if (machine && matchMedia("(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)").matches) {
  machine.addEventListener("pointermove", (event) => {
    const box = machine.getBoundingClientRect();
    machine.style.setProperty("--dx", ((event.clientX - box.left) / box.width - .5) * 10 + "px");
    machine.style.setProperty("--dy", ((event.clientY - box.top) / box.height - .5) * 8 + "px");
  });
  machine.addEventListener("pointerleave", () => {
    machine.style.removeProperty("--dx");
    machine.style.removeProperty("--dy");
  });
}

const terminal = document.querySelector("#terminal");
if (terminal && typeof terminal.showModal === "function") {
  const trigger = document.querySelector(".terminal-trigger");
  const input = document.querySelector("#command");
  const log = document.querySelector("#terminal-log");
  const paths = new Map([
    ["articles", ["文章档案", "issues/"]], ["projects", ["项目实验室", "projects/"]],
    ["about", ["关于徐辰", "about/"]], ["graph", ["技术图谱", "tech-graph/"]]
  ]);
  const history = [];
  let historyIndex = 0;

  function print(message, url) {
    const line = document.createElement("p");
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.textContent = message;
      line.append(link);
    } else line.textContent = message;
    log.append(line);
    log.scrollTop = log.scrollHeight;
  }

  trigger.hidden = false;
  trigger.addEventListener("click", () => { terminal.showModal(); input.focus(); });
  terminal.querySelector(".terminal-close").addEventListener("click", () => terminal.close());
  terminal.addEventListener("click", (event) => {
    if (event.target !== terminal) return;
    const bounds = terminal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) terminal.close();
  });
  input.addEventListener("keydown", (event) => {
    if (!history.length || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
    input.value = history[historyIndex] || "";
  });
  document.querySelector("#terminal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const line = input.value.trim();
    if (!line) return;
    history.push(line);
    historyIndex = history.length;
    input.value = "";
    print("$ " + line);
    const [command, ...args] = line.split(/\s+/);
    switch (command.toLowerCase()) {
      case "help": print("ls · 列出目录\nopen <目录> · 打开页面\nsearch <关键词> · 搜索文章\nwhoami · 关于作者\nclear · 清屏\nexit · 关闭终端"); break;
      case "ls":
        for (const [key, [title, path]] of paths) print(key + "/  " + title + " ↗", rootPath + path);
        break;
      case "whoami": print("徐辰 / xvcenh · 全栈开发者", rootPath + "about/"); break;
      case "clear": log.replaceChildren(); break;
      case "exit": terminal.close(); break;
      case "open":
        if (paths.has(args[0])) window.location.assign(rootPath + paths.get(args[0])[1]);
        else print("输入 ls 查看可打开的目录。");
        break;
      case "search":
        if (args.length) window.location.assign(rootPath + "search/?q=" + encodeURIComponent(args.join(" ")));
        else print("用法：search Docker");
        break;
      default: print("未知命令。输入 help 查看命令。");
    }
  });
}
