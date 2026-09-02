// --- Queue Toggle Logic ---
window.addEventListener('DOMContentLoaded', () => {
  const queueBtn = document.querySelector('.player-right .bi-list');
  const queueSidebar = document.querySelector('.spotify-queue');
  if (queueBtn && queueSidebar) {
    queueBtn.addEventListener('click', () => {
      const isActive = queueSidebar.style.display === 'block';
      if (isActive) {
        queueSidebar.style.display = 'none';
        queueBtn.style.color = '';
      } else {
        queueSidebar.style.display = 'block';
        queueBtn.style.color = 'orange';
      }
    });
    // Hide queue by default
    queueSidebar.style.display = 'none';
  }
});

// --- Audio Player Globals (MUST be declared before any function that uses `audio`) ---
var audio = null, groupSongs = [], groupCurrentIndex = 0, playingFromQueue = false;


window.addEventListener('DOMContentLoaded', () => {
  renderLibraryPlaylist();
  renderQueueSidebar();
});

// library.js - Clean, error-free, fully functional

// Utility: Get query param from URL
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// Utility: Format seconds as mm:ss
function formatDuration(seconds) {
  seconds = Math.floor(seconds || 0);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// --- QUEUE SIDEBAR RENDER ---
async function renderQueueSidebar() {
  const queueList = document.getElementById('queue-list');
  if (!queueList) return;
  const queue = JSON.parse(localStorage.getItem('songQueue') || '[]');
  if (!queue.length) {
    queueList.innerHTML = '';
    return;
  }
  // Fetch full song details from songs.json
  const allSongs = await loadAllSongs();
  queueList.innerHTML = '';
  let allSongsArr = allSongs;
  if (!Array.isArray(allSongsArr)) {
    allSongsArr = Object.values(allSongsArr);
  }
  queue.forEach((songRef, idx) => {
    let song = songRef;
    if (!song.cover || !song.artist) {
      // Try to find full details
      song = allSongsArr.find(s => (s.id && songRef.id && s.id === songRef.id) || (s.title === songRef.title && s.artist === songRef.artist)) || songRef;
    }
    queueList.innerHTML += `
      <div class="queue-row" data-queue-idx="${idx}" style="display:flex;align-items:center;gap:12px;padding:10px 0;">
        <img src="${song.cover || 'images/default.jpg'}" class="queue-cover" style="width:48px;height:48px;border-radius:6px;object-fit:cover;" onerror="this.onerror=null;this.src='https://via.placeholder.com/48x48?text=No+Image';">
        <div class="queue-song-meta">
          <div class="queue-title-text" style="font-weight:600;">${song.title}</div>
          <div class="queue-artist-text" style="font-size:13px;color:#b3b3b3;">${song.artist || ''}</div>
        </div>
        <button class="queue-remove-btn" data-queue-idx="${idx}" style="background:none;border:none;cursor:pointer;margin-left:auto;"><i class="bi bi-dash-circle" style="font-size:22px;color:#b3b3b3;"></i></button>
      </div>
    `;
  });
  // Add remove button event listeners
  queueList.querySelectorAll('.queue-remove-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-queue-idx'));
      let queue = JSON.parse(localStorage.getItem('songQueue') || '[]');
      queue.splice(idx, 1);
      localStorage.setItem('songQueue', JSON.stringify(queue));
      renderQueueSidebar();
    };
  });

  // Add click event to play song from queue immediately
  queueList.querySelectorAll('.queue-row').forEach(row => {
    row.onclick = async function(e) {
      // Ignore if remove button was clicked
      if (e.target.closest('.queue-remove-btn')) return;
      const idx = parseInt(row.getAttribute('data-queue-idx'));
      const queue = JSON.parse(localStorage.getItem('songQueue') || '[]');
      const allSongs = await loadAllSongs();
      let song = queue[idx];
      if (!song.cover || !song.artist) {
        song = allSongs.find(s => (s.id && song.id && s.id === song.id) || (s.title === song.title && s.artist === song.artist)) || song;
      }
      if (song) {
        await playSongInPlayer(song);
      }
    };
  });
}

// Load all songs metadata (from songs.json)
async function loadAllSongs() {
  const resp = await fetch('songs.json');
  return resp.json();
}

