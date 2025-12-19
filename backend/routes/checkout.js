// backend/routes/checkout.js
// Creates a Square payment link for the items currently in the cart.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const client = require('../squareClient');
const { findMerchById } = require('../merchFromSquare');

const locationId = process.env.SQUARE_LOCATION_ID;

router.post('/', async (req, res) => {
  try {
    const { items } = req.body; // [{ id, qty }]

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    const lineItems = [];

    for (const cartItem of items) {
      const id = cartItem.id;
      const qty = parseInt(cartItem.qty, 10) || 0;
      if (!id || qty <= 0) continue;

      const merch = await findMerchById(id);
      if (!merch || typeof merch.priceCents !== 'number') {
        console.warn('Skipping invalid merch item in checkout:', id);
        continue;
      }

      lineItems.push({
        name: merch.name,
        quantity: String(qty),
        basePriceMoney: {
          amount: BigInt(merch.priceCents),
          currency: 'USD',
        },
        catalogObjectId: merch.id,
      });
    }

    if (!lineItems.length) {
      return res.status(400).json({ error: 'No valid cart items.' });
    }

    const idempotencyKey = crypto.randomUUID();
    const redirectUrl = 'https://menuband.com'; // update if needed

    const { result } = await client.checkoutApi.createPaymentLink({
      idempotencyKey,
      order: {
        locationId,
        lineItems,
      },
      checkoutOptions: {
        redirectUrl,
      },
    });

    const paymentLink = result.paymentLink;
    res.json({ url: paymentLink.url });
  } catch (err) {
    console.error('Error creating payment link:', err);
    res.status(500).json({ error: 'Unable to create checkout link.' });
  }
});

module.exports = router;
