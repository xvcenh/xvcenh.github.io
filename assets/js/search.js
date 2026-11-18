"use strict";

(() => {
  const form = document.querySelector("#search-form");
  const input = document.querySelector("#query");
  const list = document.querySelector("#search-results");
  const counter = document.querySelector("#result-count");
  const notice = document.querySelector("#search-notice");
  const empty = document.querySelector("#empty-result");
  const clear = document.querySelector("#clear-search");
  const normalize = value => value.normalize("NFKC").toLocaleLowerCase();
  const fields = ["标题", "关键词", "正文"];
  const entries = Array.from(list.children, row => {
    const titleElement = row.querySelector(".match-title");
    const title = titleElement.textContent;
    return {
      row, title, titleElement, url: row.querySelector("a").getAttribute("href"),
      label: row.querySelector(".match-field"), preview: row.querySelector(".match-preview"),
      values: [normalize(title), normalize(row.dataset.topics), ""], rawBody: ""
    };
  });
  let fullText = "loading";

  // Keep text nodes from the index as text when highlighting a match.
  function highlight(element, content, expression) {
    if (!expression) {
      element.textContent = content;
      return;
    }
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of content.matchAll(expression)) {
      fragment.append(content.slice(offset, match.index));
      const mark = document.createElement("mark");
      mark.textContent = match[0];
      fragment.append(mark);
      offset = match.index + match[0].length;
    }
    fragment.append(content.slice(offset));
    element.replaceChildren(fragment);
  }

  function snippet(entry, terms) {
    const content = entry.rawBody;
    const offsets = terms.map(term => entry.values[2].indexOf(term)).filter(offset => offset >= 0);
    if (!offsets.length) return "";
    const start = Math.max(0, Math.min(...offsets) - 30);
    const end = Math.min(content.length, start + 120);
    return (start ? "…" : "") + content.slice(start, end).trim() + (end < content.length ? "…" : "");
  }

  function render() {
    const query = normalize(input.value.trim());
    const terms = [...new Set(query.split(/\s+/).filter(Boolean))];
    const escaped = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const expression = terms.length ? new RegExp(escaped.join("|"), "giu") : null;
    const result = [];
    for (const entry of entries) {
      const hits = terms.map(term => entry.values.findIndex(value => value.includes(term)));
      entry.row.hidden = hits.includes(-1);
      if (entry.row.hidden) continue;
      const rank = [0, 0, 0];
      for (const hit of hits) rank[hit]++;
      const matchingFields = fields.filter((field, i) => rank[i] > 0);
      entry.label.hidden = !matchingFields.length;
      entry.label.textContent = matchingFields.length ? matchingFields.join(" / ") + "匹配" : "";
      highlight(entry.titleElement, entry.title, expression);
      const excerpt = terms.length ? snippet(entry, terms) : "";
      entry.preview.hidden = !excerpt;
      if (excerpt) highlight(entry.preview, excerpt, expression);
      result.push({entry, rank});
    }
    result.sort((a, b) => b.rank[0] - a.rank[0] || b.rank[1] - a.rank[1]);
    list.append(...result.map(item => item.entry.row));
    counter.textContent = (terms.length ? "找到 " : "全部 ") + result.length + " 篇手记";
    clear.hidden = !input.value;
    empty.hidden = result.length > 0 || (terms.length && fullText === "loading");
    notice.hidden = !terms.length || fullText === "ready";
    if (!notice.hidden) notice.textContent = fullText === "loading"
      ? "正在载入正文索引…" : "正文索引暂时无法载入，当前结果来自标题和关键词。";
  }

  function updateQuery() {
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set("q", input.value.trim());
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
    render();
  }

  function restore() {
    input.value = new URLSearchParams(location.search).get("q") || "";
    render();
  }
  input.addEventListener("input", event => { if (!event.isComposing) updateQuery(); });
  input.addEventListener("compositionend", updateQuery);
  form.addEventListener("submit", event => { event.preventDefault(); updateQuery(); });
  clear.addEventListener("click", () => { input.value = ""; updateQuery(); input.focus(); });
  window.addEventListener("popstate", restore);
  restore();
  if (!input.value && matchMedia("(pointer:fine)").matches) input.focus({preventScroll: true});

  fetch(document.body.dataset.root + "search-index.json")
    .then(response => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then(posts => {
      const byUrl = new Map(posts.map(post => [post.url, post]));
      for (const entry of entries) {
        const post = byUrl.get(entry.url);
        if (!post) continue;
        entry.rawBody = post.body;
        entry.values = [post.title, post.topics, post.body].map(normalize);
      }
      fullText = "ready";
    })
    .catch(() => { fullText = "failed"; })
    .finally(render);
})();