// Render playlist and songs
async function renderLibraryPlaylist() {
  const playlists = JSON.parse(localStorage.getItem('userPlaylists') || '[]');
  const idx = parseInt(getQueryParam('idx'));
  const playlist = playlists[idx];
  if (!playlist) return;

  // Render hero grid (up to 4 covers)
  const coversDiv = document.getElementById('playlist-hero-covers');
  coversDiv.innerHTML = '';
  const covers = (playlist.songs || []).slice(0, 4).map(s => (typeof s === 'object' && s.cover) ? s.cover : 'images/default.jpg');
  for (let i = 0; i < 4; ++i) {
    const img = document.createElement('img');
    img.src = covers[i] || 'images/default.jpg';
    coversDiv.appendChild(img);
  }
  document.getElementById('playlist-hero-title').textContent = playlist.name;

  // Load all songs metadata
  const allSongsData = await loadAllSongs();
  const allSongs = Array.isArray(allSongsData) ? allSongsData : allSongsData.songs;
  window.allSongs = allSongs;
  // Map playlist song ids to full song objects
  const playlistSongs = (playlist.songs || []).map(songRef => {
    if (typeof songRef === 'object' && songRef.title) {
      // Try to find by title and artist for best match
      return allSongs.find(s => s.title === songRef.title && s.artist === songRef.artist) || songRef;
    }
    if (typeof songRef === 'string') {
      // Try to find by title and artist (if possible)
      // If songRef is in format 'Title - Artist', split and match
      const parts = songRef.split(' - ');
      if (parts.length === 2) {
        return allSongs.find(s => s.title === parts[0].trim() && s.artist === parts[1].trim());
      }
      // Otherwise, match by title only
      return allSongs.find(s => s.title === songRef.trim());
    }
    return null;
  }).filter(Boolean);
  document.getElementById('playlist-song-count').textContent = `${playlistSongs.length} songs`;
  const totalDuration = playlistSongs.reduce((sum, s) => sum + (s.duration || 0), 0);
  const h = Math.floor(totalDuration / 3600);
  const m = Math.floor((totalDuration % 3600) / 60);
  document.getElementById('playlist-duration').textContent = h ? `${h} hr ${m} min` : `${m} min`;

  // Render table
  const tbody = document.getElementById('playlist-songs');
  tbody.innerHTML = '';
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
    // Exclude songs already in the current playlist
    let suggestions = getRandomItems(allSongs, 6, s => playlistSongs.some(ps => ps.title === s.title && ps.artist === s.artist));
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
        playGroup([suggestions[idx]], 0);
      };
    });
  }
  renderYouMightLike();

  playlistSongs.forEach((song, i) => {
    const tr = document.createElement('tr');
    tr.className = 'song-row';
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><img src="${song.cover || 'images/default.jpg'}" class="song-cover"> <div style="display:inline-block;vertical-align:middle;"><div style="font-weight:600;">${song.title}</div><div style="font-size:13px;color:#b3b3b3;">${song.artist || ''}</div></div></td>
      <td>${song.album || ''}</td>
      <td>${song.dateAdded || ''}</td>
      <td>${formatDuration(song.duration)} <button class='song-more-btn' title='More options'><i class='bi bi-three-dots'></i></button></td>
    `;
    tr.onclick = (e) => {
      // Only play if not clicking the more button
      if (!e.target.closest('.song-more-btn')) {
        playGroup(playlistSongs, i);
        groupCurrentIndex = i; // Ensure index is synced for next/prev
        Array.from(tbody.children).forEach(row => row.classList.remove('selected'));
        tr.classList.add('selected');
      }
    };
    tbody.appendChild(tr);
  });
  // Main play button
  document.getElementById('main-play').onclick = () => playGroup(playlistSongs, 0);

  // Setup player
  setupPlayer(playlistSongs);
  function setupPlayer(songs) {
  audio = document.getElementById('audio');
  if (!audio) {
    console.error("Audio element not found!");
    return; // prevent crashes
  }
  // ... rest of setup
}


  // Event delegation for song row more buttons
  tbody.addEventListener('click', function(e) {
    const btn = e.target.closest('.song-more-btn');
    if (btn) {
      e.stopPropagation();
      const tr = btn.closest('tr');
      const index = Array.from(tbody.children).indexOf(tr);
      Array.from(tbody.children).forEach(row => row.classList.remove('selected'));
      tr.classList.add('selected');
      // Show context menu for this song
      const rect = btn.getBoundingClientRect();
      showSongContextMenu({
        clientX: rect.left + window.scrollX - 180, // 180px width of menu
        clientY: rect.bottom + window.scrollY + 4
      }, playlistSongs[index], index);
    }
  });
// ...existing code...

  // Hide all popups
  function hideAllPopups() {
  var contextMenu = document.getElementById('song-context-menu');
  if (contextMenu) contextMenu.style.display = 'none';
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
        console.log('DEBUG playlistSongs:', playlistSongs);
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
      opt.onclick = async function(e) {
        e.stopPropagation();
        // Helper to update mood in songs.json if playlist name matches a mood
        async function updateSongMoodIfPlaylistIsMood(playlistName, song) {
          try {
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
              let suggestions = getRandomItems(allSongs, 6, s => playlistSongs.some(ps => ps.title === s.title));
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
                  playGroup([suggestions[idx]], 0);
                };
              });
            }
            renderYouMightLike();
            const res = await fetch('songs.json');
            if (!res.ok) return;
            const data = await res.json();
            if (!data.songs || !Array.isArray(data.songs)) return;
            // Check if playlistName matches a mood
            const moods = (data.moods || []).map(m => m.name.toLowerCase());
            const moodIdx = moods.indexOf(playlistName.trim().toLowerCase());
            if (moodIdx === -1) return;
            // Find the song in songs.json
            let updated = false;
            for (let s of data.songs) {
              if (s.title === song.title && s.artist === song.artist) {
                s.mood = data.moods[moodIdx].name;
                updated = true;
                break;
              }
            }
            if (updated) {
              await fetch('songs.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data, null, 2)
              });
            }
          } catch (err) { /* ignore */ }
        }
        if (opt.dataset.action === 'new') {
          const name = prompt('Enter playlist name:');
          if (name) {
            playlists.push({ name, songs: [JSON.parse(JSON.stringify(song))] });
            savePlaylists(playlists);
            await updateSongMoodIfPlaylistIsMood(name, song);
            alert('Playlist created and song added!');
            playlistPopup.style.display = 'none';
          }
        } else if (opt.dataset.action === 'add') {
          const idx = parseInt(opt.dataset.idx);
          if (!Array.isArray(playlists[idx].songs)) playlists[idx].songs = [];
          if (!playlists[idx].songs.some(s => s.title === song.title && s.artist === song.artist)) {
            playlists[idx].songs.push(JSON.parse(JSON.stringify(song)));
            savePlaylists(playlists);
            await updateSongMoodIfPlaylistIsMood(playlists[idx].name, song);
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
// --- Audio Player Logic ---
var audio = null, groupSongs = [], groupCurrentIndex = 0;
let playingFromQueue = false;
function setupPlayer(songs) {
  audio = document.getElementById('audio');
  if (!audio) {
    console.error('Audio element not found in setupPlayer!');
    return;
  }
  groupSongs = songs;
  groupCurrentIndex = 0;

  // ✅ Declare loopMode early
  let loopMode = localStorage.getItem('loopMode') || 'off'; // off, all, one

  // Play controls
  const playPauseBtn = document.getElementById('play-pause');
  playPauseBtn.onclick = () => {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };
  // Keyboard shortcut: Spacebar toggles play/pause
  document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && !e.shiftKey) {
      e.preventDefault();
      playPauseBtn.click();
    }
  });

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

  function updatePlayPauseIcon() {
    playPauseBtn.className = audio.paused ? 'bi bi-play-circle-fill' : 'bi bi-pause-circle-fill';
  }
  audio.addEventListener('play', updatePlayPauseIcon);
  audio.addEventListener('pause', updatePlayPauseIcon);
  updatePlayPauseIcon();

  // Wire up next/prev buttons
  const nextBtn = document.getElementById('next');
  if (nextBtn) nextBtn.onclick = playNext;
  const prevBtn = document.getElementById('prev');
  if (prevBtn) prevBtn.onclick = playPrev;

  // Loop button logic (off, all, one)
  const loopBtn = document.getElementById('loop');
  if (loopBtn) {
    function updateLoopBtnUI() {
      if (loopMode === 'off') {
        loopBtn.className = 'bi bi-arrow-repeat';
        loopBtn.style.color = 'limegreen';
        loopBtn.title = 'Loop Off';
      } else if (loopMode === 'all') {
        loopBtn.className = 'bi bi-repeat';
        loopBtn.style.color = 'orange';
  // Debugging logs
  console.log('DEBUG playlist.songs:', playlist.songs);
  console.log('DEBUG playlistSongs:', playlistSongs);
        loopBtn.title = 'Loop All';
      } else if (loopMode === 'one') {
        loopBtn.className = 'bi bi-repeat-1';
        loopBtn.style.color = 'silver';
        loopBtn.title = 'Loop One';
      }
    }
    loopBtn.onclick = function() {
      if (loopMode === 'off') {
        loopMode = 'all';
      } else if (loopMode === 'all') {
        loopMode = 'one';
      } else {
        loopMode = 'off';
      }
      localStorage.setItem('loopMode', loopMode);
      updateLoopBtnUI();
    };
    updateLoopBtnUI();
  }

  function savePlayerState(song, currentTime, isPlaying) {
    localStorage.setItem('playerSong', JSON.stringify(song));
    localStorage.setItem('playerTime', currentTime);
    localStorage.setItem('playerIsPlaying', isPlaying ? '1' : '0');
  }

  function playNext() {
    if (loopMode === 'one') {
      audio.currentTime = 0;  
      audio.play();
      return;
    }
    if (playingFromQueue) {
      audio.pause();
      return;
    }
    groupCurrentIndex = (groupCurrentIndex + 1) % groupSongs.length;
    playSongInPlayer(groupSongs[groupCurrentIndex]);
  }

  function playPrev() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    if (playingFromQueue) {
      audio.pause();
      return;
    }
    groupCurrentIndex = (groupCurrentIndex - 1 + groupSongs.length) % groupSongs.length;
    playSongInPlayer(groupSongs[groupCurrentIndex]);
  }

  // Volume and seek bars
  document.getElementById('volume-bar').oninput = e => {
    audio.volume = e.target.value;
  };
  document.getElementById('seek-bar').oninput = e => {
    audio.currentTime = e.target.value;
  };

  audio.ontimeupdate = () => {
    document.getElementById('seek-bar').value = audio.currentTime;
    document.getElementById('current-time').textContent = formatDuration(audio.currentTime);
  };
  audio.onloadedmetadata = () => {
    document.getElementById('seek-bar').max = audio.duration;
    document.getElementById('total-time').textContent = formatDuration(audio.duration);
  };
  audio.onended = async () => {
    let queue = JSON.parse(localStorage.getItem('songQueue') || '[]');
    if (queue.length > 0) {
      playingFromQueue = true;
      const allSongs = await loadAllSongs();
      let nextSong = queue[0];
      if (!nextSong.cover || !nextSong.artist) {
        nextSong = allSongs.find(s => 
          (s.id && queue[0].id && s.id === queue[0].id) ||
          (s.title === queue[0].title && s.artist === queue[0].artist)
        ) || queue[0];
      }
      queue.shift();
      localStorage.setItem('songQueue', JSON.stringify(queue));
      playSongInPlayer(nextSong);
      renderQueueSidebar();
    } else {
      playingFromQueue = false;
      groupCurrentIndex = (groupCurrentIndex + 1) % groupSongs.length;
      playSongInPlayer(groupSongs[groupCurrentIndex]);
    }
  };
}

function playGroup(songs, idx) {
  groupSongs = songs;
  groupCurrentIndex = idx;
  playSongInPlayer(groupSongs[groupCurrentIndex]);
}
function playSongInPlayer(song) {
  // Always set audio from DOM before using
  audio = document.getElementById('audio');
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
  document.getElementById('now-title').textContent = song.title;
  document.getElementById('now-artist').textContent = song.artist || '';
  document.getElementById('now-cover').src = song.cover || 'images/default.jpg';
}

// Properly close renderLibraryPlaylist function
}

// On page load
window.addEventListener('DOMContentLoaded', () => {
  renderLibraryPlaylist();
  renderQueueSidebar();
});