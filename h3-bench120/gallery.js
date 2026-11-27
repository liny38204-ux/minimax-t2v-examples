"use strict";

const cases = JSON.parse(document.querySelector("#catalog-data").textContent);
const byId = new Map(cases.map((item) => [item.id, item]));
const tiles = [...document.querySelectorAll("[data-case]")];
const tileById = new Map(tiles.map((tile) => [tile.dataset.case, tile]));
const filters = [...document.querySelectorAll("[data-ratio]")];
const player = document.querySelector("#player");
const screenFrame = document.querySelector(".screen");
const query = document.querySelector("#query");
const catalog = document.querySelector("#catalog-scroll");
const previous = document.querySelector("#previous");
const next = document.querySelector("#next");
const download = document.querySelector("#download");
const note = document.querySelector("#duration-note");
const playerError = document.querySelector("#player-error");
const duration = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let selection = "Q001";
let ratio = "all";
let visibleIds = cases.map((item) => item.id);

function syncNavigation() {
  const index = visibleIds.indexOf(selection);
  previous.disabled = index <= 0;
  next.disabled = visibleIds.length === 0 || index === visibleIds.length - 1;
}

function highlightInCatalog(tile) {
  if (!tile || tile.hidden || catalog.scrollHeight <= catalog.clientHeight) return;
  const clip = tile.getBoundingClientRect();
  const viewport = catalog.getBoundingClientRect();
  if (clip.bottom > viewport.bottom) catalog.scrollTop += clip.bottom - viewport.bottom + 6;
  if (clip.top < viewport.top) catalog.scrollTop += clip.top - viewport.top - 6;
}

function select(id, { setHash = true, revealPlayer = false } = {}) {
  const item = byId.get(id);
  if (!item) return;

  const tile = tileById.get(id);
  tileById.get(selection)?.removeAttribute("aria-current");
  tile.setAttribute("aria-current", "true");
  selection = id;

  document.querySelector("#current-id").textContent = id;
  document.querySelector("#technical").textContent =
    item.ratio + " · " + item.width + " × " + item.height + " · " + duration.format(item.duration) + " 秒";
  const shortened = item.originalSeconds !== item.submittedSeconds;
  note.hidden = !shortened;
  note.textContent = shortened
    ? "原题 " + item.originalSeconds + " 秒，按 " + item.submittedSeconds + " 秒生成。"
    : "";
  player.setAttribute("aria-label", "播放 " + id);
  screenFrame.dataset.vertical = String(item.height > item.width);
  download.href = "videos/" + id + ".mp4";
  download.download = id + ".mp4";

  if (player.getAttribute("src") !== "videos/" + id + ".mp4") {
    player.pause();
    playerError.hidden = true;
    player.poster = "posters/" + id + ".jpg";
    player.src = "videos/" + id + ".mp4";
    player.load();
  }
  if (setHash) history.replaceState(null, "", "#" + id);
  syncNavigation();
  highlightInCatalog(tile);
  if (revealPlayer && matchMedia("(max-width: 920px)").matches) {
    document.querySelector(".viewer").scrollIntoView({ block: "start" });
  }
}

function filterTiles() {
  const text = query.value.trim().toUpperCase();
  visibleIds = [];

  for (const tile of tiles) {
    const item = byId.get(tile.dataset.case);
    const matches = (ratio === "all" || ratio === item.ratio) && item.id.includes(text);
    tile.hidden = !matches;
    if (matches) visibleIds.push(item.id);
  }

  document.querySelector("#result-count").textContent = visibleIds.length + " 条";
  document.querySelector("#no-results").hidden = visibleIds.length > 0;
  catalog.scrollTop = 0;
  syncNavigation();
}

document.querySelector("#tiles").addEventListener("click", (event) => {
  const tile = event.target.closest("[data-case]");
  if (!tile || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  select(tile.dataset.case, { revealPlayer: true });
});

query.addEventListener("input", filterTiles);
query.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && visibleIds.length === 1) select(visibleIds[0], { revealPlayer: true });
});

for (const button of filters) {
  button.addEventListener("click", () => {
    ratio = button.dataset.ratio;
    for (const filter of filters) filter.setAttribute("aria-pressed", String(filter === button));
    filterTiles();
  });
}

previous.addEventListener("click", () => select(visibleIds[visibleIds.indexOf(selection) - 1]));
next.addEventListener("click", () => select(visibleIds[visibleIds.indexOf(selection) + 1]));
player.addEventListener("error", () => { playerError.hidden = false; });
window.addEventListener("hashchange", () => select(location.hash.slice(1).toUpperCase(), { setHash: false }));

const deepLink = location.hash.slice(1).toUpperCase();
select(byId.has(deepLink) ? deepLink : selection, { setHash: false });
