let allTracks = [];
let visibleTracks = [];
let currentTrackIndex = -1;
let isShuffledView = false;
let layoutMap = {};

const trackListEl = document.getElementById("track-list");
const searchEl = document.getElementById("search");
const shuffleBtn = document.getElementById("shuffle-btn");
const resetBtn = document.getElementById("reset-btn");

const audio = document.getElementById("audio-player");
const playBtn = document.getElementById("play-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const progressEl = document.getElementById("progress");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");

const nowTitleEl = document.getElementById("now-title");
const nowArtistEl = document.getElementById("now-artist");
const nowYearEl = document.getElementById("now-year");

async function loadTracks() {
  const response = await fetch("./tracks.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load tracks.json");
  }
  return response.json();
}

function sortTracks(tracks) {
  return [...tracks].sort((a, b) => {
    const aNum = Number(a.trackNumber || 0);
    const bNum = Number(b.trackNumber || 0);
    return aNum - bNum;
  });
}

function filterTracks(tracks, term) {
  const q = term.trim().toLowerCase();
  if (!q) return tracks;
  return tracks.filter((track) =>
    (track.title || "").toLowerCase().includes(q),
  );
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function updateNowPlaying(track) {
  nowTitleEl.textContent = track?.title || "Select a track";
  nowArtistEl.textContent = track?.year
    ? `Year ${track.year}`
    : "Year info will appear here";
  nowYearEl.textContent = track?.year || "-";
}

function getTrackId(track) {
  return track.fileName || `${track.title}-${track.year}`;
}

function getTrackIndexInVisible(track) {
  return visibleTracks.findIndex((t) => getTrackId(t) === getTrackId(track));
}

function ensureLayoutForTrack(track) {
  const id = getTrackId(track);
  if (!layoutMap[id]) {
    const mobile = window.innerWidth <= 980;
    layoutMap[id] = {
      lane: mobile ? rand(16, 84) : rand(20, 80),
      width: mobile ? "calc(100% - 20px)" : `${rand(200, 300)}px`,
      nudge: rand(-4, 4),
    };
  }
  return layoutMap[id];
}

function renderTracks(tracks) {
  trackListEl.innerHTML = "";

  if (!tracks.length) {
    trackListEl.innerHTML = `<div class="timeline-empty">No tracks found.</div>`;
    return;
  }

  tracks.forEach((track) => {
    const trackIndex = getTrackIndexInVisible(track);
    const isActive = trackIndex === currentTrackIndex;
    const layout = ensureLayoutForTrack(track);

    const article = document.createElement("article");
    article.className = "timeline-item";
    article.style.setProperty("--lane-x", `${layout.lane}%`);
    article.style.setProperty("--card-width", layout.width);
    article.style.setProperty("--nudge-y", `${layout.nudge}px`);

    article.innerHTML = `
      <button class="timeline-card ${isActive ? "active" : ""}" type="button">
        <div class="timeline-year">${track.year || "----"}</div>
        <h2 class="timeline-title">${track.title || "Untitled"}</h2>
      </button>
    `;

    article.querySelector(".timeline-card").addEventListener("click", () => {
      loadTrack(trackIndex, true);
    });

    trackListEl.appendChild(article);
  });

  drawElectricLine();
}

function loadTrack(index, autoplay = false) {
  if (index < 0 || index >= visibleTracks.length) return;

  currentTrackIndex = index;
  const track = visibleTracks[index];

  audio.src = track.url;
  updateNowPlaying(track);
  renderTracks(visibleTracks);

  progressEl.value = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";

  if (autoplay) {
    audio.play();
  }
}

function togglePlayPause() {
  if (!audio.src && visibleTracks.length > 0) {
    loadTrack(0, true);
    return;
  }

  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

function playNext() {
  if (!visibleTracks.length) return;
  const nextIndex =
    currentTrackIndex < visibleTracks.length - 1 ? currentTrackIndex + 1 : 0;
  loadTrack(nextIndex, true);
}

function playPrev() {
  if (!visibleTracks.length) return;
  const prevIndex =
    currentTrackIndex > 0 ? currentTrackIndex - 1 : visibleTracks.length - 1;
  loadTrack(prevIndex, true);
}

function resetTimelineOrder() {
  const currentSearch = searchEl.value.trim();
  visibleTracks = filterTracks(allTracks, currentSearch);
  isShuffledView = false;
  layoutMap = {};
  currentTrackIndex = -1;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  updateNowPlaying(null);
  renderTracks(visibleTracks);
}

function shuffleTracks() {
  const currentSearch = searchEl.value.trim();
  const baseTracks = filterTracks(allTracks, currentSearch);
  visibleTracks = shuffleArray(baseTracks);
  isShuffledView = true;
  layoutMap = {};
  currentTrackIndex = -1;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  updateNowPlaying(null);
  renderTracks(visibleTracks);
}

function makeElectricSegments(
  from,
  to,
  segments = 8,
  xJitter = 18,
  yJitter = 10,
) {
  const pts = [];
  for (let s = 1; s <= segments; s += 1) {
    const t = s / segments;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const attract = Math.sin(t * Math.PI);
    const jx = rand(-xJitter, xJitter) * (1 - Math.abs(t - 0.5) * 1.15);
    const jy = rand(-yJitter, yJitter) * attract;
    pts.push({ x: x + jx, y: y + jy });
  }
  return pts;
}

function drawPathD(points) {
  if (!points.length) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

function drawElectricLine() {
  const old = trackListEl.querySelector(".electric-svg");
  if (old) old.remove();

  const cards = [...trackListEl.querySelectorAll(".timeline-card")];
  if (!cards.length) return;

  const rect = trackListEl.getBoundingClientRect();
  const points = cards.map((card) => {
    const r = card.getBoundingClientRect();
    return {
      x: r.left - rect.left + r.width / 2,
      y: r.top - rect.top + r.height / 2,
    };
  });

  const startPoint = {
    x: rect.width / 2,
    y: -90,
  };

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "electric-svg");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("viewBox", `0 -120 ${rect.width} ${rect.height + 150}`);
  svg.setAttribute("width", rect.width);
  svg.setAttribute("height", rect.height + 120);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

  const filter = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "filter",
  );
  filter.setAttribute("id", "electricGlow");
  filter.setAttribute("x", "-40%");
  filter.setAttribute("y", "-40%");
  filter.setAttribute("width", "180%");
  filter.setAttribute("height", "180%");

  const blur1 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "feGaussianBlur",
  );
  blur1.setAttribute("stdDeviation", "2.5");
  blur1.setAttribute("result", "blur1");

  const blur2 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "feGaussianBlur",
  );
  blur2.setAttribute("in", "SourceGraphic");
  blur2.setAttribute("stdDeviation", "7");
  blur2.setAttribute("result", "blur2");

  const merge = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "feMerge",
  );
  ["blur2", "blur1", "SourceGraphic"].forEach((name) => {
    const node = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode",
    );
    node.setAttribute("in", name);
    merge.appendChild(node);
  });

  filter.appendChild(blur1);
  filter.appendChild(blur2);
  filter.appendChild(merge);
  defs.appendChild(filter);
  svg.appendChild(defs);

  const fullPoints = [startPoint];
  fullPoints.push(...makeElectricSegments(startPoint, points[0], 10, 10, 12));

  for (let i = 1; i < points.length; i += 1) {
    fullPoints.push(
      ...makeElectricSegments(points[i - 1], points[i], 8, 20, 12),
    );
  }

  const coreD = drawPathD(fullPoints);

  const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  glow.setAttribute("d", coreD);
  glow.setAttribute("class", "electric-line-glow");

  const mid = document.createElementNS("http://www.w3.org/2000/svg", "path");
  mid.setAttribute("d", coreD);
  mid.setAttribute("class", "electric-line-mid");

  const core = document.createElementNS("http://www.w3.org/2000/svg", "path");
  core.setAttribute("d", coreD);
  core.setAttribute("class", "electric-line-core");

  svg.appendChild(glow);
  svg.appendChild(mid);
  svg.appendChild(core);
  trackListEl.prepend(svg);
}

playBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrev);
shuffleBtn.addEventListener("click", shuffleTracks);
resetBtn.addEventListener("click", resetTimelineOrder);

audio.addEventListener("play", () => {
  playBtn.textContent = "⏸";
});

audio.addEventListener("pause", () => {
  playBtn.textContent = "▶";
});

audio.addEventListener("loadedmetadata", () => {
  progressEl.max = Math.floor(audio.duration || 0);
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  progressEl.value = Math.floor(audio.currentTime || 0);
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

progressEl.addEventListener("input", () => {
  audio.currentTime = Number(progressEl.value);
});

audio.addEventListener("ended", playNext);

searchEl.addEventListener("input", () => {
  const baseTracks = filterTracks(allTracks, searchEl.value);
  visibleTracks = isShuffledView ? shuffleArray(baseTracks) : baseTracks;
  currentTrackIndex = -1;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  updateNowPlaying(null);
  renderTracks(visibleTracks);
});

window.addEventListener("resize", () => {
  layoutMap = {};
  renderTracks(visibleTracks);
});

(async function init() {
  try {
    const rawTracks = await loadTracks();
    allTracks = sortTracks(rawTracks);
    visibleTracks = [...allTracks];
    renderTracks(visibleTracks);
    updateNowPlaying(null);
  } catch (error) {
    trackListEl.innerHTML = `<div class="timeline-empty">${error.message}</div>`;
  }
})();
