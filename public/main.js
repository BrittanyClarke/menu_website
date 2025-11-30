// public/main.js
// Handles shows, gallery, merch carousel, cart, and checkout.

async function loadShows() {
  const container = document.getElementById('shows-list');
  if (!container) return;

  try {
    const response = await fetch(
      'https://rest.bandsintown.com/artists/menu (u.s.)/events?app_id=16bfd74ae887ffb4dc7a75d6de20cbbc'
    );

    if (!response.ok) throw new Error('Shows request failed');

    const events = await response.json();
    if (!Array.isArray(events) || events.length === 0) {
      container.innerHTML =
        '<div class="py-6 text-sm tracking-wide opacity-70">No upcoming shows. Check back soon.</div>';
      return;
    }

    container.innerHTML = events
      .map(event => {
        const date = new Date(event.datetime);
        const dateStr = date
          .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
          .toUpperCase();
        const venue = event.venue?.name || '';
        const city = event.venue?.city || '';
        const region = event.venue?.region || event.venue?.country || '';
        const loc = [venue, city, region].filter(Boolean).join(' • ');
        const url = event.offers?.[0]?.url || event.url || '#';

        return `
          <a href="${url}" target="_blank"
            class="block py-6 flex justify-between items-center hover:bg-black hover:text-white transition">
            <span class="text-lg tracking-wide">${dateStr} • ${loc}</span>
            <span class="tracking-widest text-xs">TICKETS →</span>
          </a>
        `;
      })
      .join('');
  } catch {
    container.innerHTML =
      '<div class="py-6 text-sm tracking-wide opacity-70">Unable to load shows right now.</div>';
  }
}

function initGallery() {
  const galleryInner = document.getElementById('gallery-inner');
  const galleryOverlay = document.getElementById('gallery-overlay');
  const galleryButton = document.getElementById('gallery-load-more');

  if (!galleryInner || !galleryOverlay || !galleryButton) return;

  galleryButton.addEventListener('click', () => {
    galleryInner.style.maxHeight = 'none';
    galleryOverlay.style.opacity = '0';
    galleryOverlay.style.pointerEvents = 'none';
    setTimeout(() => {
      galleryOverlay.style.display = 'none';
    }, 600);
  });
}

