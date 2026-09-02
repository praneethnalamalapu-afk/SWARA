
// --- Queue Logic ---
function getQueue() {
  return JSON.parse(localStorage.getItem('songQueue') || '[]');
}

function saveQueue(queue) {
  localStorage.setItem('songQueue', JSON.stringify(queue));
}

function renderQueueSidebar() {
  const queueSidebar = document.getElementById('queue-sidebar');
  const queueList = document.getElementById('queue-list');
  if (!queueSidebar || !queueList) return;
  const queue = getQueue();
  queueList.innerHTML = '';
  if (queue.length === 0) {
    queueList.innerHTML = '<div style="padding:16px;color:gray;">Queue is empty</div>';
    return;
  }
  queue.forEach((song, idx) => {
    queueList.innerHTML += `
      <div class="queue-row" data-queue-idx="${idx}">
        <img src="${song.cover || 'images/default.jpg'}" alt="${song.title}">
        <div class="queue-song-meta">
          <div class="queue-title-text">${song.title}</div>
          <div class="queue-artist-text">${song.artist || ''}</div>
        </div>
        <button class="queue-remove-btn"><i class="bi bi-dash-circle"></i></button>
      </div>
    `;
  });
  // Remove button logic
  queueList.querySelectorAll('.queue-remove-btn').forEach((btn, i) => {
    btn.onclick = function(e) {
      e.stopPropagation();
      let queue = getQueue();
      queue.splice(i, 1);
      saveQueue(queue);
      renderQueueSidebar();
    };
  });
  // Play from queue logic
  queueList.querySelectorAll('.queue-row').forEach(row => {
    row.onclick = function(e) {
      if (e.target.closest('.queue-remove-btn')) return;
      const idx = parseInt(row.getAttribute('data-queue-idx'));
      let queue = getQueue();
      if (queue[idx]) {
        const song = queue.splice(idx, 1)[0];
        saveQueue(queue);
        playSongInPlayer(song);
        renderQueueSidebar();
      }
    };
  });
}

// Use the player-right .bi-list icon for toggling the queue sidebar
document.querySelector('.player-right .bi-list').onclick = function() {
  const sidebar = document.getElementById('queue-sidebar');
  const isVisible = sidebar.classList.contains('visible');
  if (isVisible) {
    sidebar.classList.remove('visible');
  } else {
    sidebar.classList.add('visible');
    renderQueueSidebar();
  }
};
document.querySelector('#queue-sidebar .close-btn').onclick = function() {
  document.getElementById('queue-sidebar').classList.remove('visible');
};
// musiclibrary.js
// Detect mode (artist or album) from query param
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

const grid = document.getElementById('library-grid');
const title = document.getElementById('library-title');
let mode = getQueryParam('type') || 'artist';

// Fetch songs.json and render cards
var allSongs = [];
fetch('songs.json').then(res => res.json()).then(data => {
  const songs = Array.isArray(data.songs) ? data.songs : [];
  allSongs = songs; // Make songs available globally for search
  let items = [];
  if (mode === 'artist') {
    // Unique artists
    const allArtists = songs.flatMap(s => {
      if (typeof s.artist === 'string') return s.artist.split(',').map(a => a.trim());
      if (Array.isArray(s.artist)) return s.artist;
      return [];
    }).filter(Boolean);
    const uniqueArtists = [...new Set(allArtists)];
    items = uniqueArtists.map(artist => {
      // Find a song for cover
      const song = songs.find(s => (typeof s.artist === 'string' && s.artist.split(',').map(a => a.trim()).includes(artist)) || (Array.isArray(s.artist) && s.artist.includes(artist)));
      return {
        title: artist,
        cover: song ? (song.artistImg || song.cover || 'images/default.jpg') : 'images/default.jpg',
        meta: 'Artist',
        type: 'artist'
      };
    });
    title.textContent = 'Artists';
  } else {
    // Unique albums
    const uniqueAlbums = [...new Set(songs.map(s => s.album).filter(Boolean))];
    items = uniqueAlbums.map(album => {
      const song = songs.find(s => s.album === album);
      return {
        title: album,
        cover: song ? (song.cover || 'images/default.jpg') : 'images/default.jpg',
        meta: 'Album',
        type: 'album'
      };
    });
    title.textContent = 'Albums';
  }
  // Render cards
  grid.innerHTML = items.map(item => `
    <div class="library-card" data-title="${encodeURIComponent(item.title)}" data-type="${item.type}">
      <img src="${item.cover}" alt="${item.title}">
      <button class="play-btn"><i class="bi bi-play-circle-fill"></i></button>
      <div class="card-title">${item.title}</div>
      <div class="card-meta">${item.meta}</div>
    </div>
  `).join('');

  // Play button logic
    Array.from(document.getElementsByClassName('play-btn')).forEach(btn => {
      btn.onclick = function(e) {
        e.stopPropagation();
        const card = btn.closest('.library-card');
        const type = card.getAttribute('data-type');
        const title = decodeURIComponent(card.getAttribute('data-title'));
        let playSongs = [];
        if (type === 'artist') {
          playSongs = songs.filter(s => {
            if (typeof s.artist === 'string') return s.artist.split(',').map(a => a.trim()).includes(title);
            if (Array.isArray(s.artist)) return s.artist.includes(title);
            return false;
          });
        } else {
          playSongs = songs.filter(s => s.album === title);
        }
        playGroup(playSongs, 0);
      };
    });

  // Card click logic: open playlist page for that artist/album
  Array.from(document.getElementsByClassName('library-card')).forEach(card => {
    card.onclick = function(e) {
      const type = card.getAttribute('data-type');
      const title = decodeURIComponent(card.getAttribute('data-title'));
      if (type === 'artist') {
        localStorage.setItem('filter', title);
        localStorage.setItem('filterType', 'artist');
        window.location.href = 'playlist.html';
      } else {
        localStorage.setItem('filter', title);
        localStorage.setItem('filterType', 'album');
        window.location.href = 'playlist.html';
      }
    };
  });
});

