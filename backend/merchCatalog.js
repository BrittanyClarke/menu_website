// backend/merchCatalog.js

// prices in cents
const merch = [
    {
      id: 'chapstick',
      name: 'Chapstick',
      priceCents: 500,
      imageUrl: '/images/merch/tee_black.png'
    },
    {
      id: 'tee-classic-white',
      name: 'Classic MENU Tee (White)',
      priceCents: 3000,
      imageUrl: '/images/merch/tee_white.png'
    },
    {
      id: 'hoodie-logo',
      name: 'Logo Hoodie',
      priceCents: 5500,
      imageUrl: '/images/merch/hoodie_logo.png'
    }
  ];
  
  function getMerchItems() {
    return merch;
  }
  
  function findMerchItem(id) {
    return merch.find(m => m.id === id);
  }
  
  module.exports = {
    getMerchItems,
    findMerchItem
  };
  