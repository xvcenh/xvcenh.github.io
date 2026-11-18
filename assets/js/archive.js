"use strict";

const monthSelect = document.querySelector("#calendar-month");
if (monthSelect) {
  document.querySelector("#calendar-switch").hidden = false;
  document.querySelector("#calendar-default").hidden = true;
  const calendars = document.querySelectorAll(".calendar-grid");
  const showMonth = () => {
    for (const calendar of calendars) {
      calendar.hidden = calendar.id !== "calendar-" + monthSelect.value;
    }
  };
  function syncCalendarWithAnchor() {
    const month = location.hash.match(/^#(?:month|date)-(\d{4}-\d{2})(?:-\d{2})?$/)?.[1];
    if (month && document.getElementById("calendar-" + month)) monthSelect.value = month;
    showMonth();
  }
  monthSelect.addEventListener("change", showMonth);
  window.addEventListener("hashchange", syncCalendarWithAnchor);
  syncCalendarWithAnchor();
}

const sortSelect = document.querySelector("#topic-sort");
if (sortSelect) {
  const list = document.querySelector("#topic-cards");
  const cards = Array.from(list.children);
  document.querySelector("#sort-control").hidden = false;
  function sortTopics() {
    const sorted = sortSelect.value === "count"
      ? [...cards].sort((a, b) => Number(b.dataset.count) - Number(a.dataset.count))
      : cards;
    list.append(...sorted);
  }
  sortSelect.addEventListener("change", sortTopics);
  sortTopics();
}