// Handles merch carousel, size variations, cart state, and checkout flow.
function initMerchAndCart() {
  const bodyElement = document.body;
  const carousel = document.getElementById('merch-carousel');
  const prevBtn = document.getElementById('merch-prev');
  const nextBtn = document.getElementById('merch-next');

  const cartToggle = document.getElementById('cart-toggle');
  const cartPanel = document.getElementById('cart-panel');
  const cartClose = document.getElementById('cart-close');
  const cartItemsContainer = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartTotal = document.getElementById('cart-total');
  const cartCheckout = document.getElementById('cart-checkout');

  if (!carousel || !prevBtn || !nextBtn) return;

  if (!cartToggle || !cartPanel || !cartItemsContainer || !cartCount || !cartTotal || !cartCheckout) {
    console.warn('Cart elements missing; merch carousel will work without cart.');
  }

  let merchItems = [];
  let merchIndex = 0;

  const selectedVariationByItemId = {};
  const cartItems = new Map(); // key: variationId, value: { id, name, price, qty }

  function formatPrice(price) {
    const value = typeof price === 'number' ? price : parseFloat(price || '0');
    return `$${value.toFixed(2)}`;
  }

  function openImageModal(src) {
    const modal = document.createElement('div');
    modal.className =
      'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[999]';
  
    modal.innerHTML = `
      <div class="relative max-w-3xl w-[20vw] mx-auto rounded-lg shadow-xl overflow-hidden">
        <button
          type="button"
          class="absolute top-3 right-3 bg-black/70 text-white text-sm px-3 py-1 tracking-[0.2em] uppercase"
          data-modal-close>
          Close
        </button>
        <div>
          <img src="${src}" class="w-full h-auto object-contain" />
        </div>
      </div>
    `;
  
    document.body.appendChild(modal);
  
    modal.addEventListener('click', e => {
      const clickedOutside = e.target === modal;
      const clickedClose = e.target.closest('[data-modal-close]');
      if (clickedOutside || clickedClose) {
        modal.remove();
      }
    });
  }
  

  carousel.addEventListener('click', e => {
    // Only respond when clicking on the merch image area
    const imgShell = e.target.closest('.merch-image-shell');
    if (!imgShell) return;
  
    // Find the image inside the card that was clicked
    const img = imgShell.querySelector('img');
    if (!img) return;
  
    const src = img.src;
    openImageModal(src);
  });
  
  

  function renderCarousel() {
    if (!merchItems.length) {
      carousel.innerHTML =
        '<div class="text-white/60 tracking-widest text-sm">Merch coming soon.</div>';
      return;
    }

    const total = merchItems.length;
    const center = merchIndex;
    const left = (center - 1 + total) % total;
    const right = (center + 1) % total;
    const left2 = (center - 2 + total) % total;
    const right2 = (center + 2) % total;

    const html = merchItems
      .map((item, idx) => {
        let posClass = 'hidden';

        if (idx === center) posClass = 'absolute z-30 opacity-100 scale-100 translate-x-0';
        else if (idx === left) posClass = 'absolute z-20 opacity-80 scale-95 -translate-x-[50%]';
        else if (idx === right) posClass = 'absolute z-20 opacity-80 scale-95 translate-x-[50%]';
        else if (idx === left2) posClass = 'absolute z-10 opacity-40 -translate-x-[105%]';
        else if (idx === right2) posClass = 'absolute z-10 opacity-40 translate-x-[105%]';

        if (posClass === 'hidden') return '';

        const variations = item.variations || [];
        const inStockVariations = variations.filter(v => v.inStock !== false);
        const hasInStock = inStockVariations.length > 0;
        const itemSoldOut = !hasInStock;

        const defaultVar = hasInStock
          ? inStockVariations[0]
          : variations[0] || null;

        const currentSelectedId =
          selectedVariationByItemId[item.id] || (defaultVar ? defaultVar.id : null);

        const selectedVar =
          variations.find(v => v.id === currentSelectedId) || defaultVar;

        const priceLabel = selectedVar ? formatPrice(selectedVar.price) : '';

        let variationControl = '';
        if (variations.length > 1) {
          const optionsHtml = variations
            .map(v => {
              const selectedAttr = v.id === currentSelectedId ? 'selected' : '';
              const isInStock = v.inStock !== false;
              const labelText = isInStock
                ? `${v.label} – ${formatPrice(v.price)}`
                : `${v.label} – Sold out`;
              const disabledAttr = isInStock ? '' : 'disabled';

              return `<option value="${v.id}" ${selectedAttr} ${disabledAttr}>${labelText}</option>`;
            })
            .join('');

          variationControl = `
            <select
              class="w-full bg-black border border-white/30 text-[0.7rem] uppercase tracking-[0.12em] px-2 py-1 mt-2"
              data-item-id="${item.id}">
              ${optionsHtml}
            </select>
          `;
        }

        

        const canAddToCart = hasInStock;

        return `
          <article class="merch-card ${posClass}" data-item-id="${item.id}">
            <div class="relative w-full h-full">
              <div class="merch-image-shell">
                ${
                  item.imageUrl
                    ? `<img src="${item.imageUrl}" class="merch-image-float" id="merch-image-float-id" alt="${item.name}"/>`
                    : `<div class="text-[0.6rem] tracking-[0.35em] uppercase text-white/60 text-center px-4">${item.name}</div>`
                }
              </div>

              <div class="flex-grow space-y-1 px-0 pb-0">
                <h3 class="merch-title">${item.name}</h3>
                ${priceLabel ? `<div class="merch-price">${priceLabel}</div>` : ''}
                <div class="mt-1 h-10">
                  ${variationControl || ''}
                </div>
              </div>

              <div class="mt-4">
                <button
                  class="${canAddToCart ? 'merch-buy-btn' : 'opacity-40 cursor-not-allowed merch-buy-btn-sold-out'}"
                  data-add-to-cart="${item.id}"
                  ${canAddToCart ? '' : 'disabled'}>
                  ${canAddToCart ? 'Add to cart' : 'Sold out'}
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    carousel.innerHTML =
      html || '<div class="text-white/60 tracking-widest text-sm">Merch coming soon.</div>';


  }

  

  function helloFunc(merchImgTag) {
    let merchImage = merchImageTag.scr;
    console.log("BEFORE ", merchImage);
    console.log("hello inside my function!", merchImgTag);
  }

  function animateStep(step) {
    if (!merchItems.length) return;
    carousel.classList.add('carousel-fade');
    setTimeout(() => {
      merchIndex = (merchIndex + step + merchItems.length) % merchItems.length;
      renderCarousel();
      requestAnimationFrame(() => {
        carousel.classList.remove('carousel-fade');
      });
    }, 220);
  }

  function updateCartUI() {
    if (!cartCount || !cartItemsContainer || !cartTotal) return;

    let totalQty = 0;
    let totalAmount = 0;
    const rows = [];

    for (const item of cartItems.values()) {
      totalQty += item.qty;
      totalAmount += item.price * item.qty;

      rows.push(`
        <div class="flex justify-between items-center">
          <div class="flex-1 pr-2">
            <div class="text-[0.7rem]">${item.name}</div>
            <div class="text-[0.65rem] text-white/50">${formatPrice(item.price)} × ${item.qty}</div>
          </div>
          <button data-remove="${item.id}" class="text-[0.65rem] text-white/50 hover:text-white">Remove</button>
        </div>
      `);
    }

    cartCount.textContent = totalQty;
    cartItemsContainer.innerHTML =
      rows.join('') || '<div class="text-[0.7rem] text-white/50">Cart is empty.</div>';
    cartTotal.textContent = formatPrice(totalAmount);
  }

  function addToCart(itemId) {
    const item = merchItems.find(m => m.id === itemId);
    if (!item) return;

    const variations = item.variations || [];
    const inStockVariations = variations.filter(v => v.inStock !== false);
    if (!inStockVariations.length) return;

    const defaultVar = inStockVariations[0];
    const selectedId =
      selectedVariationByItemId[itemId] || (defaultVar ? defaultVar.id : null);

    const selectedVar =
      inStockVariations.find(v => v.id === selectedId) || defaultVar;

    if (!selectedVar) return;

    const cartKey = selectedVar.id;
    const cartName =
      variations.length > 1
        ? `${item.name} – ${selectedVar.label}`
        : item.name;

    const existing = cartItems.get(cartKey);
    if (existing) {
      existing.qty += 1;
    } else {
      cartItems.set(cartKey, {
        id: selectedVar.id,
        name: cartName,
        price: selectedVar.price,
        qty: 1,
      });
    }

    updateCartUI();
  }

  function removeFromCart(variationId) {
    if (!cartItems.has(variationId)) return;
    cartItems.delete(variationId);
    updateCartUI();
  }

  async function checkout() {
    if (!cartItems.size) return;

    const payload = {
      items: Array.from(cartItems.values()).map(item => ({
        id: item.id,
        qty: item.qty,
      })),
    };

    try {
      cartCheckout.disabled = true;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('Checkout failed:', await res.text());
        cartCheckout.disabled = false;
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        cartCheckout.disabled = false;
      }
    } catch (err) {
      console.error('Error during checkout:', err);
      cartCheckout.disabled = false;
    }
  }

  async function loadMerch() {
    try {
      const res = await fetch('/api/merch');
      if (!res.ok) throw new Error('Merch request failed');
      const items = await res.json();

      if (!Array.isArray(items) || !items.length) {
        carousel.innerHTML =
          '<div class="text-white/60 tracking-widest text-sm">Merch coming soon.</div>';
        return;
      }

      merchItems = items;
      merchIndex = 0;

      for (const item of merchItems) {
        const variations = item.variations || [];
        const inStockVariations = variations.filter(v => v.inStock !== false);
        if (inStockVariations.length) {
          selectedVariationByItemId[item.id] = inStockVariations[0].id;
        } else if (variations.length) {
          selectedVariationByItemId[item.id] = variations[0].id;
        }
      }

      renderCarousel();
    } catch (err) {
      console.error('Error loading merch:', err);
      carousel.innerHTML =
        '<div class="text-white/60 tracking-widest text-sm">Merch coming soon.</div>';
    }
  }

  prevBtn.addEventListener('click', () => animateStep(-1));
  nextBtn.addEventListener('click', () => animateStep(1));

  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') animateStep(-1);
    if (e.key === 'ArrowRight') animateStep(1);
  });

  carousel.addEventListener('click', e => {
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (!addBtn) return;
    const itemId = addBtn.getAttribute('data-add-to-cart');
    addToCart(itemId);
  });

  carousel.addEventListener('change', e => {
    const select = e.target.closest('select[data-item-id]');
    if (!select) return;
    const itemId = select.getAttribute('data-item-id');
    const variationId = select.value;
    selectedVariationByItemId[itemId] = variationId;
    renderCarousel();
  });

  if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', e => {
      const removeBtn = e.target.closest('[data-remove]');
      if (!removeBtn) return;
      const variationId = removeBtn.getAttribute('data-remove');
      removeFromCart(variationId);
    });
  }

  if (cartToggle && cartPanel) {
    cartToggle.addEventListener('click', () => {
      cartPanel.classList.toggle('hidden');
    });
  }

  if (cartClose && cartPanel) {
    cartClose.addEventListener('click', () => {
      cartPanel.classList.add('hidden');
    });
  }

  if (cartCheckout) {
    cartCheckout.addEventListener('click', checkout);
  }

  loadMerch();
}

document.addEventListener('DOMContentLoaded', () => {
  loadShows();
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
  initGallery();
  initMerchAndCart();
});