// --- Player Logic (copied from playlist.js, simplified) ---
let groupSongs = [];
let groupCurrentIndex = 0;
const audio = document.getElementById('audio');
const nowCover = document.getElementById('now-cover');
const nowTitle = document.getElementById('now-title');
const nowArtist = document.getElementById('now-artist');
const volumeBar = document.getElementById('volume-bar');
const seekBar = document.getElementById('seek-bar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const playPauseBtn = document.getElementById('play-pause');
let loopMode = 'none';

function formatTime(seconds) {
  let min = Math.floor(seconds / 60);
  let sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

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

function updatePlayPauseUI(isPlaying) {
  if (isPlaying) {
    playPauseBtn.className = 'bi bi-pause-circle-fill';
  } else {
    playPauseBtn.className = 'bi bi-play-circle-fill';
  }
}

playPauseBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    updatePlayPauseUI(true);
  } else {
    audio.pause();
    updatePlayPauseUI(false);
  }
});

seekBar.addEventListener('input', () => {
  audio.currentTime = seekBar.value;
});

volumeBar.addEventListener('input', () => {
  audio.volume = volumeBar.value;
});

audio.onloadedmetadata = () => {
  totalTimeEl.textContent = formatTime(audio.duration);
  seekBar.max = Math.floor(audio.duration);
};
audio.ontimeupdate = () => {
  seekBar.value = Math.floor(audio.currentTime);
  currentTimeEl.textContent = formatTime(audio.currentTime);
};

document.getElementById('next').addEventListener('click', () => {
  if (Array.isArray(groupSongs) && groupSongs.length > 0) {
    groupCurrentIndex = (groupCurrentIndex + 1) % groupSongs.length;
    playSongInPlayer(groupSongs[groupCurrentIndex]);
    return;
  }
});
document.getElementById('prev').addEventListener('click', () => {
  if (Array.isArray(groupSongs) && groupSongs.length > 0) {
    groupCurrentIndex = (groupCurrentIndex - 1 + groupSongs.length) % groupSongs.length;
    playSongInPlayer(groupSongs[groupCurrentIndex]);
    return;
  }
});
document.getElementById('loop').addEventListener('click', () => {
  if (loopMode === 'none') {
    loopMode = 'all';
    document.getElementById('loop').className = 'bi bi-repeat';
    audio.loop = false;
  } else if (loopMode === 'all') {
    loopMode = 'one';
    document.getElementById('loop').className = 'bi bi-repeat-1';
    audio.loop = true;
  } else {
    loopMode = 'none';
    document.getElementById('loop').className = 'bi bi-repeat';
    audio.loop = false;
  }
});

