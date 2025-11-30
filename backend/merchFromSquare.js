// backend/merchFromSquare.js
// Loads merch data from the Square Catalog and Inventory APIs.
// Groups variations under their parent item and attaches inventory info.
// Exposes grouped items for the frontend and a lookup by variation id for checkout.

const client = require('./squareClient');

let merchCache = [];
let lastFetch = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function moneyToCents(money) {
  if (!money || money.amount == null) return 0;
  return parseInt(money.amount, 10) || 0;
}

// Builds a map of variationId -> { quantity, inStock } using Square inventory counts.
async function fetchInventoryByVariationIds(variationIds) {
  if (!variationIds.length) return {};

  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    console.warn('SQUARE_LOCATION_ID not set; inventory will be treated as in stock.');
    return {};
  }

  const inventoryApi = client.inventoryApi;

  const body = {
    catalogObjectIds: variationIds,
    locationIds: [locationId],
  };

  const { result } = await inventoryApi.batchRetrieveInventoryCounts(body);
  const counts = result.counts || [];

  const map = {};

  for (const c of counts) {
    if (!c.catalogObjectId) continue;
    if (c.state !== 'IN_STOCK') continue;

    const qty = parseFloat(c.quantity || '0');
    map[c.catalogObjectId] = {
      quantity: isNaN(qty) ? 0 : qty,
      inStock: !isNaN(qty) && qty > 0,
    };
  }

  return map;
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

  const variationIds = variations.map(v => v.id);
  const inventoryByVariationId = await fetchInventoryByVariationIds(variationIds);

  const itemsById = {};

  for (const variation of variations) {
    const vData = variation.itemVariationData;
    if (!vData) continue;

    const priceCents = moneyToCents(vData.priceMoney);
    if (!priceCents) continue;

    const parentItemId = vData.itemId;
    const parentItem = items.find(it => it.id === parentItemId);
    const itemName = parentItem?.itemData?.name || 'Unknown item';
    const variationName = vData.name || '';
    const label = variationName || 'Default';

    let imageUrl = null;
    const imageId = parentItem?.itemData?.imageIds?.[0] || vData.imageIds?.[0];
    if (imageId && imageUrlById[imageId]) {
      imageUrl = imageUrlById[imageId];
    }

    const inv = inventoryByVariationId[variation.id];
    const quantity = inv?.quantity ?? null;
    const inStock = inv ? inv.inStock : true;

    if (!itemsById[parentItemId]) {
      itemsById[parentItemId] = {
        itemId: parentItemId,
        name: itemName,
        imageUrl: imageUrl || null,
        variations: [],
      };
    }

    if (!itemsById[parentItemId].imageUrl && imageUrl) {
      itemsById[parentItemId].imageUrl = imageUrl;
    }

    itemsById[parentItemId].variations.push({
      id: variation.id,
      label,
      priceCents,
      price: priceCents / 100,
      quantity,
      inStock,
    });
  }

  const merch = [];

  for (const item of Object.values(itemsById)) {
    const hasInStock = item.variations.some(v => v.inStock);
    merch.push({
      itemId: item.itemId,
      name: item.name,
      imageUrl: item.imageUrl,
      variations: item.variations,
      itemSoldOut: !hasInStock,
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

// Looks up a specific variation by id and returns flattened info for checkout.
async function findMerchById(variationId) {
  await ensureMerchLoaded();

  for (const item of merchCache) {
    const v = item.variations.find(variation => variation.id === variationId);
    if (!v) continue;

    const name =
      item.variations.length > 1
        ? `${item.name} – ${v.label}`
        : item.name;

    return {
      id: v.id,
      name,
      priceCents: v.priceCents,
      price: v.price,
      imageUrl: item.imageUrl,
    };
  }

  return null;
}

module.exports = {
  getMerchItems,
  findMerchById,
};
