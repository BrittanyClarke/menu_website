// server.js
require('dotenv').config();

const path = require('path');
const express = require('express');

const merchRouter = require('./backend/routes/merch');
const checkoutRouter = require('./backend/routes/checkout');
const musicRouter = require('./backend/routes/music');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/merch', merchRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/music', musicRouter);

// Fallback to index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fake.html'));
});

app.listen(PORT, () => {
  console.log(`MENU site running on http://localhost:${PORT}`);
});
