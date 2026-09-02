// trending.js
let trendingSongs = [];
let currentSongIndex = 0;
let groupSongs = [];
let groupCurrentIndex = 0;
const audio = document.getElementById('audio');

function formatTime(seconds) {
  let min = Math.floor(seconds / 60);
  let sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

window.onload = async function () {
  let data = { songs: [] };
  try {
    const res = await fetch("songs.json");
    if (!res.ok) throw new Error("File not found or inaccessible");
    data = await res.json();
  } catch (err) {
    document.getElementById("trending-body").innerHTML = `<tr><td colspan='4' style='color:red;text-align:center;'>Failed to load songs: ${err.message}</td></tr>`;
    return;
  }
  trendingSongs = data.songs.filter(song => {
    if (!song.hashtags) return false;
    if (Array.isArray(song.hashtags)) return song.hashtags.map(h=>h.toLowerCase()).includes("trending");
    return typeof song.hashtags === "string" && song.hashtags.toLowerCase().includes("trending");
  });
  renderTrendingTable();
};

function renderTrendingTable() {
  const tbody = document.getElementById("trending-body");
  tbody.innerHTML = "";
  trendingSongs.forEach((song, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="song-info">
          <img src="${song.cover || 'images/default.jpg'}" alt="${song.title}" class="song-cover" width="50" height="50" style="border-radius:6px; margin-right:6px;">
          <div>
            <span class="song-title">${song.title}</span><br>
            <span class="song-artist">${song.artist}</span>
          </div>
        </div>
      </td>
      <td>${song.album || ''}</td>
      <td>${formatTime(song.duration)}</td>
      <td><button class="song-options-btn"><i class="bi bi-three-dots"></i></button></td>
    `;
    row.addEventListener("click", (e) => {
      if (!e.target.closest('.song-options-btn')) {
        currentSongIndex = index;
        loadSong(currentSongIndex);
        audio.play();
        updatePlayPauseUI(true);
      }
    });
    // Options button logic
    const optionsBtn = row.querySelector('.song-options-btn');
    if (optionsBtn) {
      optionsBtn.onclick = function(ev) {
        ev.stopPropagation();
        // Hide any open popups first
        hideAllPopups();
        // Position menu directly below the button
        const rect = optionsBtn.getBoundingClientRect();
        // Show menu to the left of the button
        showSongContextMenu({
          clientX: rect.left + window.scrollX - 180, // 180px width of menu
          clientY: rect.bottom + window.scrollY + 4
        }, song, index);
      };
    }
    tbody.appendChild(row);
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
      let suggestions = getRandomItems(trendingSongs, 6);
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
          playSongInGroup(groupSongs[groupCurrentIndex]);
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
      <div class="context-menu-option" data-action="like">Save to Liked Songs</div>
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
      } else if (action === 'queue') {
        let queue = JSON.parse(localStorage.getItem('songQueue') || '[]');
        queue.push(JSON.parse(JSON.stringify(song)));
        localStorage.setItem('songQueue', JSON.stringify(queue));
        alert('Added to queue: ' + song.title);
        contextMenu.style.display = 'none';
      } else if (action === 'like') {
        let liked = JSON.parse(localStorage.getItem('likedSongs') || '[]');
        if (!liked.some(s => s.title === song.title && s.artist === song.artist)) {
          liked.push(JSON.parse(JSON.stringify(song)));
          localStorage.setItem('likedSongs', JSON.stringify(liked));
          alert('Saved to Liked Songs: ' + song.title);
        } else {
          alert('Song already in Liked Songs!');
        }
        contextMenu.style.display = 'none';
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
}

// DOM elements
// --- PlayGroup logic for 'You Might Like' cards ---
function playSongInGroup(song) {
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
    'new/' + srcRaw,
    'new/' + srcDecoded,
    'music/' + srcRaw,
    'music/' + srcDecoded,
    srcRaw,
    srcDecoded
  ]);
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
  };
  updatePlayPauseUI(true);
}
const nowCover = document.getElementById("now-cover");
const nowTitle = document.getElementById("now-title");
const nowArtist = document.getElementById("now-artist");
const volumeBar = document.getElementById("volume-bar");
const seekBar = document.getElementById("seek-bar");
const currentTimeEl = document.getElementById("current-time");
const totalTimeEl = document.getElementById("total-time");
const playPauseBtn = document.getElementById("play-pause");

function loadSong(index) {
  if (index < 0) index = trendingSongs.length - 1;
  if (index >= trendingSongs.length) index = 0;
  currentSongIndex = index;
  const song = trendingSongs[currentSongIndex];
  if (!song) return;
  // Robust fallback logic for audio src
  var srcRaw = song.file || song.path || song.url || '';
  if (!srcRaw) srcRaw = song.title + '.mp3';
  var srcDecoded = srcRaw;
  try {
    srcDecoded = decodeURIComponent(srcRaw);
  } catch (e) {
    console.warn('Failed to decode file path:', srcRaw, e);
  }
  function trySetSrc(paths) {
    let idx = 0;
    function tryNext() {
      if (idx >= paths.length) {
        console.error('All attempts to load audio src failed:', paths);
        return;
      }
      const path = paths[idx++];
      console.log('Trying audio src:', path);
      if (!audio) {
        console.error('Audio element is null when trying to set src:', path);
        return;
      }
      audio.src = path;
      audio.onerror = tryNext;
      audio.currentTime = 0;
      audio.play().catch(err => {
        console.error('Audio play() failed:', err);
      });
    }
    tryNext();
  }
  trySetSrc([
    'new/' + srcRaw,
    'new/' + srcDecoded,
    'music/' + srcRaw,
    'music/' + srcDecoded,
    srcRaw,
    srcDecoded
  ]);
  nowCover.src = song.cover || 'images/default.jpg';
  nowTitle.textContent = song.title;
  nowArtist.textContent = song.artist;
  // Set up metadata and time update listeners
  audio.onloadedmetadata = () => {
    totalTimeEl.textContent = formatTime(audio.duration);
    seekBar.max = Math.floor(audio.duration);
  };
  audio.ontimeupdate = () => {
    seekBar.value = Math.floor(audio.currentTime);
    currentTimeEl.textContent = formatTime(audio.currentTime);
  };
}

function updatePlayPauseUI(isPlaying) {
  if (isPlaying) {
    playPauseBtn.classList.remove("bi-play-circle-fill");
    playPauseBtn.classList.add("bi-pause-circle-fill");
  } else {
    playPauseBtn.classList.remove("bi-pause-circle-fill");
    playPauseBtn.classList.add("bi-play-circle-fill");
  }
}

// Controls
playPauseBtn.onclick = function () {
  if (audio.paused) {
    audio.play();
    updatePlayPauseUI(true);
  } else {
    audio.pause();
    updatePlayPauseUI(false);
  }
};
seekBar.oninput = function () {
  audio.currentTime = seekBar.value;
};
volumeBar.oninput = function () {
  audio.volume = volumeBar.value;
};

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

// Next/Prev/Loop controls
document.getElementById('next').onclick = function () {
  // If playing from group, advance in group
  if (Array.isArray(groupSongs) && groupSongs.length > 0) {
    groupCurrentIndex = (groupCurrentIndex + 1) % groupSongs.length;
    playSongInGroup(groupSongs[groupCurrentIndex]);
    return;
  }
  loadSong(currentSongIndex + 1);
  audio.play();
  updatePlayPauseUI(true);
};
document.getElementById('prev').onclick = function () {
  if (Array.isArray(groupSongs) && groupSongs.length > 0) {
    groupCurrentIndex = (groupCurrentIndex - 1 + groupSongs.length) % groupSongs.length;
    playSongInGroup(groupSongs[groupCurrentIndex]);
    return;
  }
  loadSong(currentSongIndex - 1);
  audio.play();
  updatePlayPauseUI(true);
};
let loopMode = 'none';
document.getElementById('loop').onclick = function () {
  if (loopMode === 'none') {
    loopMode = 'all';
    this.className = 'bi bi-repeat';
    audio.loop = false;
  } else if (loopMode === 'all') {
    loopMode = 'one';
    this.className = 'bi bi-repeat-1';
    audio.loop = true;
  } else {
    loopMode = 'none';
    this.className = 'bi bi-repeat';
    audio.loop = false;
  }
};

// Handle song end (auto next)
audio.onended = function () {
  if (Array.isArray(groupSongs) && groupSongs.length > 0) {
    if (loopMode === 'one') {
      playSongInGroup(groupSongs[groupCurrentIndex]);
    } else {
      groupCurrentIndex = (groupCurrentIndex + 1) % groupSongs.length;
      playSongInGroup(groupSongs[groupCurrentIndex]);
    }
    return;
  }
  if (loopMode === 'one') {
    loadSong(currentSongIndex);
    audio.play();
    updatePlayPauseUI(true);
  } else if (loopMode === 'all') {
    loadSong(currentSongIndex + 1);
    audio.play();
    updatePlayPauseUI(true);
  } else {
    if (currentSongIndex < trendingSongs.length - 1) {
      loadSong(currentSongIndex + 1);
      audio.play();
      updatePlayPauseUI(true);
    } else {
      audio.pause();
      updatePlayPauseUI(false);
    }
  }
};
