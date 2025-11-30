// public/main.js

// Loads upcoming shows from Bandsintown and renders them
async function initShows() {
  const container = document.getElementById('shows-list');
  if (!container) return;

  try {
    const response = await fetch(
      'https://rest.bandsintown.com/artists/menu (u.s.)/events?app_id=16bfd74ae887ffb4dc7a75d6de20cbbc'
    );

    if (!response.ok) {
      throw new Error('Shows request failed');
    }

    const events = await response.json();
    if (!Array.isArray(events) || !events.length) {
      container.innerHTML =
        '<div class="py-6 text-sm tracking-wide opacity-70">No upcoming shows. Check back soon.</div>';
      return;
    }

    container.innerHTML = events
      .map(event => {
        const date = new Date(event.datetime);
        const dateStr = date
          .toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
          })
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
  } catch (err) {
    console.error('Error loading shows:', err);
    container.innerHTML =
      '<div class="py-6 text-sm tracking-wide opacity-70">Unable to load shows right now.</div>';
  }
}

// Enables "load more" behavior for the photo gallery
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

// Handles merch carousel, cart state, and checkout
function initMerchAndCart() {
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
  // key: id, value: { id, name, price, qty }
  const cartItems = new Map(); 

  function formatPrice(price) {
    const value = typeof price === 'number' ? price : parseFloat(price || '0');
    return `$${value.toFixed(2)}`;
  }

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

        const priceLabel = item.price != null ? formatPrice(item.price) : '';

        return `
          <article class="merch-card ${posClass}" data-id="${item.id}">
            <div class="merch-image-shell">
              ${
                item.imageUrl
                  ? `<img src="${item.imageUrl}" class="merch-image-float" alt="${item.name}" />`
                  : `<div class="text-[0.6rem] tracking-[0.35em] uppercase text-white/60 text-center px-4">${item.name}</div>`
              }
            </div>

            <div class="flex-grow space-y-1">
              <h3 class="merch-title">${item.name}</h3>
              ${
                priceLabel
                  ? `<div class="merch-price">${priceLabel}</div>`
                  : ''
              }
            </div>

            <div class="mt-4">
              <button
                class="merch-buy-btn"
                data-add-to-cart="${item.id}">
                Add to cart
              </button>
            </div>
          </article>
        `;
      })
      .join('');

    carousel.innerHTML = html || '<div class="text-white/60 tracking-widest text-sm">Merch coming soon.</div>';
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
    cartItemsContainer.innerHTML = rows.join('') || '<div class="text-[0.7rem] text-white/50">Cart is empty.</div>';
    cartTotal.textContent = formatPrice(totalAmount);
  }

  function addToCart(id) {
    const item = merchItems.find(m => m.id === id);
    if (!item) return;

    const existing = cartItems.get(id);
    if (existing) {
      existing.qty += 1;
    } else {
      const priceValue = typeof item.price === 'number' ? item.price : parseFloat(item.price || '0');
      cartItems.set(id, {
        id: item.id,
        name: item.name,
        price: priceValue,
        qty: 1,
      });
    }

    updateCartUI();
  }

  function removeFromCart(id) {
    if (!cartItems.has(id)) return;
    cartItems.delete(id);
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

  // Add-to-cart from merch cards
  carousel.addEventListener('click', e => {
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (!addBtn) return;
    const id = addBtn.getAttribute('data-add-to-cart');
    addToCart(id);
  });

  // Remove items from cart panel
  if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', e => {
      const removeBtn = e.target.closest('[data-remove]');
      if (!removeBtn) return;
      const id = removeBtn.getAttribute('data-remove');
      removeFromCart(id);
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

// Initializes icons and all interactive sections when the document is ready.
function initPage() {
  try {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  } catch (err) {
    console.warn('Lucide icons not initialized:', err);
  }

  initShows();
  initGallery();
  initMerchAndCart();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
