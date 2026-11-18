"use strict";

(() => {
  const form = document.querySelector("#search-form");
  const input = document.querySelector("#query");
  const list = document.querySelector("#search-results");
  const count = document.querySelector("#result-count");
  const empty = document.querySelector("#empty-result");
  const rows = Array.from(list.children);
  const localText = rows.map(row => row.textContent.toLocaleLowerCase());
  const normalize = value => value.normalize("NFKC").toLocaleLowerCase();
  let index;
  let limited = false;

  function render() {
    const terms = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    let visible = 0;
    const ranked = rows.map((row, i) => {
      const fields = index?.get(row.querySelector("a").getAttribute("href")) || [localText[i], "", ""];
      let score = 0;
      for (const term of terms) {
        const field = fields.findIndex(value => value.includes(term));
        if (field < 0) return { row, score: -1 };
        score += [10, 4, 1][field];
      }
      return { row, score };
    });
    for (const { row, score } of ranked.sort((a, b) => b.score - a.score)) {
      row.hidden = score < 0;
      if (!row.hidden) visible++;
      list.append(row);
    }
    empty.hidden = visible !== 0;
    const prefix = terms.length ? "找到 " + visible + " 篇手记" : "全部 " + visible + " 篇手记";
    count.textContent = limited && terms.length ? prefix + " · 正文索引暂不可用，当前匹配标题和分类" : prefix;
  }

  function loadQuery() {
    input.value = new URLSearchParams(location.search).get("q") || "";
    render();
  }
  input.addEventListener("input", () => {
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set("q", input.value.trim());
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
    render();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    input.dispatchEvent(new Event("input"));
  });
  window.addEventListener("popstate", loadQuery);
  loadQuery();
  if (!input.value && matchMedia("(pointer:fine)").matches) input.focus({preventScroll:true});
  fetch(document.body.dataset.root + "search-index.json")
    .then(response => {
      if (!response.ok) throw new Error("Search index unavailable");
      return response.json();
    })
    .then(posts => {
      index = new Map(posts.map(post => [post.url, [post.title, post.topics, post.body].map(normalize)]));
    })
    .catch(() => { limited = true; })
    .finally(render);
})();