document.addEventListener('keydown', function(e) {
  // Space or Enter: Play/Pause
  if ((e.code === 'Space') && !e.shiftKey) {
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

window.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('search-bar');
  const searchResultsContainer = document.getElementById('search-results-container');
    // let results = []; // results can be local to renderSearchResults or searchInput event

    if (searchInput) {
        let searchPlayJustClicked = false;
        let contextMenuJustOpened = false;
        let playlistPopupJustOpened = false;

        // Function to perform the search
        function doSearch(q, songsData) { // Accept query and songs data as arguments
            if (!songsData || !Array.isArray(songsData)) {
                searchResultsContainer.innerHTML = '<div style="padding:24px;color:red;text-align:center;">No songs data available.</div>';
                return [];
            }

            const filteredResults = songsData.filter(song => {
                const title = (song.title || "").toString().toLowerCase();
                // Ensure artist is handled correctly for both string and array
                const artist = Array.isArray(song.artist)
                    ? song.artist.join(", ").toLowerCase()
                    : (song.artist || "").toString().toLowerCase();
                const album = (song.album || "").toString().toLowerCase();
                return (
                    title.includes(q) ||
                    artist.includes(q) ||
                    album.includes(q)
                );
            });
            renderSearchResults(filteredResults);
            return filteredResults; // Return results if needed elsewhere
        }

        searchInput.addEventListener('input', function () {
            const q = searchInput.value.trim().toLowerCase();
            if (!q) {
                searchResultsContainer.innerHTML = '';
                return;
            }

            // Use the globally available allSongs variable
            if (allSongs.length > 0) {
                doSearch(q, allSongs);
            } else {
                // If allSongs is still empty (e.g., songs.json failed to load or is slow),
                // you might want to display a message or re-fetch (less ideal)
                searchResultsContainer.innerHTML = '<div style="padding:24px;color:gray;text-align:center;">Loading songs for search...</div>';
                // You could add a mechanism here to re-attempt loading songs.json
                // or just rely on the initial fetch to populate allSongs.
                // For simplicity, we'll assume the initial fetch usually succeeds.
            }
        });

        // ... (rest of your existing code for blur, mousedown events) ...
        searchInput.addEventListener('blur', function () {
            setTimeout(() => {
                if (!searchPlayJustClicked && !contextMenuJustOpened && !playlistPopupJustOpened) {
                    searchResultsContainer.innerHTML = '';
                }
                searchPlayJustClicked = false;
                contextMenuJustOpened = false;
                playlistPopupJustOpened = false;
            }, 200);
        });

        searchResultsContainer.addEventListener('mousedown', function (e) {
            if (e.target.classList.contains('song-result-play') || e.target.closest('.song-result-row')) { // Use closest for row click
                searchPlayJustClicked = true;

                // Handle playing the song from search results immediately
                const row = e.target.closest('.song-result-row');
                if (row) {
                    const idx = parseInt(row.getAttribute('data-idx'));
                    const currentSearchResults = doSearch(searchInput.value.trim().toLowerCase(), allSongs); // Re-evaluate to get current results array
                    if (currentSearchResults[idx]) {
                        playSongInPlayer(currentSearchResults[idx]);
                    }
                }
            }
            if (e.target.closest('.song-options-btn')) {
                contextMenuJustOpened = true;
            }
        });

        document.body.addEventListener('mousedown', function (e) {
            if (e.target.closest && e.target.closest('#playlist-popup')) {
                playlistPopupJustOpened = true;
            }
        });
    }

    function renderSearchResults(results) {
        if (!searchResultsContainer) return;
        if (results.length === 0) {
            searchResultsContainer.innerHTML = '<div style="padding:16px;color:gray;text-align:center;">No results found.</div>';
            return;
        }
    searchResultsContainer.innerHTML = `
      <div class="song-result-list">
        ${results.map((song, i) => `
          <div class="song-result-row" data-idx="${i}">
            <img class="song-result-img" src="${song.cover || 'images/default.jpg'}" alt="${song.title}">
            <div class="song-result-info" style="flex:1; display:flex; flex-direction:column;">
              <div class="song-result-title">${song.title}</div>
              <div class="song-result-artist">${song.artist || ''}</div>
            </div>
            <button class="song-result-play" style="margin-left:auto;"><i class="bi bi-play-circle-fill"></i></button>
          </div>
        `).join('')}
      </div>
    `;

        // Add event listener for playing songs from search results
        searchResultsContainer.querySelectorAll('.song-result-play').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent row click from firing twice
                const row = btn.closest('.song-result-row');
                const idx = parseInt(row.getAttribute('data-idx'));
                // Make sure to get the *currently displayed* search results
                const currentSearchResults = doSearch(searchInput.value.trim().toLowerCase(), allSongs);
                if (currentSearchResults[idx]) {
                    playSongInPlayer(currentSearchResults[idx]);
                }
            });
        });

        // Optional: Make clicking anywhere on the row play the song
        searchResultsContainer.querySelectorAll('.song-result-row').forEach(row => {
            row.addEventListener('click', function(e) {
                if (e.target.closest('.song-result-play')) return; // Avoid double-firing if play button is clicked
                const idx = parseInt(row.getAttribute('data-idx'));
                const currentSearchResults = doSearch(searchInput.value.trim().toLowerCase(), allSongs);
                if (currentSearchResults[idx]) {
                    playSongInPlayer(currentSearchResults[idx]);
                }
            });
        });
    }

});