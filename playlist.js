// Global variables
let songs = [];
let currentSongIndex = 0;
const audio = document.getElementById('audio'); // Use persistent audio element


// Utility: format seconds to mm:ss  
function formatTime(seconds) {
  let min = Math.floor(seconds / 60);
  let sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

window.onload = async function () {
  const filter = localStorage.getItem("filter");
  const filterType = localStorage.getItem("filterType");

  // Set title
  const playlistTitleEl = document.getElementById("playlist-title");
if (playlistTitleEl) {
  playlistTitleEl.innerText =
    filterType === "artist" ? `${filter} Songs` : `${filter} Playlist`;
}

  // Load songs with error handling
  let data = { songs: [] };
  try {
    const res = await fetch("songs.json");
    if (!res.ok) throw new Error("File not found or inaccessible");
    data = await res.json();
  } catch (err) {
    const playlistBody = document.getElementById("playlist-body");
    playlistBody.innerHTML = `<tr><td colspan='4' style='color:red;text-align:center;'>Failed to load songs: ${err.message}</td></tr>`;
    return;
  }

  songs = data.songs; // assign to global
  if (filter && filterType) {
    const filterValue = filter.trim().toLowerCase();
    songs = songs.filter(song => {
      if (filterType === "mood") {
        // Support both string and array for song.mood
        if (Array.isArray(song.mood)) {
          return song.mood.map(m => m && m.toString().trim().toLowerCase()).includes(filterValue);
        } else if (typeof song.mood === "string") {
          return song.mood.trim().toLowerCase() === filterValue;
        }
        return false;
      } else if (filterType === "artist") {
  if (Array.isArray(song.artist)) {
    // If artist is an array → normalize to lowercase & compare
    return song.artist.map(a => a.trim().toLowerCase()).includes(filterValue);
  } else if (typeof song.artist === "string") {
    // If artist is a string → split by comma in case multiple names are stored
    return song.artist.split(',').map(a => a.trim().toLowerCase()).includes(filterValue);
  }
  return false;
}
 else if (filterType === "album") {
        return song.album && song.album.trim().toLowerCase() === filterValue;
      }
      return true;
    });
  }


  // Populate table
  const playlistBody = document.getElementById("playlist-body");
  playlistBody.innerHTML = "";
  console.log("Songs to render in playlist page:", songs);

  songs.forEach((song, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="song-info">
          <img src="${song.cover}" alt="${song.title}" class="song-cover" width="50" height="50" style="border-radius:6px; margin-right:6px;">
          <div>
            <span class="song-title">${song.title}</span><br>
            <span class="song-artist">${song.artist}</span>
          </div>
        </div>  
      </td>
      <td>${song.album}</td>
      <td>${formatTime(song.duration)}</td>
      <td><button class="song-options-btn"><i class="bi bi-three-dots"></i></button></td>
    `;
    row.addEventListener("click", (e) => {
      // Only play if not clicking options
      if (!e.target.closest('.song-options-btn')) {
          // Play from playlist table: set groupSongs and groupCurrentIndex for navigation
          groupSongs = songs;
          groupCurrentIndex = index;
          playSongInPlayer(groupSongs[groupCurrentIndex]);
      }
    });
    // Options button logic
    const optionsBtn = row.querySelector('.song-options-btn');
    if (optionsBtn) {
      optionsBtn.onclick = function(ev) {
        ev.stopPropagation();
        hideAllPopups();
        const rect = optionsBtn.getBoundingClientRect();
        // Show menu to the left of the button
        showSongContextMenu({
          clientX: rect.left + window.scrollX - 180, // 180px width of menu
          clientY: rect.bottom + window.scrollY + 4
        }, song, index);
      };
    }
    playlistBody.appendChild(row);
  });
  
    // --- YOU MIGHT LIKE SECTION ---
    function getRandomItems(arr, count, excludeFn) {
      const filtered = excludeFn ? arr.filter(item => !excludeFn(item)) : arr.slice();
      const result = [];
      const used = new Set();
      while (result.length < count && filtered.length > 0) {
        const idx = Math.floor(Math.random() * filtered.length);
        if (!used.has(idx)) {
          result.push(filtered[idx]);
          used.add(idx);
        }
      }
      return result;
    }
    function renderYouMightLike() {
      const container = document.getElementById('you-might-like-section');
      if (!container) return;
      let suggestions = getRandomItems(data.songs, 6, s => filterType === 'album' ? s.album === filter : filterType === 'artist' ? (typeof s.artist === 'string' && s.artist.split(',').map(a => a.trim().toLowerCase()).includes(filterValue)) : false);
      container.innerHTML = `<h3 style='margin-bottom:12px;'>You Might Like</h3><div class='you-might-like-list'>${suggestions.map((song, idx) => `
        <div class='card you-might-like-card' style='position:relative;'>
          <img src='${song.cover || 'images/default.jpg'}' alt='${song.title}' style='width:100%;height:100px;object-fit:cover;border-radius:8px;'>
          <button class='play-btn' style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:none;border:none;padding:0;z-index:2;'><i class='bi bi-play-circle-fill' style='font-size:32px;color:#1db954;'></i></button>
          <p style='margin:8px 0 4px 0;font-weight:bold;'>${song.title}</p>
          <span style='font-size:12px;color:gray;'>${song.artist || ''}</span>
        </div>
      `).join('')}</div>`;
      Array.from(container.getElementsByClassName('play-btn')).forEach((btn, idx) => {
        btn.onclick = (e) => {
          e.stopPropagation();
            // Play from 'You Might Like' group: set groupSongs and groupCurrentIndex for navigation
            groupSongs = suggestions;
            groupCurrentIndex = idx;
            playSongInPlayer(groupSongs[groupCurrentIndex]);
            // Add remaining songs to queue
            const remaining = suggestions.slice(idx + 1);
            if (remaining.length) {
              let queue = getQueue();
              remaining.forEach(song => {
                queue.push({
                  title: song.title,
                  artist: song.artist,
                  album: song.album,
                  cover: song.cover,
                  duration: song.duration,
                  file: song.file
                });
              });
              saveQueue(queue);
              renderQueueSidebar && renderQueueSidebar();
            }
        };
      });
    }
    renderYouMightLike();

  // Context menu logic
  const contextMenu = document.getElementById('song-context-menu');
  function showSongContextMenu(ev, song, idx) {
    contextMenu.innerHTML = `
      <div class="context-menu-option" data-action="add-playlist">Add to playlist</div>
      <div class="context-menu-option" data-action="queue">Add to queue</div>
      <div class="context-menu-option" data-action="artist">Go to artist</div>
      <div class="context-menu-option" data-action="album">Go to album</div>
    `;
    contextMenu.style.display = 'block';
  contextMenu.style.left = ev.clientX + 'px';
  contextMenu.style.top = ev.clientY + 'px';
    // Handle actions
    contextMenu.onclick = function(e) {
      e.stopPropagation();
      const action = e.target.getAttribute('data-action');
      if (!action) return;
      if (action === 'add-playlist') {
        // Show playlist popup to the left of context menu
        showPlaylistPopup(ev.clientX - 180, ev.clientY, song);
        contextMenu.style.display = 'none';
      }  else if (action === 'queue') {
  addToQueue(song);   // ✅ use new function
  contextMenu.style.display = 'none';
}

       else if (action === 'artist') {
        localStorage.setItem('filter', song.artist);
        localStorage.setItem('filterType', 'artist');
        window.location.href = 'playlist.html';
      } else if (action === 'album') {
        localStorage.setItem('filter', song.album);
        localStorage.setItem('filterType', 'album');
        window.location.href = 'playlist.html';
      }
    };
  }

  // Hide all popups
  function hideAllPopups() {
    contextMenu.style.display = 'none';
    let playlistPopup = document.getElementById('playlist-popup');
    if (playlistPopup) playlistPopup.style.display = 'none';
  }

  // Playlist popup logic
  function showPlaylistPopup(x, y, song) {
    let playlistPopup = document.getElementById('playlist-popup');
    if (!playlistPopup) {
      playlistPopup = document.createElement('div');
      playlistPopup.id = 'playlist-popup';
      playlistPopup.className = 'playlist-popup';
      playlistPopup.style.display = 'none';
      playlistPopup.style.position = 'absolute';
      playlistPopup.style.zIndex = 1100;
      document.body.appendChild(playlistPopup);
    }
    function getPlaylists() {
      return JSON.parse(localStorage.getItem('userPlaylists') || '[]');
    }
    function savePlaylists(playlists) {
      localStorage.setItem('userPlaylists', JSON.stringify(playlists));
    }
    const playlists = getPlaylists();
    playlistPopup.innerHTML = `
      <div class="playlist-popup-header">
        <input id="playlist-search" type="text" placeholder="Find a playlist" style="width:90%;margin:8px 5%;padding:6px;border-radius:6px;border:none;outline:none;">
      </div>
      <div class="playlist-popup-option" data-action="new">+ New playlist</div>
      ${playlists.map((pl, i) => `<div class="playlist-popup-option" data-action="add" data-idx="${i}">${pl.name}</div>`).join('')}
    `;
    playlistPopup.style.display = 'block';
    playlistPopup.style.left = x + 'px';
    playlistPopup.style.top = y + 'px';
    // Search filter
    playlistPopup.querySelector('#playlist-search').oninput = function() {
      const val = this.value.toLowerCase();
      Array.from(playlistPopup.getElementsByClassName('playlist-popup-option')).forEach(opt => {
        if (opt.dataset.action === 'add') {
          opt.style.display = opt.textContent.toLowerCase().includes(val) ? '' : 'none';
        }
      });
    };
    // Option click
    Array.from(playlistPopup.getElementsByClassName('playlist-popup-option')).forEach(opt => {
      opt.onclick = function(e) {
        e.stopPropagation();
        if (opt.dataset.action === 'new') {
          const name = prompt('Enter playlist name:');
          if (name) {
            playlists.push({ name, songs: [JSON.parse(JSON.stringify(song))] });
            savePlaylists(playlists);
            alert('Playlist created and song added!');
            playlistPopup.style.display = 'none';
          }
        } else if (opt.dataset.action === 'add') {
          const idx = parseInt(opt.dataset.idx);
          if (!Array.isArray(playlists[idx].songs)) playlists[idx].songs = [];
          if (!playlists[idx].songs.some(s => s.title === song.title && s.artist === song.artist)) {
            playlists[idx].songs.push(JSON.parse(JSON.stringify(song)));
            savePlaylists(playlists);
            alert('Song added to playlist!');
          } else {
            alert('Song already in playlist!');
          }
          playlistPopup.style.display = 'none';
        }
      };
    });
  }

  // Hide popups on outside click or scroll
  document.addEventListener('click', hideAllPopups);
  window.addEventListener('scroll', hideAllPopups);

    // Init audio (do not recreate here)
};

// DOM elements
const nowCover = document.getElementById("now-cover");
const nowTitle = document.getElementById("now-title");
const nowArtist = document.getElementById("now-artist");
const volumeBar = document.getElementById("volume-bar");
const seekBar = document.getElementById("seek-bar");
const currentTimeEl = document.getElementById("current-time");
const totalTimeEl = document.getElementById("total-time");
const playPauseBtn = document.getElementById("play-pause");

// --- Persistent Audio Player Logic ---
// --- PlayGroup and PlaySongInPlayer for card playback ---
let groupSongs = [];
let groupCurrentIndex = 0;
function playGroup(songsArr, startIdx) {
  if (!Array.isArray(songsArr) || songsArr.length === 0) return;
  groupSongs = songsArr;
  groupCurrentIndex = startIdx || 0;
  playSongInPlayer(groupSongs[groupCurrentIndex]);
}

function playSongInPlayer(song) {
  if (!audio || !song) return;
  var srcRaw = song.file || song.path || song.url || '';
  if (!srcRaw) srcRaw = song.title + '.mp3';
  var srcDecoded = srcRaw;
  try {
    srcDecoded = decodeURIComponent(srcRaw);
  } catch (e) {
    console.warn('Failed to decode file path:', srcRaw, e);
  }
  // Prefer 320kbps/high-bitrate files if available
  function makeHighBitrateVariants(base) {
    let ext = base.endsWith('.mp3') ? '' : '.mp3';
    return [
      base.replace(/\.mp3$/i, ' 320kbps.mp3'),
      base.replace(/\.mp3$/i, ' [320kbps].mp3'),
      base.replace(/\.mp3$/i, ' high.mp3'),
      base.replace(/\.mp3$/i, ' [high].mp3'),
      base + ' 320kbps' + ext,
      base + ' [320kbps]' + ext,
      base + ' high' + ext,
      base + ' [high]' + ext
    ];
  }
  let highBitratePaths = [srcRaw, srcDecoded].flatMap(base => makeHighBitrateVariants(base));
  function trySetSrc(paths) {
    let idx = 0;
    function tryNext() {
      if (idx >= paths.length) {
        console.error('All attempts to load audio src failed:', paths);
        return;
      }
      const path = paths[idx++];
      console.log('Trying audio src:', path);
      audio.src = path;
      audio.onerror = tryNext;
      audio.currentTime = 0;
      // Always set event handlers after src change
      audio.onloadedmetadata = () => {
        totalTimeEl.textContent = formatTime(audio.duration);
        seekBar.max = Math.floor(audio.duration);
      };
      audio.ontimeupdate = () => {
        seekBar.value = Math.floor(audio.currentTime);
        currentTimeEl.textContent = formatTime(audio.currentTime);
        savePlayerState(song, audio.currentTime, !audio.paused);
      };
      audio.onpause = () => {
        savePlayerState(song, audio.currentTime, false);
      };
      audio.onplay = () => {
        savePlayerState(song, audio.currentTime, true);
      };
      audio.play().catch(err => {
        console.error('Audio play() failed:', err);
      });
    }
    tryNext();
  }
  trySetSrc([
    ...highBitratePaths.map(p => 'music/' + p),
    ...highBitratePaths.map(p => 'new/' + p),
    ...highBitratePaths,
    'music/' + srcRaw,
    'music/' + srcDecoded,
    'new/' + srcRaw,
    'new/' + srcDecoded,
    srcRaw,
    srcDecoded
  ]);
  // Update UI
  nowTitle.textContent = song.title;
  nowArtist.textContent = song.artist || '';
  nowCover.src = song.cover || 'images/default.jpg';
  savePlayerState(song, 0, true);
  updatePlayPauseUI(true);
}

audio.addEventListener('ended', () => {
  if (Array.isArray(groupSongs) && groupSongs.length > 1) {
    if (groupCurrentIndex < groupSongs.length - 1) {
      groupCurrentIndex++;
      playSongInPlayer(groupSongs[groupCurrentIndex]);
      return;
    }
  }
  updatePlayPauseUI(false);
});
function savePlayerState(song, currentTime, isPlaying) {
  localStorage.setItem('playerSong', JSON.stringify(song));
  localStorage.setItem('playerTime', currentTime);
  localStorage.setItem('playerIsPlaying', isPlaying ? '1' : '0');
}

function loadPlayerState() {
  const song = JSON.parse(localStorage.getItem('playerSong') || 'null');
  const time = parseFloat(localStorage.getItem('playerTime') || '0');
  const isPlaying = localStorage.getItem('playerIsPlaying') === '1';
  return { song, time, isPlaying };
}

// Load song + update UI
function loadSong(index) {
  if (index < 0) index = songs.length - 1;
  if (index >= songs.length) index = 0;
  currentSongIndex = index;
  const song = songs[currentSongIndex];
  if (!song) return;
  // Decode file name if URL-encoded
  let filePath = song.file;
  try {
    filePath = decodeURIComponent(filePath);
  } catch (e) {}
  audio.src = filePath;
  nowCover.src = song.cover || 'images/default.jpg';
  nowTitle.textContent = song.title;
  nowArtist.textContent = song.artist;
  audio.onloadedmetadata = () => {
    totalTimeEl.textContent = formatTime(audio.duration);
    seekBar.max = Math.floor(audio.duration);
  };
  audio.ontimeupdate = () => {
    seekBar.value = Math.floor(audio.currentTime);
    currentTimeEl.textContent = formatTime(audio.currentTime);
    savePlayerState(song, audio.currentTime, !audio.paused);
  };
  audio.onpause = () => {
    savePlayerState(song, audio.currentTime, false);
  };
  audio.onplay = () => {
    savePlayerState(song, audio.currentTime, true);
  };
}

// Seek bar control
seekBar.addEventListener("input", () => {
  audio.currentTime = seekBar.value;
});

// Volume control
volumeBar.addEventListener("input", () => {
  audio.volume = volumeBar.value;
});

// Play/Pause toggle
playPauseBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
    updatePlayPauseUI(true);
  } else {
    audio.pause();
    updatePlayPauseUI(false);
  }
});

// Loop toggle
let loopMode = "none"; // none | all | one
document.getElementById("loop").addEventListener("click", () => {
  if (loopMode === "none") {
    loopMode = "all";
    document.getElementById("loop").className = "bi bi-repeat";
    audio.loop = false;
  } else if (loopMode === "all") {
    loopMode = "one";
    document.getElementById("loop").className = "bi bi-repeat-1";
    audio.loop = true;
  } else {
    loopMode = "none";
    document.getElementById("loop").className = "bi bi-repeat";
    audio.loop = false;
  }
});

// Next button
// ✅ Final Next Button Logic (Queue → Playlist fallback)
document.getElementById("next").addEventListener("click", () => {
  // Try queue first
  if (playNextFromQueue()) {
    return; // a queued song started playing
  }
  // Otherwise, advance in current group (playlist or 'You Might Like')
  if (Array.isArray(groupSongs) && groupSongs.length > 0) {
    groupCurrentIndex = (groupCurrentIndex + 1) % groupSongs.length;
    playSongInPlayer(groupSongs[groupCurrentIndex]);
    return;
  }
  // Fallback to playlist order
  loadSong(currentSongIndex + 1);
  audio.play();
  updatePlayPauseUI(true);
});

// Previous button
document.getElementById("prev").addEventListener("click", () => {
  if (Array.isArray(groupSongs) && groupSongs.length > 0) {
    groupCurrentIndex = (groupCurrentIndex - 1 + groupSongs.length) % groupSongs.length;
    playSongInPlayer(groupSongs[groupCurrentIndex]);
    return;
  }
  loadSong(currentSongIndex - 1);
  audio.play();
  updatePlayPauseUI(true);
});

// Handle song end → play next
// ✅ QUEUE PRIORITY END LOGIC
audio.addEventListener("ended", () => {
  // 1. First try queue
  if (playNextFromQueue()) return;

  // 2. Fallback → playlist/loop
  if (loopMode === "one") {
    loadSong(currentSongIndex);
  } else if (loopMode === "all") {
    loadSong(currentSongIndex + 1);
  } else if (currentSongIndex < songs.length - 1) {
    loadSong(currentSongIndex + 1);
  } else {
    // reached end, stop
    audio.pause();
    updatePlayPauseUI(false);
    return;
  }

  audio.play().catch(err => console.warn("Autoplay blocked:", err));
  updatePlayPauseUI(true);
});

// --- Take next song from queue if available ---
function playNextFromQueue() {
  let queue = getQueue();
  if (queue.length > 0) {
    const nextSong = queue.shift(); // remove first song
    saveQueue(queue);
    playFromQueueSong(nextSong); // play queued song
    return true; // handled by queue
  }
  return false; // no queue → let playlist continue
}


// ✅ helper to update play/pause button icon
function updatePlayPauseUI(isPlaying) {
  if (isPlaying) {
    playPauseBtn.className = "bi bi-pause-circle-fill";
  } else {
    playPauseBtn.className = "bi bi-play-circle-fill";
  }
}

// Autoplay if triggered (DISABLED: always require user click to play)
const autoplay = localStorage.getItem("autoplay");
if (autoplay === "true" && songs.length > 0) {
  currentSongIndex = 0;
  loadSong(currentSongIndex);
  // Do NOT autoplay
  updatePlayPauseUI(false);
  localStorage.setItem("autoplay", "false"); // reset
}

// On page load, restore player state
window.addEventListener('DOMContentLoaded', () => {
  if (!audio) return;
  const { song, time } = loadPlayerState();
  if (song && song.file) {
    audio.src = song.file;
    audio.currentTime = time || 0;
    nowCover.src = song.cover || 'images/default.jpg';
    nowTitle.textContent = song.title;
    nowArtist.textContent = song.artist || '';
    // Do NOT autoplay
    updatePlayPauseUI(false);
  }
});

// --- Queue Logic ---  ✅ QUEUE ADDED
// --- Queue Logic ---
function getQueue() {
  return JSON.parse(localStorage.getItem('songQueue') || '[]');
}

function saveQueue(queue) {
  localStorage.setItem('songQueue', JSON.stringify(queue));
}

// Add song to queue
function addToQueue(song) {
  let queue = getQueue();

  // Make sure to copy ALL properties (including .file)
  const fullSong = {
    title: song.title,
    artist: song.artist,
    album: song.album,
    cover: song.cover,
    duration: song.duration,
    file: song.file   // ✅ ensure file is saved
  };

  queue.push(fullSong);
  saveQueue(queue);
  alert("Added to queue: " + song.title);
}



// --- Play from Queue (fixed, single definition) ---
function playFromQueueSong(song) {
  if (!song || !song.file) {
    console.error("Invalid song in queue:", song);
    return;
  }

  window.currentSong = song;
  // Decode file name if URL-encoded
  let filePath = song.file;
  try {
    filePath = decodeURIComponent(filePath);
  } catch (e) {}
  audio.src = filePath;
  nowCover.src = song.cover || 'images/default.jpg';
  nowTitle.textContent = song.title;
  nowArtist.textContent = song.artist || '';

  audio.onloadedmetadata = () => {
    totalTimeEl.textContent = formatTime(audio.duration);
    seekBar.max = Math.floor(audio.duration);
  };

  audio.ontimeupdate = () => {
    seekBar.value = Math.floor(audio.currentTime);
    currentTimeEl.textContent = formatTime(audio.currentTime);
    savePlayerState(song, audio.currentTime, !audio.paused);
  };

  audio.play();
  updatePlayPauseUI(true);
  renderQueueSidebar(); // refresh queue sidebar
}


// Keyboard shortcuts for player controls
document.addEventListener('keydown', function(e) {
  // Space or Enter: Play/Pause
  if ((e.code === 'Space' || e.code === 'Enter') && !e.shiftKey) {
    e.preventDefault();
    playPauseBtn.click();
  }
  // Shift+N or Shift+ArrowRight: Next song
  if ((e.shiftKey && (e.code === 'KeyN' || e.code === 'ArrowRight'))) {
    e.preventDefault();
    document.getElementById('next').click();
  }
  // Shift+ArrowLeft: Previous song
  if (e.shiftKey && e.code === 'ArrowLeft') {
    e.preventDefault();
    document.getElementById('prev').click();
  }
  // J: Loop off
  if (e.code === 'KeyJ' && !e.shiftKey) {
    loopMode = 'none';
    document.getElementById('loop').className = 'bi bi-repeat';
    audio.loop = false;
  }
  // K: Loop all
  if (e.code === 'KeyK' && !e.shiftKey) {
    loopMode = 'all';
    document.getElementById('loop').className = 'bi bi-repeat';
    audio.loop = false;
  }
  // L: Loop one
  if (e.code === 'KeyL' && !e.shiftKey) {
    loopMode = 'one';
    document.getElementById('loop').className = 'bi bi-repeat-1';
    audio.loop = true;
  }
});




// --- Queue Sidebar Toggle ---
// --- Queue Sidebar Toggle ---
window.addEventListener("DOMContentLoaded", () => {
  const queueBtn = document.querySelector(".player-right .bi-list"); // list button
  const queueSidebar = document.querySelector(".spotify-queue");
  const closeBtn = queueSidebar.querySelector(".close-btn");

  if (queueBtn && queueSidebar) {
    queueSidebar.style.display = "none"; // hidden by default

    queueBtn.addEventListener("click", () => {
      const isVisible = queueSidebar.style.display === "block";

      if (isVisible) {
        queueSidebar.style.display = "none";
        queueBtn.style.color = "";
      } else {
        queueSidebar.style.display = "block";
        queueBtn.style.color = "orange";
        renderQueueSidebar(); // load queue
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        queueSidebar.style.display = "none";
        queueBtn.style.color = "";
      });
    }
  }
});

// --- Render queue into sidebar ---
function renderQueueSidebar() {
  const queueList = document.getElementById("queue-list");
  const nowPlayingDiv = document.querySelector(".queue-now");

  if (!queueList || !nowPlayingDiv) return;

  const queue = getQueue();

  // Show "Now Playing"
  if (window.currentSong) {
    nowPlayingDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${window.currentSong.cover}" width="50" height="50" style="border-radius:4px;">
        <div>
          <div style="font-weight:bold;">${window.currentSong.title}</div>
          <div style="font-size:12px; color:gray;">${window.currentSong.artist}</div>
        </div>
      </div>
    `;
  } else {
    nowPlayingDiv.textContent = "Now playing: none";
  }

  // Queue list (Up Next)
  if (queue.length === 0) {
    queueList.innerHTML = `<li style="padding:16px; color:gray;">Queue is empty</li>`;
    return;
  }

  queueList.innerHTML = queue.map((song, i) => `
  <li data-index="${i}">
    <img src="${song.cover}" alt="${song.title}">
    <div>
      <div style="font-weight:bold;">${song.title}</div>
      <div style="font-size:12px; color:gray;">${song.artist}</div>
    </div>
  </li>
`).join("");


  // Click → play from queue immediately
  queueList.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", () => {
      const index = parseInt(li.dataset.index, 10);
      let queue = getQueue();
      if (queue[index]) {
        const song = queue.splice(index, 1)[0];
        saveQueue(queue);
        playFromQueueSong(song);
        renderQueueSidebar();
      }
    });
  });
}



