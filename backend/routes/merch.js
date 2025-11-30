// backend/routes/merch.js
// Returns grouped merch items (with variations and inventory info) for the frontend carousel.

const express = require('express');
const router = express.Router();
const { getMerchItems } = require('../merchFromSquare');

router.get('/', async (req, res) => {
  try {
    const items = await getMerchItems();

    console.log("items ", items);

    const publicItems = items.map(item => ({
      id: item.itemId,
      name: item.name,
      imageUrl: item.imageUrl,
      itemSoldOut: item.itemSoldOut,
      variations: item.variations.map(v => ({
        id: v.id,
        label: v.label,
        price: v.price,
        quantity: v.quantity,
        inStock: v.inStock,
      })),
    }));

    res.json(publicItems);
  } catch (err) {
    console.error('Error loading merch from Square:', err);
    res.status(500).json({ error: 'Unable to load merch right now.' });
  }
});

module.exports = router;
