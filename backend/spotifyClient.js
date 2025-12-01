// backend/spotifyClient.js
const fetch = require('node-fetch');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let tokenCache = null;
let tokenExpiration = 0;

async function getSpotifyToken() {
  const now = Date.now();

  if (tokenCache && now < tokenExpiration - 60_000) {
    return tokenCache;
  }

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  const data = await resp.json();
  tokenCache = data.access_token;
  tokenExpiration = now + data.expires_in * 1000;
  return tokenCache;
}

async function getLatestRelease(artistId) {
  const token = await getSpotifyToken();

  const resp = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=single,album&market=US&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await resp.json();
  return data.items?.[0] || null;
}

module.exports = {
  getLatestRelease,
};
