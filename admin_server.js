// Backend for admin song upload and YouTube to MP3 conversion
// Requires: express, ytdl-core, fluent-ffmpeg, fs, path
// To install: npm install express ytdl-core fluent-ffmpeg ffmpeg-static

const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const SONGS_JSON = path.join(__dirname, 'songs_formatted.json');
const MUSIC_DIR = path.join(__dirname, '.'); // Save mp3s in root for now

ffmpeg.setFfmpegPath(ffmpegPath);
app.use(express.json());
app.use(express.static(__dirname));

// Admin endpoint to add song
app.post('/admin/add-song', async (req, res) => {
  const { title, artist, album, youtube, cover, artistImg } = req.body;
  if (!title || !artist || !album || !youtube) {
    return res.json({ success: false, error: 'Missing required fields' });
  }
  try {
    // Download and convert YouTube to MP3
    const info = await ytdl.getInfo(youtube);
    const safeTitle = title.replace(/[^a-z0-9\-\s\[\]\(\)\.]/gi, '_');
    const mp3File = `[admin] ${safeTitle}.mp3`;
    const mp3Path = path.join(MUSIC_DIR, mp3File);
    await new Promise((resolve, reject) => {
      const stream = ytdl(youtube, { filter: 'audioonly' });
      ffmpeg(stream)
        .audioBitrate(128)
        .format('mp3')
        .save(mp3Path)
        .on('end', resolve)
        .on('error', reject);
    });
    // Add to JSON
    let songs = [];
    if (fs.existsSync(SONGS_JSON)) {
      songs = JSON.parse(fs.readFileSync(SONGS_JSON));
    }
    const newSong = {
      title,
      artist,
      album,
      file: mp3File,
      cover: cover || '',
      duration: Math.round(info.videoDetails.lengthSeconds),
      mood: 'unknown',
      artistImg: artistImg || '',
    };
    songs.push(newSong);
    fs.writeFileSync(SONGS_JSON, JSON.stringify(songs, null, 2));
    // Also append to songs_n.json
    const SONGS_N_JSON = path.join(__dirname, 'songs_n.json');
    let songsN = [];
    if (fs.existsSync(SONGS_N_JSON)) {
      try {
        songsN = JSON.parse(fs.readFileSync(SONGS_N_JSON));
        if (!Array.isArray(songsN)) songsN = [];
      } catch (e) {
        songsN = [];
      }
    }
    songsN.push(newSong);
    fs.writeFileSync(SONGS_N_JSON, JSON.stringify(songsN, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Admin backend running at http://localhost:${PORT}`);
});
