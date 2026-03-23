let allTracks = [];
let visibleTracks = [];
let currentTrackIndex = -1;

const trackListEl = document.getElementById("track-list");
const searchEl = document.getElementById("search");
const shuffleBtn = document.getElementById("shuffle-btn");

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
  nowArtistEl.textContent = track?.artist || "Artist info will appear here";
  nowYearEl.textContent = track?.year || "-";
}

function renderTracks(tracks) {
  trackListEl.innerHTML = "";

  if (!tracks.length) {
    trackListEl.innerHTML = `<div class="timeline-empty">No tracks found.</div>`;
    return;
  }

  tracks.forEach((track, index) => {
    const item = document.createElement("article");
    item.className = `timeline-item ${index % 2 === 0 ? "left" : "right"}`;

    const isActive = index === currentTrackIndex;

    item.innerHTML = `
      <div class="timeline-marker"></div>
      <button class="timeline-card ${isActive ? "active" : ""}" type="button">
        <div class="timeline-year">${track.year || "Unknown Year"}</div>
        <h2 class="timeline-title">${track.title || "Untitled"}</h2>
        <div class="timeline-artist">${track.artist || "Unknown Artist"}</div>
      </button>
    `;

    item.querySelector(".timeline-card").addEventListener("click", () => {
      loadTrack(index, true);
    });

    trackListEl.appendChild(item);
  });
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

function shuffleTracks() {
  const currentSearch = searchEl.value.trim();
  const baseTracks = filterTracks(allTracks, currentSearch);
  visibleTracks = shuffleArray(baseTracks);
  currentTrackIndex = -1;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  updateNowPlaying(null);
  renderTracks(visibleTracks);
}

playBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrev);
shuffleBtn.addEventListener("click", shuffleTracks);

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
  visibleTracks = filterTracks(allTracks, searchEl.value);
  currentTrackIndex = -1;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  updateNowPlaying(null);
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
