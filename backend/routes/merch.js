// backend/routes/merch.js
// Returns the merch catalog derived from Square for the frontend carousel.

const express = require('express');
const router = express.Router();
const { getMerchItems } = require('../merchFromSquare');

router.get('/', async (req, res) => {
  try {
    const items = await getMerchItems();
    const publicItems = items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
    }));
    res.json(publicItems);
  } catch (err) {
    console.error('Error loading merch from Square:', err);
    res.status(500).json({ error: 'Unable to load merch right now.' });
  }
});

module.exports = router;
