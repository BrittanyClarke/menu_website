// backend/merchFromSquare.js
// Loads merch data from the Square Catalog API and exposes a simple merch list.
// Results are cached in memory to avoid frequent API calls.

const client = require('./squareClient');

let merchCache = [];
let lastFetch = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function moneyToCents(money) {
  if (!money || money.amount == null) return 0;
  return parseInt(money.amount, 10) || 0;
}

async function refreshMerchFromSquare() {
  const catalogApi = client.catalogApi;
  const allObjects = [];
  let cursor;

  do {
    const { result } = await catalogApi.listCatalog(
      cursor,
      'ITEM,ITEM_VARIATION,IMAGE'
    );

    if (result.objects) {
      allObjects.push(...result.objects);
    }

    cursor = result.cursor;
  } while (cursor);

  const items = allObjects.filter(o => o.type === 'ITEM');
  const variations = allObjects.filter(o => o.type === 'ITEM_VARIATION');
  const images = allObjects.filter(o => o.type === 'IMAGE');

  const imageUrlById = {};
  for (const img of images) {
    const data = img.imageData;
    if (data && data.url) {
      imageUrlById[img.id] = data.url;
    }
  }

  const merch = [];

  for (const variation of variations) {
    const vData = variation.itemVariationData;
    if (!vData) continue;

    const priceCents = moneyToCents(vData.priceMoney);
    if (!priceCents) continue;

    const parentItem = items.find(it => it.id === vData.itemId);
    const itemName = parentItem?.itemData?.name || 'Unknown item';
    const variationName = vData.name || '';
    const displayName = variationName ? `${itemName} – ${variationName}` : itemName;

    let imageUrl = null;
    const imageId = parentItem?.itemData?.imageIds?.[0] || vData.imageIds?.[0];
    if (imageId && imageUrlById[imageId]) {
      imageUrl = imageUrlById[imageId];
    }

    merch.push({
      // Square variation ID
      id: variation.id,               
      name: displayName,
      priceCents,
      price: priceCents / 100,
      imageUrl,
    });
  }

  merchCache = merch;
  lastFetch = Date.now();
  return merchCache;
}

async function ensureMerchLoaded() {
  const now = Date.now();
  const needsRefresh = !merchCache.length || now - lastFetch > CACHE_TTL_MS;
  if (needsRefresh) {
    await refreshMerchFromSquare();
  }
}

async function getMerchItems() {
  await ensureMerchLoaded();
  return merchCache;
}

async function findMerchById(id) {
  await ensureMerchLoaded();
  return merchCache.find(m => m.id === id);
}

module.exports = {
  getMerchItems,
  findMerchById,
};
