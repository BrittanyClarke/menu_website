// backend/routes/music.js
const express = require('express');
const router = express.Router();
const { getLatestRelease } = require('../spotifyClient'); // <-- note the .. here

// MENU's Spotify artist ID
const ARTIST_ID = '3K0KJBedbI1lEoTHc1zBPa'; // update if different

router.get('/latest', async (req, res) => {
  try {
    const latest = await getLatestRelease(ARTIST_ID);
    if (!latest) {
      return res.status(404).json({ error: 'No releases found' });
    }
    res.json(latest);
  } catch (err) {
    console.error('Spotify latest release error:', err);
    res.status(500).json({ error: 'Unable to fetch latest release' });
  }
});

module.exports = router;
