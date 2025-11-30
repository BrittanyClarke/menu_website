// backend/squareClient.js
// Configures the Square client using environment variables.

require('dotenv').config();
const { Client, Environment } = require('square/legacy');

const client = new Client({
  environment:
    process.env.SQUARE_ENV === 'production'
      ? Environment.Production
      : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

module.exports = client;
