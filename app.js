// --- Unified DOMContentLoaded for all initialization ---


window.addEventListener('DOMContentLoaded', async () => {
  // --- Utility: Format seconds as mm:ss ---
  function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    var m = Math.floor(seconds / 60);
    var s = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  // --- SIDEBAR PLAYLIST RENDERING ---
  // Ensure songs data is loaded before search event registration
  let data = null;
  try {
    const res = await fetch('songs.json');
    data = await res.json();
    window.songsData = data; // for debugging
  } catch (err) {
    console.error('Failed to load songs.json:', err);
    data = { songs: [] };
  }
  function renderSidebarPlaylists() {
    const sidebar = document.getElementById('user-playlists-sidebar');
    if (!sidebar) return;
    const playlists = JSON.parse(localStorage.getItem('userPlaylists') || '[]');
    sidebar.innerHTML = playlists.map((pl, i) => {
      let cover = 'images/default.jpg';
      if (pl.songs && pl.songs.length && pl.songs[0].cover) cover = pl.songs[0].cover;
      else if (pl.songs && pl.songs.length) cover = 'images/default.jpg';
      return `
        <li class="sidebar-playlist-item" data-idx="${i}">
          <img class="sidebar-playlist-cover" src="${cover}" alt="${pl.name}">
          <div class="sidebar-playlist-info">
            <span class="sidebar-playlist-title">${pl.name}</span>
            <span class="sidebar-playlist-meta">Playlist${pl.songs && pl.songs.length ? ' • ' + pl.songs.length + ' songs' : ''}${pl.owner ? ' • ' + pl.owner : ''}</span>
          </div>
          <button class="playlist-options-btn" title="Options"><i class="bi bi-three-dots"></i></button>
        </li>
      `;
    }).join('');
    // Attach click to open playlist page
    Array.from(sidebar.getElementsByClassName('sidebar-playlist-item')).forEach((item, idx) => {
      item.onclick = function(e) {
        // Don't trigger if clicking the options button
        if (e.target.closest('.playlist-options-btn')) return;
        window.location.href = `library.html?idx=${idx}`;
      };
    });
    // Attach options menu logic
    Array.from(sidebar.getElementsByClassName('playlist-options-btn')).forEach((btn, idx) => {
      btn.onclick = function(e) {
        e.stopPropagation();
        showSidebarPlaylistMenu(btn, idx);
      };
    });
  }
  
  

  // Sidebar playlist options menu
  let sidebarPlaylistMenu = document.getElementById('sidebar-playlist-menu');
  if (!sidebarPlaylistMenu) {
    sidebarPlaylistMenu = document.createElement('div');
    sidebarPlaylistMenu.id = 'sidebar-playlist-menu';
    sidebarPlaylistMenu.className = 'playlist-popup';
    sidebarPlaylistMenu.style.display = 'none';
    sidebarPlaylistMenu.style.position = 'absolute';
    sidebarPlaylistMenu.style.zIndex = 1200;
    document.body.appendChild(sidebarPlaylistMenu);
  }
  function showSidebarPlaylistMenu(btn, idx) {
    sidebarPlaylistMenu.innerHTML = `
      <div class="playlist-popup-option" data-action="play">Play</div>
      <div class="playlist-popup-option" data-action="edit">Edit details</div>
      <div class="playlist-popup-option" data-action="delete">Delete</div>
      <div class="playlist-popup-option" data-action="share">Share</div>
    `;
    const rect = btn.getBoundingClientRect();
    sidebarPlaylistMenu.style.display = 'block';
    sidebarPlaylistMenu.style.left = rect.right + 8 + 'px';
    sidebarPlaylistMenu.style.top = rect.top + 'px';
    sidebarPlaylistMenu.dataset.idx = idx;
  }
  document.addEventListener('click', function() {
    sidebarPlaylistMenu.style.display = 'none';
  });
  sidebarPlaylistMenu.onclick = function(e) {
    e.stopPropagation();
    const idx = parseInt(sidebarPlaylistMenu.dataset.idx);
    const action = e.target.getAttribute('data-action');
    let playlists = JSON.parse(localStorage.getItem('userPlaylists') || '[]');
    if (action === 'play') {
      if (playlists[idx]) playGroup(playlists[idx].songs, 0);
    } else if (action === 'edit') {
      const newName = prompt('Edit playlist name:', playlists[idx].name);
      if (newName) {
        playlists[idx].name = newName;
        localStorage.setItem('userPlaylists', JSON.stringify(playlists));
        renderSidebarPlaylists();
      }
    } else if (action === 'delete') {
      if (confirm('Delete this playlist?')) {
        playlists.splice(idx, 1);
        localStorage.setItem('userPlaylists', JSON.stringify(playlists));
        renderSidebarPlaylists();
      }
    } else if (action === 'share') {
      alert('Share functionality coming soon!');
    }
    sidebarPlaylistMenu.style.display = 'none';
  };

  // Initial render
  renderSidebarPlaylists();

  // Re-render sidebar playlists after creating or editing playlists
  window.renderLibraryPlaylist = renderSidebarPlaylists;
  // --- SEARCH BAR FUNCTIONALITY ---
  const searchInput = document.getElementById('search-bar');
  const searchResultsContainer = document.getElementById('search-results-container');
  function renderSearchResults(results) {
      // --- QUEUE LOGIC ---
      // Maintain queue in localStorage
      
      // Show sidebar on load
      renderQueueSidebar();
      // Playlist popup logic
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
  if (window.renderLibraryPlaylist) window.renderLibraryPlaylist();
      }
      function showPlaylistPopup(x, y, song) {
        const playlists = getPlaylists();
        // Helper to deep copy a song object (avoid reference bugs)
        function copySong(s) {
          return JSON.parse(JSON.stringify(s));
        }
        playlistPopup.innerHTML = `
          <div class="playlist-popup-header">
            <input id="playlist-search" type="text" placeholder="Find a playlist" style="width:90%;margin:8px 5%;padding:6px;border-radius:6px;border:none;outline:none;">
          </div>
          <div class="playlist-popup-option" data-action="new">+ New playlist</div>
          ${playlists.map((pl, i) => `<div class="playlist-popup-option" data-action="add" data-idx="${i}">${pl.name}</div>`).join('')}
        `;
        if (window.renderSidebarPlaylists) window.renderSidebarPlaylists();
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
                playlists.push({ name, songs: [copySong(song)] });
                savePlaylists(playlists);
                alert('Playlist created and song added!');
                playlistPopup.style.display = 'none';
              }
            } else if (opt.dataset.action === 'add') {
              const idx = parseInt(opt.dataset.idx);
              if (!Array.isArray(playlists[idx].songs)) playlists[idx].songs = [];
              if (!playlists[idx].songs.some(s => s.title === song.title && s.artist === song.artist)) {
                playlists[idx].songs.push(copySong(song));
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
    if (!searchResultsContainer) return;
    if (!Array.isArray(results) || results.length === 0) {
      searchResultsContainer.innerHTML = '<div style="padding:24px;color:gray;text-align:center;">No results found.</div>';
      return;
    }
    // Top result is the first result
    const top = results[0] || {};
    const rest = results.slice(1);
    searchResultsContainer.innerHTML = `
      <div style="display: flex; gap: 32px; flex-wrap: wrap; align-items: flex-start;">
        <div style="flex:1; min-width: 320px; max-width: 400px;">
          <div class="top-result-label">Top result</div>
          <div class="top-result-card song-result-row" style="cursor:pointer; position:relative;">
            <img src="${top.cover || 'images/default.jpg'}" alt="${top.title || 'No Title'}">
            <div class="top-result-info">
              <div class="top-result-title">${top.title || 'No Title'}</div>
              <div class="top-result-meta">Song &bull; ${top.artist || 'Unknown'}${top.album ? ', ' + top.album : ''}</div>
            </div>
            <button class="top-result-play song-result-play"><i class="bi bi-play-circle-fill"></i></button>
            <button class="song-options-btn"><i class="bi bi-three-dots"></i></button>
          </div>
        </div>
        <div style="flex:2; min-width: 320px;">
          <div class="songs-label">Songs</div>
          <div class="song-result-list">
            ${results.map((song, idx) => `
              <div class="song-result-row" data-idx="${idx}" style="position:relative;">
                <img class="song-result-img" src="${song.cover || 'images/default.jpg'}" alt="${song.title || 'No Title'}">
                <span class="song-result-title">${song.title || 'No Title'}</span>
                <span class="song-result-meta">${song.artist || 'Unknown'}</span>
                <span class="song-result-duration">${song.duration ? formatDuration(song.duration) : ''}</span>
                <i class="bi bi-play-circle-fill song-result-play"></i>
                <button class="song-options-btn"><i class="bi bi-three-dots"></i></button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div id="song-context-menu" class="song-context-menu" style="display:none; position:absolute; z-index:1000;"></div>
    `;
      // Context menu logic
      const contextMenu = document.getElementById('song-context-menu');
      let contextMenuSongIdx = null;
      // --- Unified context menu logic for all song rows/cards ---
      function showContextMenu(x, y, idx) {
        contextMenu.innerHTML = `
          <div class="context-menu-option" data-action="add-playlist">Add to playlist</div>
          <div class="context-menu-option" data-action="queue">Add to queue</div>
          <div class="context-menu-option" data-action="artist">Go to artist</div>
          <div class="context-menu-option" data-action="album">Go to album</div>
        `;
        contextMenu.style.display = 'block';
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenuSongIdx = idx;
        // Hide any open playlist popup
        if (playlistPopup) playlistPopup.style.display = 'none';
      }
      function hideContextMenuAndPopups() {
        contextMenu.style.display = 'none';
        contextMenuSongIdx = null;
        if (playlistPopup) playlistPopup.style.display = 'none';
      }
      // Attach to all .song-options-btn
      Array.from(document.getElementsByClassName('song-options-btn')).forEach((btn, idx) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          hideContextMenuAndPopups();
          const rect = btn.getBoundingClientRect();
          showContextMenu(rect.left + window.scrollX, rect.bottom + window.scrollY + 4, idx);
        };
      });
      // Hide on click elsewhere or scroll
      document.addEventListener('click', hideContextMenuAndPopups);
      window.addEventListener('scroll', hideContextMenuAndPopups);
      // Handle context menu actions
      contextMenu.onclick = function(e) {
        e.stopPropagation();
        const action = e.target.getAttribute('data-action');
        if (!action) return;
        const idx = contextMenuSongIdx;
        if (action === 'queue') {
          addToQueue(results[idx]);
          alert('Added to queue: ' + results[idx].title);
          hideContextMenuAndPopups();
        } else if (action === 'add-playlist') {
          // Show playlist popup beside context menu
          const rect = contextMenu.getBoundingClientRect();
          showPlaylistPopup(rect.right + 8, rect.top, results[idx]);
          contextMenu.style.display = 'none';
        } else if (action === 'artist') {
          // Go to artist page
          localStorage.setItem('filter', results[idx].artist);
          localStorage.setItem('filterType', 'artist');
          window.location.href = 'playlist.html';
        } else if (action === 'album') {
          // Go to album page
          localStorage.setItem('filter', results[idx].album);
          localStorage.setItem('filterType', 'album');
          window.location.href = 'playlist.html';
        }
      };
      // Add play button and row click logic for top result
      const topCard = searchResultsContainer.querySelector('.top-result-card');
      if (topCard) {
        topCard.onclick = () => playGroup(results, 0);
        const btn = topCard.querySelector('.song-result-play');
        if (btn) {
          btn.onmousedown = (e) => { 
            e.stopPropagation(); 
            // Prevent blur from clearing results
            if (document.activeElement === searchInput) { e.preventDefault(); }
            playGroup(results, 0); 
          };
        }
      }
      // Add play button and row click logic for song list (use data-idx for correct index)
      const songRows = Array.from(searchResultsContainer.getElementsByClassName('song-result-row'));
      songRows.forEach((row) => {
        const idx = parseInt(row.getAttribute('data-idx'));
        if (!isNaN(idx)) {
          row.onclick = () => playGroup(results, idx);
          const btn = row.querySelector('.song-result-play');
          if (btn) {
            btn.onmousedown = (e) => { 
              e.stopPropagation(); 
              if (document.activeElement === searchInput) { e.preventDefault(); }
              playGroup(results, idx); 
            };
          }
        }
      });
  }

  if (searchInput) {
    let searchPlayJustClicked = false;
    let contextMenuJustOpened = false;
    let playlistPopupJustOpened = false;
    searchInput.addEventListener('input', function () {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) {
        searchResultsContainer.innerHTML = '';
        return;
      }
      // Debug: log songs and query
      console.log('SEARCH QUERY:', q);
      function doSearch(songs) {
        console.log('SONGS:', songs);
        const results = songs.filter(song => {
          const title = (song.title || "").toString().toLowerCase();
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
        console.log('SEARCH RESULTS:', results);
        renderSearchResults(results);
      }
      if (typeof data === 'object' && Array.isArray(data.songs)) {
        doSearch(data.songs);
      } else {
        // If data.songs not loaded, fetch songs.json and retry
        fetch('songs.json').then(resp => resp.json()).then(json => {
          if (Array.isArray(json.songs)) {
            doSearch(json.songs);
          } else {
            searchResultsContainer.innerHTML = '<div style="padding:24px;color:red;text-align:center;">No songs loaded.</div>';
          }
        }).catch(err => {
          searchResultsContainer.innerHTML = '<div style="padding:24px;color:red;text-align:center;">Error loading songs.</div>';
        });
      }
    });
    // Prevent results from disappearing if play or context menu is clicked
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
    // Listen for play click in results
    searchResultsContainer.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('song-result-play') || e.target.classList.contains('song-result-row')) {
        searchPlayJustClicked = true;
      }
      if (e.target.closest('.song-options-btn')) {
        contextMenuJustOpened = true;
      }
    });
    // Listen for playlist popup open
    document.body.addEventListener('mousedown', function (e) {
      if (e.target.closest && e.target.closest('#playlist-popup')) {
        playlistPopupJustOpened = true;
      }
    });
  }
  const res = await fetch("songs.json");
  data = await res.json();

  // --- TRENDING CHART ---
  const trendingSection = document.getElementById("trending-section");
  if (trendingSection) {
    const trendingSongs = data.songs.filter(song => {
      if (!song.hashtags) return false;
      if (Array.isArray(song.hashtags)) return song.hashtags.map(h=>h.toLowerCase()).includes("trending");
      return typeof song.hashtags === "string" && song.hashtags.toLowerCase().includes("trending");
    });
    let trendingVisible = 15;
    function renderTrendingCards() {
      trendingSection.innerHTML = "";
      trendingSongs.slice(0, trendingVisible).forEach((song, idx) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <img src="${song.cover || 'images/default.jpg'}" alt="${song.title}">
          <p>${song.title}</p>
          <i class="bi bi-play-circle-fill play-btn"></i>
        `;
        card.querySelector(".play-btn").onclick = (e) => {
          e.stopPropagation();
          // Trending: play all trending songs in order
          playGroup(trendingSongs.slice(0, trendingVisible), idx);
        };
        card.onclick = () => {
          window.location.href = "trending.html";
        };
        trendingSection.appendChild(card);
      });
      const showMoreBtn = document.getElementById("show-more-trending");
      if (trendingVisible < trendingSongs.length) {
        showMoreBtn.style.display = "block";
      } else {
        showMoreBtn.style.display = "none";
      }
    }
    renderTrendingCards();
    const showMoreBtn = document.getElementById("show-more-trending");
    showMoreBtn.onclick = () => {
      trendingVisible += 15;
      renderTrendingCards();
    };
    trendingSection.addEventListener('scroll', () => {
      if (trendingSection.scrollLeft + trendingSection.clientWidth >= trendingSection.scrollWidth - 10) {
        if (trendingVisible < trendingSongs.length) showMoreBtn.style.display = "block";
      }
    });
  }
  // Repeat similar logic for mood, artist, album sections
  function setupSection(sectionId, showMoreId, items, renderCardFn) {
    const section = document.getElementById(sectionId);
    const showMoreBtn = document.getElementById(showMoreId);
    if (!section || !showMoreBtn) return;
    let visible = 15;
    function renderCards() {
      section.innerHTML = "";
      items.slice(0, visible).forEach(renderCardFn);
      if (visible < items.length) {
        showMoreBtn.style.display = "block";
      } else {
        showMoreBtn.style.display = "none";
      }
    }
    renderCards();
    showMoreBtn.onclick = () => {
      visible += 15;
      renderCards();
    };
    section.addEventListener('scroll', () => {
      if (section.scrollLeft + section.clientWidth >= section.scrollWidth - 10) {
        if (visible < items.length) showMoreBtn.style.display = "block";
      }
    });
  }

  setupSection("mood-section", "show-more-mood", Array.isArray(data.moods) ? data.moods : [], mood => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${mood.image}" alt="${mood.name}">
      <p>${mood.name.charAt(0).toUpperCase() + mood.name.slice(1)}</p>
      <i class="bi bi-play-circle-fill play-btn"></i>
    `;
    card.querySelector(".play-btn").onclick = (e) => {
      e.stopPropagation();
      // Play all songs in the selected mood
      const moodSongs = data.songs.filter(song => {
        if (Array.isArray(song.mood))
          return song.mood.some(m => m.trim().toLowerCase() === mood.name.trim().toLowerCase());
        return typeof song.mood === "string" && song.mood.trim().toLowerCase() === mood.name.trim().toLowerCase();
      });
      playGroup(moodSongs, 0);
    };
    card.onclick = () => openPlaylist(mood.name, "mood");
    document.getElementById("mood-section").appendChild(card);
  });


  // Artists (from songs, unique, split multi-artist)
  // --- Artists (unique, multi-artist aware) ---
  const allArtists = data.songs
    .flatMap(s => {
      if (typeof s.artist === "string" && s.artist.trim() !== "") {
        return s.artist.split(",").map(a => a.trim());
      }
      return [];
    })
    .filter(a => a);
  const uniqueArtists = [...new Set(allArtists)];
  setupSection("artist-section", "show-more-artist", uniqueArtists, artist => {
    const song = data.songs.find(s =>
      typeof s.artist === "string" &&
      s.artist.split(",").map(a => a.trim().toLowerCase()).includes(artist.toLowerCase())
    );
    if (!song) return;
    const img = song.artistImg || song.cover || "images/default.jpg";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${img}" alt="${artist}">
      <p>${artist}</p>
      <i class="bi bi-play-circle-fill play-btn"></i>
    `;
    card.querySelector(".play-btn").onclick = (e) => {
      e.stopPropagation();
      // Play all songs by the selected artist
      const artistSongs = data.songs.filter(s => {
        if (typeof s.artist === "string") {
          return s.artist.split(",").map(a => a.trim().toLowerCase()).includes(artist.trim().toLowerCase());
        }
        return false;
      });
      playGroup(artistSongs, 0);
    };
    card.onclick = () => openPlaylist(artist, "artist");
    document.getElementById("artist-section").appendChild(card);
  });


  // Albums (from songs, unique)
    const uniqueAlbums = [...new Set(data.songs.map(s => s.album).filter(a => a))];
    setupSection("album-section", "show-more-album", uniqueAlbums, album => {
      const song = data.songs.find(s => s.album === album);
      if (!song) return;
      const img = song.cover || 'images/default.jpg';
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${img}" alt="${album}">
        <p>${album}</p>
        <i class="bi bi-play-circle-fill play-btn"></i>
      `;
      card.querySelector(".play-btn").onclick = (e) => {
      e.stopPropagation();
      // Play all songs in the selected album
      const albumSongs = data.songs.filter(song => song.album && song.album.trim().toLowerCase() === album.trim().toLowerCase());
      playGroup(albumSongs, 0);
      };
      card.onclick = () => openPlaylist(album, "album");
      document.getElementById("album-section").appendChild(card);
    });
  // --- Restore player state and wire up controls (existing logic) ---
  // Normal navigation (no autoplay)
  function openPlaylist(filter, type) {
    localStorage.setItem("filter", filter.trim());
    localStorage.setItem("filterType", type);
    localStorage.setItem("autoplay", "false");
    window.location.href = "playlist.html";
  }

  // Autoplay navigation
  function startPlaylist(filter, type) {
    localStorage.setItem("filter", filter.trim());
    localStorage.setItem("filterType", type);
    localStorage.setItem("autoplay", "true");
    window.location.href = "playlist.html";
  }

  // --- Persistent Audio Player Logic ---
  var groupSongs = [];
  var groupCurrentIndex = 0;
  var loopMode = localStorage.getItem('loopMode') || 'off'; // 'off', 'all', 'one'

  function playGroup(songsArr, startIdx) {
    if (!Array.isArray(songsArr) || songsArr.length === 0) return;
    groupSongs = songsArr;
    groupCurrentIndex = startIdx || 0;
    playSongInPlayer(groupSongs[groupCurrentIndex]);
  }

  function playSongInPlayer(song) {
    var audio = document.getElementById('audio');
    if (!audio) {
      console.error('Audio element not found in DOM.');
      return;
    }
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
    var playerTitle = document.getElementById('player-title') || document.getElementById('now-title');
    if (playerTitle) playerTitle.textContent = song.title;
    var playerArtist = document.getElementById('player-artist') || document.getElementById('now-artist');
    if (playerArtist) playerArtist.textContent = song.artist || '';
    var playerCover = document.getElementById('player-cover') || document.getElementById('now-cover');
    if (playerCover) playerCover.src = song.cover || song.artistImg || 'images/default.jpg';
    // Save state
    savePlayerState(song, 0, true);
    updateIndexPlayPauseUI(true);
    // Listen for time updates
    audio.ontimeupdate = function() {
      savePlayerState(song, audio.currentTime, !audio.paused);
      var seekBar = document.getElementById('seek-bar');
      if (seekBar) seekBar.value = Math.floor(audio.currentTime);
      var currentTimeEl = document.getElementById('current-time');
      if (currentTimeEl) currentTimeEl.textContent = formatDuration(audio.currentTime);
      updateIndexPlayPauseUI(!audio.paused);
    };
    audio.onloadedmetadata = function() {
      var seekBar = document.getElementById('seek-bar');
      if (seekBar) seekBar.max = Math.floor(audio.duration);
      var totalTimeEl = document.getElementById('total-time');
      if (totalTimeEl) totalTimeEl.textContent = formatDuration(audio.duration);
    };
    audio.onpause = function() {
      savePlayerState(song, audio.currentTime, false);
      updateIndexPlayPauseUI(false);
    };
    audio.onplay = function() {
      savePlayerState(song, audio.currentTime, true);
      updateIndexPlayPauseUI(true);
    };
    if (seekBar) {
      seekBar.oninput = function () {
        var audio = document.getElementById('audio');
        if (audio) audio.currentTime = seekBar.value;
      };
    }

  // Next/Previous button logic
  function playNext() {
    if (!groupSongs.length) return;
    groupCurrentIndex = (groupCurrentIndex + 1) % groupSongs.length;
    playSongInPlayer(groupSongs[groupCurrentIndex]);
  }

  function playPrev() {
    if (!groupSongs.length) return;
    groupCurrentIndex = (groupCurrentIndex - 1 + groupSongs.length) % groupSongs.length;
    playSongInPlayer(groupSongs[groupCurrentIndex]);
  }

  // Wire up next/prev buttons
  var nextBtn = document.getElementById('next');
  if (nextBtn) nextBtn.onclick = playNext;
  var prevBtn = document.getElementById('prev');
  if (prevBtn) prevBtn.onclick = playPrev;

  // Loop button logic (off, all, one)
  var loopBtn = document.getElementById('loop');
  if (loopBtn) {
    function updateLoopBtnUI() {
      if (loopMode === 'off') {
        loopBtn.className = 'bi bi-arrow-repeat';
        loopBtn.style.color = 'limegreen';
        loopBtn.title = 'Loop Off';
      } else if (loopMode === 'all') {
        loopBtn.className = 'bi bi-repeat';
        loopBtn.style.color = 'orange';
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

  function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    var m = Math.floor(seconds / 60);
    var s = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateIndexPlayPauseUI(isPlaying) {
    var playPauseBtn = document.getElementById('play-pause');
    if (playPauseBtn) {
      playPauseBtn.className = isPlaying ? 'bi bi-pause-circle-fill' : 'bi bi-play-circle-fill';
    }
  }

  // Seek bar interaction
  var seekBar = document.getElementById('seek-bar');
    if (seekBar) {
      seekBar.oninput = function () {
        var audio = document.getElementById('audio');
        if (audio) audio.currentTime = seekBar.value;
      };
    }
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

// Handle song end → play next
// ✅ QUEUE PRIORITY END LOGIC


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

// --- Queue Logic ---  ✅ QUEUE ADDED
audio.onended = handleSongEnd;

function handleSongEnd() {
  // 1️⃣ Queue priority
  const queue = JSON.parse(localStorage.getItem('songQueue') || '[]');
  if (queue.length > 0) {
    const next = queue.shift();
    localStorage.setItem('songQueue', JSON.stringify(queue));
    renderQueueSidebar();
    playSongInPlayer(next);
    return;
  }

  // 2️⃣ Group playback (trending, mood, artist, album)
  if (Array.isArray(groupSongs) && groupSongs.length > 1) {
    // If currently playing trending songs, only play trending until finished
    const isTrendingGroup = groupSongs.length > 0 && groupSongs.every(song => {
      if (!song.hashtags) return false;
      if (Array.isArray(song.hashtags)) return song.hashtags.some(h => h && h.toLowerCase() === "trending");
      if (typeof song.hashtags === "string") return song.hashtags.toLowerCase().includes("trending");
      return false;
    });
    if (isTrendingGroup) {
      if (groupCurrentIndex < groupSongs.length - 1) {
        groupCurrentIndex++;
        playSongInPlayer(groupSongs[groupCurrentIndex]);
        return;
      } else if (loopMode === 'all') {
        groupCurrentIndex = 0;
        playSongInPlayer(groupSongs[0]);
        return;
      }
      // If finished trending and loopMode is off, do NOT play other section songs
      updateIndexPlayPauseUI(false);
      return;
    } else {
      // Non-trending group playback (mood, artist, album)
      if (groupCurrentIndex < groupSongs.length - 1) {
        groupCurrentIndex++;
        playSongInPlayer(groupSongs[groupCurrentIndex]);
        return;
      } else if (loopMode === 'all') {
        groupCurrentIndex = 0;
        playSongInPlayer(groupSongs[0]);
        return;
      }
    }
  }

  // 3️⃣ Loop one: repeat current
  if (loopMode === 'one') {
    audio.currentTime = 0;
    audio.play();
    return;
  }

  // 4️⃣ Otherwise, stop (end of group, loopMode off)
  updateIndexPlayPauseUI(false);
}

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
  // Try both encoded and decoded file names in music/ subfolder
  let filePathRaw = song.file;
  let filePathDecoded = filePathRaw;
  try {
    filePathDecoded = decodeURIComponent(filePathRaw);
  } catch (e) {
    console.warn('Failed to decode file path:', filePathRaw, e);
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
      audio.src = path;
      audio.onerror = tryNext;
    }
    tryNext();
  }
  trySetSrc([
    'music/' + filePathRaw,
    'music/' + filePathDecoded,
    'new/' + filePathRaw,
    'new/' + filePathDecoded,
    filePathRaw,
    filePathDecoded
  ]);
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

  audio.play().catch(err => {
    console.error('Audio play() failed:', err);
  });
  updatePlayPauseUI(true);
  renderQueueSidebar(); // refresh queue sidebar
}

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
});