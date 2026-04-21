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

  function openImageModal(item) {
    const images = [
      item.imageUrl,
      ...(item.secondaryImages || []),
    ].filter(Boolean);
  
    if (!images.length) return;
  
    const hasMultiple = images.length > 1;
    let currentIndex = 0;
  
    const modal = document.createElement('div');
    modal.className =
      'fixed inset-0 bg-black/80 flex items-center justify-center z-[999] ' +
      'opacity-0 transition-opacity duration-150 ease-out';
  
    modal.innerHTML = `
      <div class="relative bg-black border border-white/20 shadow-2xl rounded-sm
                  w-[70vw] max-w-[520px] max-h-[80vh] mx-4 my-6
                  flex flex-col overflow-hidden
                  transform scale-95 transition-transform duration-150 ease-out"
           data-modal-box>
  
        <div class="absolute top-3 right-3">
          <button
            type="button"
            class="w-8 h-8 flex items-center justify-center bg-white text-black
                   text-lg font-bold border border-white hover:bg-black hover:text-white transition"
            data-modal-close-x>
            ✕
          </button>
        </div>
  
        <div class="flex-1 flex items-center justify-center px-5 pt-10 pb-3">
          <div class="w-full h-[320px] max-h-[55vh] flex items-center justify-center">
            <img
              src="${images[0]}"
              data-modal-main
              class="object-contain max-h-full max-w-full mx-auto"
            />
          </div>
        </div>
  
        ${
          hasMultiple
            ? `
          <button
            type="button"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                   border border-white/40 text-2xl text-white/80 hover:bg-white hover:text-black transition"
            data-modal-prev>
            ‹
          </button>
  
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                   border border-white/40 text-2xl text-white/80 hover:bg-white hover:text-black transition"
            data-modal-next>
            ›
          </button>
          `
            : ''
        }
  
        <div class="px-5 pb-5 pt-1 flex justify-center">
          <button
            type="button"
            class="px-8 py-3 bg-white text-black uppercase tracking-[0.35em]
                   border border-white/80 text-[0.7rem]
                   hover:bg-black hover:text-white transition"
            data-modal-close-btn>
            Close
          </button>
        </div>
      </div>
    `;
  
    document.body.appendChild(modal);
  
    const box = modal.querySelector('[data-modal-box]');
    const mainImg = modal.querySelector('[data-modal-main]');
    const prevBtn = modal.querySelector('[data-modal-prev]');
    const nextBtn = modal.querySelector('[data-modal-next]');
    const closeX = modal.querySelector('[data-modal-close-x]');
    const closeBtn = modal.querySelector('[data-modal-close-btn]');
  
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      modal.classList.add('opacity-100');
      if (box) {
        box.classList.remove('scale-95');
        box.classList.add('scale-100');
      }
    });
  
    function showImage(index) {
      currentIndex = (index + images.length) % images.length;
      mainImg.src = images[currentIndex];
    }
  
    function handleKeydown(e) {
      if (e.key === 'Escape') return closeModal();
      if (!hasMultiple) return;
      if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
      if (e.key === 'ArrowRight') showImage(currentIndex + 1);
    }
  
    function closeModal() {
      window.removeEventListener('keydown', handleKeydown);
      modal.classList.remove('opacity-100');
      modal.classList.add('opacity-0');
      if (box) {
        box.classList.remove('scale-100');
        box.classList.add('scale-95');
      }
      const removeAfterTransition = () => {
        modal.removeEventListener('transitionend', removeAfterTransition);
        modal.remove();
      };
      modal.addEventListener('transitionend', removeAfterTransition);
    }
  
    if (hasMultiple) {
      prevBtn?.addEventListener('click', () => showImage(currentIndex - 1));
      nextBtn?.addEventListener('click', () => showImage(currentIndex + 1));
    }
  
    closeX.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });
    window.addEventListener('keydown', handleKeydown);
  }

  carousel.addEventListener('click', e => {
    const imgShell = e.target.closest('.merch-image-shell');
    if (!imgShell) return;
    const card = imgShell.closest('.merch-card');
    if (!card) return;
    const itemId = card.getAttribute('data-item-id');
    const item = merchItems.find(m => m.id === itemId);
    if (!item) return;
    openImageModal(item);
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

  // --- Swipe support for touch devices ---
  let touchStartX = null;
  let touchStartY = null;
  const SWIPE_THRESHOLD = 40;

  carousel.addEventListener('touchstart', e => {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  });

  carousel.addEventListener('touchend', e => {
    if (touchStartX === null || touchStartY === null) return;
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) animateStep(1);
      else animateStep(-1);
    }
    touchStartX = null;
    touchStartY = null;
  });

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

  // Creates a full-screen loading overlay while we wait for the Square redirect.
  function showCheckoutOverlay() {
    const existing = document.getElementById('checkout-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'checkout-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.92);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      gap: 20px;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    overlay.innerHTML = `
      <style>
        @keyframes menu-spin { to { transform: rotate(360deg); } }
        #checkout-overlay-spinner {
          width: 40px;
          height: 40px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: menu-spin 0.75s linear infinite;
        }
      </style>
      <div id="checkout-overlay-spinner"></div>
      <div style="
        color: white;
        letter-spacing: 0.3em;
        font-size: 0.7rem;
        text-transform: uppercase;
        font-family: sans-serif;
      ">Taking you to checkout…</div>
    `;

    document.body.appendChild(overlay);

    // Fade in on next frame
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    return overlay;
  }

  function removeCheckoutOverlay() {
    const overlay = document.getElementById('checkout-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 250);
  }

  async function checkout() {
    if (!cartItems.size) return;

    const payload = {
      items: Array.from(cartItems.values()).map(item => ({
        id: item.id,
        qty: item.qty,
      })),
    };

    const overlay = showCheckoutOverlay();

    try {
      if (cartCheckout) cartCheckout.disabled = true;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('Checkout failed:', await res.text());
        removeCheckoutOverlay();
        if (cartCheckout) cartCheckout.disabled = false;
        alert('Something went wrong starting checkout. Please try again.');
        return;
      }

      const data = await res.json();

      if (data.url) {
        // Keep the overlay visible through the page navigation — it will
        // disappear naturally once Square's page loads.
        window.location.href = data.url;
      } else {
        removeCheckoutOverlay();
        if (cartCheckout) cartCheckout.disabled = false;
      }
    } catch (err) {
      console.error('Error during checkout:', err);
      removeCheckoutOverlay();
      if (cartCheckout) cartCheckout.disabled = false;
      alert('Connection error. Please try again.');
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

  async function loadLatestMusic() {
    try {
      const res = await fetch('/api/music/latest');
      if (!res.ok) throw new Error("Music fetch failed");

      const album = await res.json();
      if (!album) return;

      const musicSection = document.querySelector('#music .grid');
      if (!musicSection) return;

      const coverUrl = album.images?.[0]?.url || "/fallback.jpg";
      const name = album.name || "Latest Release";
      const releaseYear = album.release_date?.slice(0, 4);
      const albumId = album.id;

      // Build the full section HTML. The cover wrapper is a <div> (not an <a>)
      // so there's no competing href navigation to fight the click handler.
      musicSection.innerHTML = `
        <div id="spotify-cover-wrapper"
             class="relative block w-full aspect-square rounded-lg overflow-hidden cursor-pointer group">

          <img id="spotify-cover-image"
               src="${coverUrl}"
               alt="Latest MENU Release"
               class="w-full h-full object-cover opacity-0 transition-opacity duration-500" />

          <div class="absolute inset-0 bg-black/30 opacity-0
                      group-hover:opacity-100 transition pointer-events-none"></div>

          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-20 h-20 rounded-full bg-white/80 flex items-center
                        justify-center text-black text-4xl">▶</div>
          </div>
        </div>

        <div>
          <p class="text-sm opacity-60 mb-2 tracking-widest">LATEST RELEASE</p>
          <h3 class="text-5xl mb-4 leading-tight">${name}</h3>
          <p class="text-xl opacity-60 mb-8">${releaseYear}</p>
          <p class="max-w-2xl text-white/70 mb-10 text-sm leading-relaxed">
            Stream ${name} and the rest of the MENU catalog on Spotify, Apple Music, and YouTube.
            Alternative pop rock from Atlanta with big choruses, raw emotion, and high energy live shows.
          </p>
          <p class="text-xs opacity-60 mb-4 tracking-[0.25em] uppercase">Listen on</p>

          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 text-center place-items-center w-full">
            <a href="https://open.spotify.com/artist/3K0KJBedbI1lEoTHc1zBPa?si=Cus7cwJJROexizToMZGWzQ&dl_branch=1"
               class="group flex flex-col items-center gap-2 hover:-translate-y-1 transition w-full">
              <div class="w-10 h-10 flex items-center justify-center border border-white/40 group-hover:border-green-400 transition">
                <i class="fa-brands fa-spotify text-white group-hover:text-green-400"></i>
              </div>
              <span class="text-[0.65rem] tracking-widest text-white/60 group-hover:text-white whitespace-nowrap">SPOTIFY</span>
            </a>

            <a href="https://geo.music.apple.com/us/album/_/1848795480?app=music&at=1000lHKX&ct=linktree_http&i=1848795481"
               class="group flex flex-col items-center gap-2 hover:-translate-y-1 transition w-full">
              <div class="w-10 h-10 flex items-center justify-center border border-white/40 group-hover:border-pink-400 transition">
                <i class="fa-brands fa-apple text-white group-hover:text-pink-400"></i>
              </div>
              <span class="text-[0.65rem] tracking-widest text-white/60 group-hover:text-white whitespace-nowrap">APPLE</span>
            </a>

            <a href="https://music.youtube.com/playlist?list=OLAK5uy_k8dFaiUIR43r-yfPtpoe98wTVGGoc4owM"
               class="group flex flex-col items-center gap-2 hover:-translate-y-1 transition w-full">
              <div class="w-10 h-10 flex items-center justify-center border border-white/40 group-hover:border-red-500 transition">
                <i class="fa-brands fa-youtube text-white group-hover:text-red-500"></i>
              </div>
              <span class="text-[0.65rem] tracking-widest text-white/60 group-hover:text-white whitespace-nowrap">YOUTUBE</span>
            </a>

            <a href="https://www.pandora.com/TR:177656958"
               class="group flex flex-col items-center gap-2 hover:-translate-y-1 transition w-full">
              <div class="w-10 h-10 flex items-center justify-center border border-white/40 group-hover:border-sky-400 transition">
                <i class="fa-brands fa-podcast text-white group-hover:text-sky-400"></i>
              </div>
              <span class="text-[0.65rem] tracking-widest text-white/60 group-hover:text-white whitespace-nowrap">PANDORA</span>
            </a>

            <a href="https://menuatlga.bandcamp.com/"
               class="group flex flex-col items-center gap-2 hover:-translate-y-1 transition w-full">
              <div class="w-10 h-10 flex items-center justify-center border border-white/40 group-hover:border-teal-300 transition">
                <i class="fa-brands fa-bandcamp text-white group-hover:text-teal-300"></i>
              </div>
              <span class="text-[0.65rem] tracking-widest text-white/60 group-hover:text-white whitespace-nowrap">BANDCAMP</span>
            </a>

            <a href="https://listen.tidal.com/track/468978923"
               class="group flex flex-col items-center gap-2 hover:-translate-y-1 transition w-full">
              <div class="w-10 h-10 flex items-center justify-center border border-white/40 group-hover:border-blue-400 transition">
                <i class="fa-solid fa-water text-white group-hover:text-blue-400"></i>
              </div>
              <span class="text-[0.65rem] tracking-widest text-white/60 group-hover:text-white whitespace-nowrap">TIDAL</span>
            </a>

            <a href="https://music.amazon.com/albums/B0FXK6BS9J?trackAsin=B0FXK3G96V"
               class="group flex flex-col items-center gap-2 hover:-translate-y-1 transition w-full">
              <div class="w-10 h-10 flex items-center justify-center border border-white/40 group-hover:border-yellow-400 transition">
                <i class="fa-brands fa-amazon text-white group-hover:text-yellow-400"></i>
              </div>
              <span class="text-[0.65rem] tracking-widest text-white/60 group-hover:text-white whitespace-nowrap">AMAZON</span>
            </a>
          </div>
        </div>
      `;

      // Fade in the album cover once the DOM is ready (no race condition —
      // we're attaching to elements we just created above).
      const img = document.getElementById('spotify-cover-image');
      if (img) {
        img.onload = () => img.classList.remove('opacity-0');
        // If already cached and loaded, onload won't fire — check complete
        if (img.complete) img.classList.remove('opacity-0');
      }

      // Single click handler on the wrapper div. Re-queries by ID so the
      // reference is always fresh, then replaces itself with the iframe.
      const wrapper = document.getElementById('spotify-cover-wrapper');
      if (wrapper) {
        wrapper.addEventListener('click', () => {
          const fresh = document.getElementById('spotify-cover-wrapper');
          if (!fresh) return;
          fresh.outerHTML = `
            <iframe
              src="https://open.spotify.com/embed/album/${albumId}?utm_source=generator&autoplay=1"
              width="100%"
              height="380"
              frameborder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="eager"
              style="border-radius:12px; aspect-ratio:1;">
            </iframe>
          `;
        });
      }

    } catch (err) {
      console.error("Error loading Spotify music:", err);
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
  loadLatestMusic();
}

document.addEventListener('DOMContentLoaded', () => {
  const hamburgerToggle = document.getElementById('hamburger-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuClose = document.getElementById('mobile-menu-close');

  function toggleMobileMenu() {
    mobileMenu.classList.toggle('hidden');
    mobileMenu.classList.toggle('show');
    hamburgerToggle.classList.toggle('open');
    hamburgerToggle.classList.toggle('closed');
  }

  window.toggleMobileMenu = toggleMobileMenu;

  if (hamburgerToggle) {
    hamburgerToggle.addEventListener('click', toggleMobileMenu);
  }

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', toggleMobileMenu);
  }

  loadShows();
  initGallery();
  initMerchAndCart();
});